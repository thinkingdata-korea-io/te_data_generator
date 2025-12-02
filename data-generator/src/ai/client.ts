import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ParsedSchema, AIAnalysisResult, EventDefinition } from '../types';
import {
  buildStrategyPrompt,
  buildEventGroupPrompt,
  buildRetentionPrompt,
  buildEventSequencingPrompt,
  convertAIGroupsToMap,
  splitLargeGroups
} from './prompts';
import { ValidationPipeline } from './validation-pipeline';
import {
  AnalysisLanguage,
  getMessage,
  formatSegmentList,
  formatRetentionDetail,
  formatSequencingDetail,
  formatPhase4GroupDetail,
  formatPhase4CompletionDetail,
  formatPhase5CompletionDetail
} from '../utils/language-helper';
import { logger } from '../utils/logger';

export type AIProgressCallback = (progress: {
  phase: string;
  progress: number;
  message: string;
  detail?: string;
}) => void;

/**
 * AI 클라이언트 설정
 */
export interface AIClientConfig {
  provider: 'openai' | 'anthropic' | 'gemini';
  apiKey: string;
  model?: string;
  validationModelTier?: 'fast' | 'balanced';  // 검증 모델 등급 (기본: fast)
  customValidationModel?: string;  // 사용자 지정 검증 모델 (선택사항)
  language?: AnalysisLanguage;  // 분석 언어 (기본: ko)
  onProgress?: AIProgressCallback;  // 진행 상황 콜백
}

/**
 * 사용자 입력
 */
export interface UserInput {
  scenario: string;
  dau: number;
  industry: string;  // 서비스 산업
  notes: string;     // 비고 (서비스 특징)
  dateRange: {
    start: string;
    end: string;
  };
}

/**
 * AI 클라이언트
 */
export class AIClient {
  private openai?: OpenAI;
  private anthropic?: Anthropic;
  private gemini?: GoogleGenerativeAI;
  private config: AIClientConfig;
  private validationPipeline: ValidationPipeline;

  constructor(config: AIClientConfig) {
    this.config = config;

    if (config.provider === 'openai') {
      this.openai = new OpenAI({ apiKey: config.apiKey });
    } else if (config.provider === 'anthropic') {
      this.anthropic = new Anthropic({ apiKey: config.apiKey });
    } else if (config.provider === 'gemini') {
      this.gemini = new GoogleGenerativeAI(config.apiKey);
    }

    // ValidationPipeline 초기화 (검증 모델 등급 + 커스텀 모델 전달)
    const validationTier = config.validationModelTier || 'fast';
    this.validationPipeline = new ValidationPipeline(
      this,
      validationTier,
      config.customValidationModel
    );
  }

