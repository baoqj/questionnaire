#!/usr/bin/env node

/**
 * 🔍 配置检查脚本
 * 验证环境变量配置是否正确
 */

const fs = require('fs');
const path = require('path');

// 加载环境变量
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

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

function checkConfig() {
  colorLog('cyan', '🔍 CRS Check 问卷系统 - 配置检查');
  colorLog('yellow', '=' .repeat(50));
  
  const envPath = path.join(process.cwd(), '.env.local');
  
  // 检查 .env.local 文件是否存在
  if (!fs.existsSync(envPath)) {
    colorLog('red', '❌ .env.local 文件不存在');
    colorLog('yellow', '💡 请运行 node scripts/setup-env.js 进行配置');
    return false;
  }
  
  colorLog('green', '✅ .env.local 文件存在');
  
  let allValid = true;
  
  // 检查必需的环境变量
  colorLog('blue', '\n🔧 必需配置检查:');
  
  const requiredVars = [
    { name: 'LLM_API_KEY', description: 'LLM API 密钥' }
  ];
  
  requiredVars.forEach(({ name, description }) => {
    if (process.env[name]) {
      colorLog('green', `✅ ${description}: 已配置`);
    } else {
      colorLog('red', `❌ ${description}: 未配置`);
      allValid = false;
    }
  });
  
  // 检查邮件配置
  colorLog('blue', '\n📧 邮件服务配置检查:');
  
  const emailService = process.env.EMAIL_SERVICE || 'smtp';
  colorLog('cyan', `📮 邮件服务类型: ${emailService}`);
  
  let emailValid = true;
  
  switch (emailService) {
    case 'smtp':
      const smtpVars = [
        { name: 'SMTP_HOST', description: 'SMTP 主机' },
        { name: 'SMTP_USER', description: 'SMTP 用户名' },
        { name: 'SMTP_PASS', description: 'SMTP 密码' }
      ];
      
      smtpVars.forEach(({ name, description }) => {
        if (process.env[name]) {
          colorLog('green', `✅ ${description}: 已配置`);
        } else {
          colorLog('red', `❌ ${description}: 未配置`);
          emailValid = false;
        }
      });
      break;
      
    case 'sendgrid':
      if (process.env.SENDGRID_API_KEY) {
        colorLog('green', '✅ SendGrid API Key: 已配置');
      } else {
        colorLog('red', '❌ SendGrid API Key: 未配置');
        emailValid = false;
      }
      break;
      
    case 'resend':
      if (process.env.RESEND_API_KEY) {
        colorLog('green', '✅ Resend API Key: 已配置');
      } else {
        colorLog('red', '❌ Resend API Key: 未配置');
        emailValid = false;
      }
      break;
  }
  
  if (!emailValid) {
    colorLog('yellow', '⚠️  邮件功能将无法正常工作');
    allValid = false;
  }
  
  // 检查LLM配置
  colorLog('blue', '\n🤖 LLM API 配置检查:');
  
  const llmVars = [
    { name: 'LLM_API_ENDPOINT', description: 'LLM API 端点', default: 'https://api.suanli.cn/v1' },
    { name: 'LLM_API_KEY', description: 'LLM API 密钥' },
    { name: 'LLM_MODEL', description: 'LLM 模型', default: 'free:Qwen3-30B-A3B' }
  ];
  
  llmVars.forEach(({ name, description, default: defaultValue }) => {
    const value = process.env[name];
    if (value) {
      colorLog('green', `✅ ${description}: ${value === defaultValue ? '(默认值)' : '已配置'}`);
    } else if (defaultValue) {
      colorLog('yellow', `⚠️  ${description}: 使用默认值 (${defaultValue})`);
    } else {
      colorLog('red', `❌ ${description}: 未配置`);
      allValid = false;
    }
  });
  
  // 检查安全配置
  colorLog('blue', '\n🔒 安全配置检查:');
  
  const securityVars = [
    { name: 'JWT_SECRET', description: 'JWT 密钥' },
    { name: 'SESSION_SECRET', description: '会话密钥' }
  ];
  
  securityVars.forEach(({ name, description }) => {
    const value = process.env[name];
    if (value) {
      if (value.includes('default') || value.includes('change')) {
        colorLog('yellow', `⚠️  ${description}: 使用默认值 (建议更改)`);
      } else {
        colorLog('green', `✅ ${description}: 已配置`);
      }
    } else {
      colorLog('red', `❌ ${description}: 未配置`);
      allValid = false;
    }
  });
  
  // 总结
  colorLog('blue', '\n📋 配置检查总结:');
  
  if (allValid) {
    colorLog('green', '🎉 所有配置检查通过！');
    colorLog('bright', '🚀 可以正常启动应用程序');
  } else {
    colorLog('red', '❌ 配置检查失败');
    colorLog('yellow', '💡 请修复上述问题后重新检查');
    colorLog('bright', '🔧 运行 node scripts/setup-env.js 重新配置');
  }
  
  return allValid;
}

// 运行配置检查
const isValid = checkConfig();
process.exit(isValid ? 0 : 1);
