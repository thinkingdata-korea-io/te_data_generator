export const ko = {
  // Common
  common: {
    loading: '로딩 중...',
    save: '저장',
    cancel: '취소',
    delete: '삭제',
    edit: '수정',
    back: '뒤로',
    next: '다음',
    confirm: '확인',
    search: '검색',
    filter: '필터',
    export: '내보내기',
    import: '가져오기',
  },

  // Auth
  auth: {
    login: '로그인',
    logout: '로그아웃',
    username: '사용자명',
    password: '비밀번호',
    loginButton: '시스템 접속',
    loginSuccess: '인증 성공',
    loginFailed: '인증 실패',
  },

  // Navigation
  nav: {
    dashboard: '대시보드',
    dataGenerator: '데이터 생성기',
    settings: '설정',
    userManagement: '사용자 관리',
    auditLogs: '감사 로그',
  },

  // Dashboard
  dashboard: {
    title: 'ThinkingEngine',
    subtitle: 'AI 기반 이벤트 데이터 생성 플랫폼',
    totalRuns: '총 실행 횟수',
    totalEvents: '총 이벤트 수',
    activeUsers: '활성 사용자',
    storageUsed: '스토리지 사용량',
    recentActivity: '최근 활동',
    quickActions: '빠른 작업',
    systemStatus: '시스템 상태',
    uptime: '가동 시간',
    status: '상태',
    online: 'Online',
  },

  // Data Generator
  generator: {
    title: '데이터 생성 방법을 선택하세요',
    selectMode: '데이터 생성 방법 선택',

    // Mode selection
    newStart: '새로 시작하기',
    newStartDesc: '산업/서비스 정보를 입력하여\n엑셀 스키마부터 자동으로 생성합니다',
    newStartStep1: '1. 서비스 정보 입력',
    newStartStep2: '2. 엑셀 스키마 자동 생성',
    newStartStep3: '3. 데이터 생성',

    useExcel: '기존 엑셀 사용하기',
    useExcelDesc: '이미 만들어진 엑셀 파일을 업로드하여\n바로 데이터를 생성합니다',
    useExcelStep1: '1. 엑셀 파일 업로드',
    useExcelStep2: '2. 서비스 정보 및 설정 입력',
    useExcelStep3: '3. 데이터 생성',

    // Input form
    serviceInfo: '서비스 정보 입력',
    scenario: '시나리오 설명',
    scenarioPlaceholder: '예: 모바일 게임 앱, 전자상거래 플랫폼, 교육 콘텐츠 서비스',
    dau: 'DAU (일일 활성 사용자 수)',
    dauPlaceholder: '예: 10000',
    industry: '산업 분류',
    industryPlaceholder: '예: 게임, 이커머스, 교육, 핀테크',
    notes: '추가 요구사항',
    notesPlaceholder: '특정 이벤트나 사용자 행동 패턴이 있다면 설명해주세요',
    dateRange: '데이터 생성 기간',
    startDate: '시작일',
    endDate: '종료일',
    generateExcel: '엑셀 생성 시작',
    required: '필수',

    // Excel upload
    uploadExcel: '엑셀 파일 업로드',
    uploadDesc: 'ThinkingEngine 스키마 형식의 엑셀 파일을 선택하세요',
    dragDrop: '파일을 드래그하거나 클릭하여 선택',
    supportedFormats: '지원 형식: .xlsx, .xls (최대 10MB)',
    uploadButton: '파일 업로드',
    uploading: '업로드 중...',
    uploadSuccess: '업로드 성공',
    uploadError: '업로드 실패',

    // Excel preview
    excelPreview: '엑셀 파일 미리보기',
    previewSummary: '스키마 요약',
    eventCount: '이벤트 수',
    eventPropertiesCount: '이벤트 속성 수',
    commonPropertiesCount: '공통 속성 수',
    userDataCount: '사용자 데이터 항목',
    generatedAt: '생성 시간',
    provider: 'AI 제공자',
    requestedEvents: '요청 이벤트 수',
    downloadExcel: '엑셀 다운로드',
    proceedToGeneration: '데이터 생성 단계로',

    // Data generation config
    generationConfig: '데이터 생성 설정',
    appId: 'APP ID',
    appIdPlaceholder: 'ThinkingEngine APP ID 입력',
    receiverUrl: 'Receiver URL',
    eventCountToGenerate: '생성할 이벤트 수',
    eventCountPlaceholder: '예: 1000',
    generateData: '데이터 생성 시작',

    // Progress
    generatingExcel: '엑셀 생성 중...',
    generatingData: '데이터 생성 중...',
    sendingData: '데이터 전송 중...',
    completed: '완료',
    progress: '진행률',

    // Results
    generationComplete: '데이터 생성 완료',
    sendingComplete: '데이터 전송 완료',
    totalGenerated: '생성된 총 이벤트',
    totalSent: '전송된 총 이벤트',
    downloadData: '데이터 다운로드',
    sendToTE: 'ThinkingEngine으로 전송',
    viewDetails: '상세 보기',
    startNew: '새로 시작',
  },

  // Settings
  settings: {
    title: '설정',
    userProfile: '사용자 프로필',
    aiProviders: 'AI 제공자',
    platformConfig: '플랫폼 설정',
    dataRetention: '데이터 보관',

    // User profile
    displayName: '표시 이름',
    email: '이메일',
    role: '역할',
    currentPassword: '현재 비밀번호',
    newPassword: '새 비밀번호',
    confirmPassword: '비밀번호 확인',
    updateProfile: '프로필 업데이트',

    // AI providers
    anthropicKey: 'Anthropic API 키',
    openaiKey: 'OpenAI API 키',
    excelProvider: '엑셀 생성 AI',
    dataProvider: '데이터 생성 AI',
    testConnection: '연결 테스트',

    // Platform config
    teAppId: 'TE APP ID',
    teReceiverUrl: 'TE Receiver URL',
    defaultDau: '기본 DAU',
    defaultOutputDir: '기본 출력 디렉토리',

    // Data retention
    dataRetentionDays: '데이터 보관 기간',
    excelRetentionDays: '엑셀 보관 기간',
    autoDeleteAfterSend: '전송 후 자동 삭제',
    days: '일',
    enabled: '사용',
    disabled: '사용 안함',
  },

  // User Management
  users: {
    title: '사용자 관리',
    addUser: '사용자 추가',
    editUser: '사용자 수정',
    deleteUser: '사용자 삭제',
    username: '사용자명',
    email: '이메일',
    role: '역할',
    createdAt: '생성일',
    lastLogin: '마지막 로그인',
    actions: '작업',
    admin: '관리자',
    user: '사용자',
    viewer: '뷰어',
  },

  // Audit Logs
  audit: {
    title: '감사 로그',
    timestamp: '시간',
    user: '사용자',
    action: '작업',
    resource: '리소스',
    ipAddress: 'IP 주소',
    userAgent: 'User Agent',
    details: '상세 정보',
  },

  // Errors
  errors: {
    generic: '오류가 발생했습니다',
    networkError: '네트워크 오류',
    unauthorized: '권한이 없습니다',
    notFound: '찾을 수 없습니다',
    serverError: '서버 오류',
    validationError: '입력값을 확인해주세요',
  },

  // Success messages
  success: {
    saved: '저장되었습니다',
    deleted: '삭제되었습니다',
    updated: '업데이트되었습니다',
    created: '생성되었습니다',
  },
};
