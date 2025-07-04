/**
 * 🧪 LLM API 测试端点
 * 用于测试和诊断LLM服务连接问题
 */

import { NextRequest, NextResponse } from 'next/server';
import { LLMTester } from '@/lib/llm-test';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 开始LLM API测试...');

    // 检查环境变量
    const envCheck = {
      LLM_ENABLE_MOCK: process.env.LLM_ENABLE_MOCK,
      LLM_FORCE_REAL_API: process.env.LLM_FORCE_REAL_API,
      NODE_ENV: process.env.NODE_ENV,
      LLM_PRIMARY_API_KEY: process.env.LLM_PRIMARY_API_KEY ? '已设置' : '未设置',
      LLM_BACKUP_API_KEY: process.env.LLM_BACKUP_API_KEY ? '已设置' : '未设置',
      mockModeActive: process.env.LLM_ENABLE_MOCK === 'true' ||
                     (process.env.NODE_ENV === 'production' && !process.env.LLM_FORCE_REAL_API)
    };

    console.log('🔍 环境变量检查:', envCheck);

    // 执行全面测试
    const results = await LLMTester.testAllProviders({
      verbose: true,
      timeout: 15000
    });

    // 生成详细报告
    const report = LLMTester.generateReport(results);

    console.log('📋 测试报告:');
    console.log(report);

    return NextResponse.json({
      success: results.summary.successCount > 0,
      environmentCheck: envCheck,
      results,
      report,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ LLM测试失败:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider = 'primary', message, timeout } = body;

    console.log(`🧪 测试单个LLM提供商: ${provider}`);
    
    const result = await LLMTester.testProvider(provider, {
      testMessage: message,
      timeout,
      verbose: true
    });

    console.log(`📋 ${provider} 测试结果:`, result);

    return NextResponse.json({
      success: result.success,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ LLM单项测试失败:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
