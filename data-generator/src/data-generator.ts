import * as fs from 'fs';
import * as path from 'path';
import { ExcelParser } from './excel/parser';
import { AIClient, UserInput } from './ai/client';
import { CohortGenerator } from './generators/cohort-generator';
import { EventGenerator } from './generators/event-generator';
import { MarketingGenerator } from './generators/marketing-generator';
import { TEFormatter } from './formatters/te-formatter';
import { LogBus2Controller } from './logbus/controller';
import {
  ParsedSchema,
  AIAnalysisResult,
  UserGenerationConfig,
  DEFAULT_COUNTRY_CONFIGS,
  Session,
  TEEvent,
  EventData
} from './types';
import { generateUUID, randomInt, probabilityCheck } from './utils/random';
import { formatDateYYYYMMDD, addMilliseconds } from './utils/date';
import { exponentialDistribution } from './utils/distribution';

/**
 * 진행 상황 콜백 타입
 */
export type ProgressCallback = (progress: {
  status: string;
  progress: number;
  message: string;
  step?: string;
  details?: string[];  // 상세 로그 메시지
}) => void;

/**
 * 데이터 생성기 설정
 */
export interface DataGeneratorConfig {
  // Excel 파일
  excelFilePath: string;

  // 사용자 입력
  userInput: UserInput;

  // AI 설정
  aiProvider: 'openai' | 'anthropic' | 'gemini';
  aiApiKey: string;
  aiModel?: string;
  validationModelTier?: 'fast' | 'balanced';  // 검증 모델 등급 (기본: fast)
  customValidationModel?: string;  // 사용자 지정 검증 모델 (선택사항)

  // LogBus2 설정
  logbus?: {
    appId: string;
    receiverUrl: string;
    logbusPath: string;
    cpuLimit?: number;
  };

  // 출력 경로
  outputDataPath: string;
  outputMetadataPath: string;

  // 진행 상황 콜백 (선택적)
  onProgress?: ProgressCallback;

  // 사전 분석된 AI 결과 (선택적)
  preAnalyzedResult?: AIAnalysisResult;
}

/**
 * 생성 결과
 */
export interface GenerationResult {
  runId: string;
  totalUsers: number;
  totalEvents: number;
  totalDays: number;
  filesGenerated: string[];
  metadata: any;
  aiAnalysis?: AIAnalysisResult;  // 🆕 AI 분석 결과 포함
}

/**
 * 데이터 생성기 오케스트레이터
 */
export class DataGenerator {
  private config: DataGeneratorConfig;
  private runId: string;
  private marketingGenerator: MarketingGenerator;

  constructor(config: DataGeneratorConfig, runId?: string) {
    this.config = config;
    this.runId = runId || `run_${Date.now()}`;
    this.marketingGenerator = new MarketingGenerator(this.config.userInput.industry);
  }

