export const en = {
  // Common
  common: {
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    back: 'Back',
    next: 'Next',
    confirm: 'Confirm',
    search: 'Search',
    filter: 'Filter',
    export: 'Export',
    import: 'Import',
  },

  // Auth
  auth: {
    login: 'Login',
    logout: 'Logout',
    username: 'Username',
    password: 'Password',
    loginButton: 'Access System',
    loginSuccess: 'Authentication Successful',
    loginFailed: 'Authentication Failed',
  },

  // Navigation
  nav: {
    dashboard: 'Dashboard',
    dataGenerator: 'Data Generator',
    settings: 'Settings',
    userManagement: 'User Management',
    auditLogs: 'Audit Logs',
  },

  // Dashboard
  dashboard: {
    title: 'ThinkingEngine',
    subtitle: 'AI-Powered Event Data Generation Platform',
    totalRuns: 'Total Runs',
    totalEvents: 'Total Events',
    activeUsers: 'Active Users',
    storageUsed: 'Storage Used',
    recentActivity: 'Recent Activity',
    quickActions: 'Quick Actions',
    systemStatus: 'System Status',
    uptime: 'Uptime',
    status: 'Status',
    online: 'Online',
  },

  // Data Generator
  generator: {
    title: 'Select Data Generation Method',
    selectMode: 'Choose Data Generation Method',

    // Mode selection
    newStart: 'Start from Scratch',
    newStartDesc: 'Input industry/service information to\nautomatically generate Excel schema',
    newStartStep1: '1. Input Service Information',
    newStartStep2: '2. Auto-generate Excel Schema',
    newStartStep3: '3. Generate Data',

    useExcel: 'Use Existing Excel',
    useExcelDesc: 'Upload a pre-made Excel file to\ngenerate data directly',
    useExcelStep1: '1. Upload Excel File',
    useExcelStep2: '2. Input Service Info & Settings',
    useExcelStep3: '3. Generate Data',

    // Input form
    serviceInfo: 'Service Information',
    scenario: 'Scenario Description',
    scenarioPlaceholder: 'e.g., Mobile game app, E-commerce platform, Educational content service',
    dau: 'DAU (Daily Active Users)',
    dauPlaceholder: 'e.g., 10000',
    industry: 'Industry Category',
    industryPlaceholder: 'e.g., Gaming, E-commerce, Education, Fintech',
    notes: 'Additional Requirements',
    notesPlaceholder: 'Describe any specific events or user behavior patterns',
    dateRange: 'Data Generation Period',
    startDate: 'Start Date',
    endDate: 'End Date',
    generateExcel: 'Start Excel Generation',
    required: 'Required',

    // Excel upload
    uploadExcel: 'Upload Excel File',
    uploadDesc: 'Select an Excel file in ThinkingEngine schema format',
    dragDrop: 'Drag & drop or click to select file',
    supportedFormats: 'Supported: .xlsx, .xls (Max 10MB)',
    uploadButton: 'Upload File',
    uploading: 'Uploading...',
    uploadSuccess: 'Upload Successful',
    uploadError: 'Upload Failed',

    // Excel preview
    excelPreview: 'Excel File Preview',
    previewSummary: 'Schema Summary',
    eventCount: 'Event Count',
    eventPropertiesCount: 'Event Properties',
    commonPropertiesCount: 'Common Properties',
    userDataCount: 'User Data Items',
    generatedAt: 'Generated At',
    provider: 'AI Provider',
    requestedEvents: 'Requested Events',
    downloadExcel: 'Download Excel',
    proceedToGeneration: 'Proceed to Generation',

    // Data generation config
    generationConfig: 'Data Generation Settings',
    appId: 'APP ID',
    appIdPlaceholder: 'Enter ThinkingEngine APP ID',
    receiverUrl: 'Receiver URL',
    eventCountToGenerate: 'Events to Generate',
    eventCountPlaceholder: 'e.g., 1000',
    generateData: 'Start Data Generation',

    // Progress
    generatingExcel: 'Generating Excel...',
    generatingData: 'Generating Data...',
    sendingData: 'Sending Data...',
    completed: 'Completed',
    progress: 'Progress',

    // Results
    generationComplete: 'Data Generation Complete',
    sendingComplete: 'Data Sending Complete',
    totalGenerated: 'Total Events Generated',
    totalSent: 'Total Events Sent',
    downloadData: 'Download Data',
    sendToTE: 'Send to ThinkingEngine',
    viewDetails: 'View Details',
    startNew: 'Start New',
  },

  // Settings
  settings: {
    title: 'Settings',
    userProfile: 'User Profile',
    aiProviders: 'AI Providers',
    platformConfig: 'Platform Configuration',
    dataRetention: 'Data Retention',

    // User profile
    displayName: 'Display Name',
    email: 'Email',
    role: 'Role',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm Password',
    updateProfile: 'Update Profile',

    // AI providers
    anthropicKey: 'Anthropic API Key',
    openaiKey: 'OpenAI API Key',
    excelProvider: 'Excel Generation AI',
    dataProvider: 'Data Generation AI',
    testConnection: 'Test Connection',

    // Platform config
    teAppId: 'TE APP ID',
    teReceiverUrl: 'TE Receiver URL',
    defaultDau: 'Default DAU',
    defaultOutputDir: 'Default Output Directory',

    // Data retention
    dataRetentionDays: 'Data Retention Period',
    excelRetentionDays: 'Excel Retention Period',
    autoDeleteAfterSend: 'Auto-delete After Send',
    days: 'days',
    enabled: 'Enabled',
    disabled: 'Disabled',
  },

  // User Management
  users: {
    title: 'User Management',
    addUser: 'Add User',
    editUser: 'Edit User',
    deleteUser: 'Delete User',
    username: 'Username',
    email: 'Email',
    role: 'Role',
    createdAt: 'Created At',
    lastLogin: 'Last Login',
    actions: 'Actions',
    admin: 'Admin',
    user: 'User',
    viewer: 'Viewer',
  },

  // Audit Logs
  audit: {
    title: 'Audit Logs',
    timestamp: 'Timestamp',
    user: 'User',
    action: 'Action',
    resource: 'Resource',
    ipAddress: 'IP Address',
    userAgent: 'User Agent',
    details: 'Details',
  },

  // Errors
  errors: {
    generic: 'An error occurred',
    networkError: 'Network error',
    unauthorized: 'Unauthorized',
    notFound: 'Not found',
    serverError: 'Server error',
    validationError: 'Please check your input',
  },

  // Success messages
  success: {
    saved: 'Saved successfully',
    deleted: 'Deleted successfully',
    updated: 'Updated successfully',
    created: 'Created successfully',
  },
};
