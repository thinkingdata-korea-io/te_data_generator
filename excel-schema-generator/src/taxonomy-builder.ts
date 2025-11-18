import * as fs from 'fs';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import {
  ExcelGenerationRequest,
  TaxonomyData,
  UserIdSystemRow,
  EventDataRow,
  CommonPropertyRow,
  UserDataRow
} from './types';

export interface TaxonomyBuilderOptions {
  provider?: 'anthropic' | 'openai';
  apiKey?: string;
  model?: string;
  promptPath?: string; // Path to taxonomy-generator-prompt.md
}

/**
 * AI를 사용하여 4-sheet taxonomy 생성
 */
export class TaxonomyBuilder {
  private options: TaxonomyBuilderOptions;
  private anthropic?: Anthropic;
  private openai?: OpenAI;
  private promptTemplate: string;

  constructor(options: TaxonomyBuilderOptions) {
    this.options = {
      provider: options.provider || 'anthropic',
      apiKey: options.apiKey,
      model: options.model,
      promptPath: options.promptPath
    };

    if (this.options.provider === 'anthropic' && this.options.apiKey) {
      this.anthropic = new Anthropic({ apiKey: this.options.apiKey });
    }

    if (this.options.provider === 'openai' && this.options.apiKey) {
      this.openai = new OpenAI({ apiKey: this.options.apiKey });
    }

    // Load prompt template
    this.promptTemplate = this.loadPromptTemplate();
  }

  /**
   * Load taxonomy-generator-prompt.md template
   */
  private loadPromptTemplate(): string {
    const defaultPath = path.join(__dirname, '../prompts/taxonomy-generator-prompt.md');
    const promptPath = this.options.promptPath || defaultPath;

    try {
      return fs.readFileSync(promptPath, 'utf-8');
    } catch (error) {
      console.warn(`⚠️  Failed to load prompt template from ${promptPath}, using minimal fallback`);
      return this.getFallbackPromptTemplate();
    }
  }

  /**
   * Minimal fallback prompt if template file is not found
   */
  private getFallbackPromptTemplate(): string {
    return `
제공된 서비스 정보를 바탕으로 이벤트 트래킹 텍소노미를 설계합니다.

## 서비스 정보
- 산업/카테고리: {industry}
- 서비스 시나리오: {scenario}
- 서비스 특징: {notes}

## 출력 형식
다음 JSON 형식으로 반환하세요:

\`\`\`json
{
  "userIdSystem": [
    {
      "type": "단일 계정 단일 프로필",
      "propertyName": "#account_id",
      "propertyAlias": "계정 ID",
      "description": "사용자의 계정 ID로 설정합니다",
      "valueDescription": "UUID 형식, 로그인 시 발급"
    },
    {
      "type": "단일 계정 단일 프로필",
      "propertyName": "#distinct_id",
      "propertyAlias": "게스트 ID",
      "description": "SDK 자동 수집",
      "valueDescription": "디바이스 기반 식별자"
    }
  ],
  "eventData": [
    {
      "eventName": "event_name",
      "eventAlias": "이벤트 별칭",
      "eventDescription": "이벤트 설명",
      "eventTag": "태그",
      "propertyName": "property_name",
      "propertyAlias": "속성 별칭",
      "propertyType": "string",
      "propertyDescription": "속성 설명"
    }
  ],
  "commonProperties": [
    {
      "propertyName": "platform",
      "propertyAlias": "플랫폼",
      "propertyType": "string",
      "description": "접속 플랫폼"
    }
  ],
  "userData": [
    {
      "propertyName": "user_level",
      "propertyAlias": "사용자 레벨",
      "propertyType": "number",
      "updateMethod": "userset",
      "description": "현재 레벨",
      "tag": "성장"
    }
  ]
}
\`\`\`
`;
  }

  /**
   * Generate taxonomy using AI
   */
  async build(request: ExcelGenerationRequest): Promise<TaxonomyData> {
    if (!this.options.apiKey) {
      console.warn('⚠️  No API key provided, using minimal fallback taxonomy');
      return this.buildFallback(request);
    }

    try {
      const prompt = this.buildPrompt(request);
      const responseText = await this.callAI(prompt);
      const taxonomy = this.parseResponse(responseText);
      return this.validateAndNormalize(taxonomy);
    } catch (error) {
      console.warn('⚠️  AI taxonomy generation failed, using fallback:', (error as Error).message);
      return this.buildFallback(request);
    }
  }