  /**
   * 전체 데이터 생성 프로세스 실행
   */
  async generate(): Promise<GenerationResult> {
    console.log('🚀 Starting data generation...');
    console.log(`Run ID: ${this.runId}`);

    // 1. Excel 파싱
    this.config.onProgress?.({
      status: 'parsing',
      progress: 10,
      message: `Excel 파일에서 ${path.basename(this.config.excelFilePath)} 로드 중...`,
      step: '1/5'
    });
    console.log('\n📋 Step 1: Parsing Excel schema...');
    const schema = await this.parseExcel();
    console.log(`✅ Parsed ${schema.events.length} events, ${schema.properties.length} properties`);

    this.config.onProgress?.({
      status: 'parsing',
      progress: 15,
      message: `${schema.events.length}개 이벤트, ${schema.properties.length}개 속성 파싱 완료`,
      step: '1/5'
    });

    // 2. AI 분석
    const aiDetails: string[] = [];
    this.config.onProgress?.({
      status: 'analyzing',
      progress: 25,
      message: `${this.config.aiProvider === 'anthropic' ? 'Claude' : 'GPT'} AI를 통해 시나리오 분석 시작...`,
      step: '2/5',
      details: ['🤖 AI 분석 시작', `📋 이벤트 수: ${schema.events.length}개`, `📋 속성 수: ${schema.properties.length}개`]
    });
    console.log('\n🤖 Step 2: AI analysis...');

    // AI 분석 전에 어떤 모드인지 알림
    if (schema.events.length > 15) {
      aiDetails.push('📊 Multi-Phase Analysis 모드 활성화 (정확도 향상)');
      aiDetails.push('⚡ Phase 1: 사용자 세그먼트 & 이벤트 구조 분석');
      this.config.onProgress?.({
        status: 'analyzing',
        progress: 27,
        message: 'AI 다단계 분석 시작 (Phase 1/3)',
        step: '2/5',
        details: aiDetails
      });
    } else {
      aiDetails.push('📊 Single-Phase Analysis 모드 (빠른 분석)');
      this.config.onProgress?.({
        status: 'analyzing',
        progress: 27,
        message: 'AI 스키마 분석 중...',
        step: '2/5',
        details: aiDetails
      });
    }

    const aiAnalysis = await this.analyzeWithAI(schema);
    console.log(`✅ Generated ${aiAnalysis.userSegments.length} user segments`);

    // AI 분석 결과 상세 로깅
    console.log('\n📊 AI Analysis Summary:');
    console.log(`  - User Segments: ${aiAnalysis.userSegments.length}`);
    console.log(`  - Event Ranges: ${aiAnalysis.eventRanges.length}`);
    console.log(`  - Total Properties with Ranges: ${aiAnalysis.eventRanges.reduce((sum, e) => sum + e.properties.length, 0)}`);

    // AI 분석 결과를 details에 추가
    aiDetails.push(`✅ AI 분석 완료`);
    aiDetails.push(`👥 사용자 세그먼트: ${aiAnalysis.userSegments.length}개`);
    aiAnalysis.userSegments.forEach(seg => {
      aiDetails.push(`  - ${seg.name} (${(seg.ratio * 100).toFixed(0)}%): ${seg.characteristics}`);
    });

    aiDetails.push(`📊 이벤트 범위: ${aiAnalysis.eventRanges.length}개`);
    const totalProps = aiAnalysis.eventRanges.reduce((sum, e) => sum + e.properties.length, 0);
    aiDetails.push(`🔢 AI 생성 속성: ${totalProps}개`);

    if (aiAnalysis.eventRanges.length > 0) {
      console.log('\n📋 Event Ranges Detail:');
      aiDetails.push(`📋 주요 이벤트 범위:`);
      aiAnalysis.eventRanges.slice(0, 5).forEach(er => {
        console.log(`  - ${er.event_name}: ${er.properties.length} properties`);
        aiDetails.push(`  - ${er.event_name}: ${er.properties.length} 속성`);
        er.properties.slice(0, 2).forEach(p => {
          console.log(`    • ${p.property_name} (${p.type})`);
          aiDetails.push(`    • ${p.property_name} (${p.type})`);
        });
      });
      if (aiAnalysis.eventRanges.length > 5) {
        console.log(`  ... and ${aiAnalysis.eventRanges.length - 5} more events`);
        aiDetails.push(`  ... 외 ${aiAnalysis.eventRanges.length - 5}개 이벤트`);
      }
    } else {
      console.warn('⚠️  WARNING: No event ranges generated! All properties will use Faker.js fallback.');
      aiDetails.push('⚠️ 경고: AI 범위 미생성, Faker.js 폴백 사용');
    }

    // 세션 패턴 정보 추가
    aiDetails.push('📈 세션 패턴 분석:');
    Object.entries(aiAnalysis.sessionPatterns.avgSessionsPerDay).forEach(([segment, sessions]) => {
      const duration = (aiAnalysis.sessionPatterns.avgSessionDuration[segment] / 1000 / 60).toFixed(1);
      const events = aiAnalysis.sessionPatterns.avgEventsPerSession[segment];
      aiDetails.push(`  - ${segment}: ${sessions}회/일, ${duration}분/세션, ${events}이벤트/세션`);
    });

    this.config.onProgress?.({
      status: 'analyzing',
      progress: 35,
      message: `AI 분석 완료: ${aiAnalysis.userSegments.length}개 세그먼트, ${totalProps}개 속성 범위 생성`,
      step: '2/5',
      details: aiDetails
    });

    // 3. 코호트 생성
    this.config.onProgress?.({
      status: 'generating',
      progress: 45,
      message: '사용자 코호트 생성 중...',
      step: '3/5'
    });
    console.log('\n👥 Step 3: Generating user cohorts...');
    const cohorts = await this.generateCohorts(aiAnalysis);
    console.log(`✅ Generated cohorts for ${cohorts.size} days`);

    this.config.onProgress?.({
      status: 'generating',
      progress: 55,
      message: `${cohorts.size}일치 사용자 코호트 생성 완료`,
      step: '3/5'
    });

    // 4. 이벤트 생성
    this.config.onProgress?.({
      status: 'generating',
      progress: 60,
      message: '일별 이벤트 데이터 생성 시작...',
      step: '4/5'
    });
    console.log('\n📊 Step 4: Generating events...');
    const { filesGenerated, totalEvents } = await this.generateEvents(
      schema,
      aiAnalysis,
      cohorts
    );
    console.log(`✅ Generated ${totalEvents} events in ${filesGenerated.length} files`);

    this.config.onProgress?.({
      status: 'generating',
      progress: 85,
      message: `${totalEvents.toLocaleString()}개 이벤트 생성 완료`,
      step: '4/5'
    });

    // 5. 메타데이터 저장
    this.config.onProgress?.({
      status: 'saving',
      progress: 90,
      message: '메타데이터 및 파일 저장 중...',
      step: '5/5'
    });
    console.log('\n💾 Step 5: Saving metadata...');
    const metadata = this.saveMetadata(schema, aiAnalysis, filesGenerated, totalEvents);

    const result: GenerationResult = {
      runId: this.runId,
      totalUsers: this.getTotalUsers(cohorts),
      totalEvents,
      totalDays: cohorts.size,
      filesGenerated,
      metadata,
      aiAnalysis  // 🆕 AI 분석 결과 포함
    };

    this.config.onProgress?.({
      status: 'completed',
      progress: 100,
      message: '✅ 데이터 생성 완료!',
      step: '5/5'
    });

    console.log('\n✅ Data generation completed!');
    console.log(`📁 Output: ${this.config.outputDataPath}`);

    return result;
  }

