/**
 * 🔧 应用程序配置管理
 * 统一管理所有环境变量和配置常量
 */

// ===========================================
// 📧 邮件服务配置
// ===========================================
export const EMAIL_CONFIG = {
  service: process.env.EMAIL_SERVICE || 'smtp',
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.qq.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  },
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
    fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com'
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.RESEND_FROM_EMAIL || 'noreply@example.com'
  }
} as const;

// ===========================================
// 🤖 LLM API配置
// ===========================================
export const LLM_CONFIG = {
  endpoint: process.env.LLM_API_ENDPOINT || 'https://api.suanli.cn/v1',
  apiKey: process.env.LLM_API_KEY || '',
  model: process.env.LLM_MODEL || 'free:Qwen3-30B-A3B',
  timeout: parseInt(process.env.LLM_TIMEOUT || '60000'),
  maxRetries: parseInt(process.env.LLM_MAX_RETRIES || '3')
} as const;

// ===========================================
// 🔒 安全配置
// ===========================================
export const SECURITY_CONFIG = {
  jwtSecret: process.env.JWT_SECRET || 'default-jwt-secret-change-in-production',
  sessionSecret: process.env.SESSION_SECRET || 'default-session-secret-change-in-production'
} as const;

// ===========================================
// 🔧 应用程序配置
// ===========================================
export const APP_CONFIG = {
  name: process.env.APP_NAME || 'CRS Check 问卷系统',
  version: process.env.APP_VERSION || '1.0.0',
  env: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production'
} as const;

// ===========================================
// 🗄️ 数据库配置
// ===========================================
export const DATABASE_CONFIG = {
  url: process.env.DATABASE_URL || '',
  // 文件存储路径配置
  dataDir: 'src/data',
  usersFile: 'users.json',
  surveysDir: 'surveys',
  responsesDir: 'responses'
} as const;

// ===========================================
// 📊 分析和监控配置
// ===========================================
export const ANALYTICS_CONFIG = {
  googleAnalyticsId: process.env.NEXT_PUBLIC_GA_ID || '',
  sentryDsn: process.env.SENTRY_DSN || ''
} as const;

// ===========================================
// 🎯 业务配置常量
// ===========================================
export const BUSINESS_CONFIG = {
  // 问卷配置
  survey: {
    maxQuestions: 100,
    autoSaveInterval: 30000, // 30秒
    defaultEstimatedTime: '5-10分钟'
  },
  
  // UI配置
  ui: {
    animationDuration: 300,
    notificationDuration: 5000,
    loadingMinDuration: 1000
  },
  
  // 分析配置
  analysis: {
    maxRetries: 3,
    cacheTimeout: 300000, // 5分钟
    batchSize: 10
  }
} as const;

// ===========================================
// 🔍 配置验证工具
// ===========================================
export class ConfigValidator {
  /**
   * 验证必需的环境变量是否已设置
   */
  static validateRequired(): { isValid: boolean; missingVars: string[] } {
    const requiredVars = [
      'LLM_API_KEY'
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    return {
      isValid: missingVars.length === 0,
      missingVars
    };
  }
  
  /**
   * 验证邮件配置是否完整
   */
  static validateEmailConfig(): { isValid: boolean; missingVars: string[] } {
    const service = EMAIL_CONFIG.service;
    let requiredVars: string[] = [];
    
    switch (service) {
      case 'smtp':
        requiredVars = ['SMTP_USER', 'SMTP_PASS'];
        break;
      case 'sendgrid':
        requiredVars = ['SENDGRID_API_KEY'];
        break;
      case 'resend':
        requiredVars = ['RESEND_API_KEY'];
        break;
    }
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    return {
      isValid: missingVars.length === 0,
      missingVars
    };
  }
  
  /**
   * 打印配置状态（仅在开发环境）
   */
  static printConfigStatus(): void {
    if (!APP_CONFIG.isDevelopment) return;
    
    console.log('🔧 配置状态检查:');
    
    const requiredValidation = this.validateRequired();
    console.log(`✅ 必需配置: ${requiredValidation.isValid ? '完整' : '缺失'}`);
    if (!requiredValidation.isValid) {
      console.log(`❌ 缺失变量: ${requiredValidation.missingVars.join(', ')}`);
    }
    
    const emailValidation = this.validateEmailConfig();
    console.log(`📧 邮件配置: ${emailValidation.isValid ? '完整' : '缺失'}`);
    if (!emailValidation.isValid) {
      console.log(`❌ 缺失变量: ${emailValidation.missingVars.join(', ')}`);
    }
    
    console.log(`🤖 LLM服务: ${LLM_CONFIG.endpoint}`);
    console.log(`📧 邮件服务: ${EMAIL_CONFIG.service}`);
    console.log(`🔧 运行环境: ${APP_CONFIG.env}`);
  }
}

// 在开发环境下自动打印配置状态
if (typeof window === 'undefined' && APP_CONFIG.isDevelopment) {
  ConfigValidator.printConfigStatus();
}
