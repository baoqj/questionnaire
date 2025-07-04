/**
 * 🧪 LLM API 测试和诊断工具
 * 用于详细测试和调试LLM API调用过程
 */

import { LLM_CONFIG } from '@/lib/config';

interface TestResult {
  success: boolean;
  provider: string;
  endpoint: string;
  model: string;
  responseTime: number;
  error?: string;
  response?: any;
  details: {
    configCheck: boolean;
    networkCheck: boolean;
    authCheck: boolean;
    responseCheck: boolean;
  };
}

interface LLMTestOptions {
  testMessage?: string;
  timeout?: number;
  verbose?: boolean;
}

export class LLMTester {
  private static readonly DEFAULT_TEST_MESSAGE = "请回复'测试成功'四个字，不要添加任何其他内容。";

  /**
   * 测试LLM配置是否正确
   */
  static validateConfig(): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    // 检查主要服务配置
    if (!LLM_CONFIG.primary.endpoint) {
      issues.push('主要LLM服务endpoint未配置');
    }
    if (!LLM_CONFIG.primary.apiKey) {
      issues.push('主要LLM服务API密钥未配置');
    }
    if (!LLM_CONFIG.primary.model) {
      issues.push('主要LLM服务模型未配置');
    }

    // 检查备用服务配置
    if (LLM_CONFIG.enableFallback) {
      if (!LLM_CONFIG.backup.endpoint) {
        issues.push('备用LLM服务endpoint未配置');
      }
      if (!LLM_CONFIG.backup.apiKey) {
        issues.push('备用LLM服务API密钥未配置');
      }
      if (!LLM_CONFIG.backup.model) {
        issues.push('备用LLM服务模型未配置');
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * 测试单个LLM提供商
   */
  static async testProvider(
    provider: 'primary' | 'backup',
    options: LLMTestOptions = {}
  ): Promise<TestResult> {
    const startTime = Date.now();
    const config = LLM_CONFIG[provider];
    const testMessage = options.testMessage || this.DEFAULT_TEST_MESSAGE;
    const timeout = options.timeout || LLM_CONFIG.timeout;

    const result: TestResult = {
      success: false,
      provider: config.name,
      endpoint: config.endpoint,
      model: config.model,
      responseTime: 0,
      details: {
        configCheck: false,
        networkCheck: false,
        authCheck: false,
        responseCheck: false
      }
    };

    try {
      // 1. 配置检查
      if (options.verbose) {
        console.log(`🔧 [${config.name}] 检查配置...`);
      }
      
      if (!config.endpoint || !config.apiKey || !config.model) {
        result.error = '配置不完整：缺少endpoint、apiKey或model';
        return result;
      }
      result.details.configCheck = true;

      // 2. 网络连接检查
      if (options.verbose) {
        console.log(`🌐 [${config.name}] 测试网络连接...`);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const requestBody = {
        model: config.model,
        messages: [
          {
            role: "system",
            content: "你是一个测试助手，请严格按照用户要求回复。"
          },
          {
            role: "user",
            content: testMessage
          }
        ],
        max_tokens: 50,
        temperature: 0.1
      };

      if (options.verbose) {
        console.log(`📤 [${config.name}] 发送请求:`, {
          endpoint: config.endpoint + '/chat/completions',
          model: config.model,
          messageLength: testMessage.length
        });
      }

      const response = await fetch(config.endpoint + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      result.details.networkCheck = true;

      // 3. 认证检查
      if (options.verbose) {
        console.log(`🔐 [${config.name}] 检查认证状态: ${response.status}`);
      }

      if (response.status === 401) {
        result.error = 'API密钥认证失败';
        return result;
      }

      if (response.status === 403) {
        result.error = 'API访问被拒绝，可能是权限问题';
        return result;
      }

      if (!response.ok) {
        const errorText = await response.text();
        result.error = `HTTP错误 ${response.status}: ${errorText}`;
        return result;
      }
      result.details.authCheck = true;

      // 4. 响应检查
      if (options.verbose) {
        console.log(`📥 [${config.name}] 解析响应...`);
      }

      const data = await response.json();
      result.response = data;

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        result.error = '响应格式不正确：缺少choices或message字段';
        return result;
      }

      const content = data.choices[0].message.content;
      if (!content || typeof content !== 'string') {
        result.error = '响应内容为空或格式不正确';
        return result;
      }

      result.details.responseCheck = true;
      result.success = true;
      result.responseTime = Date.now() - startTime;

      if (options.verbose) {
        console.log(`✅ [${config.name}] 测试成功! 响应时间: ${result.responseTime}ms`);
        console.log(`📝 [${config.name}] 响应内容: "${content}"`);
      }

    } catch (error: any) {
      result.error = `请求失败: ${error.message}`;
      result.responseTime = Date.now() - startTime;
      
      if (options.verbose) {
        console.error(`❌ [${config.name}] 测试失败:`, error);
      }
    }

    return result;
  }

  /**
   * 测试所有LLM提供商
   */
  static async testAllProviders(options: LLMTestOptions = {}): Promise<{
    primary: TestResult;
    backup?: TestResult;
    summary: {
      totalTested: number;
      successCount: number;
      failureCount: number;
      recommendedProvider: string | null;
    };
  }> {
    if (options.verbose) {
      console.log('🧪 开始LLM API全面测试...');
    }

    const results = {
      primary: await this.testProvider('primary', options),
      backup: undefined as TestResult | undefined,
      summary: {
        totalTested: 1,
        successCount: 0,
        failureCount: 0,
        recommendedProvider: null as string | null
      }
    };

    if (results.primary.success) {
      results.summary.successCount++;
      results.summary.recommendedProvider = 'primary';
    } else {
      results.summary.failureCount++;
    }

    // 测试备用服务
    if (LLM_CONFIG.enableFallback) {
      results.backup = await this.testProvider('backup', options);
      results.summary.totalTested++;

      if (results.backup.success) {
        results.summary.successCount++;
        if (!results.summary.recommendedProvider) {
          results.summary.recommendedProvider = 'backup';
        }
      } else {
        results.summary.failureCount++;
      }
    }

    if (options.verbose) {
      console.log('📊 测试总结:', results.summary);
    }

    return results;
  }

  /**
   * 生成详细的测试报告
   */
  static generateReport(results: any): string {
    let report = '🧪 LLM API 测试报告\n';
    report += '=' * 50 + '\n\n';

    // 配置验证
    const configValidation = this.validateConfig();
    report += '📋 配置验证:\n';
    report += `状态: ${configValidation.isValid ? '✅ 通过' : '❌ 失败'}\n`;
    if (!configValidation.isValid) {
      report += '问题:\n';
      configValidation.issues.forEach(issue => {
        report += `  - ${issue}\n`;
      });
    }
    report += '\n';

    // 主要服务测试结果
    report += '🎯 主要服务 (Qwen3):\n';
    report += `状态: ${results.primary.success ? '✅ 成功' : '❌ 失败'}\n`;
    report += `响应时间: ${results.primary.responseTime}ms\n`;
    if (results.primary.error) {
      report += `错误: ${results.primary.error}\n`;
    }
    report += `详细检查:\n`;
    report += `  - 配置检查: ${results.primary.details.configCheck ? '✅' : '❌'}\n`;
    report += `  - 网络检查: ${results.primary.details.networkCheck ? '✅' : '❌'}\n`;
    report += `  - 认证检查: ${results.primary.details.authCheck ? '✅' : '❌'}\n`;
    report += `  - 响应检查: ${results.primary.details.responseCheck ? '✅' : '❌'}\n`;
    report += '\n';

    // 备用服务测试结果
    if (results.backup) {
      report += '🔄 备用服务 (DeepSeek):\n';
      report += `状态: ${results.backup.success ? '✅ 成功' : '❌ 失败'}\n`;
      report += `响应时间: ${results.backup.responseTime}ms\n`;
      if (results.backup.error) {
        report += `错误: ${results.backup.error}\n`;
      }
      report += `详细检查:\n`;
      report += `  - 配置检查: ${results.backup.details.configCheck ? '✅' : '❌'}\n`;
      report += `  - 网络检查: ${results.backup.details.networkCheck ? '✅' : '❌'}\n`;
      report += `  - 认证检查: ${results.backup.details.authCheck ? '✅' : '❌'}\n`;
      report += `  - 响应检查: ${results.backup.details.responseCheck ? '✅' : '❌'}\n`;
      report += '\n';
    }

    // 总结和建议
    report += '📊 总结:\n';
    report += `测试总数: ${results.summary.totalTested}\n`;
    report += `成功数量: ${results.summary.successCount}\n`;
    report += `失败数量: ${results.summary.failureCount}\n`;
    report += `推荐服务: ${results.summary.recommendedProvider || '无可用服务'}\n`;

    return report;
  }
}
