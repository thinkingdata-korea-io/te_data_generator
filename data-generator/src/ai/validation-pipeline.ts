import { AIClient, UserInput } from './client';
import { ParsedSchema, RetentionCurve, EventSequencing } from '../types';
import {
  buildRetentionValidationPrompt,
  buildRetentionFixerPrompt,
  buildEventSequencingValidationPrompt,
  buildEventSequencingFixerPrompt
} from './prompts';
import {
  validateRetentionWithRules,
  validateEventSequencingWithRules
} from './rule-validators';

interface ValidationResult {
  valid: boolean;
  recommendation: 'accept' | 'revise';
  issues: Array<{
    field: string;
    severity: 'critical' | 'warning';
    message: string;
  }>;
}

interface ValidationSummary {
  passed: boolean;
  ruleBasedPassed: boolean;
  aiValidationUsed: boolean;
  fixAttempts: number;
  errors: string[];
  warnings: string[];
}

/**
 * Provider별 기본 검증 모델 매핑 (사용자가 설정에서 변경 가능)
 */
export const DEFAULT_VALIDATION_MODELS: Record<string, Record<string, string>> = {
  anthropic: {
    fast: 'claude-haiku-4-5',           // Claude Haiku 4.5 (가장 저렴, 빠름)
    balanced: 'claude-sonnet-4-5',      // Claude Sonnet 4.5 (균형)
  },
  openai: {
    fast: 'gpt-4o-mini',                // GPT-4o Mini (저렴)
    balanced: 'gpt-4o',                 // GPT-4o (균형)
  },
  google: {
    fast: 'gemini-2.5-flash',           // Gemini 2.5 Flash (저렴, 빠름)
    balanced: 'gemini-2.5-pro',         // Gemini 2.5 Pro (균형)
  }
};

export class ValidationPipeline {
  private aiClient: AIClient;
  private validatorModel: string;
  private fixerModel: string;

  constructor(
    aiClient: AIClient,
    validationModelTier: 'fast' | 'balanced' = 'fast',
    customValidationModel?: string  // 사용자 지정 모델 (선택사항)
  ) {
    this.aiClient = aiClient;

    if (customValidationModel) {
      // 사용자가 직접 지정한 모델 사용
      this.validatorModel = customValidationModel;
      this.fixerModel = customValidationModel;
      console.log(`🔍 ValidationPipeline initialized with custom model: ${customValidationModel}`);
    } else {
      // Provider에 따라 기본 모델 선택
      const provider = (aiClient as any).config.provider;
      const modelMap = DEFAULT_VALIDATION_MODELS[provider] || DEFAULT_VALIDATION_MODELS.anthropic;

      this.validatorModel = modelMap[validationModelTier] || modelMap.fast;
      this.fixerModel = modelMap[validationModelTier] || modelMap.fast;

      console.log(`🔍 ValidationPipeline initialized with ${provider} / ${this.validatorModel}`);
    }
  }

  /**
   * 리텐션 커브 검증 + 수정 파이프라인
   */
  async validateAndFixRetention(
    proposedCurve: RetentionCurve,
    userInput: UserInput,
    maxRetries: number = 3
  ): Promise<{ curve: RetentionCurve; summary: ValidationSummary }> {

    console.log('\n🔍 Validating Retention Curve...');

    // 1. 규칙 기반 검증 (무료!)
    console.log('  📏 Rule-based validation...');
    const ruleValidation = validateRetentionWithRules(proposedCurve, userInput.industry);

    if (ruleValidation.valid) {
      console.log('  ✅ Rule-based validation passed! Skipping AI validation.');
      return {
        curve: proposedCurve,
        summary: {
          passed: true,
          ruleBasedPassed: true,
          aiValidationUsed: false,
          fixAttempts: 0,
          errors: [],
          warnings: ruleValidation.warnings
        }
      };
    }

    console.log(`  ⚠️  Rule-based validation found ${ruleValidation.errors.length} error(s). Using AI validation...`);
    ruleValidation.errors.forEach(e => console.log(`    - ${e}`));

    // 2. AI 검증 + 수정 루프
    let currentCurve = proposedCurve;
    let fixAttempts = 0;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // AI Validator 호출 (Haiku)
      const aiValidation = await this.callRetentionValidator(
        currentCurve,
        userInput.industry,
        ruleValidation.errors
      );

      console.log(`  Attempt ${attempt}: ${aiValidation.recommendation}`);

      // 통과
      if (aiValidation.recommendation === 'accept') {
        console.log('  ✅ AI validation passed!');
        return {
          curve: currentCurve,
          summary: {
            passed: true,
            ruleBasedPassed: false,
            aiValidationUsed: true,
            fixAttempts,
            errors: [],
            warnings: aiValidation.issues
              .filter(i => i.severity === 'warning')
              .map(i => i.message)
          }
        };
      }

      // 수정 시도
      if (attempt < maxRetries) {
        console.log('  🔧 Attempting to fix...');
        const criticalIssues = aiValidation.issues
          .filter(i => i.severity === 'critical')
          .map(i => i.message);

        currentCurve = await this.callRetentionFixer(
          currentCurve,
          userInput.industry,
          criticalIssues
        );
        fixAttempts++;

        console.log('  🔄 Re-validating fixed version...');
      }
    }

