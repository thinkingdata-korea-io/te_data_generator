import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import {
  ExcelGenerationRequest,
  TaxonomyEvent,
  TaxonomyFunnel,
  TaxonomyPlan,
  TaxonomyProperty,
  TaxonomySegment
} from './types';

export interface ReferenceDocument {
  name: string;
  content: string;
}

export interface TaxonomyBuilderOptions {
  provider?: 'anthropic' | 'openai';
  apiKey?: string;
  model?: string;
  referenceDocs?: ReferenceDocument[];
}

/**
 * Excel 트래킹 정책 생성을 위한 AI/템플릿 빌더
 */
export class TaxonomyBuilder {
  private options: TaxonomyBuilderOptions;
  private anthropic?: Anthropic;
  private openai?: OpenAI;
  private strategy: 'ai' | 'fallback' = 'fallback';
  private referenceDocs: ReferenceDocument[];

  constructor(options: TaxonomyBuilderOptions) {
    this.options = {
      provider: options.provider || 'anthropic',
      apiKey: options.apiKey,
      model: options.model
    };

    if (this.options.provider === 'anthropic' && this.options.apiKey) {
      this.anthropic = new Anthropic({ apiKey: this.options.apiKey });
    }

    if (this.options.provider === 'openai' && this.options.apiKey) {
      this.openai = new OpenAI({ apiKey: this.options.apiKey });
    }

    this.referenceDocs = this.options.referenceDocs || [];
  }

  /**
   * 트래킹 정책 생성
   */
  async build(
    request: ExcelGenerationRequest,
    options?: { targetEventCount?: number }
  ): Promise<TaxonomyPlan> {
    const targetEventCount = this.normalizeTargetEventCount(options?.targetEventCount);

    if (!this.options.apiKey) {
      this.strategy = 'fallback';
      const fallbackPlan = this.buildFallback(request, targetEventCount);
      return this.adjustEventCount(fallbackPlan, request, targetEventCount, true);
    }

    try {
      this.strategy = 'ai';
      const plan = await this.buildWithAI(request, targetEventCount);
      if (plan.events.length === 0 || plan.properties.length === 0) {
        this.strategy = 'fallback';
        const fallbackPlan = this.buildFallback(request, targetEventCount);
        return this.adjustEventCount(fallbackPlan, request, targetEventCount, true);
      }
      return this.adjustEventCount(plan, request, targetEventCount, false);
    } catch (error) {
      console.warn('⚠️  AI taxonomy generation failed, using fallback:', (error as Error).message);
      this.strategy = 'fallback';
      const fallbackPlan = this.buildFallback(request, targetEventCount);
      return this.adjustEventCount(fallbackPlan, request, targetEventCount, true);
    }
  }

  get lastStrategy(): 'ai' | 'fallback' {
    return this.strategy;
  }

