import * as fs from 'fs';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import {
  ExcelGenerationRequest,
  TaxonomyData,
  Stage1Output,
  Stage2Output,
  Stage3Output,
  EventDataRow,
  EventSkeleton
} from './types';

export type ProgressCallback = (progress: {
  stage: string;
  progress: number;
  message: string;
  detail?: string;
}) => void;

export interface TaxonomyBuilderOptions {
  provider?: 'anthropic' | 'openai';
  apiKey?: string;
  model?: string;
  promptsDir?: string;
  onProgress?: ProgressCallback;
}

/**
 * 3단계 프로세스로 AI를 사용하여 taxonomy 생성
 */
export class TaxonomyBuilderV2 {
  private options: TaxonomyBuilderOptions;
  private anthropic?: Anthropic;
  private openai?: OpenAI;
  private stage1Prompt: string;
  private stage2Prompt: string;
  private stage3Prompt: string;

  constructor(options: TaxonomyBuilderOptions) {
    this.options = {
      provider: options.provider || 'anthropic',
      apiKey: options.apiKey,
      model: options.model,
      promptsDir: options.promptsDir,
      onProgress: options.onProgress
    };

    if (this.options.provider === 'anthropic' && this.options.apiKey) {
      this.anthropic = new Anthropic({ apiKey: this.options.apiKey });
    }

    if (this.options.provider === 'openai' && this.options.apiKey) {
      this.openai = new OpenAI({ apiKey: this.options.apiKey });
    }

    // Load prompt templates
    this.stage1Prompt = this.loadPrompt('stage1-events-common.md');
    this.stage2Prompt = this.loadPrompt('stage2-event-properties.md');
    this.stage3Prompt = this.loadPrompt('stage3-user-data.md');
  }

