#!/usr/bin/env node

/**
 * LLM服务测试脚本
 * 用于验证多平台LLM配置和连接
 */

const { LLM_CONFIG } = require('../lib/config.ts');

// 测试单个LLM服务
async function testSingleLLM(name, endpoint, apiKey, model) {
  console.log(`\n🧪 测试 ${name}...`);
  console.log(`📡 端点: ${endpoint}`);
  console.log(`🔑 API Key: ${apiKey ? `${apiKey.substring(0, 10)}...` : '未配置'}`);
  console.log(`🤖 模型: ${model}`);

  if (!apiKey) {
    console.log(`❌ ${name}: API Key未配置`);
    return false;
  }

  try {
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的AI助手。'
          },
          {
            role: 'user',
            content: '请简单介绍一下你自己，不超过50字。'
          }
        ],
        temperature: 0.7,
        max_tokens: 100
      }),
      signal: AbortSignal.timeout(15000) // 15秒超时
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.log(`❌ ${name}: HTTP ${response.status} - ${errorText}`);
      return false;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (content) {
      console.log(`✅ ${name}: 连接成功`);
      console.log(`📝 响应: ${content.substring(0, 100)}...`);
      return true;
    } else {
      console.log(`❌ ${name}: 响应格式无效`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    return false;
  }
}

// 主测试函数
async function testLLMServices() {
  console.log('🚀 开始测试LLM服务配置...\n');

  // 测试主要服务
  const primaryResult = await testSingleLLM(
    LLM_CONFIG.primary.name,
    LLM_CONFIG.primary.endpoint,
    LLM_CONFIG.primary.apiKey,
    LLM_CONFIG.primary.model
  );

  // 测试备用服务
  const backupResult = await testSingleLLM(
    LLM_CONFIG.backup.name,
    LLM_CONFIG.backup.endpoint,
    LLM_CONFIG.backup.apiKey,
    LLM_CONFIG.backup.model
  );

  // 总结
  console.log('\n📊 测试结果总结:');
  console.log(`🎯 主要服务 (${LLM_CONFIG.primary.name}): ${primaryResult ? '✅ 可用' : '❌ 不可用'}`);
  console.log(`🔄 备用服务 (${LLM_CONFIG.backup.name}): ${backupResult ? '✅ 可用' : '❌ 不可用'}`);
  console.log(`🛡️ 容错机制: ${LLM_CONFIG.enableFallback ? '✅ 已启用' : '❌ 已禁用'}`);

  if (!primaryResult && !backupResult) {
    console.log('\n⚠️ 警告: 所有LLM服务都不可用！');
    console.log('请检查：');
    console.log('1. 网络连接是否正常');
    console.log('2. API Key是否正确');
    console.log('3. 服务端点是否可访问');
    process.exit(1);
  } else if (!primaryResult && backupResult) {
    console.log('\n⚠️ 注意: 主要服务不可用，将使用备用服务');
  } else if (primaryResult && !backupResult) {
    console.log('\n⚠️ 注意: 备用服务不可用，仅主要服务可用');
  } else {
    console.log('\n🎉 所有服务都可用！');
  }
}

// 运行测试
if (require.main === module) {
  testLLMServices().catch(console.error);
}

module.exports = { testLLMServices, testSingleLLM };