  /**
   * Anthropic/OpenAI를 사용한 트래킹 정책 생성
   */
  private async buildWithAI(
    request: ExcelGenerationRequest,
    targetEventCount: number
  ): Promise<TaxonomyPlan> {
    const prompt = this.buildPrompt(request, targetEventCount);
    const provider = this.options.provider || 'anthropic';
    let responseText = '';

    if (provider === 'openai') {
      if (!this.openai) {
        throw new Error('OpenAI client not initialized');
      }
      const completion = await this.openai.chat.completions.create({
        model: this.options.model || 'gpt-4o-mini',
        temperature: 0.6,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: '당신은 제품 데이터 분석 전문가입니다. 반드시 JSON 하나만 응답하세요.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      });
      responseText = completion.choices[0].message.content || '{}';
    } else {
      if (!this.anthropic) {
        throw new Error('Anthropic client not initialized');
      }
      const message = await this.anthropic.messages.create({
        model: this.options.model || 'claude-3-5-sonnet-20240620',
        max_tokens: 4096,
        temperature: 0.6,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });
      const content = message.content[0];
      if (content && content.type === 'text') {
        responseText = content.text;
      } else {
        responseText = '';
      }
    }

    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)```/i);
    const jsonText = jsonMatch ? jsonMatch[1] : responseText;
    const parsed = JSON.parse(jsonText);
    return this.normalizePlan(parsed);
  }

  /**
   * AI 프롬프트 구성
   */
  private buildPrompt(request: ExcelGenerationRequest, targetEventCount?: number): string {
    const dateRange = request.dateStart && request.dateEnd
      ? `${request.dateStart} ~ ${request.dateEnd}`
      : '입력되지 않음';
    const desiredEvents = targetEventCount ?? 12;
    const referenceSection = this.buildReferenceSection();

    return `
당신은 ${request.industry} 도메인의 시니어 제품 분석가입니다.
서비스 시나리오와 특징을 기반으로 **이벤트 트래킹 정책(텍소노미)**을 설계하세요.

- 시나리오: ${request.scenario}
- 서비스 특징: ${request.notes}
- 목표 DAU: ${request.dau || '입력되지 않음'}
- 수집 기간: ${dateRange}
- 목표 이벤트 수: 약 ${desiredEvents}개
${referenceSection}

규칙:
1. 약 ${desiredEvents}개의 핵심 이벤트를 정의하세요. (최소 6개, 최대 30개)
2. 각 이벤트마다 한국어 이름(event_name_kr)과 설명을 포함하세요.
3. 이벤트별 최소 3개의 속성을 정의하세요. (data_type: string|number|boolean|date 중 선택)
4. 전사 공통 속성이 필요한 경우 event_name 없이 정의하세요.
5. 최소 2개의 퍼널을 정의하고 steps는 이벤트 이름 배열로 작성하세요.
6. 4개의 사용자 세그먼트를 정의하고 ratio(0~1) 및 행동 설명을 붙여주세요.
7. JSON만 출력하세요.

응답 JSON 스키마:
{
  "events": [
    {
      "event_name": "string_snake_case",
      "event_name_kr": "한국어 이름",
      "description": "비즈니스 맥락 설명",
      "category": "system|lifecycle|transaction|engagement|retention",
      "stage": "new_user|active|returning",
      "tags": ["예: onboarding", "purchase"]
    }
  ],
  "properties": [
    {
      "event_name": "event_name (생략 시 공통 속성)",
      "property_name": "snake_case",
      "property_name_kr": "한국어 이름",
      "data_type": "string|number|boolean|date",
      "description": "수집 목적",
      "required": true,
      "example": "예시 값",
      "allowed_values": ["선택 값"]
    }
  ],
  "funnels": [
    {
      "name": "퍼널 이름",
      "description": "목표 설명",
      "steps": ["event_a", "event_b", "event_c"],
      "conversion_rate": 0.35
    }
  ],
  "segments": [
    { "name": "segment_name", "ratio": 0.25, "notes": "행동 특성" }
  ],
  "insights": ["권장 모니터링 지표", "추가 메모"]
}
`;
  }

  private buildReferenceSection(): string {
    if (!this.referenceDocs.length) {
      return '';
    }

    const summaries = this.referenceDocs
      .slice(0, 3)
      .map(doc => {
        const snippet = truncate(doc.content, 600);
        return `### ${doc.name}\n${snippet}`;
      })
      .join('\n\n');

