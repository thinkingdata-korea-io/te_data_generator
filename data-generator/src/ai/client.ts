import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { ParsedSchema, AIAnalysisResult } from '../types';

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
   */
  async analyzeSchema(
    schema: ParsedSchema,
    userInput: UserInput
  ): Promise<AIAnalysisResult> {
    const prompt = this.buildPrompt(schema, userInput);

    let response: string;
    if (this.config.provider === 'openai') {
      response = await this.callOpenAI(prompt);
    } else {
      response = await this.callAnthropic(prompt);
    }

    return this.parseAIResponse(response);
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
   */
  private async callAnthropic(prompt: string): Promise<string> {
    if (!this.anthropic) {
      throw new Error('Anthropic client not initialized');
    }

    const model = this.config.model || 'claude-sonnet-4-20250514';
    const message = await this.anthropic.messages.create({
      model,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = message.content[0];
    if (content.type === 'text') {
      return content.text;
    }

    return '{}';
  }

  /**
   * AI 응답 파싱
   */
  private parseAIResponse(response: string): AIAnalysisResult {
    // JSON 블록 추출 (```json ... ``` 형식)
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1] : response;

    try {
      const parsed = JSON.parse(jsonText);
      return parsed as AIAnalysisResult;
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      console.error('Response:', response);
      throw new Error('Invalid AI response format');
    }
  }
}
