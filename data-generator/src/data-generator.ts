import * as fs from 'fs';
import * as path from 'path';
import { ExcelParser } from './excel/parser';
import { AIClient, UserInput } from './ai/client';
import { CohortGenerator } from './generators/cohort-generator';
import { EventGenerator } from './generators/event-generator';
import { TEFormatter } from './formatters/te-formatter';
import { LogBus2Controller } from './logbus/controller';
import {
  ParsedSchema,
  AIAnalysisResult,
  UserGenerationConfig,
  DEFAULT_COUNTRY_CONFIGS,
  Session,
  TEEvent
} from './types';
import { generateUUID, randomInt } from './utils/random';
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
  aiProvider: 'openai' | 'anthropic';
  aiApiKey: string;
  aiModel?: string;

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
}

/**
 * 데이터 생성기 오케스트레이터
 */
export class DataGenerator {
  private config: DataGeneratorConfig;
  private runId: string;

  constructor(config: DataGeneratorConfig) {
    this.config = config;
    this.runId = `run_${Date.now()}`;
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
    this.config.onProgress?.({
      status: 'analyzing',
      progress: 25,
      message: 'Claude AI를 통해 시나리오 분석 시작...',
      step: '2/5'
    });
    console.log('\n🤖 Step 2: AI analysis...');
    const aiAnalysis = await this.analyzeWithAI(schema);
    console.log(`✅ Generated ${aiAnalysis.userSegments.length} user segments`);

    this.config.onProgress?.({
      status: 'analyzing',
      progress: 35,
      message: `${aiAnalysis.userSegments.length}개 사용자 세그먼트 및 행동 패턴 생성 완료`,
      step: '2/5'
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
      metadata
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
    const aiClient = new AIClient({
      provider: this.config.aiProvider,
      apiKey: this.config.aiApiKey,
      model: this.config.aiModel
    });

    return await aiClient.analyzeSchema(schema, this.config.userInput);
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
    const eventGenerator = new EventGenerator(schema, aiAnalysis);
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

      const dailyEvents: TEEvent[] = [];

      // 각 유저별로 세션 및 이벤트 생성
      for (const user of users) {
        const sessions = this.generateUserSessions(user, new Date(dateKey), aiAnalysis);

        for (const session of sessions) {
          const sessionEvents = eventGenerator.generateSessionEvents(session);
          const teEvents = sessionEvents.map(e => teFormatter.formatTrackEvent(e));
          dailyEvents.push(...teEvents);

          // user_set 이벤트 (첫 세션)
          if (user.total_sessions === 0) {
            const userSet = teFormatter.formatUserSet(user, session.start, {});
            dailyEvents.push(userSet);
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

      // JSONL 파일 저장
      if (dailyEvents.length > 0) {
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

    let currentTime = new Date(date);
    currentTime.setHours(8 + Math.floor(Math.random() * 12)); // 08:00 ~ 20:00

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

      // 다음 세션까지 간격 (1-6시간)
      const intervalHours = 1 + Math.random() * 5;
      currentTime = addMilliseconds(currentTime, intervalHours * 60 * 60 * 1000);
    }

    return sessions;
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
    await controller.monitorProgress(5, (status) => {
      // Progress callback
    });

    console.log('✅ Upload completed!');
  }
}