    // 최대 재시도 초과 → 실패
    throw new Error(
      `Retention curve validation failed after ${maxRetries} attempts. ` +
      `Please check the data manually.`
    );
  }

  /**
   * 이벤트 순서 검증 + 수정 파이프라인
   */
  async validateAndFixEventSequencing(
    proposedSequencing: EventSequencing,
    schema: ParsedSchema,
    userInput: UserInput,
    maxRetries: number = 3
  ): Promise<{ sequencing: EventSequencing; summary: ValidationSummary }> {

    console.log('\n🔍 Validating Event Sequencing...');

    // 1. 규칙 기반 검증
    console.log('  📏 Rule-based validation...');
    const ruleValidation = validateEventSequencingWithRules(proposedSequencing, schema);

    if (ruleValidation.valid) {
      console.log('  ✅ Rule-based validation passed! Skipping AI validation.');
      return {
        sequencing: proposedSequencing,
        summary: {
          passed: true,
          ruleBasedPassed: true,
          aiValidationUsed: false,
          fixAttempts: 0,
          errors: [],
          warnings: ruleValidation.warnings
        }
      };
    }

    console.log(`  ⚠️  Rule-based validation found ${ruleValidation.errors.length} error(s). Using AI validation...`);
    ruleValidation.errors.forEach(e => console.log(`    - ${e}`));

    // 2. AI 검증 + 수정 루프
    let currentSequencing = proposedSequencing;
    let fixAttempts = 0;
    const allEvents = schema.events.map(e => e.event_name);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const aiValidation = await this.callEventSequencingValidator(
        currentSequencing,
        allEvents,
        ruleValidation.errors
      );

      console.log(`  Attempt ${attempt}: ${aiValidation.recommendation}`);

      if (aiValidation.recommendation === 'accept') {
        console.log('  ✅ AI validation passed!');
        return {
          sequencing: currentSequencing,
          summary: {
            passed: true,
            ruleBasedPassed: false,
            aiValidationUsed: true,
            fixAttempts,
            errors: [],
            warnings: aiValidation.issues
              .filter(i => i.severity === 'warning')
              .map(i => i.message)
          }
        };
      }

      if (attempt < maxRetries) {
        console.log('  🔧 Attempting to fix...');
        const criticalIssues = aiValidation.issues
          .filter(i => i.severity === 'critical')
          .map(i => i.message);

        currentSequencing = await this.callEventSequencingFixer(
          currentSequencing,
          allEvents,
          criticalIssues
        );
        fixAttempts++;

        console.log('  🔄 Re-validating fixed version...');
      }
    }

    throw new Error(
      `Event sequencing validation failed after ${maxRetries} attempts. ` +
      `Please check the data manually.`
    );
  }

  /**
   * AI Validator 호출 (Haiku)
   */
  private async callRetentionValidator(
    curve: RetentionCurve,
    industry: string,
    ruleErrors: string[]
  ): Promise<ValidationResult> {
    const prompt = buildRetentionValidationPrompt(curve, industry, ruleErrors);

    const response = await this.callAI(prompt, this.validatorModel);
    const result = this.parseAIResponse(response);

    return result as ValidationResult;
  }

  /**
   * AI Fixer 호출 (Haiku)
   */
  private async callRetentionFixer(
    curve: RetentionCurve,
    industry: string,
    errors: string[]
  ): Promise<RetentionCurve> {
    const prompt = buildRetentionFixerPrompt(curve, industry, errors);

    const response = await this.callAI(prompt, this.fixerModel);
    const result = this.parseAIResponse(response);

    return result.retentionCurve;
  }

  /**
   * AI Validator 호출 (Event Sequencing)
   */
  private async callEventSequencingValidator(
    sequencing: EventSequencing,
    allEvents: string[],
    ruleErrors: string[]
  ): Promise<ValidationResult> {
    const prompt = buildEventSequencingValidationPrompt(sequencing, allEvents, ruleErrors);

    const response = await this.callAI(prompt, this.validatorModel);
    const result = this.parseAIResponse(response);

    return result as ValidationResult;
  }

  /**
   * AI Fixer 호출 (Event Sequencing)
   */
  private async callEventSequencingFixer(
    sequencing: EventSequencing,
    allEvents: string[],
    errors: string[]
  ): Promise<EventSequencing> {
    const prompt = buildEventSequencingFixerPrompt(sequencing, allEvents, errors);

    const response = await this.callAI(prompt, this.fixerModel);
    const result = this.parseAIResponse(response);

    return result.eventSequencing;
  }

  /**
   * AI 호출 (공통)
   */
  private async callAI(prompt: string, model: string): Promise<string> {
    // AIClient의 private 메서드 접근을 위한 타입 캐스팅
    const client = this.aiClient as any;

    if (client.config.provider === 'openai') {
      return await client.callOpenAI(prompt);
    } else {
      // Anthropic - 모델 지정
      return await client.callAnthropic(prompt, 1, model);
    }
  }

  /**
   * AI 응답 파싱
   */
  private parseAIResponse(response: string): any {
    const client = this.aiClient as any;
    return client.parseAIResponse(response);
  }
}