  /**
   * Load prompt template from file
   */
  private loadPrompt(filename: string): string {
    const defaultPath = path.join(__dirname, '../prompts', filename);
    const promptPath = this.options.promptsDir
      ? path.join(this.options.promptsDir, filename)
      : defaultPath;

    try {
      return fs.readFileSync(promptPath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to load prompt: ${promptPath}`);
    }
  }

  /**
   * Generate complete taxonomy using 3-stage process
   */
  async build(request: ExcelGenerationRequest): Promise<TaxonomyData> {
    if (!this.options.apiKey) {
      console.warn('⚠️  No API key provided, using minimal fallback taxonomy');
      this.options.onProgress?.({
        stage: 'fallback',
        progress: 100,
        message: 'AI 키 없음, 기본 템플릿 사용'
      });
      return this.buildFallback(request);
    }

    try {
      // Stage 1: Events and Common Properties
      this.options.onProgress?.({
        stage: 'stage1',
        progress: 10,
        message: 'AI 프롬프트 준비 중...',
        detail: 'Stage 1: 이벤트 및 공통 속성 생성'
      });
      console.log('🔹 Stage 1: Generating events and common properties...');

      this.options.onProgress?.({
        stage: 'stage1',
        progress: 15,
        message: `${this.options.provider === 'anthropic' ? 'Claude' : 'GPT'} AI에게 이벤트 구조 요청 중...`,
        detail: `산업: ${request.industry}, 시나리오: ${request.scenario}`
      });

      const stage1 = await this.runStage1(request);
      console.log(`✓ Stage 1 complete: ${stage1.events.length} events, ${stage1.commonProperties.length} common properties`);

      this.options.onProgress?.({
        stage: 'stage1',
        progress: 30,
        message: `Stage 1 완료: ${stage1.events.length}개 이벤트, ${stage1.commonProperties.length}개 공통 속성`,
        detail: stage1.events.slice(0, 5).map(e => `• ${e.eventName}`).join('\n')
      });

      // Stage 2: Event Properties
      this.options.onProgress?.({
        stage: 'stage2',
        progress: 35,
        message: 'Stage 2 시작: 이벤트별 속성 생성...',
        detail: `${stage1.events.length}개 이벤트를 배치로 처리`
      });
      console.log('🔹 Stage 2: Generating event properties...');

      const stage2 = await this.runStage2(request, stage1);
      console.log(`✓ Stage 2 complete: ${stage2.eventProperties.length} event properties`);

      this.options.onProgress?.({
        stage: 'stage2',
        progress: 70,
        message: `Stage 2 완료: ${stage2.eventProperties.length}개 이벤트 속성 생성`,
        detail: `배치 처리 완료`
      });

      // Stage 3: User Data
      this.options.onProgress?.({
        stage: 'stage3',
        progress: 75,
        message: 'Stage 3 시작: 유저 데이터 스키마 생성...',
        detail: '사용자 프로필 및 유저 ID 체계 정의'
      });
      console.log('🔹 Stage 3: Generating user data...');

      const stage3 = await this.runStage3(request, stage1, stage2);
      console.log(`✓ Stage 3 complete: ${stage3.userData.length} user properties`);

      this.options.onProgress?.({
        stage: 'stage3',
        progress: 90,
        message: `Stage 3 완료: ${stage3.userData.length}개 유저 속성 생성`,
        detail: 'Taxonomy 데이터 병합 중...'
      });

      // Combine all stages
      const taxonomy = this.combineStagesToTaxonomy(stage1, stage2, stage3);

      this.options.onProgress?.({
        stage: 'complete',
        progress: 95,
        message: 'Taxonomy 생성 완료, Excel 파일 작성 준비 중...'
      });

      return taxonomy;
    } catch (error) {
      console.warn('⚠️  AI taxonomy generation failed, using fallback:', (error as Error).message);
      this.options.onProgress?.({
        stage: 'fallback',
        progress: 100,
        message: 'AI 분석 실패, 기본 템플릿 사용',
        detail: (error as Error).message
      });
      return this.buildFallback(request);
    }
  }

  /**
   * Stage 1: Events + Common Properties + User ID System
   */
  private async runStage1(request: ExcelGenerationRequest): Promise<Stage1Output> {
    const eventCountMin = request.eventCountMin || 20;
    const eventCountMax = request.eventCountMax || 40;

    const prompt = this.stage1Prompt
      .replace(/\{industry\}/g, request.industry)
      .replace(/\{scenario\}/g, request.scenario)
      .replace(/\{notes\}/g, request.notes)
      .replace(/\{eventCountMin\}/g, eventCountMin.toString())
      .replace(/\{eventCountMax\}/g, eventCountMax.toString());

    const responseText = await this.callAI(prompt);
    const parsed = this.parseJSON(responseText);

    return {
      userIdSystem: parsed.userIdSystem || [],
      events: parsed.events || [],
      commonProperties: parsed.commonProperties || []
    };
  }

  /**
   * Stage 2: Event Properties (process in batches)
   */
  private async runStage2(request: ExcelGenerationRequest, stage1: Stage1Output): Promise<Stage2Output> {
    const allProperties: any[] = [];
    const batchSize = 3; // Process 3 events at a time to avoid token limit
    const totalBatches = Math.ceil(stage1.events.length / batchSize);

    // Split events into batches
    for (let i = 0; i < stage1.events.length; i += batchSize) {
      const batch = stage1.events.slice(i, i + batchSize);
      const currentBatchNum = Math.floor(i / batchSize) + 1;

      console.log(`  Processing events ${i + 1}-${Math.min(i + batchSize, stage1.events.length)}...`);

      // Calculate progress for Stage 2 (35-70%)
      const stage2Progress = 35 + Math.floor((currentBatchNum / totalBatches) * 35);
      this.options.onProgress?.({
        stage: 'stage2',
        progress: stage2Progress,
        message: `이벤트 속성 생성 중 (${currentBatchNum}/${totalBatches} 배치)...`,
        detail: `처리 중: ${batch.map(e => e.eventName).join(', ')}`
      });

      // Retry logic for handling truncated responses
      let parsed: any = null;
      let retryCount = 0;
      const maxRetries = 2;
      let currentBatch = batch;

      while (!parsed && retryCount <= maxRetries) {
        try {
          const eventListJson = JSON.stringify(currentBatch, null, 2);
          const prompt = this.stage2Prompt
            .replace(/\{industry\}/g, request.industry)
            .replace(/\{scenario\}/g, request.scenario)
            .replace(/\{notes\}/g, request.notes)
            .replace(/\{eventList\}/g, eventListJson);

          const responseText = await this.callAI(prompt);
          parsed = this.parseJSON(responseText);

          if (parsed.eventProperties && Array.isArray(parsed.eventProperties)) {
            allProperties.push(...parsed.eventProperties);
          }
        } catch (error) {
          retryCount++;
          console.log(`  ⚠️  Parse failed for batch, retry ${retryCount}/${maxRetries}`);

          // If batch has more than 1 event and we can retry, split it smaller
          if (currentBatch.length > 1 && retryCount <= maxRetries) {
            console.log(`  📉 Reducing batch size from ${currentBatch.length} to ${Math.ceil(currentBatch.length / 2)}`);
            currentBatch = currentBatch.slice(0, Math.ceil(currentBatch.length / 2));
            parsed = null; // Reset to retry with smaller batch
          } else {
            // Can't split further or out of retries, log and skip
            console.error(`  ❌ Failed to process batch after ${retryCount} retries:`, error);
            break;
          }
        }
      }

      // Add delay between batches to avoid rate limit (8000 tokens/min)
      // Wait 8 seconds between batches
      if (i + batchSize < stage1.events.length) {
        await new Promise(resolve => setTimeout(resolve, 8000));
      }
    }

    return {
      eventProperties: allProperties
    };
  }

  /**
   * Stage 3: User Data
   */
  private async runStage3(
    request: ExcelGenerationRequest,
    stage1: Stage1Output,
    stage2: Stage2Output
  ): Promise<Stage3Output> {
    // Create event summary for stage 3
    const eventSummary = {
      events: stage1.events,
      totalProperties: stage2.eventProperties.length
    };
    const eventSummaryJson = JSON.stringify(eventSummary, null, 2);

    const prompt = this.stage3Prompt
      .replace(/\{industry\}/g, request.industry)
      .replace(/\{scenario\}/g, request.scenario)
      .replace(/\{notes\}/g, request.notes)
      .replace(/\{eventSummary\}/g, eventSummaryJson);

    const responseText = await this.callAI(prompt);
    const parsed = this.parseJSON(responseText);

    return {
      userData: parsed.userData || []
    };
  }

  /**
   * Call AI API (Anthropic or OpenAI)
   */
  private async callAI(prompt: string): Promise<string> {
    const provider = this.options.provider || 'anthropic';

    if (provider === 'openai' && this.openai) {
      const completion = await this.openai.chat.completions.create({
        model: this.options.model || 'gpt-4o',
        temperature: 0.7,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: '당신은 이벤트 트래킹 텍소노미 설계 전문가입니다. 반드시 JSON 형식으로만 응답하세요.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      });
      return completion.choices[0].message.content || '{}';
    }

    if (provider === 'anthropic' && this.anthropic) {
      const message = await this.anthropic.messages.create({
        model: this.options.model || 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = message.content[0];
      if (content && content.type === 'text') {
        return content.text;
      }
      return '{}';
    }

    throw new Error(`Provider ${provider} is not available`);
  }

  /**
   * Parse AI response and extract JSON
   */
  private parseJSON(responseText: string): any {
    let jsonText = responseText.trim();

    // Try to extract JSON from markdown code blocks
    const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1].trim();
    } else {
      // No code blocks, remove them if they exist
      jsonText = jsonText.replace(/^```(?:json)?\s*/i, '');
      jsonText = jsonText.replace(/\s*```\s*$/i, '');
      jsonText = jsonText.trim();
    }

    // If text doesn't start with { or [, try to find first { or [
    if (!jsonText.startsWith('{') && !jsonText.startsWith('[')) {
      const jsonStart = Math.max(
        jsonText.indexOf('{') !== -1 ? jsonText.indexOf('{') : Infinity,
        jsonText.indexOf('[') !== -1 ? jsonText.indexOf('[') : Infinity
      );

      if (jsonStart !== Infinity && jsonStart !== -1) {
        jsonText = jsonText.substring(jsonStart);
      }
    }

    try {
      return JSON.parse(jsonText);
    } catch (error) {
      // Log first 500 chars for debugging
      console.error('Failed to parse JSON. First 500 chars:', jsonText.substring(0, 500));
      throw new Error(`Failed to parse JSON response: ${(error as Error).message}`);
    }
  }

  /**
   * Combine all stage outputs into final taxonomy
   */
  private combineStagesToTaxonomy(
    stage1: Stage1Output,
    stage2: Stage2Output,
    stage3: Stage3Output
  ): TaxonomyData {
    // Combine event skeleton with properties
    const eventData: EventDataRow[] = [];

    stage1.events.forEach((event: EventSkeleton) => {
      const eventProps = stage2.eventProperties.filter(
        (prop) => prop.eventName === event.eventName
      );

      if (eventProps.length === 0) {
        // Event without properties (shouldn't happen, but handle it)
        console.warn(`⚠️  Event ${event.eventName} has no properties`);
      } else {
        eventProps.forEach((prop) => {
          eventData.push({
            eventName: event.eventName,
            eventAlias: event.eventAlias,
            eventDescription: event.eventDescription,
            eventTag: event.eventTag,
            propertyName: prop.propertyName,
            propertyAlias: prop.propertyAlias,
            propertyType: prop.propertyType,
            propertyDescription: prop.propertyDescription
          });
        });
      }
    });

    return {
      userIdSystem: stage1.userIdSystem,
      eventData,
      commonProperties: stage1.commonProperties,
      userData: stage3.userData
    };
  }

  /**
   * Fallback taxonomy when AI is not available
   */
  private buildFallback(request: ExcelGenerationRequest): TaxonomyData {
    const industrySlug = request.industry.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const isGame = /게임|game/i.test(request.industry);
    const idSystemType = isGame ? '단일 계정 단일 캐릭터' : '단일 계정 단일 프로필';

    return {
      userIdSystem: [
        {
          type: idSystemType,
          propertyName: '#account_id',
          propertyAlias: '계정 ID',
          description: isGame ? '플레이어의 계정 ID로 설정합니다' : '사용자의 계정 ID로 설정합니다',
          valueDescription: 'UUID 형식, 로그인 시 발급'
        },
        {
          type: idSystemType,
          propertyName: '#distinct_id',
          propertyAlias: '게스트 ID',
          description: '디바이스 관련 ID 또는 서비스 내 게스트 ID를 사용하며, 클라이언트 SDK를 사용하는 경우',
          valueDescription: 'SDK 자동 수집'
        }
      ],
      eventData: [
        {
          eventName: `${industrySlug}_app_launch`,
          eventAlias: '앱 실행',
          eventDescription: '사용자가 앱을 실행했을 때',
          eventTag: '시스템',
          propertyName: 'launch_source',
          propertyAlias: '실행 소스',
          propertyType: 'string',
          propertyDescription: '앱 실행 경로 (organic, push, deeplink)'
        }
      ],
      commonProperties: [
        {
          propertyName: 'session_id',
          propertyAlias: '세션 ID',
          propertyType: 'string',
          description: '현재 세션의 고유 식별자'
        }
      ],
      userData: [
        {
          propertyName: 'signup_date',
          propertyAlias: '가입일',
          propertyType: 'time',
          updateMethod: 'usersetonce',
          description: '최초 가입 날짜',
          tag: '프로필'
        },
        {
          propertyName: 'last_login_date',
          propertyAlias: '마지막 로그인일',
          propertyType: 'time',
          updateMethod: 'userset',
          description: '가장 최근 로그인 날짜',
          tag: '활동'
        }
      ]
    };
  }
}
