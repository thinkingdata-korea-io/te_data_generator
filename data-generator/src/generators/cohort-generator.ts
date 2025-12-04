import {
  User,
  UserLifecycleStage,
  UserGenerationConfig,
  CountryConfig,
  AIAnalysisResult
} from '../types';
import {
  generateUserInfo,
  generateDeviceInfo,
  generateNetworkType,
  generateConsistentLocationForCountry
} from './faker-utils';
import { generateUUID, weightedRandom } from '../utils/random';
import { generateDateRange, randomDateBetween, addDays } from '../utils/date';

/**
 * 코호트 생성기
 * DAU 기반으로 일별 유저 생성
 */
export class CohortGenerator {
  private config: UserGenerationConfig;
  private aiAnalysis: AIAnalysisResult;
  private allUsers: Map<string, User> = new Map();

  constructor(config: UserGenerationConfig, aiAnalysis: AIAnalysisResult) {
    this.config = config;
    this.aiAnalysis = aiAnalysis;
  }

  /**
   * 전체 기간에 대한 코호트 생성
   */
  generateCohorts(): Map<string, User[]> {
    const dateRange = generateDateRange(
      this.config.dateRange.start,
      this.config.dateRange.end
    );

    // 날짜별 활성 유저
    const dailyCohorts = new Map<string, User[]>();

    // 초기 유저 풀 생성 (첫날)
    const initialUsers = this.generateInitialUsers();
    initialUsers.forEach(user => {
      this.allUsers.set(user.account_id, user);
    });

    // 날짜별로 활성 유저 결정
    dateRange.forEach((date, index) => {
      const dateKey = this.formatDate(date);
      const activeUsers: User[] = [];

      // 기존 유저 중 활성화될 유저 선택
      this.allUsers.forEach(user => {
        const daysSinceInstall = this.getDaysDifference(user.install_date, date);

        // 🆕 세그먼트 전환 체크 (shouldBeActive 전에 실행)
        this.checkSegmentMigration(user, date, daysSinceInstall);

        if (daysSinceInstall >= 0 && this.shouldBeActive(user, date)) {
          activeUsers.push(user);
        }
      });

      // 신규 유저 추가 (DAU 맞추기)
      const newUsersNeeded = this.config.dau - activeUsers.length;
      if (newUsersNeeded > 0 && index > 0) {
        const newUsers = this.generateNewUsers(newUsersNeeded, date);
        newUsers.forEach(user => {
          this.allUsers.set(user.account_id, user);
          activeUsers.push(user);
        });
      }

      dailyCohorts.set(dateKey, activeUsers);
    });

    return dailyCohorts;
  }

  /**
   * 초기 유저 생성 (첫날)
   */
  private generateInitialUsers(): User[] {
    const users: User[] = [];
    const installDate = this.config.dateRange.start;

    // DAU의 70%를 초기 유저로 생성
    const initialUserCount = Math.floor(this.config.dau * 0.7);

    for (let i = 0; i < initialUserCount; i++) {
      const user = this.createUser(installDate, 'new');
      users.push(user);
    }

    return users;
  }

  /**
   * 신규 유저 생성
   */
  private generateNewUsers(count: number, date: Date): User[] {
    const users: User[] = [];

    for (let i = 0; i < count; i++) {
      const user = this.createUser(date, 'new');
      users.push(user);
    }

    return users;
  }

  /**
   * 단일 유저 생성
   */
  private createUser(installDate: Date, initialStage: UserLifecycleStage): User {
    // 국가 선택 (가중치 기반)
    const country = this.selectCountry();

    // Faker.js로 유저 정보 생성
    const userInfo = generateUserInfo(country);
    const deviceInfo = generateDeviceInfo();

    // 🆕 전체 위치 정보 생성 (일관성 보장)
    const locationInfo = generateConsistentLocationForCountry(country.countryCode);

    // 세그먼트 선택 (AI 분석 결과 기반)
    const segment = this.selectSegment();

    const accountId = generateUUID();

    return {
      account_id: accountId,
      distinct_id: accountId,
      segment,
      lifecycle_stage: initialStage,
      install_date: installDate,
      last_active_date: installDate,

      // 국가별 정보
      country: country.country,
      countryCode: country.countryCode,
      locale: country.locale,
      name: userInfo.name,
      email: userInfo.email,
      phone: userInfo.phone,

      // 🆕 위치 상세 정보 (일관성 유지용)
      city: locationInfo.city,
      state: locationInfo.state,
      region: locationInfo.region,
      timezone: locationInfo.timezone,

      // 디바이스 정보
      os: deviceInfo.os,
      os_version: deviceInfo.os_version,
      device_model: deviceInfo.device_model,
      device_id: deviceInfo.device_id,

      // 네트워크 정보
      ip: userInfo.ip,
      carrier: userInfo.carrier,
      network_type: generateNetworkType(),

      // 통계
      total_sessions: 0,
      total_events: 0
    };
  }