  /**
   * Excel 파싱
   */
  private async parseExcel(): Promise<ParsedSchema> {
    const parser = new ExcelParser();
    return await parser.parseExcelFile(this.config.excelFilePath);
  }

  /**
   * AI 분석
   */
  private async analyzeWithAI(schema: ParsedSchema): Promise<AIAnalysisResult> {
    // AI 진행 상황을 누적하기 위한 배열
    const progressDetails: string[] = [];

    const aiClient = new AIClient({
      provider: this.config.aiProvider,
      apiKey: this.config.aiApiKey,
      model: this.config.aiModel,
      validationModelTier: this.config.validationModelTier || 'fast',
      customValidationModel: this.config.customValidationModel,
      onProgress: (aiProgress) => {
        // AI의 detail을 progressDetails 배열에 누적
        if (aiProgress.detail) {
          progressDetails.push(aiProgress.detail);
          // 최근 30개만 유지 (너무 길어지지 않도록)
          if (progressDetails.length > 30) {
            progressDetails.shift();
          }
        }

        // Convert AI progress to data generator progress
        this.config.onProgress?.({
          status: 'analyzing',
          progress: aiProgress.progress,
          message: aiProgress.message,
          step: '2/5',
          details: [...progressDetails]  // 누적된 details 전달
        });
      }
    });

    // 다단계 분석 사용 (이벤트가 많을 때 정확도 향상)
    if (schema.events.length > 15) {
      console.log('  📊 Using Multi-Phase Analysis (30+ events)');
      return await aiClient.analyzeSchemaMultiPhase(schema, this.config.userInput);
    } else {
      console.log('  📊 Using Single-Phase Analysis (<15 events)');
      return await aiClient.analyzeSchema(schema, this.config.userInput);
    }
  }

