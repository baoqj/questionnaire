import { Response, RiskAnalysis } from '@/types';
import { LLM_CONFIG } from '@/lib/config';

// Prompt配置接口
interface PromptConfig {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  analysisPrompt: string;
  condition?: {
    type: string;
    questionId: string;
    values: string[];
  };
  outputFormat: {
    riskScores: Record<string, string>;
    suggestions: string[];
    summary: string;
  };
}

interface AnalysisPrompts {
  surveyId: string;
  title: string;
  version: string;
  prompts: Record<string, PromptConfig>;
  fallbackPrompt: {
    systemPrompt: string;
    analysisPrompt: string;
  };
}

// AI分析结果接口
interface AIAnalysisResult {
  riskScores: RiskAnalysis;
  suggestions: string[];
  summary: string;
  promptUsed: string;
}

export class LLMService {
  private static instance: LLMService;
  private promptConfigs: Map<string, AnalysisPrompts> = new Map();
  // 🔥 优化9: 添加结果缓存
  private analysisCache: Map<string, { result: AIAnalysisResult; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

  private constructor() {}

  static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService();
    }
    return LLMService.instance;
  }

  // 加载prompt配置（服务器端）
  async loadPromptConfig(surveyId: string): Promise<AnalysisPrompts | null> {
    try {
      // 检查缓存
      if (this.promptConfigs.has(surveyId)) {
        return this.promptConfigs.get(surveyId)!;
      }

      // 在服务器端直接读取文件系统
      if (typeof window === 'undefined') {
        // Node.js环境，直接读取文件
        const fs = await import('fs');
        const path = await import('path');

        // 映射surveyId到实际的配置文件名
        const configFileMap: Record<string, string> = {
          'bank_crs_01': 'ana_bank_crs.json',
          'ai_survey': 'ana_ai_survey.json'
        };

        const configFileName = configFileMap[surveyId];
        if (!configFileName) {
          console.warn(`No config file mapping found for survey: ${surveyId}`);
          return null;
        }

        const configPath = path.join(process.cwd(), 'src', 'data', 'prompt', 'analysis', configFileName);

        if (!fs.existsSync(configPath)) {
          console.warn(`Prompt config not found for survey: ${surveyId}`);
          return null;
        }

        const configContent = fs.readFileSync(configPath, 'utf-8');
        const config: AnalysisPrompts = JSON.parse(configContent);
        this.promptConfigs.set(surveyId, config);
        return config;
      } else {
        // 客户端环境，不应该直接加载配置
        console.error('Prompt config should not be loaded on client side');
        return null;
      }
    } catch (error) {
      console.error('Error loading prompt config:', error);
      return null;
    }
  }

  // 选择合适的prompt
  selectPrompt(config: AnalysisPrompts, userAnswers: any[]): PromptConfig {
    // 遍历所有prompt，找到第一个匹配条件的
    for (const [key, prompt] of Object.entries(config.prompts)) {
      if (key === 'default') continue; // 跳过默认prompt
      
      if (prompt.condition && this.checkCondition(prompt.condition, userAnswers)) {
        console.log(`Selected prompt: ${prompt.name} (${prompt.id})`);
        return prompt;
      }
    }

    // 如果没有匹配的，使用默认prompt
    console.log('Using default prompt');
    return config.prompts.default;
  }

  // 检查条件是否匹配
  private checkCondition(condition: any, userAnswers: any[]): boolean {
    if (condition.type === 'answer_contains') {
      const answer = userAnswers.find(a => a.questionId === condition.questionId);
      if (!answer) return false;

      // 检查答案是否包含指定值
      const answerValues = Array.isArray(answer.value) ? answer.value : [answer.value];
      return condition.values.some((value: string) => answerValues.includes(value));
    }

    return false;
  }

  // 格式化用户答案为文本
  private formatUserAnswers(userAnswers: any[], surveyData: any): string {
    let formattedAnswers = '';
    
    userAnswers.forEach((answer, index) => {
      const question = surveyData.questions?.find((q: any) => q.id === answer.questionId);
      if (question) {
        formattedAnswers += `问题${index + 1}: ${question.title}\n`;
        
        if (Array.isArray(answer.value)) {
          formattedAnswers += `回答: ${answer.value.join(', ')}\n`;
        } else {
          formattedAnswers += `回答: ${answer.value}\n`;
        }
        formattedAnswers += '\n';
      }
    });

    return formattedAnswers;
  }

  // 🔥 新增：多平台LLM调用方法
  async callLLMWithFallback(systemPrompt: string, userPrompt: string): Promise<{ content: string; provider: string }> {
    const startTime = Date.now();
    console.log('🤖 开始多平台LLM调用...');

    // 首先尝试主要服务
    try {
      console.log(`🎯 尝试主要服务: ${LLM_CONFIG.primary.name}`);
      const content = await this.callSingleLLM(
        LLM_CONFIG.primary.endpoint,
        LLM_CONFIG.primary.apiKey,
        LLM_CONFIG.primary.model,
        systemPrompt,
        userPrompt
      );

      const duration = Date.now() - startTime;
      console.log(`✅ 主要服务调用成功 (${duration}ms)`);
      return { content, provider: LLM_CONFIG.primary.name };
    } catch (primaryError) {
      console.warn(`⚠️ 主要服务失败:`, primaryError);

      // 如果启用了fallback，尝试备用服务
      if (LLM_CONFIG.enableFallback && LLM_CONFIG.backup.apiKey) {
        try {
          console.log(`🔄 尝试备用服务: ${LLM_CONFIG.backup.name}`);
          const content = await this.callSingleLLM(
            LLM_CONFIG.backup.endpoint,
            LLM_CONFIG.backup.apiKey,
            LLM_CONFIG.backup.model,
            systemPrompt,
            userPrompt
          );

          const duration = Date.now() - startTime;
          console.log(`✅ 备用服务调用成功 (${duration}ms)`);
          return { content, provider: LLM_CONFIG.backup.name };
        } catch (backupError) {
          console.error(`❌ 备用服务也失败:`, backupError);
          throw new Error(`所有LLM服务都失败了。主要服务: ${primaryError}; 备用服务: ${backupError}`);
        }
      } else {
        throw primaryError;
      }
    }
  }

  // 单个LLM服务调用
  private async callSingleLLM(
    endpoint: string,
    apiKey: string,
    model: string,
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
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
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
        stream: false,
        top_p: 0.9,
        frequency_penalty: 0.1
      }),
      signal: AbortSignal.timeout(LLM_CONFIG.timeout)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from LLM API');
    }

    return data.choices[0].message.content || '';
  }

  // 调用LLM API (优化版本) - 保持向后兼容
  async callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
    try {
      const result = await this.callLLMWithFallback(systemPrompt, userPrompt);
      return result.content;
    } catch (error) {
      console.error('❌ 所有LLM服务都失败了:', error);
      throw error;
    }
  }

  // 🔥 新增：清理文本格式（去除表情符号，保留markdown）
  private cleanText(text: string): string {
    if (!text) return '';

    // 去除常见的表情符号和特殊符号
    let cleaned = text
      // 去除<think>标签内容
      .replace(/<think>[\s\S]*?<\/think>/g, '')
      // 去除常见的特殊符号（直接匹配字符）
      .replace(/[🔥⚡💾📡✅❌🚀🔍⚙️📋💡📊📈🎯]/g, '')
      // 去除其他常见表情符号
      .replace(/[\u2600-\u26FF]/g, '')   // 杂项符号
      .replace(/[\u2700-\u27BF]/g, '')   // 装饰符号
      // 清理多余的空行
      .replace(/\n{3,}/g, '\n\n')
      // 清理首尾空白
      .trim();

    return cleaned;
  }

  // 提取JSON内容
  private extractJSON(text: string): any | null {
    // 方法1: 寻找完整的JSON对象
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.log('JSON解析方法1失败，尝试方法2');
      }
    }

    // 方法2: 寻找第一个{到最后一个}
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        const jsonStr = text.substring(firstBrace, lastBrace + 1);
        return JSON.parse(jsonStr);
      } catch (e) {
        console.log('JSON解析方法2失败');
      }
    }

    return null;
  }

  // 验证和标准化结果
  private validateAndNormalizeResult(result: any): Partial<AIAnalysisResult> {
    const normalized: Partial<AIAnalysisResult> = {};

    // 验证和标准化风险评分
    if (result.riskScores && typeof result.riskScores === 'object') {
      normalized.riskScores = {
        金融账户: 3,
        控制人: 3,
        结构: 3,
        合规: 3,
        税务: 3
      };

      const expectedKeys: (keyof typeof normalized.riskScores)[] = ['金融账户', '控制人', '结构', '合规', '税务'];

      for (const key of expectedKeys) {
        const score = result.riskScores[key];
        if (typeof score === 'number' && score >= 1 && score <= 5) {
          normalized.riskScores[key] = Math.round(score);
        }
        // 如果不是有效数字，保持默认值3
      }
    }

    // 验证和标准化建议
    if (Array.isArray(result.suggestions)) {
      normalized.suggestions = result.suggestions
        .filter((s: any) => typeof s === 'string' && s.trim().length > 0)
        .map((s: string) => this.cleanText(s))
        .slice(0, 5); // 最多5条建议
    }

    // 验证和标准化总结
    if (typeof result.summary === 'string' && result.summary.trim().length > 0) {
      normalized.summary = this.cleanText(result.summary.trim());
    }

    return normalized;
  }

  // 🔥 改进的AI响应解析
  private parseAIResponse(aiResponse: string): Partial<AIAnalysisResult> {
    console.log('🔍 开始解析AI响应...');
    console.log('📝 原始响应长度:', aiResponse.length);

    try {
      // 清理响应文本
      const cleanedResponse = this.cleanText(aiResponse);
      console.log('🧹 清理后响应:', cleanedResponse.substring(0, 200) + '...');

      // 尝试多种JSON提取方法
      const jsonResult = this.extractJSON(cleanedResponse);
      if (jsonResult) {
        console.log('✅ JSON解析成功');
        return this.validateAndNormalizeResult(jsonResult);
      }

      // 如果JSON解析失败，尝试文本解析
      console.log('⚠️ JSON解析失败，尝试文本解析');
      return this.parseTextResponse(cleanedResponse);
    } catch (error) {
      console.error('❌ AI响应解析失败:', error);
      return this.parseTextResponse(this.cleanText(aiResponse));
    }
  }

  // 解析文本格式的AI响应
  private parseTextResponse(text: string): Partial<AIAnalysisResult> {
    const result: Partial<AIAnalysisResult> = {
      riskScores: {
        金融账户: 3,
        控制人: 3,
        结构: 3,
        合规: 3,
        税务: 3
      },
      suggestions: [],
      summary: ''
    };

    // 提取风险评分
    const scorePattern = /(\d+)分?/g;
    const scores = text.match(scorePattern);
    if (scores && scores.length >= 5) {
      const dimensions = ['金融账户', '控制人', '结构', '合规', '税务'];
      scores.slice(0, 5).forEach((score, index) => {
        const numScore = parseInt(score.replace(/[^\d]/g, ''));
        if (numScore >= 1 && numScore <= 5 && index < dimensions.length) {
          (result.riskScores as any)[dimensions[index]] = numScore;
        }
      });
    }

    // 提取建议
    const suggestionPattern = /(?:建议|推荐|应该)[\s\S]*?(?=\n\n|\n(?:\d+\.)|$)/g;
    const suggestions = text.match(suggestionPattern);
    if (suggestions) {
      result.suggestions = suggestions.slice(0, 5).map(s => this.cleanText(s.trim()));
    }

    // 提取总结
    const summaryPattern = /(?:总结|综合|整体)[\s\S]*?(?=\n\n|$)/;
    const summaryMatch = text.match(summaryPattern);
    if (summaryMatch) {
      result.summary = this.cleanText(summaryMatch[0].trim());
    } else {
      result.summary = this.cleanText(text.slice(0, 200)) + '...';
    }

    return result;
  }

  // 🔥 优化10: 生成缓存键
  private generateCacheKey(response: Response): string {
    const answersHash = JSON.stringify(response.answers.sort((a, b) => a.questionId.localeCompare(b.questionId)));
    return `${response.surveyId}_${Buffer.from(answersHash).toString('base64').slice(0, 16)}`;
  }

  // 🔥 优化11: 检查缓存
  private getCachedResult(cacheKey: string): AIAnalysisResult | null {
    const cached = this.analysisCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`💾 使用缓存结果: ${cacheKey}`);
      return cached.result;
    }
    return null;
  }

  // 🔥 优化12: 保存到缓存
  private setCachedResult(cacheKey: string, result: AIAnalysisResult): void {
    this.analysisCache.set(cacheKey, { result, timestamp: Date.now() });
    // 清理过期缓存
    this.analysisCache.forEach((value, key) => {
      if (Date.now() - value.timestamp >= this.CACHE_DURATION) {
        this.analysisCache.delete(key);
      }
    });
  }

  // 主要分析方法 (优化版本)
  async analyzeResponse(response: Response, surveyData: any): Promise<AIAnalysisResult> {
    const startTime = Date.now();
    console.log(`🔍 开始AI分析 - ResponseID: ${response.id}`);

    // 🔥 优化13: 检查缓存
    const cacheKey = this.generateCacheKey(response);
    const cachedResult = this.getCachedResult(cacheKey);
    if (cachedResult) {
      console.log(`⚡ 缓存命中，跳过AI调用 - 耗时: ${Date.now() - startTime}ms`);
      return cachedResult;
    }

    try {
      // 🔥 优化6: 并行加载配置和格式化答案
      const [promptConfig, formattedAnswers] = await Promise.all([
        this.loadPromptConfig(response.surveyId),
        Promise.resolve(this.formatUserAnswers(response.answers, surveyData))
      ]);

      const configTime = Date.now() - startTime;
      console.log(`⚙️ 配置加载耗时: ${configTime}ms`);

      if (!promptConfig) {
        throw new Error(`No prompt configuration found for survey: ${response.surveyId}`);
      }

      // 选择合适的prompt
      const selectedPrompt = this.selectPrompt(promptConfig, response.answers);
      console.log(`📋 选择Prompt: ${selectedPrompt.name}`);

      // 🔥 优化7: 简化prompt内容，减少token消耗
      const analysisPrompt = this.optimizePrompt(selectedPrompt.analysisPrompt, formattedAnswers);

      // 调用LLM (使用多平台容错)
      const llmResult = await this.callLLMWithFallback(selectedPrompt.systemPrompt, analysisPrompt);
      console.log(`🎯 使用的LLM提供商: ${llmResult.provider}`);

      // 解析响应
      const parsedResult = this.parseAIResponse(llmResult.content);

      // 构建最终结果
      const result: AIAnalysisResult = {
        riskScores: parsedResult.riskScores || {
          金融账户: 3,
          控制人: 3,
          结构: 3,
          合规: 3,
          税务: 3
        },
        suggestions: parsedResult.suggestions || ['请咨询专业的CRS合规顾问获取个性化建议。'],
        summary: parsedResult.summary || '基于您的回答，我们为您生成了CRS合规风险分析报告。',
        promptUsed: `${selectedPrompt.id} (${llmResult.provider})`
      };

      const totalTime = Date.now() - startTime;
      console.log(`✅ AI分析完成 - 总耗时: ${totalTime}ms`);

      // 🔥 优化14: 保存到缓存
      this.setCachedResult(cacheKey, result);

      return result;
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ AI分析失败 (耗时: ${totalTime}ms):`, error);

      // 🔥 改进的fallback结果，包含错误信息
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      const isNetworkError = errorMessage.includes('fetch') || errorMessage.includes('timeout') || errorMessage.includes('network');
      const isAPIError = errorMessage.includes('HTTP') || errorMessage.includes('API');

      let fallbackSummary = '由于技术原因，无法生成详细分析。';
      if (isNetworkError) {
        fallbackSummary += '网络连接可能存在问题，请稍后重试。';
      } else if (isAPIError) {
        fallbackSummary += 'AI服务暂时不可用，请稍后重试。';
      }
      fallbackSummary += '建议咨询专业顾问获取个性化建议。';

      return {
        riskScores: {
          金融账户: 3,
          控制人: 3,
          结构: 3,
          合规: 3,
          税务: 3
        },
        suggestions: [
          '建议咨询专业的CRS合规顾问获取个性化建议',
          '定期关注CRS相关法规的更新和变化',
          '建立完善的合规管理体系和内控制度',
          '保持良好的文档记录和申报习惯',
          '如问题持续，请检查网络连接或联系技术支持'
        ],
        summary: fallbackSummary,
        promptUsed: `fallback (错误: ${errorMessage.substring(0, 100)})`
      };
    }
  }

  // 🔥 优化8: 新增prompt优化方法
  private optimizePrompt(originalPrompt: string, formattedAnswers: string): string {
    // 限制答案长度，避免过长的prompt
    const maxAnswerLength = 1000;
    const truncatedAnswers = formattedAnswers.length > maxAnswerLength
      ? formattedAnswers.substring(0, maxAnswerLength) + '...(答案已截断)'
      : formattedAnswers;

    return originalPrompt.replace('{USER_ANSWERS}', truncatedAnswers);
  }
}

// 导出单例实例
export const llmService = LLMService.getInstance();
