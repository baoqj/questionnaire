#!/usr/bin/env node

/**
 * 🔧 环境变量设置脚本
 * 帮助用户快速配置环境变量
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupEnvironment() {
  colorLog('cyan', '🔧 CRS Check 问卷系统 - 环境变量配置向导');
  colorLog('yellow', '=' .repeat(50));
  
  const envPath = path.join(process.cwd(), '.env.local');
  const examplePath = path.join(process.cwd(), '.env.example');
  
  // 检查是否已存在 .env.local
  if (fs.existsSync(envPath)) {
    colorLog('yellow', '⚠️  .env.local 文件已存在');
    const overwrite = await question('是否要重新配置？(y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      colorLog('green', '✅ 配置已取消');
      rl.close();
      return;
    }
  }
  
  colorLog('blue', '\n📧 邮件服务配置');
  colorLog('bright', '支持的邮件服务: smtp, sendgrid, resend');
  const emailService = await question('选择邮件服务 (smtp): ') || 'smtp';
  
  let emailConfig = `EMAIL_SERVICE=${emailService}\n`;
  
  if (emailService === 'smtp') {
    colorLog('blue', '\n🔧 SMTP 配置');
    const smtpHost = await question('SMTP 主机 (smtp.qq.com): ') || 'smtp.qq.com';
    const smtpPort = await question('SMTP 端口 (587): ') || '587';
    const smtpUser = await question('SMTP 用户名: ');
    const smtpPass = await question('SMTP 密码/授权码: ');
    
    emailConfig += `SMTP_HOST=${smtpHost}\n`;
    emailConfig += `SMTP_PORT=${smtpPort}\n`;
    emailConfig += `SMTP_SECURE=false\n`;
    emailConfig += `SMTP_USER=${smtpUser}\n`;
    emailConfig += `SMTP_PASS=${smtpPass}\n`;
  } else if (emailService === 'sendgrid') {
    const apiKey = await question('SendGrid API Key: ');
    const fromEmail = await question('发送邮箱: ');
    
    emailConfig += `SENDGRID_API_KEY=${apiKey}\n`;
    emailConfig += `SENDGRID_FROM_EMAIL=${fromEmail}\n`;
  } else if (emailService === 'resend') {
    const apiKey = await question('Resend API Key: ');
    const fromEmail = await question('发送邮箱: ');
    
    emailConfig += `RESEND_API_KEY=${apiKey}\n`;
    emailConfig += `RESEND_FROM_EMAIL=${fromEmail}\n`;
  }
  
  colorLog('blue', '\n🤖 LLM API 配置');
  const llmEndpoint = await question('LLM API 端点 (https://api.suanli.cn/v1): ') || 'https://api.suanli.cn/v1';
  const llmApiKey = await question('LLM API Key: ');
  const llmModel = await question('LLM 模型 (free:Qwen3-30B-A3B): ') || 'free:Qwen3-30B-A3B';
  
  const llmConfig = `
# LLM API配置
LLM_API_ENDPOINT=${llmEndpoint}
LLM_API_KEY=${llmApiKey}
LLM_MODEL=${llmModel}
LLM_TIMEOUT=60000
LLM_MAX_RETRIES=3
`;
  
  colorLog('blue', '\n🔒 安全配置');
  const jwtSecret = await question('JWT 密钥 (留空使用随机生成): ') || generateRandomString(32);
  const sessionSecret = await question('会话密钥 (留空使用随机生成): ') || generateRandomString(32);
  
  const securityConfig = `
# 安全配置
JWT_SECRET=${jwtSecret}
SESSION_SECRET=${sessionSecret}
`;
  
  const appConfig = `
# 应用程序配置
APP_NAME=CRS Check 问卷系统
APP_VERSION=1.0.0
NODE_ENV=development
`;
  
  // 生成完整的 .env.local 文件
  const envContent = `# ===========================================
# 🔐 环境变量配置文件 (.env.local)
# ===========================================
# 此文件包含真实的配置值，不会被提交到版本控制系统
# 生成时间: ${new Date().toISOString()}

# ===========================================
# 📧 邮件服务配置
# ===========================================
${emailConfig}
${llmConfig}
${securityConfig}
${appConfig}
# ===========================================
# 📊 分析和监控配置 (可选)
# ===========================================
# NEXT_PUBLIC_GA_ID=
# SENTRY_DSN=
`;
  
  // 写入文件
  fs.writeFileSync(envPath, envContent);
  
  colorLog('green', '\n✅ 环境变量配置完成！');
  colorLog('yellow', `📁 配置文件已保存到: ${envPath}`);
  colorLog('blue', '\n🚀 下一步操作:');
  colorLog('bright', '1. 检查配置文件内容');
  colorLog('bright', '2. 运行 npm run dev 启动开发服务器');
  colorLog('bright', '3. 测试邮件发送和AI分析功能');
  
  rl.close();
}

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 运行配置向导
setupEnvironment().catch(error => {
  colorLog('red', `❌ 配置失败: ${error.message}`);
  rl.close();
  process.exit(1);
});
