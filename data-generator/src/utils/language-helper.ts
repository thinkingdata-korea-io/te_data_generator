/**
 * Language Helper for Backend Messages
 * Provides localized progress messages for AI analysis and data generation
 */

export type AnalysisLanguage = 'ko' | 'en' | 'zh' | 'ja';

interface LanguageMessages {
  // AI Analysis Phase Messages
  phase1_analyzing: string;
  phase1_completed: (count: number) => string;
  phase1_detail: string;

  phase2_analyzing: string;
  phase2_completed: (d1: string, d7: string, d30: string) => string;
  phase2_detail: string;

  phase3_analyzing: string;
  phase3_completed: (funnels: number, deps: number) => string;
  phase3_detail: string;

  phase4_preparing: (count: number) => string;
  phase4_grouping: (count: number) => string;
  phase4_analyzing: (index: number, total: number, name: string) => string;
  phase4_detail: (count: number) => string;

  phase5_validating: string;
  phase5_completed: (segments: number, events: number) => string;
  phase5_detail: string;

  // Data Generation Messages
  dataGen_start: string;
  dataGen_completed: string;
  dataGen_daily: (date: string, index: number, total: number) => string;

  // Excel Generation
  excelGen_start: string;
  excelGen_completed: (filename: string) => string;

  // Common
  segments: string;
  events: string;
  funnels: string;
  dependencies: string;
  retention: string;
  groups: string;
  properties: string;
}