  /**
   * Build prompt by replacing placeholders
   */
  private buildPrompt(request: ExcelGenerationRequest): string {
    return this.promptTemplate
      .replace(/\{industry\}/g, request.industry)
      .replace(/\{scenario\}/g, request.scenario)
      .replace(/\{notes\}/g, request.notes);
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
  private parseResponse(responseText: string): any {
    // Try to extract JSON from markdown code block
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)```/i);
    const jsonText = jsonMatch ? jsonMatch[1] : responseText;

    try {
      return JSON.parse(jsonText);
    } catch (error) {
      throw new Error(`Failed to parse JSON response: ${(error as Error).message}`);
    }
  }

  /**
   * Validate and normalize taxonomy data
   */
  private validateAndNormalize(data: any): TaxonomyData {
    return {
      userIdSystem: this.normalizeUserIdSystem(data.userIdSystem),
      eventData: this.normalizeEventData(data.eventData),
      commonProperties: this.normalizeCommonProperties(data.commonProperties),
      userData: this.normalizeUserData(data.userData)
    };
  }

  private normalizeUserIdSystem(rows: any[]): UserIdSystemRow[] {
    if (!Array.isArray(rows)) return [];
    return rows.map(row => ({
      type: String(row.type || ''),
      propertyName: String(row.propertyName || ''),
      propertyAlias: String(row.propertyAlias || ''),
      description: String(row.description || ''),
      valueDescription: String(row.valueDescription || '')
    })).filter(row => row.type && row.propertyName);
  }

  private normalizeEventData(rows: any[]): EventDataRow[] {
    if (!Array.isArray(rows)) return [];
    return rows.map(row => ({
      eventName: String(row.eventName || ''),
      eventAlias: String(row.eventAlias || ''),
      eventDescription: String(row.eventDescription || ''),
      eventTag: String(row.eventTag || ''),
      propertyName: String(row.propertyName || ''),
      propertyAlias: String(row.propertyAlias || ''),
      propertyType: this.normalizePropertyType(row.propertyType),
      propertyDescription: String(row.propertyDescription || '')
    })).filter(row => row.eventName && row.propertyName);
  }

  private normalizeCommonProperties(rows: any[]): CommonPropertyRow[] {
    if (!Array.isArray(rows)) return [];
    return rows.map(row => ({
      propertyName: String(row.propertyName || ''),
      propertyAlias: String(row.propertyAlias || ''),
      propertyType: this.normalizePropertyType(row.propertyType),
      description: String(row.description || '')
    })).filter(row => row.propertyName);
  }

  private normalizeUserData(rows: any[]): UserDataRow[] {
    if (!Array.isArray(rows)) return [];
    return rows.map(row => ({
      propertyName: String(row.propertyName || ''),
      propertyAlias: String(row.propertyAlias || ''),
      propertyType: this.normalizePropertyType(row.propertyType),
      updateMethod: this.normalizeUpdateMethod(row.updateMethod),
      description: String(row.description || ''),
      tag: String(row.tag || '')
    })).filter(row => row.propertyName);
  }

  private normalizePropertyType(type: any): any {
    const validTypes = ['string', 'number', 'boolean', 'time', 'list', 'object', 'object group'];
    const normalized = String(type || 'string').toLowerCase();
    return validTypes.includes(normalized) ? normalized : 'string';
  }

  private normalizeUpdateMethod(method: any): any {
    const validMethods = ['userset', 'usersetonce', 'useradd', 'userunset', 'userappend', 'useruniqappend'];
    const normalized = String(method || 'userset').toLowerCase();
    return validMethods.includes(normalized) ? normalized : 'userset';
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
          propertyName: 'app_version',
          propertyAlias: '앱 버전',
          propertyType: 'string',
          propertyDescription: '현재 사용 중인 앱 버전'
        },
        {
          eventName: `${industrySlug}_app_launch`,
          eventAlias: '앱 실행',
          eventDescription: '사용자가 앱을 실행했을 때',
          eventTag: '시스템',
          propertyName: 'platform',
          propertyAlias: '플랫폼',
          propertyType: 'string',
          propertyDescription: '접속 플랫폼 (iOS, Android, Web)'
        }
      ],
      commonProperties: [
        {
          propertyName: 'platform',
          propertyAlias: '플랫폼',
          propertyType: 'string',
          description: '접속 플랫폼 (iOS, Android, Web)'
        },
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