  /**
   * 국가 선택 (가중치 기반)
   */
  private selectCountry(): CountryConfig {
    const countries = this.config.countryConfigs;
    const weights = countries.map(c => c.ratio);
    return weightedRandom(countries, weights);
  }

  /**
   * 세그먼트 선택 (AI 분석 결과 기반)
   */
  private selectSegment(): string {
    const segments = this.aiAnalysis.userSegments;
    const names = segments.map(s => s.name);
    const weights = segments.map(s => s.ratio);
    return weightedRandom(names, weights);
  }

  /**
   * 유저가 특정 날짜에 활성화될지 결정
   */
  private shouldBeActive(user: User, date: Date): boolean {
    const daysSinceInstall = this.getDaysDifference(user.install_date, date);
    const daysSinceLastActive = user.last_active_date
      ? this.getDaysDifference(user.last_active_date, date)
      : 0;

    // 생명주기 단계 업데이트
    user.lifecycle_stage = this.getNextLifecycleStage(
      user.lifecycle_stage,
      daysSinceLastActive
    );

    // 기본 활동 확률 계산
    let probability = this.getActivityProbability(
      user.lifecycle_stage,
      daysSinceInstall
    );

    // AI 리텐션 커브가 있으면 추가 조정 적용
    const retentionCurve = this.aiAnalysis.retentionCurve;
    if (retentionCurve) {
      // 1. Day-N 리텐션 커브 적용
      const dayNRetention = this.calculateDayNRetention(daysSinceInstall, retentionCurve);
      probability = probability * dayNRetention;

      // 2. 세그먼트별 가중치 적용
      const segmentMultiplier = retentionCurve.segmentMultipliers[user.segment] || 1.0;
      probability = probability * segmentMultiplier;

      // 3. 주말 부스트 적용
      if (retentionCurve.weekendBoost) {
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        if (isWeekend) {
          probability = probability * retentionCurve.weekendBoost;
        }
      }

      // 4. 월간 복귀 패턴 (이커머스/금융)
      if (retentionCurve.monthlyReturnPattern) {
        const dayOfMonth = date.getDate();
        // 급여일 (25~28일, 1~5일) 복귀 확률 증가
        if ((dayOfMonth >= 25 && dayOfMonth <= 28) || (dayOfMonth >= 1 && dayOfMonth <= 5)) {
          if (user.lifecycle_stage === 'dormant' || user.lifecycle_stage === 'returning') {
            probability = probability * 1.5;
          }
        }
      }

      // 확률은 0~1 범위로 제한
      probability = Math.max(0, Math.min(1, probability));
    }

    const isActive = Math.random() < probability;

    if (isActive) {
      user.last_active_date = date;
    }

    return isActive;
  }

  /**
   * Day-N 리텐션 계산 (exponential decay 모델)
   * 공식: retention(day) = baseRetention * (retentionDecay ^ day)
   */
  private calculateDayNRetention(daysSinceInstall: number, retentionCurve: any): number {
    if (daysSinceInstall === 0) {
      return retentionCurve.dayZeroRetention;
    }

    // Exponential decay 모델
    const baseRetention = retentionCurve.day1Retention;
    const decay = retentionCurve.retentionDecay;
    const retention = baseRetention * Math.pow(decay, daysSinceInstall - 1);

    return Math.max(0, Math.min(1, retention));
  }

  /**
   * 생명주기 단계 전환
   */
  private getNextLifecycleStage(
    currentStage: UserLifecycleStage,
    daysSinceLastActive: number
  ): UserLifecycleStage {
    // AI 정의 임계값 사용 (fallback: 기본값)
    const retentionCurve = this.aiAnalysis.retentionCurve;
    const dormantThreshold = retentionCurve?.lifecycleTransitionThresholds?.dormantAfterDays || 7;
    const churnedThreshold = retentionCurve?.lifecycleTransitionThresholds?.churnedAfterDays || 30;

    // 장기간 비활성 시 단계 변경
    if (daysSinceLastActive > churnedThreshold) {
      return 'churned';
    } else if (daysSinceLastActive > dormantThreshold && currentStage !== 'new') {
      return 'dormant';
    } else if (daysSinceLastActive === 0 && currentStage === 'dormant') {
      return 'returning';
    } else if (currentStage === 'new' && daysSinceLastActive > 1) {
      return 'active';
    }

    return currentStage;
  }

  /**
   * 생명주기별 활동 확률 (AI 리텐션 커브 기반)
   */
  private getActivityProbability(
    stage: UserLifecycleStage,
    daysSinceInstall: number
  ): number {
    // AI 리텐션 커브가 있으면 사용
    const retentionCurve = this.aiAnalysis.retentionCurve;
    if (retentionCurve) {
      const lifeCycleProbability = retentionCurve.lifecycleProbabilities[stage] || 0.3;
      return lifeCycleProbability;
    }

    // 폴백: 기존 하드코딩된 값
    switch (stage) {
      case 'new':
        if (daysSinceInstall <= 3) return 0.9;
        return 0.6;
      case 'active':
        return 0.8;
      case 'returning':
        return 0.5;
      case 'dormant':
        return 0.1;
      case 'churned':
        return 0.02;
      default:
        return 0.3;
    }
  }