  /**
   * Excel 스키마와 사용자 입력을 기반으로 AI 분석
   * 재시도 로직 포함 (최대 3회)
   */
  async analyzeSchema(
    schema: ParsedSchema,
    userInput: UserInput
  ): Promise<AIAnalysisResult> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`AI 분석 시도 ${attempt}/${maxRetries}...`);

        const prompt = this.buildPrompt(schema, userInput);
        let response: string;

        if (this.config.provider === 'openai') {
          response = await this.callOpenAI(prompt);
        } else if (this.config.provider === 'gemini') {
          response = await this.callGemini(prompt);
        } else {
          response = await this.callAnthropic(prompt, attempt);
        }

        // 응답 파싱 시도
        const result = this.parseAIResponse(response);

        // 필수 필드 검증
        this.validateAIResult(result);

        logger.info(`✅ AI 분석 성공 (시도 ${attempt}/${maxRetries})`);
        return result;

      } catch (error) {
        lastError = error as Error;
        logger.error(`❌ AI 분석 실패 (시도 ${attempt}/${maxRetries}):`, error instanceof Error ? error.message : error);

        if (attempt < maxRetries) {
          // 재시도 전 대기 (exponential backoff)
          const waitTime = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          logger.info(`⏳ ${waitTime}ms 후 재시도...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    // 모든 재시도 실패
    throw new Error(`AI 분석 실패 (${maxRetries}회 시도): ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * AI 프롬프트 생성
   */
  private buildPrompt(schema: ParsedSchema, userInput: UserInput): string {
    return `당신은 ${userInput.industry} 도메인의 데이터 분석 전문가입니다.

다음 정보를 기반으로 현실적인 이벤트 트래킹 데이터 생성을 위한 분석을 제공해주세요.

## 사용자 시나리오
${userInput.scenario}

## 서비스 정보
- 산업: ${userInput.industry}
- DAU: ${userInput.dau}
- 비고: ${userInput.notes}
- 날짜 범위: ${userInput.dateRange.start} ~ ${userInput.dateRange.end}

## 이벤트 정의
${schema.events.map(e => `- ${e.event_name} (${e.event_name_kr}): ${e.category}`).join('\n')}

## 속성 정의
${schema.properties.map(p => `- ${p.property_name} (${p.property_name_kr}): ${p.data_type}`).join('\n')}

## 퍼널 정의
${schema.funnels.map(f => `- ${f.name}: ${f.steps.join(' → ')}`).join('\n')}

---

**중요**: 다음 속성들은 Faker.js가 자동으로 생성하므로 범위를 정의하지 마세요:
- 이름 관련: user_name, nickname → Faker.js person.fullName()
- 주소 관련: address, city → Faker.js location.*
- 연락처: email, phone → Faker.js internet.email(), phone.number()

AI는 **비즈니스 로직 중심 속성만** 범위를 정의하세요:
- 금액, 가격, 수량
- 상품 ID, 카테고리
- 레벨, 점수 등

다음 JSON 형식으로 응답해주세요:

\`\`\`json
{
  "userSegments": [
    {
      "name": "세그먼트명",
      "ratio": 0.3,
      "characteristics": "세그먼트 특성 설명"
    }
  ],
  "eventDependencies": {
    "event_name": ["required_event1", "required_event2"]
  },
  "eventRanges": [
    {
      "event_name": "이벤트명",
      "properties": [
        {
          "property_name": "속성명",
          "type": "number",
          "min": 10,
          "max": 100,
          "segmentRanges": {
            "세그먼트명": { "min": 50, "max": 200 }
          }
        },
        {
          "property_name": "카테고리",
          "type": "choice",
          "values": ["A", "B", "C"],
          "weights": [0.5, 0.3, 0.2]
        }
      ]
    }
  ],
  "sessionPatterns": {
    "avgSessionsPerDay": {
      "세그먼트명": 3.5
    },
    "avgSessionDuration": {
      "세그먼트명": 300000
    },
    "avgEventsPerSession": {
      "세그먼트명": 15
    }
  }
}
\`\`\``;
  }

  /**
   * OpenAI API 호출
   */
  private async callOpenAI(prompt: string): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const model = this.config.model || 'gpt-4o';
    const completion = await this.openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: '당신은 이벤트 트래킹 데이터 분석 전문가입니다. JSON 형식으로만 응답하세요.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7
    });

    return completion.choices[0].message.content || '{}';
  }

  /**
   * Anthropic API 호출
   * 재시도 시 max_tokens를 자동으로 증가
   */
  private async callAnthropic(prompt: string, attempt: number = 1, modelOverride?: string): Promise<string> {
    if (!this.anthropic) {
      throw new Error('Anthropic client not initialized');
    }

    // 재시도마다 max_tokens 증가 (8192 → 12288 → 16384)
    const baseTokens = 8192;
    const maxTokens = Math.min(baseTokens * attempt, 16384);

    // 모델 선택: override가 있으면 사용, 없으면 config
    const model = modelOverride || this.config.model || 'claude-sonnet-4-20250514';

    // Haiku 모델명 매핑
    const modelName = model === 'haiku' ? 'claude-3-5-haiku-20241022' : model;

    logger.info(`  📊 Claude API 호출 (model: ${modelName}, max_tokens: ${maxTokens})...`);

    const message = await this.anthropic.messages.create({
      model: modelName,
      max_tokens: maxTokens,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = message.content[0];
    if (content.type === 'text') {
      // 응답이 잘렸는지 확인
      const text = content.text;
      if (message.stop_reason === 'max_tokens') {
        logger.warn(`  ⚠️  응답이 max_tokens 제한으로 잘렸습니다 (${maxTokens} tokens)`);
        throw new Error('AI response truncated due to max_tokens limit');
      }
      return text;
    }

    return '{}';
  }

  /**
   * Gemini API 호출
   */
  private async callGemini(prompt: string, modelOverride?: string): Promise<string> {
    if (!this.gemini) {
      throw new Error('Gemini client not initialized');
    }

    // 모델 선택: override가 있으면 사용, 없으면 config
    const model = modelOverride || this.config.model || 'gemini-2.5-pro-latest';

    logger.info(`  📊 Gemini API 호출 (model: ${model})...`);

    const generativeModel = this.gemini.getGenerativeModel({
      model,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json'
      }
    });

    const result = await generativeModel.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    return text;
  }

  /**
   * AI 응답 파싱 (개선된 버전)
   */
  private parseAIResponse(response: string): AIAnalysisResult {
    let jsonText = response.trim();

    // 1. 마크다운 코드 블록 제거
    if (jsonText.includes('```')) {
      // ```json ... ``` 또는 ``` ... ``` 패턴 찾기
      const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1].trim();
      } else {
        // 열린 코드 블록만 있는 경우 (잘린 응답)
        jsonText = jsonText.replace(/^```(?:json)?\s*/, '');
      }
    }

    // 2. JSON이 중간에 잘렸는지 확인
    const openBraces = (jsonText.match(/\{/g) || []).length;
    const closeBraces = (jsonText.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      throw new Error(`Incomplete JSON: ${openBraces} open braces, ${closeBraces} close braces`);
    }

    // 3. JSON 파싱 시도
    try {
      const parsed = JSON.parse(jsonText);
      return parsed as AIAnalysisResult;
    } catch (error) {
      logger.error('❌ JSON 파싱 실패:', error instanceof Error ? error.message : error);
      logger.error('📄 응답 (처음 500자):', response.substring(0, 500));
      logger.error('📄 응답 (마지막 200자):', response.substring(Math.max(0, response.length - 200)));
      throw new Error(`Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * AI 분석 결과 검증
   */
  private validateAIResult(result: AIAnalysisResult): void {
    // 필수 필드 확인
    if (!result.userSegments || !Array.isArray(result.userSegments) || result.userSegments.length === 0) {
      throw new Error('Missing or invalid userSegments in AI response');
    }

    if (!result.eventRanges || !Array.isArray(result.eventRanges)) {
      throw new Error('Missing or invalid eventRanges in AI response');
    }

    if (!result.sessionPatterns || typeof result.sessionPatterns !== 'object') {
      throw new Error('Missing or invalid sessionPatterns in AI response');
    }

    // userSegments 검증
    const totalRatio = result.userSegments.reduce((sum, seg) => sum + seg.ratio, 0);
    if (Math.abs(totalRatio - 1.0) > 0.01) {
      logger.warn(`⚠️  User segment ratios don't sum to 1.0: ${totalRatio}`);
    }

    // sessionPatterns 필수 필드 확인
    if (!result.sessionPatterns.avgSessionsPerDay ||
        !result.sessionPatterns.avgSessionDuration ||
        !result.sessionPatterns.avgEventsPerSession) {
      throw new Error('Missing required fields in sessionPatterns');
    }

    logger.info(`  ✅ AI 결과 검증 완료: ${result.userSegments.length}개 세그먼트, ${result.eventRanges.length}개 이벤트 범위`);
  }

  /**
   * 다단계 AI 분석 (Phase 1 + Phase 2)
   * 이벤트를 그룹별로 나눠서 정확도 향상
   */
  async analyzeSchemaMultiPhase(
    schema: ParsedSchema,
    userInput: UserInput
  ): Promise<AIAnalysisResult> {
    logger.info('\n🎯 Starting Multi-Phase AI Analysis...');

    const lang = this.config.language || 'ko';

    // Phase 1: 전략 분석
    this.config.onProgress?.({
      phase: 'phase1',
      progress: 30,
      message: getMessage(lang, 'phase1_analyzing'),
      detail: getMessage(lang, 'phase1_detail')
    });
    logger.info('\n📋 Phase 1: Strategy Analysis');
    const strategy = await this.analyzeStrategy(schema, userInput);

    logger.info(`  ✅ Strategy: ${strategy.userSegments.length} segments defined`);
    logger.info(`  ✅ Session patterns configured`);
    logger.info(`  ✅ Event dependencies: ${Object.keys(strategy.eventDependencies || {}).length} rules`);
    logger.info(`  ✅ Event groups: ${Object.keys(strategy.eventGroups || {}).length} categories (AI-based)`);

    this.config.onProgress?.({
      phase: 'phase1',
      progress: 35,
      message: getMessage(lang, 'phase1_completed', strategy.userSegments.length),
      detail: formatSegmentList(lang, strategy.userSegments)
    });

    // Phase 2: 리텐션 커브 분석
    this.config.onProgress?.({
      phase: 'phase2',
      progress: 40,
      message: getMessage(lang, 'phase2_analyzing'),
      detail: getMessage(lang, 'phase2_detail')
    });
    logger.info('\n📈 Phase 1.5: Retention Curve Analysis');
    const { retentionCurve, validationSummary: retentionSummary } = await this.analyzeRetention(userInput, strategy.userSegments);
    logger.info(`  ✅ Retention: Day1=${(retentionCurve.day1Retention * 100).toFixed(1)}%, Day7=${(retentionCurve.day7Retention * 100).toFixed(1)}%, Day30=${(retentionCurve.day30Retention * 100).toFixed(1)}%`);

    this.config.onProgress?.({
      phase: 'phase2',
      progress: 45,
      message: getMessage(lang, 'phase2_completed',
        (retentionCurve.day1Retention*100).toFixed(1),
        (retentionCurve.day7Retention*100).toFixed(1),
        (retentionCurve.day30Retention*100).toFixed(1)),
      detail: formatRetentionDetail(lang, retentionCurve.day1Retention, retentionCurve.day7Retention, retentionCurve.day30Retention)
    });

    // Phase 3: 이벤트 순서 분석
    this.config.onProgress?.({
      phase: 'phase3',
      progress: 50,
      message: getMessage(lang, 'phase3_analyzing'),
      detail: getMessage(lang, 'phase3_detail')
    });
    logger.info('\n🔗 Phase 1.6: Event Sequencing Analysis');
    const { eventSequencing, validationSummary: sequencingSummary } = await this.analyzeEventSequencing(schema, userInput);
    logger.info(`  ✅ Event categories: lifecycle=${eventSequencing.eventCategories?.lifecycle?.length || 0}, onboarding=${eventSequencing.eventCategories?.onboarding?.length || 0}, core=${eventSequencing.eventCategories?.core?.length || 0}`);
    logger.info(`  ✅ Strict dependencies: ${Object.keys(eventSequencing.strictDependencies || {}).length} rules`);
    logger.info(`  ✅ Logical sequences: ${eventSequencing.logicalSequences?.length || 0} funnels`);

    this.config.onProgress?.({
      phase: 'phase3',
      progress: 55,
      message: getMessage(lang, 'phase3_completed',
        eventSequencing.logicalSequences.length,
        Object.keys(eventSequencing.strictDependencies).length),
      detail: formatSequencingDetail(lang, eventSequencing.logicalSequences.length, Object.keys(eventSequencing.strictDependencies).length)
    });

    // Phase 4: 이벤트 그룹별 속성 범위 생성
    this.config.onProgress?.({
      phase: 'phase4',
      progress: 60,
      message: getMessage(lang, 'phase4_preparing', schema.events.length),
      detail: formatPhase4GroupDetail(lang, schema.events.length)
    });
    logger.info(`\n📊 Phase 2: Event Group Analysis (${schema.events.length} events)`);

    // AI가 반환한 eventGroups 사용
    if (!strategy.eventGroups || Object.keys(strategy.eventGroups).length === 0) {
      logger.warn('⚠️  AI did not return eventGroups, using fallback grouping');
      // 폴백: Excel의 category 기반 그룹핑
      const fallbackGroups = new Map<string, EventDefinition[]>();
      schema.events.forEach(e => {
        const cat = e.category || '기타';
        if (!fallbackGroups.has(cat)) fallbackGroups.set(cat, []);
        fallbackGroups.get(cat)!.push(e);
      });
      var groups = fallbackGroups;
    } else {
      // AI가 반환한 그룹 사용
      var groups = convertAIGroupsToMap(strategy.eventGroups, schema.events);
      logger.info(`  📁 AI grouped into ${groups.size} categories`);
    }

    // 큰 그룹 분할 (최대 10개씩)
    groups = splitLargeGroups(groups, 10);
    logger.info(`  📁 Final groups: ${groups.size} (max 10 events per group)`);

    this.config.onProgress?.({
      phase: 'phase4',
      progress: 62,
      message: getMessage(lang, 'phase4_grouping', groups.size),
      detail: formatPhase4CompletionDetail(lang, groups.size)
    });

    // 각 그룹별로 AI 분석
    const allEventRanges: any[] = [];
    let groupIndex = 0;

    for (const [groupName, events] of groups.entries()) {
      groupIndex++;

      // Calculate progress for Phase 4 groups (62-80%)
      const groupProgress = 62 + Math.floor((groupIndex / groups.size) * 18);
      this.config.onProgress?.({
        phase: 'phase4',
        progress: groupProgress,
        message: getMessage(lang, 'phase4_analyzing', groupIndex, groups.size, groupName),
        detail: getMessage(lang, 'phase4_detail', events.length)
      });

      logger.info(`\n  📦 Group ${groupIndex}/${groups.size}: ${groupName} (${events.length} events)`);

      try {
        const groupRanges = await this.analyzeEventGroup(
          events,
          schema.properties,
          strategy.userSegments.map(s => s.name),
          userInput,
          groupName
        );

        allEventRanges.push(...groupRanges.eventRanges);
        logger.info(`    ✅ Generated ranges for ${groupRanges.eventRanges.length} events`);
      } catch (error) {
        logger.error(`    ❌ Failed to analyze group ${groupName}:`, error instanceof Error ? error.message : error);
        logger.warn(`    ⚠️  Continuing with other groups...`);
      }

      // API rate limit 방지를 위한 짧은 대기
      if (groupIndex < groups.size) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Phase 5: 결과 병합 및 검증
    this.config.onProgress?.({
      phase: 'phase5',
      progress: 85,
      message: getMessage(lang, 'phase5_validating'),
      detail: getMessage(lang, 'phase5_detail')
    });
    logger.info(`\n🔗 Phase 5: Merging Results & Validation`);
    const result: AIAnalysisResult = {
      userSegments: strategy.userSegments,
      eventDependencies: strategy.eventDependencies || {},
      eventRanges: allEventRanges,
      sessionPatterns: strategy.sessionPatterns,
      retentionCurve,
      eventSequencing,
      validationSummary: {
        retention: retentionSummary,
        sequencing: sequencingSummary
      }
    };

    logger.info(`  ✅ Total event ranges: ${allEventRanges.length}`);
    logger.info(`  ✅ Total properties with ranges: ${allEventRanges.reduce((sum, e) => sum + e.properties.length, 0)}`);

    // 검증
    this.validateAIResult(result);

    this.config.onProgress?.({
      phase: 'phase5',
      progress: 95,
      message: getMessage(lang, 'phase5_completed', result.userSegments.length, result.eventRanges.length),
      detail: formatPhase5CompletionDetail(lang, result.userSegments.length, result.eventRanges.length)
    });

    logger.info('\n✅ Multi-Phase AI Analysis Completed!');
    return result;
  }

  /**
   * Phase 1: 전략 분석 + 이벤트 그룹핑
   */
  private async analyzeStrategy(
    schema: ParsedSchema,
    userInput: UserInput
  ): Promise<Omit<AIAnalysisResult, 'eventRanges'> & { eventGroups?: Record<string, string[]> }> {
    const prompt = buildStrategyPrompt(schema, userInput);
    let response: string;

    if (this.config.provider === 'openai') {
      response = await this.callOpenAI(prompt);
    } else if (this.config.provider === 'gemini') {
      response = await this.callGemini(prompt);
    } else {
      response = await this.callAnthropic(prompt);
    }

    const result = this.parseAIResponse(response);
    return {
      userSegments: result.userSegments,
      eventDependencies: result.eventDependencies || {},
      eventGroups: result.eventGroups || {},
      sessionPatterns: result.sessionPatterns,
      propertyCorrelations: result.propertyCorrelations || [],
      timingDistribution: result.timingDistribution || undefined
    };
  }

  /**
   * Phase 2: 이벤트 그룹별 속성 범위 생성
   */
  private async analyzeEventGroup(
    events: EventDefinition[],
    properties: any[],
    userSegments: string[],
    userInput: UserInput,
    groupName: string
  ): Promise<{ eventRanges: any[] }> {
    const prompt = buildEventGroupPrompt(
      events,
      properties,
      userSegments,
      userInput,
      groupName
    );

    let response: string;

    if (this.config.provider === 'openai') {
      response = await this.callOpenAI(prompt);
    } else if (this.config.provider === 'gemini') {
      response = await this.callGemini(prompt);
    } else {
      response = await this.callAnthropic(prompt);
    }

    const result = this.parseAIResponse(response);
    return {
      eventRanges: result.eventRanges || []
    };
  }

  /**
   * Phase 1.5: 리텐션 커브 분석 (검증 포함)
   */
  private async analyzeRetention(
    userInput: UserInput,
    userSegments: Array<{ name: string; ratio: number; characteristics: string }>
  ): Promise<any> {
    // 1. Generator: 초안 생성
    const prompt = buildRetentionPrompt(userInput, userSegments);
    let response: string;

    if (this.config.provider === 'openai') {
      response = await this.callOpenAI(prompt);
    } else if (this.config.provider === 'gemini') {
      response = await this.callGemini(prompt);
    } else {
      response = await this.callAnthropic(prompt);
    }

    const result = this.parseAIResponse(response);
    const proposedCurve = result.retentionCurve;

    // 2. Validation Pipeline (규칙 + AI 검증)
    try {
      const { curve, summary } = await this.validationPipeline.validateAndFixRetention(
        proposedCurve,
        userInput
      );

      // 검증 결과 로깅
      if (summary.ruleBasedPassed) {
        logger.info('  💚 Passed rule-based validation (no AI validation needed)');
      } else if (summary.aiValidationUsed) {
        logger.info(`  💛 Passed AI validation (${summary.fixAttempts} fix attempt(s))`);
      }

      if (summary.warnings.length > 0) {
        logger.warn('  ⚠️  Warnings:', summary.warnings.join(', '));
      }

      return { retentionCurve: curve, validationSummary: summary };

    } catch (error) {
      logger.error('  ❌ Validation failed:', error instanceof Error ? error.message : error);
      logger.warn('  🔄 Using fallback retention curve');

      const fallbackCurve = this.generateFallbackRetentionCurve(userInput.industry);
      const fallbackSummary = {
        passed: false,
        ruleBasedPassed: false,
        aiValidationUsed: true,
        fixAttempts: 3,
        errors: [error instanceof Error ? error.message : 'Unknown validation error'],
        warnings: ['Using fallback retention curve due to validation failure']
      };

      return { retentionCurve: fallbackCurve, validationSummary: fallbackSummary };
    }
  }

  /**
   * Phase 1.6: 이벤트 순서 분석 (검증 포함)
   */
  private async analyzeEventSequencing(
    schema: ParsedSchema,
    userInput: UserInput
  ): Promise<any> {
    // 1. Generator: 초안 생성
    const prompt = buildEventSequencingPrompt(schema, userInput);
    let response: string;

    if (this.config.provider === 'openai') {
      response = await this.callOpenAI(prompt);
    } else if (this.config.provider === 'gemini') {
      response = await this.callGemini(prompt);
    } else {
      response = await this.callAnthropic(prompt);
    }

    const result = this.parseAIResponse(response);
    const proposedSequencing = result.eventSequencing;

    // 2. Validation Pipeline
    try {
      const { sequencing, summary } = await this.validationPipeline.validateAndFixEventSequencing(
        proposedSequencing,
        schema,
        userInput
      );

      // 검증 결과 로깅
      if (summary.ruleBasedPassed) {
        logger.info('  💚 Passed rule-based validation (no AI validation needed)');
      } else if (summary.aiValidationUsed) {
        logger.info(`  💛 Passed AI validation (${summary.fixAttempts} fix attempt(s))`);
      }

      if (summary.warnings.length > 0) {
        logger.warn('  ⚠️  Warnings:', summary.warnings.join(', '));
      }

      // 트랜잭션 검증 및 초기화
      if (!sequencing.transactions) {
        logger.warn('  ⚠️  트랜잭션 필드가 없습니다. 빈 배열로 초기화합니다.');
        sequencing.transactions = [];
      }

      if (sequencing.transactions.length === 0) {
        logger.warn('  ⚠️  감지된 트랜잭션이 없습니다.');
        logger.info('  💡 가능한 원인:');
        logger.info('     1. 이벤트 이름에 start/end 패턴이 없음');
        logger.info('     2. 트랜잭션이 불필요한 도메인 (뉴스, 콘텐츠 소비 등)');
        logger.info('     3. AI 감지 실패 → Excel에서 수동 추가 가능');
      } else {
        logger.info(`  ✅ 트랜잭션 ${sequencing.transactions.length}개 생성됨`);
      }

      return { eventSequencing: sequencing, validationSummary: summary };

    } catch (error) {
      logger.error('  ❌ Validation failed:', error instanceof Error ? error.message : error);
      logger.warn('  🔄 Using fallback event sequencing');

      const fallbackSequencing = this.generateFallbackEventSequencing(schema);
      const fallbackSummary = {
        passed: false,
        ruleBasedPassed: false,
        aiValidationUsed: true,
        fixAttempts: 3,
        errors: [error instanceof Error ? error.message : 'Unknown validation error'],
        warnings: ['Using fallback event sequencing due to validation failure']
      };

      return { eventSequencing: fallbackSequencing, validationSummary: fallbackSummary };
    }
  }

  /**
   * 폴백: 안전한 리텐션 커브
   */
  private generateFallbackRetentionCurve(industry: string): any {
    const benchmarks: Record<string, any> = {
      '게임': { day1: 0.40, day7: 0.20, day30: 0.05, decay: 0.93 },
      'Mobile Game': { day1: 0.40, day7: 0.20, day30: 0.05, decay: 0.93 },
      '금융': { day1: 0.62, day7: 0.42, day30: 0.28, decay: 0.96 },
      'Finance': { day1: 0.62, day7: 0.42, day30: 0.28, decay: 0.96 },
      '이커머스': { day1: 0.48, day7: 0.28, day30: 0.15, decay: 0.94 },
      'E-Commerce': { day1: 0.48, day7: 0.28, day30: 0.15, decay: 0.94 },
      '소셜': { day1: 0.55, day7: 0.38, day30: 0.20, decay: 0.95 },
      'Social': { day1: 0.55, day7: 0.38, day30: 0.20, decay: 0.95 },
      'default': { day1: 0.45, day7: 0.25, day30: 0.10, decay: 0.94 }
    };

    const b = benchmarks[industry] || benchmarks['default'];

    return {
      industry,
      dayZeroRetention: 1.0,
      day1Retention: b.day1,
      day7Retention: b.day7,
      day30Retention: b.day30,
      retentionDecay: b.decay,
      segmentMultipliers: {
        'default': 1.0
      },
      lifecycleProbabilities: {
        new: 0.8,
        active: 0.7,
        returning: 0.5,
        dormant: 0.1,
        churned: 0.03
      },
      weekendBoost: 1.2,
      monthlyReturnPattern: false
    };
  }

  /**
   * 폴백: 안전한 이벤트 순서
   */
  private generateFallbackEventSequencing(schema: ParsedSchema): any {
    // 이벤트명 기반 휴리스틱 분류
    const lifecycle: string[] = [];
    const sessionStart: string[] = [];
    const sessionEnd: string[] = [];
    const onboarding: string[] = [];
    const core: string[] = [];

    schema.events.forEach(event => {
      const name = event.event_name.toLowerCase();

      if (name.includes('install') || name.includes('signup') || name.includes('register')) {
        lifecycle.push(event.event_name);
      } else if (name.includes('start') || name.includes('open') || name.includes('launch')) {
        sessionStart.push(event.event_name);
      } else if (name.includes('end') || name.includes('close') || name.includes('exit')) {
        sessionEnd.push(event.event_name);
      } else if (name.includes('tutorial') || name.includes('onboarding') || name.includes('welcome')) {
        onboarding.push(event.event_name);
      } else {
        core.push(event.event_name);
      }
    });

    return {
      transactions: [], // 폴백에서도 빈 배열로 초기화
      strictDependencies: {},
      eventCategories: {
        lifecycle,
        session_start: sessionStart,
        session_end: sessionEnd,
        onboarding,
        core,
        monetization: []
      },
      executionConstraints: {},
      logicalSequences: []
    };
  }
}
