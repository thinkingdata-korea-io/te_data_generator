import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { ParsedSchema, AIAnalysisResult, EventDefinition } from '../types';
import {
  buildStrategyPrompt,
  buildEventGroupPrompt,
  convertAIGroupsToMap,
  splitLargeGroups
} from './prompts';

/**
 * AI 클라이언트 설정
 */
export interface AIClientConfig {
  provider: 'openai' | 'anthropic';
  apiKey: string;
  model?: string;
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
  private config: AIClientConfig;

  constructor(config: AIClientConfig) {
    this.config = config;

    if (config.provider === 'openai') {
      this.openai = new OpenAI({ apiKey: config.apiKey });
    } else {
      this.anthropic = new Anthropic({ apiKey: config.apiKey });
    }
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
        console.log(`AI 분석 시도 ${attempt}/${maxRetries}...`);

        const prompt = this.buildPrompt(schema, userInput);
        let response: string;

        if (this.config.provider === 'openai') {
          response = await this.callOpenAI(prompt);
        } else {
          response = await this.callAnthropic(prompt, attempt);
        }

        // 응답 파싱 시도
        const result = this.parseAIResponse(response);

        // 필수 필드 검증
        this.validateAIResult(result);

        console.log(`✅ AI 분석 성공 (시도 ${attempt}/${maxRetries})`);
        return result;

      } catch (error) {
        lastError = error as Error;
        console.error(`❌ AI 분석 실패 (시도 ${attempt}/${maxRetries}):`, error instanceof Error ? error.message : error);

        if (attempt < maxRetries) {
          // 재시도 전 대기 (exponential backoff)
          const waitTime = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          console.log(`⏳ ${waitTime}ms 후 재시도...`);
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

    const model = this.config.model || 'gpt-4-turbo-preview';
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
  private async callAnthropic(prompt: string, attempt: number = 1): Promise<string> {
    if (!this.anthropic) {
      throw new Error('Anthropic client not initialized');
    }

    // 재시도마다 max_tokens 증가 (8192 → 12288 → 16384)
    const baseTokens = 8192;
    const maxTokens = Math.min(baseTokens * attempt, 16384);

    console.log(`  📊 Claude API 호출 (max_tokens: ${maxTokens})...`);

    const model = this.config.model || 'claude-sonnet-4-20250514';
    const message = await this.anthropic.messages.create({
      model,
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
        console.warn(`  ⚠️  응답이 max_tokens 제한으로 잘렸습니다 (${maxTokens} tokens)`);
        throw new Error('AI response truncated due to max_tokens limit');
      }
      return text;
    }

    return '{}';
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
      console.error('❌ JSON 파싱 실패:', error instanceof Error ? error.message : error);
      console.error('📄 응답 (처음 500자):', response.substring(0, 500));
      console.error('📄 응답 (마지막 200자):', response.substring(Math.max(0, response.length - 200)));
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
      console.warn(`⚠️  User segment ratios don't sum to 1.0: ${totalRatio}`);
    }

    // sessionPatterns 필수 필드 확인
    if (!result.sessionPatterns.avgSessionsPerDay ||
        !result.sessionPatterns.avgSessionDuration ||
        !result.sessionPatterns.avgEventsPerSession) {
      throw new Error('Missing required fields in sessionPatterns');
    }

    console.log(`  ✅ AI 결과 검증 완료: ${result.userSegments.length}개 세그먼트, ${result.eventRanges.length}개 이벤트 범위`);
  }

  /**
   * 다단계 AI 분석 (Phase 1 + Phase 2)
   * 이벤트를 그룹별로 나눠서 정확도 향상
   */
  async analyzeSchemaMultiPhase(
    schema: ParsedSchema,
    userInput: UserInput
  ): Promise<AIAnalysisResult> {
    console.log('\n🎯 Starting Multi-Phase AI Analysis...');

    // Phase 1: 전략 분석
    console.log('\n📋 Phase 1: Strategy Analysis');
    const strategy = await this.analyzeStrategy(schema, userInput);

    console.log(`  ✅ Strategy: ${strategy.userSegments.length} segments defined`);
    console.log(`  ✅ Session patterns configured`);
    console.log(`  ✅ Event dependencies: ${Object.keys(strategy.eventDependencies || {}).length} rules`);
    console.log(`  ✅ Event groups: ${Object.keys(strategy.eventGroups || {}).length} categories (AI-based)`);

    // Phase 2: 이벤트 그룹별 속성 범위 생성
    console.log(`\n📊 Phase 2: Event Group Analysis (${schema.events.length} events)`);

    // AI가 반환한 eventGroups 사용
    if (!strategy.eventGroups || Object.keys(strategy.eventGroups).length === 0) {
      console.warn('⚠️  AI did not return eventGroups, using fallback grouping');
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
      console.log(`  📁 AI grouped into ${groups.size} categories`);
    }

    // 큰 그룹 분할 (최대 10개씩)
    groups = splitLargeGroups(groups, 10);
    console.log(`  📁 Final groups: ${groups.size} (max 10 events per group)`);

    // 각 그룹별로 AI 분석
    const allEventRanges: any[] = [];
    let groupIndex = 0;

    for (const [groupName, events] of groups.entries()) {
      groupIndex++;
      console.log(`\n  📦 Group ${groupIndex}/${groups.size}: ${groupName} (${events.length} events)`);

      try {
        const groupRanges = await this.analyzeEventGroup(
          events,
          schema.properties,
          strategy.userSegments.map(s => s.name),
          userInput,
          groupName
        );

        allEventRanges.push(...groupRanges.eventRanges);
        console.log(`    ✅ Generated ranges for ${groupRanges.eventRanges.length} events`);
      } catch (error) {
        console.error(`    ❌ Failed to analyze group ${groupName}:`, error instanceof Error ? error.message : error);
        console.warn(`    ⚠️  Continuing with other groups...`);
      }

      // API rate limit 방지를 위한 짧은 대기
      if (groupIndex < groups.size) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Phase 3: 결과 병합
    console.log(`\n🔗 Phase 3: Merging Results`);
    const result: AIAnalysisResult = {
      userSegments: strategy.userSegments,
      eventDependencies: strategy.eventDependencies || {},
      eventRanges: allEventRanges,
      sessionPatterns: strategy.sessionPatterns
    };

    console.log(`  ✅ Total event ranges: ${allEventRanges.length}`);
    console.log(`  ✅ Total properties with ranges: ${allEventRanges.reduce((sum, e) => sum + e.properties.length, 0)}`);

    // 검증
    this.validateAIResult(result);

    console.log('\n✅ Multi-Phase AI Analysis Completed!');
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
    } else {
      response = await this.callAnthropic(prompt);
    }

    const result = this.parseAIResponse(response);
    return {
      userSegments: result.userSegments,
      eventDependencies: result.eventDependencies || {},
      eventGroups: result.eventGroups || {},
      sessionPatterns: result.sessionPatterns
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
    } else {
      response = await this.callAnthropic(prompt);
    }

    const result = this.parseAIResponse(response);
    return {
      eventRanges: result.eventRanges || []
    };
  }
}