  /**
   * 코호트 생성
   */
  private async generateCohorts(
    aiAnalysis: AIAnalysisResult
  ): Promise<Map<string, any[]>> {
    const config: UserGenerationConfig = {
      dau: this.config.userInput.dau,
      dateRange: {
        start: new Date(this.config.userInput.dateRange.start),
        end: new Date(this.config.userInput.dateRange.end)
      },
      countryConfigs: DEFAULT_COUNTRY_CONFIGS,
      segmentRatios: aiAnalysis.userSegments.reduce((acc, seg) => {
        acc[seg.name] = seg.ratio;
        return acc;
      }, {} as Record<string, number>)
    };

    const generator = new CohortGenerator(config, aiAnalysis);
    return generator.generateCohorts();
  }

  /**
   * 이벤트 생성
   */
  private async generateEvents(
    schema: ParsedSchema,
    aiAnalysis: AIAnalysisResult,
    cohorts: Map<string, any[]>
  ): Promise<{ filesGenerated: string[]; totalEvents: number }> {
    const eventGenerator = new EventGenerator(schema, aiAnalysis, this.config.userInput.industry);
    const teFormatter = new TEFormatter();
    const filesGenerated: string[] = [];
    let totalEvents = 0;

    // 출력 디렉토리 생성
    const runDataPath = path.join(this.config.outputDataPath, this.runId);
    if (!fs.existsSync(runDataPath)) {
      fs.mkdirSync(runDataPath, { recursive: true });
    }

    // 날짜별로 이벤트 생성
    const totalDays = cohorts.size;
    let dayIndex = 0;

    for (const [dateKey, users] of cohorts.entries()) {
      dayIndex++;
      console.log(`  📅 Processing ${dateKey} (${users.length} users)...`);

      // 진행 상황 업데이트 (60% ~ 85% 구간을 일별로 분할)
      const dayProgress = 60 + ((dayIndex - 1) / totalDays) * 25;
      this.config.onProgress?.({
        status: 'generating',
        progress: Math.floor(dayProgress),
        message: `${dateKey} 데이터 생성 중... (${dayIndex}/${totalDays}일)`,
        step: '4/5'
      });

      // 프론트엔드 폴링이 진행 상황을 확인할 시간을 주기 위한 짧은 지연
      await new Promise(resolve => setTimeout(resolve, 500));

      const dailyEvents: TEEvent[] = [];

      // 각 유저별로 세션 및 이벤트 생성
      for (const user of users) {
        const sessions = this.generateUserSessions(user, new Date(dateKey), aiAnalysis);

        // 첫 세션 전에 install/user_set 이벤트 생성 (lifecycle 이벤트)
        if (user.total_sessions === 0 && sessions.length > 0) {
          const firstSession = sessions[0];
          // install은 세션 시작 **직전**에 발생
          const installTime = addMilliseconds(firstSession.start, -5000); // 5초 전

          // 1. install 이벤트 (마케팅 어트리뷰션)
          const installProperties = this.marketingGenerator.generateInstallEvent(user, installTime);
          const installEvent: EventData = {
            event_name: 'install',
            timestamp: installTime,
            user,
            properties: installProperties
          };
          const teInstallEvent = teFormatter.formatTrackEvent(installEvent);
          dailyEvents.push(teInstallEvent);

          // 2. user_set 이벤트 (te_ads_object 유저 속성 포함)
          const userAttribution = this.marketingGenerator.generateUserAttribution();
          const userSet = teFormatter.formatUserSet(user, installTime, userAttribution);
          dailyEvents.push(userSet);
        }

        for (const session of sessions) {
          // 일반 세션 이벤트 생성
          const sessionEvents = eventGenerator.generateSessionEvents(session);
          const teEvents = sessionEvents.map(e => teFormatter.formatTrackEvent(e));
          dailyEvents.push(...teEvents);

          // adjust_ad_revenue 이벤트 (30% 확률)
          if (probabilityCheck(0.3)) {
            const adRevenueProperties = this.marketingGenerator.generateAdRevenueEvent(user, session.end);
            const adRevenueEvent: EventData = {
              event_name: 'adjust_ad_revenue',
              timestamp: session.end,
              user,
              properties: adRevenueProperties
            };
            const teAdRevenueEvent = teFormatter.formatTrackEvent(adRevenueEvent);
            dailyEvents.push(teAdRevenueEvent);
          }

          // user_add 이벤트 (통계 업데이트)
          const userAdd = teFormatter.generateUserStatUpdate(
            user,
            session.end,
            1,
            sessionEvents.length
          );
          dailyEvents.push(userAdd);

          // 유저 통계 업데이트
          user.total_sessions++;
          user.total_events += sessionEvents.length;
        }
      }

      // JSONL 파일 저장 (타임스탬프 순으로 정렬)
      if (dailyEvents.length > 0) {
        // 타임스탬프 기준으로 이벤트 정렬 (중요!)
        dailyEvents.sort((a, b) => {
          const timeA = new Date(a['#time']).getTime();
          const timeB = new Date(b['#time']).getTime();
          return timeA - timeB;
        });

        const fileName = `${dateKey}.jsonl`;
        const filePath = path.join(runDataPath, fileName);
        const jsonl = teFormatter.toJSONL(dailyEvents);

        fs.writeFileSync(filePath, jsonl, 'utf-8');
        filesGenerated.push(filePath);
        totalEvents += dailyEvents.length;

        console.log(`    ✅ ${dailyEvents.length} events → ${fileName}`);

        // 파일 저장 후 진행 상황 업데이트
        const completedProgress = 60 + (dayIndex / totalDays) * 25;
        this.config.onProgress?.({
          status: 'generating',
          progress: Math.floor(completedProgress),
          message: `${dateKey} 완료 (${dailyEvents.length.toLocaleString()}개 이벤트)`,
          step: '4/5'
        });

        // 프론트엔드 폴링이 진행 상황을 확인할 시간을 주기 위한 짧은 지연
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return { filesGenerated, totalEvents };
  }

  /**
   * 유저의 일별 세션 생성
   */
  private generateUserSessions(
    user: any,
    date: Date,
    aiAnalysis: AIAnalysisResult
  ): Session[] {
    const sessions: Session[] = [];

    // 세그먼트별 평균 세션 수
    const avgSessions = aiAnalysis.sessionPatterns.avgSessionsPerDay[user.segment] || 2;
    const sessionCount = Math.max(1, Math.round(avgSessions * (0.8 + Math.random() * 0.4)));

    // 세그먼트별 평균 세션 시간
    const avgDuration = aiAnalysis.sessionPatterns.avgSessionDuration[user.segment] || 300000;

    // 산업 및 세그먼트별 접속 시간대 결정
    const peakHours = this.getPeakHours(user.segment);

    let currentTime = new Date(date);
    currentTime.setHours(peakHours.start + Math.floor(Math.random() * (peakHours.end - peakHours.start)));
    currentTime.setMinutes(Math.floor(Math.random() * 60));

    for (let i = 0; i < sessionCount; i++) {
      const duration = Math.floor(avgDuration * (0.5 + Math.random()));
      const sessionId = generateUUID();

      const session: Session = {
        session_id: sessionId,
        user,
        start: new Date(currentTime),
        end: addMilliseconds(currentTime, duration),
        duration,
        event_count: 0
      };

      sessions.push(session);

      // 다음 세션까지 간격 (세그먼트별 조정)
      const intervalHours = this.getSessionInterval(user.segment);
      currentTime = addMilliseconds(currentTime, intervalHours * 60 * 60 * 1000);

      // 24시간 넘어가면 다음날 피크타임으로 리셋
      if (currentTime.getDate() !== date.getDate()) {
        currentTime = new Date(date);
        currentTime.setDate(currentTime.getDate() + 1);
        currentTime.setHours(peakHours.start + Math.floor(Math.random() * 3));
        currentTime.setMinutes(Math.floor(Math.random() * 60));
      }
    }

    return sessions;
  }

  /**
   * 산업 및 세그먼트별 피크 시간대 반환
   */
  private getPeakHours(segment: string): { start: number; end: number } {
    const industry = this.config.userInput.industry.toLowerCase();

    // VIP/고급 사용자는 일반적으로 낮 시간대 사용
    if (segment.toLowerCase().includes('vip') || segment.toLowerCase().includes('whale') || segment.toLowerCase().includes('프리미엄')) {
      return { start: 10, end: 22 }; // 10:00 ~ 22:00
    }

    // 산업별 피크 시간
    if (industry.includes('게임') || industry.includes('game')) {
      // 게임: 저녁~밤
      return { start: 19, end: 23 }; // 19:00 ~ 23:00
    }

    if (industry.includes('금융') || industry.includes('finance') || industry.includes('bank')) {
      // 금융: 아침 출근, 점심
      const random = Math.random();
      if (random < 0.4) return { start: 9, end: 10 };   // 09:00 ~ 10:00
      if (random < 0.7) return { start: 12, end: 13 };  // 12:00 ~ 13:00
      return { start: 20, end: 22 };                     // 20:00 ~ 22:00
    }

    if (industry.includes('쇼핑') || industry.includes('commerce') || industry.includes('이커머스')) {
      // 쇼핑: 점심, 저녁
      const random = Math.random();
      if (random < 0.4) return { start: 12, end: 14 };  // 12:00 ~ 14:00
      return { start: 20, end: 22 };                     // 20:00 ~ 22:00
    }

    // 기본값: 업무 외 시간
    return { start: 18, end: 22 }; // 18:00 ~ 22:00
  }

  /**
   * 세그먼트별 세션 간격 (시간)
   */
  private getSessionInterval(segment: string): number {
    const segmentLower = segment.toLowerCase();

    // VIP/고급 사용자: 짧은 간격 (자주 접속)
    if (segmentLower.includes('vip') || segmentLower.includes('whale') || segmentLower.includes('프리미엄')) {
      return 2 + Math.random() * 3; // 2~5시간
    }

    // 활성 사용자: 중간 간격
    if (segmentLower.includes('active') || segmentLower.includes('활성') || segmentLower.includes('engaged')) {
      return 4 + Math.random() * 4; // 4~8시간
    }

    // 일반/신규 사용자: 긴 간격
    return 6 + Math.random() * 6; // 6~12시간
  }

  /**
   * 메타데이터 저장
   */
  private saveMetadata(
    schema: ParsedSchema,
    aiAnalysis: AIAnalysisResult,
    filesGenerated: string[],
    totalEvents: number
  ): any {
    const metadata = {
      runId: this.runId,
      createdAt: new Date().toISOString(),
      config: {
        excelFile: path.basename(this.config.excelFilePath),
        userInput: this.config.userInput
      },
      schema: {
        events: schema.events.length,
        properties: schema.properties.length,
        funnels: schema.funnels.length
      },
      aiAnalysis: {
        userSegments: aiAnalysis.userSegments,
        sessionPatterns: aiAnalysis.sessionPatterns
      },
      results: {
        totalEvents,
        totalFiles: filesGenerated.length,
        files: filesGenerated.map(f => path.basename(f))
      }
    };

    // 메타데이터 디렉토리 생성
    const metadataDir = path.join(this.config.outputMetadataPath, this.runId);
    if (!fs.existsSync(metadataDir)) {
      fs.mkdirSync(metadataDir, { recursive: true });
    }

    // metadata.json 저장
    const metadataPath = path.join(metadataDir, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
    console.log(`  ✅ Metadata saved: ${metadataPath}`);

    return metadata;
  }

  /**
   * 총 유저 수 계산
   */
  private getTotalUsers(cohorts: Map<string, any[]>): number {
    const allUserIds = new Set<string>();
    cohorts.forEach(users => {
      users.forEach(user => allUserIds.add(user.account_id));
    });
    return allUserIds.size;
  }

  /**
   * LogBus2로 업로드
   */
  async uploadToLogBus2(): Promise<void> {
    if (!this.config.logbus) {
      throw new Error('LogBus2 configuration not provided');
    }

    console.log('\n📤 Uploading to ThinkingEngine via LogBus2...');

    const controller = new LogBus2Controller({
      appId: this.config.logbus.appId,
      receiverUrl: this.config.logbus.receiverUrl,
      logbusPath: this.config.logbus.logbusPath,
      dataPath: path.join(this.config.outputDataPath, this.runId),
      cpuLimit: this.config.logbus.cpuLimit
    });

    // daemon.json 생성
    await controller.createDaemonConfig();

    // 설정 검증
    const isValid = await controller.validateConfig();
    if (!isValid) {
      throw new Error('LogBus2 configuration validation failed');
    }

    // LogBus2 시작
    await controller.start();

    // 진행 상태 모니터링
    await controller.monitorProgress(5, (_status) => {
      // Progress callback
    });

    console.log('✅ Upload completed!');
  }
}