  /**
   * 두 날짜 간 일수 차이
   */
  private getDaysDifference(date1: Date, date2: Date): number {
    const diff = date2.getTime() - date1.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * 날짜를 YYYY-MM-DD 형식으로 변환
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 🆕 세그먼트 전환 체크 (AI segmentMigrations 기반)
   */
  private checkSegmentMigration(user: User, date: Date, daysSinceInstall: number): void {
    const segmentMigrations = this.aiAnalysis.segmentMigrations;
    if (!segmentMigrations || segmentMigrations.length === 0) {
      return;
    }

    // 현재 세그먼트에서 전환 가능한 규칙 찾기
    const applicableMigrations = segmentMigrations.filter(
      migration => migration.fromSegment === user.segment
    );

    if (applicableMigrations.length === 0) {
      return;
    }

    // 각 전환 규칙 평가
    for (const migration of applicableMigrations) {
      // 조건 평가
      const conditionMet = this.evaluateMigrationCondition(
        migration,
        user,
        date,
        daysSinceInstall
      );

      if (conditionMet) {
        // 확률 기반 전환
        if (Math.random() < migration.probability) {
          const oldSegment = user.segment;
          user.segment = migration.toSegment;

          // 로그 출력
          console.log(
            `🔄 [Segment Migration] ${user.account_id}: ${oldSegment} → ${migration.toSegment} ` +
            `(trigger: ${migration.trigger}, condition: ${migration.condition})`
          );

          // 하나의 전환만 적용 (중복 전환 방지)
          break;
        }
      }
    }
  }

  /**
   * 세그먼트 전환 조건 평가
   */
  private evaluateMigrationCondition(
    migration: any,
    user: User,
    date: Date,
    daysSinceInstall: number
  ): boolean {
    const trigger = migration.trigger;
    const condition = migration.condition;

    if (trigger === 'time') {
      // 시간 기반 조건 (예: "daysSinceInstall > 7", "daysInSegment > 30")
      return this.evaluateTimeCondition(condition, user, date, daysSinceInstall);
    } else if (trigger === 'lifecycle') {
      // 생명주기 기반 조건 (예: "lifecycle_stage === 'active'")
      return this.evaluateLifecycleCondition(condition, user);
    } else if (trigger === 'event') {
      // 이벤트 기반 조건은 코호트 생성기에서 평가 불가 (이벤트 추적 필요)
      // 향후 EventGenerator에서 처리 가능
      return false;
    }

    return false;
  }

  /**
   * 시간 조건 평가 (예: "daysSinceInstall > 7")
   */
  private evaluateTimeCondition(
    condition: string,
    user: User,
    date: Date,
    daysSinceInstall: number
  ): boolean {
    try {
      // 조건 파싱 및 평가
      // 지원 형식: "daysSinceInstall > 7", "daysSinceInstall >= 30"
      const match = condition.match(/daysSinceInstall\s*([><=]+)\s*(\d+)/);
      if (match) {
        const operator = match[1];
        const threshold = parseInt(match[2], 10);

        switch (operator) {
          case '>':
            return daysSinceInstall > threshold;
          case '>=':
            return daysSinceInstall >= threshold;
          case '<':
            return daysSinceInstall < threshold;
          case '<=':
            return daysSinceInstall <= threshold;
          case '==':
          case '===':
            return daysSinceInstall === threshold;
          default:
            return false;
        }
      }

      return false;
    } catch (error) {
      console.error(`❌ [Segment Migration] Failed to evaluate time condition: ${condition}`, error);
      return false;
    }
  }

  /**
   * 생명주기 조건 평가 (예: "lifecycle_stage === 'active'")
   */
  private evaluateLifecycleCondition(condition: string, user: User): boolean {
    try {
      // 조건 파싱 및 평가
      // 지원 형식: "lifecycle_stage === 'active'", "lifecycle_stage == 'dormant'"
      const match = condition.match(/lifecycle_stage\s*([!=]=)\s*['"](\w+)['"]/);
      if (match) {
        const operator = match[1];
        const targetStage = match[2];

        if (operator === '===' || operator === '==') {
          return user.lifecycle_stage === targetStage;
        } else if (operator === '!==') {
          return user.lifecycle_stage !== targetStage;
        }
      }

      return false;
    } catch (error) {
      console.error(`❌ [Segment Migration] Failed to evaluate lifecycle condition: ${condition}`, error);
      return false;
    }
  }

  /**
   * 모든 생성된 유저 반환
   */
  getAllUsers(): Map<string, User> {
    return this.allUsers;
  }
}
