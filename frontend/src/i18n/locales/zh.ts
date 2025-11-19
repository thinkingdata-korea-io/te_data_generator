export const zh = {
  // Common
  common: {
    loading: '加载中...',
    save: '保存',
    cancel: '取消',
    delete: '删除',
    edit: '编辑',
    back: '返回',
    next: '下一步',
    confirm: '确认',
    search: '搜索',
    filter: '筛选',
    export: '导出',
    import: '导入',
  },

  // Auth
  auth: {
    login: '登录',
    logout: '登出',
    username: '用户名',
    password: '密码',
    loginButton: '访问系统',
    loginSuccess: '认证成功',
    loginFailed: '认证失败',
  },

  // Navigation
  nav: {
    dashboard: '仪表板',
    dataGenerator: '数据生成器',
    settings: '设置',
    userManagement: '用户管理',
    auditLogs: '审计日志',
  },

  // Dashboard
  dashboard: {
    title: 'ThinkingEngine',
    subtitle: 'AI驱动的事件数据生成平台',
    totalRuns: '总运行次数',
    totalEvents: '总事件数',
    activeUsers: '活跃用户',
    storageUsed: '存储使用量',
    recentActivity: '最近活动',
    quickActions: '快捷操作',
    systemStatus: '系统状态',
    uptime: '运行时间',
    status: '状态',
    online: '在线',
  },

  // Data Generator
  generator: {
    title: '选择数据生成方式',
    selectMode: '选择数据生成方法',

    // Mode selection
    newStart: '从头开始',
    newStartDesc: '输入行业/服务信息\n自动生成Excel架构',
    newStartStep1: '1. 输入服务信息',
    newStartStep2: '2. 自动生成Excel架构',
    newStartStep3: '3. 生成数据',

    useExcel: '使用现有Excel',
    useExcelDesc: '上传预制的Excel文件\n直接生成数据',
    useExcelStep1: '1. 上传Excel文件',
    useExcelStep2: '2. 输入服务信息和设置',
    useExcelStep3: '3. 生成数据',

    // Input form
    serviceInfo: '服务信息',
    scenario: '场景描述',
    scenarioPlaceholder: '例如：手机游戏应用、电子商务平台、教育内容服务',
    dau: 'DAU（日活跃用户数）',
    dauPlaceholder: '例如：10000',
    industry: '行业分类',
    industryPlaceholder: '例如：游戏、电商、教育、金融科技',
    notes: '附加要求',
    notesPlaceholder: '描述任何特定事件或用户行为模式',
    dateRange: '数据生成期间',
    startDate: '开始日期',
    endDate: '结束日期',
    generateExcel: '开始生成Excel',
    required: '必填',

    // Excel upload
    uploadExcel: '上传Excel文件',
    uploadDesc: '选择ThinkingEngine架构格式的Excel文件',
    dragDrop: '拖放或点击选择文件',
    supportedFormats: '支持格式：.xlsx、.xls（最大10MB）',
    uploadButton: '上传文件',
    uploading: '上传中...',
    uploadSuccess: '上传成功',
    uploadError: '上传失败',

    // Excel preview
    excelPreview: 'Excel文件预览',
    previewSummary: '架构摘要',
    eventCount: '事件数量',
    eventPropertiesCount: '事件属性',
    commonPropertiesCount: '公共属性',
    userDataCount: '用户数据项',
    generatedAt: '生成时间',
    provider: 'AI提供商',
    requestedEvents: '请求的事件',
    downloadExcel: '下载Excel',
    proceedToGeneration: '进入生成步骤',

    // Data generation config
    generationConfig: '数据生成设置',
    appId: '应用ID',
    appIdPlaceholder: '输入ThinkingEngine应用ID',
    receiverUrl: '接收器URL',
    eventCountToGenerate: '要生成的事件数',
    eventCountPlaceholder: '例如：1000',
    generateData: '开始生成数据',

    // Progress
    generatingExcel: '正在生成Excel...',
    generatingData: '正在生成数据...',
    sendingData: '正在发送数据...',
    completed: '已完成',
    progress: '进度',

    // Results
    generationComplete: '数据生成完成',
    sendingComplete: '数据发送完成',
    totalGenerated: '生成的总事件',
    totalSent: '发送的总事件',
    downloadData: '下载数据',
    sendToTE: '发送到ThinkingEngine',
    viewDetails: '查看详情',
    startNew: '开始新任务',
  },

  // Settings
  settings: {
    title: '设置',
    userProfile: '用户资料',
    aiProviders: 'AI提供商',
    platformConfig: '平台配置',
    dataRetention: '数据保留',

    // User profile
    displayName: '显示名称',
    email: '电子邮件',
    role: '角色',
    currentPassword: '当前密码',
    newPassword: '新密码',
    confirmPassword: '确认密码',
    updateProfile: '更新资料',

    // AI providers
    anthropicKey: 'Anthropic API密钥',
    openaiKey: 'OpenAI API密钥',
    excelProvider: 'Excel生成AI',
    dataProvider: '数据生成AI',
    testConnection: '测试连接',

    // Platform config
    teAppId: 'TE应用ID',
    teReceiverUrl: 'TE接收器URL',
    defaultDau: '默认DAU',
    defaultOutputDir: '默认输出目录',

    // Data retention
    dataRetentionDays: '数据保留期',
    excelRetentionDays: 'Excel保留期',
    autoDeleteAfterSend: '发送后自动删除',
    days: '天',
    enabled: '启用',
    disabled: '禁用',
  },

  // User Management
  users: {
    title: '用户管理',
    addUser: '添加用户',
    editUser: '编辑用户',
    deleteUser: '删除用户',
    username: '用户名',
    email: '电子邮件',
    role: '角色',
    createdAt: '创建时间',
    lastLogin: '最后登录',
    actions: '操作',
    admin: '管理员',
    user: '用户',
    viewer: '查看者',
  },

  // Audit Logs
  audit: {
    title: '审计日志',
    timestamp: '时间戳',
    user: '用户',
    action: '操作',
    resource: '资源',
    ipAddress: 'IP地址',
    userAgent: '用户代理',
    details: '详情',
  },

  // Errors
  errors: {
    generic: '发生错误',
    networkError: '网络错误',
    unauthorized: '未授权',
    notFound: '未找到',
    serverError: '服务器错误',
    validationError: '请检查您的输入',
  },

  // Success messages
  success: {
    saved: '保存成功',
    deleted: '删除成功',
    updated: '更新成功',
    created: '创建成功',
  },
};