    return `\n## 참고 문서\n${summaries}\n`;
  }

  /**
   * AI 응답을 내부 형식으로 정규화
   */
  private normalizePlan(payload: any): TaxonomyPlan {
    const events: TaxonomyEvent[] = Array.isArray(payload?.events)
      ? payload.events
        .map((event: any) => ({
          event_name: sanitizeIdentifier(event.event_name),
          event_name_kr: sanitizeText(event.event_name_kr || event.event_name),
          description: sanitizeText(event.description),
          category: sanitizeText(event.category || 'interaction'),
          stage: sanitizeText(event.stage),
          tags: Array.isArray(event.tags) ? event.tags.map((tag: any) => sanitizeText(tag)).filter(Boolean) : undefined
        }))
        .filter((event: TaxonomyEvent) => !!event.event_name)
      : [];

    const properties: TaxonomyProperty[] = Array.isArray(payload?.properties)
      ? payload.properties
        .map((prop: any) => ({
          event_name: prop.event_name ? sanitizeIdentifier(prop.event_name) : undefined,
          property_name: sanitizeIdentifier(prop.property_name),
          property_name_kr: sanitizeText(prop.property_name_kr || prop.property_name),
          data_type: normalizeType(prop.data_type),
          description: sanitizeText(prop.description),
          required: Boolean(prop.required),
          example: prop.example !== undefined ? String(prop.example) : undefined,
          allowed_values: Array.isArray(prop.allowed_values)
            ? prop.allowed_values.map((value: any) => String(value)).filter(Boolean)
            : undefined
        }))
        .filter((prop: TaxonomyProperty) => !!prop.property_name)
      : [];

    const funnels: TaxonomyFunnel[] = Array.isArray(payload?.funnels)
      ? payload.funnels
        .map((funnel: any) => ({
          name: sanitizeText(funnel.name) || 'activation_funnel',
          description: sanitizeText(funnel.description),
          steps: Array.isArray(funnel.steps)
            ? funnel.steps.map((step: any) => sanitizeIdentifier(step)).filter(Boolean)
            : [],
          conversion_rate: typeof funnel.conversion_rate === 'number'
            ? clamp(funnel.conversion_rate, 0, 1)
            : undefined
        }))
        .filter((funnel: TaxonomyFunnel) => funnel.steps.length > 1)
      : [];

    const segments: TaxonomySegment[] = Array.isArray(payload?.segments)
      ? payload.segments
        .map((segment: any) => ({
          name: sanitizeText(segment.name) || 'segment',
          ratio: typeof segment.ratio === 'number' ? clamp(segment.ratio, 0, 1) : undefined,
          notes: sanitizeText(segment.notes)
        }))
        .filter((segment: TaxonomySegment) => !!segment.name)
      : [];

    return {
      events: events.slice(0, 40),
      properties,
      funnels,
      segments,
      insights: Array.isArray(payload?.insights)
        ? payload.insights.map((insight: any) => sanitizeText(insight)).filter(Boolean)
        : undefined
    };
  }

  private adjustEventCount(
    plan: TaxonomyPlan,
    request: ExcelGenerationRequest,
    targetEventCount: number,
    allowFallbackFill: boolean
  ): TaxonomyPlan {
    let events = [...(plan.events || [])];

    if (targetEventCount && events.length > targetEventCount) {
      events = events.slice(0, targetEventCount);
    }

    const keep = new Set(events.map(event => event.event_name));
    let properties = (plan.properties || []).filter(
      prop => !prop.event_name || keep.has(prop.event_name)
    );
    let funnels = (plan.funnels || [])
      .map(funnel => ({
        ...funnel,
        steps: funnel.steps.filter(step => keep.has(step))
      }))
      .filter(funnel => funnel.steps.length >= 2);

    if (!allowFallbackFill || !targetEventCount || events.length >= targetEventCount) {
      return {
        ...plan,
        events,
        properties,
        funnels
      };
    }

    const fallbackPlan = this.buildFallback(request, targetEventCount);
    const existingNames = new Set(events.map(event => event.event_name));

    for (const fallbackEvent of fallbackPlan.events) {
      if (events.length >= targetEventCount) break;
      if (existingNames.has(fallbackEvent.event_name)) continue;

      events.push(fallbackEvent);
      existingNames.add(fallbackEvent.event_name);

      const fallbackProps = fallbackPlan.properties.filter(
        prop => prop.event_name === fallbackEvent.event_name
      );
      properties = properties.concat(fallbackProps);
    }

    if (funnels.length === 0 && fallbackPlan.funnels.length > 0) {
      funnels = funnels.concat(fallbackPlan.funnels.slice(0, 2));
    }

    return {
      ...plan,
      events,
      properties,
      funnels
    };
  }

  /**
   * API 키가 없거나 실패 시 사용하는 기본 템플릿
   */
  private buildFallback(request: ExcelGenerationRequest, targetEventCount: number): TaxonomyPlan {
    const prefix = slugify(request.industry || 'service');
    const featureKeyword = deriveFeatureKeyword(request.notes);
    const keywords = extractKeywords(`${request.scenario} ${request.notes}`, 8);

    const eventBlueprints = getFallbackEventBlueprints({
      industry: request.industry,
      featureKeyword,
      desiredCount: targetEventCount,
      scenario: request.scenario,
      notes: request.notes,
      keywords
    });
    const limitedBlueprints = targetEventCount
      ? eventBlueprints.slice(0, targetEventCount)
      : eventBlueprints;
    const events: TaxonomyEvent[] = limitedBlueprints.map(blueprint => ({
      event_name: `${prefix}_${blueprint.name}`,
      event_name_kr: blueprint.nameKr,
      description: blueprint.description.replace('{industry}', request.industry),
      category: blueprint.category,
      stage: blueprint.stage,
      tags: blueprint.tags
    }));

    const properties: TaxonomyProperty[] = [];
    limitedBlueprints.forEach((blueprint, index) => {
      const event = events[index];
      blueprint.properties.forEach(prop => {
        properties.push({
          event_name: event.event_name,
          property_name: prop.name,
          property_name_kr: prop.nameKr,
          data_type: prop.type,
          description: prop.description,
          required: prop.required,
          example: prop.example,
          allowed_values: prop.allowedValues
        });
      });
    });

    const globalProperties: TaxonomyProperty[] = [
      {
        property_name: 'platform',
        property_name_kr: '플랫폼',
        data_type: 'string',
        description: 'ios / android / web',
        allowed_values: ['ios', 'android', 'web'],
        required: true
      },
      {
        property_name: 'market',
        property_name_kr: '유입 국가',
        data_type: 'string',
        description: '주요 국가 코드',
        example: 'KR'
      },
      {
        property_name: 'campaign_code',
        property_name_kr: '캠페인 코드',
        data_type: 'string',
        description: '설치/리인게이지먼트 캠페인 구분'
      }
    ];

    const funnels: TaxonomyFunnel[] = [
      {
        name: `${prefix}_activation`,
        description: '신규 사용자 온보딩 성공률',
        steps: [
          `${prefix}_app_launch`,
          `${prefix}_onboarding_view`,
          `${prefix}_onboarding_complete`,
          `${prefix}_core_feature_entry`
        ],
        conversion_rate: 0.62
      },
      {
        name: `${prefix}_conversion`,
        description: '핵심 액션 이후 결제 전환',
        steps: [
          `${prefix}_core_feature_entry`,
          `${prefix}_core_feature_complete`,
          `${prefix}_checkout_start`,
          `${prefix}_payment_complete`
        ],
        conversion_rate: 0.27
      }
    ];

    const segments: TaxonomySegment[] = [
      { name: 'core', ratio: 0.22, notes: '주간 5회 이상 핵심 기능 이용' },
      { name: 'growth', ratio: 0.18, notes: '온보딩 완료 후 전환 대기' },
      { name: 'casual', ratio: 0.42, notes: '콘텐츠 소비 중심 경량 사용자' },
      { name: 'at_risk', ratio: 0.18, notes: '7일 이상 핵심 기능 미사용' }
    ];

    return {
      events,
      properties: [...properties, ...globalProperties],
      funnels,
      segments,
      insights: [
        `시나리오 요약: ${truncate(request.scenario, 120)}`,
        `서비스 특징: ${truncate(request.notes, 120)}`
      ]
    };
  }

  private normalizeTargetEventCount(value?: number): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return 12;
    }
    return Math.max(6, Math.min(100, Math.round(value)));
  }
}