const MESSAGES: Record<AnalysisLanguage, LanguageMessages> = {
  ko: {
    // Phase 1
    phase1_analyzing: 'Phase 1/5: 사용자 전략 분석 중...',
    phase1_completed: (count: number) => `Phase 1/5 완료: ${count}개 사용자 세그먼트 생성됨`,
    phase1_detail: '🤖 AI가 사용자 세그먼트 및 이벤트 구조 분석 중',

    // Phase 2
    phase2_analyzing: 'Phase 2/5: 리텐션 패턴 분석 중...',
    phase2_completed: (d1: string, d7: string, d30: string) =>
      `Phase 2/5 완료: 리텐션 분석 완료`,
    phase2_detail: '📈 사용자 유지율 및 재방문 패턴 생성',

    // Phase 3
    phase3_analyzing: 'Phase 3/5: 이벤트 시퀀스 분석 중...',
    phase3_completed: (funnels: number, deps: number) =>
      `Phase 3/5 완료: 이벤트 시퀀싱 분석 완료`,
    phase3_detail: '🔗 이벤트 의존성 및 사용자 퍼널 구조 분석',

    // Phase 4
    phase4_preparing: (count: number) => `Phase 4/5: 이벤트 속성 범위 생성 준비 중...`,
    phase4_grouping: (count: number) => `Phase 4/5: ${count}개 그룹 분석 시작`,
    phase4_analyzing: (index: number, total: number, name: string) =>
      `Phase 4/5: 그룹 ${index}/${total} 분석 중 - ${name}`,
    phase4_detail: (count: number) => `🔍 ${count}개 이벤트의 속성 범위 AI 생성 중`,

    // Phase 5
    phase5_validating: 'Phase 5/5: 최종 검증 및 결과 병합 중...',
    phase5_completed: (segments: number, events: number) =>
      `Phase 5/5 완료: 모든 AI 분석 완료!`,
    phase5_detail: '🔗 모든 AI 분석 결과 통합 및 검증',

    // Data Generation
    dataGen_start: '일별 이벤트 데이터 생성 시작...',
    dataGen_completed: '✅ 데이터 생성 완료!',
    dataGen_daily: (date: string, index: number, total: number) =>
      `${date} 데이터 생성 중... (${index}/${total}일)`,

    // Excel
    excelGen_start: '📄 AI 분석 결과 Excel 파일 생성 중...',
    excelGen_completed: (filename: string) => `✅ AI 분석 Excel 생성 완료: ${filename}`,

    // Common
    segments: '세그먼트',
    events: '이벤트',
    funnels: '퍼널',
    dependencies: '의존성 규칙',
    retention: '유지율',
    groups: '그룹',
    properties: '속성'
  },

  en: {
    // Phase 1
    phase1_analyzing: 'Phase 1/5: Analyzing user strategy...',
    phase1_completed: (count: number) => `Phase 1/5 completed: ${count} user segments created`,
    phase1_detail: '🤖 AI analyzing user segments and event structure',

    // Phase 2
    phase2_analyzing: 'Phase 2/5: Analyzing retention patterns...',
    phase2_completed: (d1: string, d7: string, d30: string) =>
      `Phase 2/5 completed: Retention analysis done`,
    phase2_detail: '📈 Generating user retention and return patterns',

    // Phase 3
    phase3_analyzing: 'Phase 3/5: Analyzing event sequences...',
    phase3_completed: (funnels: number, deps: number) =>
      `Phase 3/5 completed: Event sequencing analyzed`,
    phase3_detail: '🔗 Analyzing event dependencies and user funnels',

    // Phase 4
    phase4_preparing: (count: number) => `Phase 4/5: Preparing event property ranges...`,
    phase4_grouping: (count: number) => `Phase 4/5: Starting ${count} group analysis`,
    phase4_analyzing: (index: number, total: number, name: string) =>
      `Phase 4/5: Analyzing group ${index}/${total} - ${name}`,
    phase4_detail: (count: number) => `🔍 AI generating property ranges for ${count} events`,

    // Phase 5
    phase5_validating: 'Phase 5/5: Final validation and merging...',
    phase5_completed: (segments: number, events: number) =>
      `Phase 5/5 completed: All AI analysis done!`,
    phase5_detail: '🔗 Integrating and validating all AI analysis results',

    // Data Generation
    dataGen_start: 'Starting daily event data generation...',
    dataGen_completed: '✅ Data generation completed!',
    dataGen_daily: (date: string, index: number, total: number) =>
      `Generating ${date} data... (Day ${index}/${total})`,

    // Excel
    excelGen_start: '📄 Generating AI analysis Excel file...',
    excelGen_completed: (filename: string) => `✅ AI analysis Excel generated: ${filename}`,

    // Common
    segments: 'segments',
    events: 'events',
    funnels: 'funnels',
    dependencies: 'dependency rules',
    retention: 'retention',
    groups: 'groups',
    properties: 'properties'
  },

  zh: {
    // Phase 1
    phase1_analyzing: '阶段 1/5：分析用户策略中...',
    phase1_completed: (count: number) => `阶段 1/5 完成：已创建 ${count} 个用户细分`,
    phase1_detail: '🤖 AI 正在分析用户细分和事件结构',

    // Phase 2
    phase2_analyzing: '阶段 2/5：分析留存模式中...',
    phase2_completed: (d1: string, d7: string, d30: string) =>
      `阶段 2/5 完成：留存分析完成`,
    phase2_detail: '📈 生成用户留存和回访模式',

    // Phase 3
    phase3_analyzing: '阶段 3/5：分析事件序列中...',
    phase3_completed: (funnels: number, deps: number) =>
      `阶段 3/5 完成：事件序列分析完成`,
    phase3_detail: '🔗 分析事件依赖关系和用户漏斗',

    // Phase 4
    phase4_preparing: (count: number) => `阶段 4/5：准备事件属性范围...`,
    phase4_grouping: (count: number) => `阶段 4/5：开始分析 ${count} 个组`,
    phase4_analyzing: (index: number, total: number, name: string) =>
      `阶段 4/5：分析组 ${index}/${total} - ${name}`,
    phase4_detail: (count: number) => `🔍 AI 为 ${count} 个事件生成属性范围`,

    // Phase 5
    phase5_validating: '阶段 5/5：最终验证和合并中...',
    phase5_completed: (segments: number, events: number) =>
      `阶段 5/5 完成：所有 AI 分析完成！`,
    phase5_detail: '🔗 整合并验证所有 AI 分析结果',

    // Data Generation
    dataGen_start: '开始生成每日事件数据...',
    dataGen_completed: '✅ 数据生成完成！',
    dataGen_daily: (date: string, index: number, total: number) =>
      `生成 ${date} 数据中... (第 ${index}/${total} 天)`,

    // Excel
    excelGen_start: '📄 生成 AI 分析 Excel 文件中...',
    excelGen_completed: (filename: string) => `✅ AI 分析 Excel 已生成：${filename}`,

    // Common
    segments: '细分',
    events: '事件',
    funnels: '漏斗',
    dependencies: '依赖规则',
    retention: '留存',
    groups: '组',
    properties: '属性'
  },

  ja: {
    // Phase 1
    phase1_analyzing: 'フェーズ 1/5：ユーザー戦略分析中...',
    phase1_completed: (count: number) => `フェーズ 1/5 完了：${count} 個のユーザーセグメント作成完了`,
    phase1_detail: '🤖 AI がユーザーセグメントとイベント構造を分析中',

    // Phase 2
    phase2_analyzing: 'フェーズ 2/5：リテンションパターン分析中...',
    phase2_completed: (d1: string, d7: string, d30: string) =>
      `フェーズ 2/5 完了：リテンション分析完了`,
    phase2_detail: '📈 ユーザーリテンションと再訪パターンを生成中',

    // Phase 3
    phase3_analyzing: 'フェーズ 3/5：イベントシーケンス分析中...',
    phase3_completed: (funnels: number, deps: number) =>
      `フェーズ 3/5 完了：イベントシーケンス分析完了`,
    phase3_detail: '🔗 イベント依存関係とユーザーファネルを分析中',

    // Phase 4
    phase4_preparing: (count: number) => `フェーズ 4/5：イベントプロパティ範囲準備中...`,
    phase4_grouping: (count: number) => `フェーズ 4/5：${count} グループの分析開始`,
    phase4_analyzing: (index: number, total: number, name: string) =>
      `フェーズ 4/5：グループ ${index}/${total} 分析中 - ${name}`,
    phase4_detail: (count: number) => `🔍 ${count} イベントのプロパティ範囲を AI 生成中`,

    // Phase 5
    phase5_validating: 'フェーズ 5/5：最終検証とマージ中...',
    phase5_completed: (segments: number, events: number) =>
      `フェーズ 5/5 完了：全 AI 分析完了！`,
    phase5_detail: '🔗 すべての AI 分析結果を統合・検証中',

    // Data Generation
    dataGen_start: '日別イベントデータ生成開始...',
    dataGen_completed: '✅ データ生成完了！',
    dataGen_daily: (date: string, index: number, total: number) =>
      `${date} データ生成中... (${index}/${total} 日目)`,

    // Excel
    excelGen_start: '📄 AI 分析 Excel ファイル生成中...',
    excelGen_completed: (filename: string) => `✅ AI 分析 Excel 生成完了：${filename}`,

    // Common
    segments: 'セグメント',
    events: 'イベント',
    funnels: 'ファネル',
    dependencies: '依存ルール',
    retention: 'リテンション',
    groups: 'グループ',
    properties: 'プロパティ'
  }
};