function sanitizeIdentifier(value: any): string {
  if (!value) return '';
  const normalized = String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized || '';
}

function sanitizeText(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function normalizeType(value: any): string {
  const raw = String(value || '').toLowerCase();
  if (['int', 'integer', 'float', 'double', 'decimal', 'number'].includes(raw)) {
    return 'number';
  }
  if (['bool', 'boolean'].includes(raw)) {
    return 'boolean';
  }
  if (['date', 'datetime', 'timestamp'].includes(raw)) {
    return 'date';
  }
  return 'string';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function slugify(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized || 'service';
}

function truncate(value: string, length: number): string {
  if (value.length <= length) return value;
  return `${value.slice(0, length - 3)}...`;
}

function deriveFeatureKeyword(notes: string): string {
  const tokens = notes
    .split(/[\s,/|]+/)
    .map(token => token.trim())
    .filter(token => token.length >= 3);
  return tokens[0]?.toLowerCase() || 'feature';
}

function extractKeywords(text: string, limit = 5): string[] {
  const stopwords = new Set([
    '', 'the', 'and', 'with', 'for', 'from', 'into', 'about', 'into', 'using',
    '서비스', '사용자', '시나리오', '기능', '및', '으로', '에서', '그리고', '또한', '관련', '요청', '데이터', '정보'
  ]);

  const tokens = text
    .toLowerCase()
    .split(/[^0-9a-zA-Z가-힣]+/)
    .map(token => token.trim())
    .filter(token => token.length >= 2 && !stopwords.has(token));

  const frequency = new Map<string, number>();
  for (const token of tokens) {
    frequency.set(token, (frequency.get(token) || 0) + 1);
  }

  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([token]) => token);
}

interface EventBlueprint {
  name: string;
  nameKr: string;
  category: string;
  description: string;
  stage?: string;
  tags?: string[];
  properties: Array<{
    name: string;
    nameKr: string;
    type: string;
    description: string;
    required?: boolean;
    example?: string;
    allowedValues?: string[];
  }>;
}

interface FallbackContext {
  industry: string;
  featureKeyword: string;
  desiredCount: number;
  scenario: string;
  notes: string;
  keywords: string[];
}

function getFallbackEventBlueprints(context: FallbackContext): EventBlueprint[] {
  const { industry, featureKeyword, desiredCount, keywords } = context;
  const normalizedKeyword = slugify(featureKeyword || industry || 'service');
  const accentKeyword = keywords[0] || featureKeyword || industry;
  const blueprints: EventBlueprint[] = [
    {
      name: `${normalizedKeyword}_app_launch`,
      nameKr: `${industry} 앱 실행`,
      category: 'lifecycle',
      description: `사용자가 ${industry} 서비스를 실행하여 첫 세션을 시작`,
      stage: 'new_user',
      tags: ['session', 'activation'],
      properties: [
        { name: 'app_version', nameKr: '앱 버전', type: 'string', description: '사용 중인 앱 버전', required: true, example: '2.3.1' },
        { name: 'device_type', nameKr: '디바이스 유형', type: 'string', description: 'mobile / tablet / desktop', allowedValues: ['mobile', 'tablet', 'desktop'] },
        { name: 'entry_channel', nameKr: '유입 채널', type: 'string', description: 'Organic, Push, 광고 등 진입 채널' }
      ]
    },
    {
      name: `${normalizedKeyword}_onboarding_view`,
      nameKr: '온보딩 화면 노출',
      category: 'engagement',
      description: `${industry} 온보딩/튜토리얼 화면 진입`,
      stage: 'new_user',
      tags: ['onboarding'],
      properties: [
        { name: 'step_index', nameKr: '단계 번호', type: 'number', description: '현재 온보딩 단계', example: '2' },
        { name: 'skip_available', nameKr: '건너뛰기 가능 여부', type: 'boolean', description: '건너뛰기 버튼 제공 여부' },
        { name: 'persona', nameKr: '타겟 페르소나', type: 'string', description: '세그먼트/페르소나 태그' }
      ]
    },
    {
      name: `${normalizedKeyword}_onboarding_complete`,
      nameKr: '온보딩 완료',
      category: 'engagement',
      description: `${industry} 온보딩 주요 절차 완료`,
      stage: 'new_user',
      tags: ['onboarding'],
      properties: [
        { name: 'completion_time', nameKr: '완료 소요 시간(초)', type: 'number', description: '온보딩 시작~완료까지 시간', example: '145' },
        { name: 'skipped_steps', nameKr: '건너뛴 단계 수', type: 'number', description: '사용자가 건너뛴 단계 개수' },
        { name: 'tutorial_variant', nameKr: '튜토리얼 버전', type: 'string', description: '실험/버전 정보' }
      ]
    },
    {
      name: `${normalizedKeyword}_core_feature_entry`,
      nameKr: `핵심 기능 진입 (${accentKeyword})`,
      category: 'interaction',
      description: `사용자가 ${accentKeyword} 관련 핵심 기능에 진입`,
      stage: 'active',
      tags: ['core', accentKeyword],
      properties: [
        { name: 'entry_source', nameKr: '진입 경로', type: 'string', description: '홈, 추천, 푸시 등' },
        { name: 'experience_variant', nameKr: '실험 그룹', type: 'string', description: '실험/테스트 그룹 정보', example: 'variant_b' },
        { name: 'session_goal', nameKr: '세션 목표', type: 'string', description: '세션에서 달성하려는 목적' }
      ]
    },
    {
      name: `${normalizedKeyword}_core_feature_complete`,
      nameKr: `핵심 기능 완료 (${accentKeyword})`,
      category: 'interaction',
      description: `${accentKeyword} 관련 핵심 기능 수행 완료`,
      stage: 'active',
      tags: ['core', accentKeyword],
      properties: [
        { name: 'duration_ms', nameKr: '체류 시간(ms)', type: 'number', description: '기능 시작~완료까지 시간', example: '52000' },
        { name: 'success', nameKr: '성공 여부', type: 'boolean', description: '목표 달성 성공 여부' },
        { name: 'output_value', nameKr: '결과 값', type: 'number', description: '핵심 지표/점수' }
      ]
    },
    {
      name: `${normalizedKeyword}_content_share`,
      nameKr: '콘텐츠 공유',
      category: 'engagement',
      description: `${industry} 결과/콘텐츠를 외부에 공유`,
      stage: 'active',
      tags: ['social'],
      properties: [
        { name: 'share_channel', nameKr: '공유 채널', type: 'string', description: 'kakao / link / instagram 등', example: 'kakao' },
        { name: 'content_type', nameKr: '콘텐츠 유형', type: 'string', description: '랭킹, 제품, 후기 등' },
        { name: 'audience_size', nameKr: '노출 예상 수', type: 'number', description: '공유 대상 예상 규모' }
      ]
    },
    {
      name: `${normalizedKeyword}_detail_view`,
      nameKr: '상품/콘텐츠 상세 조회',
      category: 'transaction',
      description: '유료 전환과 연결되는 상세 페이지 진입',
      stage: 'active',
      tags: ['monetization'],
      properties: [
        { name: 'item_id', nameKr: '아이템 ID', type: 'string', description: '상품/콘텐츠 ID', required: true, example: 'ITEM-3488' },
        { name: 'price', nameKr: '가격', type: 'number', description: '표시 가격', example: '9900' },
        { name: 'recommendation_reason', nameKr: '추천 사유', type: 'string', description: '추천/큐레이션 근거' }
      ]
    },
    {
      name: `${normalizedKeyword}_checkout_start`,
      nameKr: '결제 시작',
      category: 'transaction',
      description: '결제 플로우 진입',
      stage: 'active',
      tags: ['checkout'],
      properties: [
        { name: 'order_id', nameKr: '주문 ID', type: 'string', description: '임시 주문 ID', example: 'ORD-90321' },
        { name: 'payment_method', nameKr: '결제 수단', type: 'string', description: 'card / in-app / toss 등' },
        { name: 'coupon_applied', nameKr: '쿠폰 적용 여부', type: 'boolean', description: '프로모션 코드 사용 여부' }
      ]
    },
    {
      name: `${normalizedKeyword}_payment_complete`,
      nameKr: '결제 완료',
      category: 'transaction',
      description: '결제가 성공적으로 완료',
      stage: 'active',
      tags: ['checkout'],
      properties: [
        { name: 'order_id', nameKr: '주문 ID', type: 'string', description: '완료된 주문 ID' },
        { name: 'amount', nameKr: '결제 금액', type: 'number', description: '실제 결제 금액', example: '19900' },
        { name: 'currency', nameKr: '통화', type: 'string', description: 'ISO 통화 코드', example: 'KRW' },
        { name: 'purchase_type', nameKr: '구매 유형', type: 'string', description: '구독/단건/가상재화 등' }
      ]
    },
    {
      name: `${normalizedKeyword}_retention_return`,
      nameKr: '리텐션 복귀',
      category: 'retention',
      description: '장기 미활성 사용자가 다시 방문',
      stage: 'returning',
      tags: ['retention'],
      properties: [
        { name: 'days_inactive', nameKr: '비활성 일수', type: 'number', description: '마지막 활동 이후 일수', example: '12' },
        { name: 'reengage_channel', nameKr: '재참여 채널', type: 'string', description: '푸시, 이메일, 캠페인 등' },
        { name: 'reward_type', nameKr: '복귀 보상', type: 'string', description: '복귀 유도 보상 종류' }
      ]
    }
  ];

  while (blueprints.length < Math.max(desiredCount, baseMinimumCount())) {
    const index = blueprints.length + 1;
    const keyword = keywords[(index - 1) % Math.max(1, keywords.length)] || featureKeyword || industry;
    blueprints.push(createKeywordDrivenBlueprint(keyword, index, industry));
  }

  return blueprints;
}

function createKeywordDrivenBlueprint(keyword: string, index: number, industry: string): EventBlueprint {
  const categories: Array<{ category: string; stage: string; tag: string }> = [
    { category: 'interaction', stage: 'active', tag: 'behavior' },
    { category: 'engagement', stage: 'active', tag: 'engagement' },
    { category: 'transaction', stage: 'active', tag: 'revenue' },
    { category: 'retention', stage: 'returning', tag: 'retention' }
  ];
  const cycle = categories[(index - 1) % categories.length];
  const slug = slugify(keyword || `feature_${index}`);
  const suffix = index.toString().padStart(2, '0');

  return {
    name: `${slug}_${suffix}`,
    nameKr: `${keyword || industry} 행동 ${suffix}`,
    category: cycle.category,
    description: `${industry} 서비스에서 ${keyword || '핵심 기능'} 관련 세부 행동`,
    stage: cycle.stage as any,
    tags: [keyword || industry, cycle.tag],
    properties: [
      {
        name: `${slug}_intensity`,
        nameKr: `${keyword} 집중도`,
        type: 'number',
        description: `${keyword} 활동의 강도/점수`,
        example: '75'
      },
      {
        name: `${slug}_context`,
        nameKr: `${keyword} 컨텍스트`,
        type: 'string',
        description: `${keyword} 행동이 발생한 상황/화면 정보`
      },
      {
        name: 'session_momentum',
        nameKr: '세션 모멘텀',
        type: 'number',
        description: '세션 내 사용자 몰입도',
        example: '0.82'
      }
    ]
  };
}

function baseMinimumCount(): number {
  return 12;
}