/**
 * Get localized message by key
 */
export function getMessage(
  language: AnalysisLanguage,
  key: keyof LanguageMessages,
  ...args: any[]
): string {
  const messages = MESSAGES[language] || MESSAGES.ko;
  const message = messages[key];

  if (typeof message === 'function') {
    return (message as (...args: any[]) => string)(...args);
  }

  return message as string;
}

/**
 * Format segment list
 */
export function formatSegmentList(
  language: AnalysisLanguage,
  segments: Array<{ name: string; ratio: number }>
): string {
  const segmentWord = getMessage(language, 'segments');
  const list = segments.map(s => `${s.name}(${(s.ratio*100).toFixed(0)}%)`).join(', ');
  return `✅ ${segmentWord}: ${list}`;
}

/**
 * Format retention detail
 */
export function formatRetentionDetail(
  language: AnalysisLanguage,
  day1: number,
  day7: number,
  day30: number
): string {
  const retentionWord = getMessage(language, 'retention');
  return `✅ ${retentionWord}: D1=${(day1*100).toFixed(1)}%, D7=${(day7*100).toFixed(1)}%, D30=${(day30*100).toFixed(1)}%`;
}

/**
 * Format sequencing detail
 */
export function formatSequencingDetail(
  language: AnalysisLanguage,
  funnels: number,
  dependencies: number
): string {
  const funnelsWord = getMessage(language, 'funnels');
  const depsWord = getMessage(language, 'dependencies');
  return `✅ ${funnels}${language === 'zh' ? '个' : language === 'ja' ? '個' : '개'} ${funnelsWord}, ${dependencies}${language === 'zh' ? '个' : language === 'ja' ? '個' : '개'} ${depsWord}`;
}

/**
 * Format phase 4 group detail
 */
export function formatPhase4GroupDetail(
  language: AnalysisLanguage,
  eventCount: number
): string {
  const eventsWord = getMessage(language, 'events');
  const propertiesWord = getMessage(language, 'properties');

  if (language === 'zh') {
    return `📊 ${eventCount}个${eventsWord}分类`;
  } else if (language === 'ja') {
    return `📊 ${eventCount}個の${eventsWord}をカテゴリ別にグループ化`;
  } else if (language === 'en') {
    return `📊 Grouping ${eventCount} ${eventsWord} by category`;
  } else {
    return `📊 ${eventCount}개 ${eventsWord}를 카테고리별로 그룹화`;
  }
}

/**
 * Format phase 4 completion detail
 */
export function formatPhase4CompletionDetail(
  language: AnalysisLanguage,
  groupCount: number
): string {
  const groupsWord = getMessage(language, 'groups');

  if (language === 'zh') {
    return `✅ 分组完成（每组最多10个事件）`;
  } else if (language === 'ja') {
    return `✅ グループ化完了（各グループ最大10イベント）`;
  } else if (language === 'en') {
    return `✅ Grouping completed (max 10 events/group)`;
  } else {
    return `✅ 그룹화 완료 (최대 10개 이벤트/그룹)`;
  }
}

/**
 * Format phase 5 completion detail
 */
export function formatPhase5CompletionDetail(
  language: AnalysisLanguage,
  segments: number,
  eventRanges: number
): string {
  const segmentsWord = getMessage(language, 'segments');
  const eventsWord = getMessage(language, 'events');

  if (language === 'zh') {
    return `✅ ${segments}个${segmentsWord}，${eventRanges}个${eventsWord}范围生成完成`;
  } else if (language === 'ja') {
    return `✅ ${segments}個の${segmentsWord}、${eventRanges}個の${eventsWord}範囲生成完了`;
  } else if (language === 'en') {
    return `✅ ${segments} ${segmentsWord}, ${eventRanges} event ranges generated`;
  } else {
    return `✅ ${segments}개 ${segmentsWord}, ${eventRanges}개 ${eventsWord} 범위 생성 완료`;
  }
}
