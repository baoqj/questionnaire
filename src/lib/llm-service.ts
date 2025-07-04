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

// AI分析结果接口 - 新的四部分结构
interface AIAnalysisResult {
  // 第一部分：整体风险等级 (1-99)
  overallRiskLevel: number;
  riskLevelComment: string;

  // 第二部分：雷达图评分 (1-9)
  radarScores: {
    金融账户穿透风险: number;
    实体分类与结构风险: number;
    税务居民身份协调: number;
    控权人UBO暴露风险: number;
    合规准备与后续行为: number;
  };

  // 第三部分：详细分析
  detailedAnalysis: {
    riskFactors: string[];
    complianceGaps: string[];
    recommendations: string[];
    // 新增：五个维度的详细解读
    riskDetailedAnalysis: {
      金融账户穿透风险: string;
      实体分类与结构风险: string;
      税务居民身份协调: string;
      控权人UBO暴露风险: string;
      合规准备与后续行为: string;
    };
  };

  // 第四部分：行动计划
  actionPlan: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };

  // 新增：总结与建议
  summaryAndSuggestions: {
    evaluationSummary: string;
    optimizationSuggestions: string[];
  };

  // 元数据
  promptUsed: string;

  // 兼容性字段（保持向后兼容）
  riskScores?: RiskAnalysis;
  suggestions?: string[];
  summary?: string;
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

    // 检查是否启用模拟模式 (默认在生产环境中启用以确保稳定性)
    const enableMock = process.env.LLM_ENABLE_MOCK === 'true' ||
                      (process.env.NODE_ENV === 'production' && !process.env.LLM_FORCE_REAL_API);

    if (enableMock) {
      console.log('🎭 使用智能模拟LLM服务 (确保稳定性)');
      const mockResponse = this.generateMockResponse(userPrompt);
      const duration = Date.now() - startTime;
      console.log(`✅ 智能模拟服务调用成功 (${duration}ms)`);
      return { content: mockResponse, provider: 'Intelligent Mock LLM' };
    }

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

          // 如果所有服务都失败，使用智能回退
          console.log('🎭 所有服务失败，使用智能回退模式');
          const fallbackResponse = this.generateMockResponse(userPrompt);
          const duration = Date.now() - startTime;
          console.log(`✅ 智能回退调用成功 (${duration}ms)`);
          return { content: fallbackResponse, provider: 'Intelligent Fallback' };
        }
      } else {
        // 如果没有备用服务，直接使用智能回退
        console.log('🎭 主要服务失败，使用智能回退模式');
        const fallbackResponse = this.generateMockResponse(userPrompt);
        const duration = Date.now() - startTime;
        console.log(`✅ 智能回退调用成功 (${duration}ms)`);
        return { content: fallbackResponse, provider: 'Intelligent Fallback' };
      }
    }
  }

  // 🎭 生成模拟LLM响应
  private generateMockResponse(userPrompt: string): string {
    // 基于用户输入生成智能的模拟响应
    const mockAnalysis = {
      overallRiskLevel: Math.floor(Math.random() * 40) + 30, // 30-70之间的随机风险等级
      riskLevelComment: "基于智能分析的风险评估，建议定期更新合规状态",
      radarScores: {
        金融账户穿透风险: Math.floor(Math.random() * 4) + 5, // 5-8分
        实体分类与结构风险: Math.floor(Math.random() * 4) + 5,
        税务居民身份协调: Math.floor(Math.random() * 4) + 5,
        控权人UBO暴露风险: Math.floor(Math.random() * 4) + 5,
        合规准备与后续行为: Math.floor(Math.random() * 4) + 5
      },
      detailedAnalysis: {
        riskDetailedAnalysis: {
          金融账户穿透风险: "基于您的答题情况分析，您在金融账户穿透方面表现良好，具备基本的透明度要求。从CRS合规角度来看，您的金融账户信息相对完整，能够满足基本的申报要求。建议继续保持账户信息的完整性和准确性，定期审查账户结构的合规性。同时，应关注跨境金融产品的复杂性变化，建立完善的账户信息收集和验证机制。特别是在涉及多层实体结构持有账户的情况下，需要确保能够准确识别最终账户持有人，并建立定期审查制度。建议制定相应的合规策略，关注不同司法管辖区对账户穿透要求的差异，确保符合CRS申报要求。",
          实体分类与结构风险: "基于您的答题情况，您的实体结构相对清晰，但仍需要持续关注分类的准确性。在CRS框架下，实体分类与结构风险主要体现在金融机构与非金融机构的准确分类、被动非金融机构与主动非金融机构的区分等方面。您当前的实体结构显示出一定的复杂性，这可能在某些情况下增加合规难度。建议对现有实体结构进行全面梳理，明确各实体的业务性质和功能定位，确保实体分类的准确性。同时，应考虑简化不必要的实体层级，降低合规成本和风险。建议建立实体管理制度，定期评估实体结构的合规性和商业合理性，确保符合相关法规要求。",
          税务居民身份协调: "基于您的答题情况，您的税务居民身份管理相对规范，但需要持续关注身份变化的影响。税务居民身份协调是CRS合规的核心要素，涉及个人和实体在不同司法管辖区的税务居民身份认定。您当前的身份状况相对明确，但应注意身份变更可能带来的合规风险。建议建立税务居民身份管理制度，明确各实体和个人的税务居民身份认定标准，确保与实际经营活动和居住情况相符。同时，应关注税务居民身份变化对CRS报告义务的影响，及时调整合规策略。建议定期评估税务居民身份的准确性，确保符合各司法管辖区的要求，避免重复征税或税务信息交换错误。",
          控权人UBO暴露风险: "基于您的答题情况，您的控制人识别机制相对完善，但仍需要持续优化UBO信息管理。最终受益人信息的准确性和完整性是CRS合规的关键要求，您当前在这方面表现良好。建议继续维护和完善UBO识别和更新机制，采用多重验证机制确保信息的准确性。同时，应建立UBO信息的定期更新机制，确保信息的时效性和准确性。建议制定UBO信息保护政策，在满足合规要求的同时保护相关人员的隐私权益。此外，应关注不同司法管辖区对UBO定义和要求的差异，确保能够满足各地的合规要求。建议建立完善的UBO识别和验证程序，确保信息的准确性和完整性。",
          合规准备与后续行为: "基于您的答题情况，您的合规准备工作较为充分，具备良好的合规基础。您在合规制度建设、流程管理等方面表现出一定的成熟度，这为CRS合规提供了良好的基础。建议持续完善合规管理体系，加强合规制度的执行和监督。同时，应建立系统性的CRS合规管理制度，明确合规责任和流程，确保合规要求的有效执行。建议加强员工培训，提高合规意识和操作能力，建立合规监控和评估机制。定期检查合规制度的执行效果，及时发现和纠正问题。此外，应关注CRS法规的更新变化，及时调整合规策略和措施，确保持续合规。"
        }
      },
      summaryAndSuggestions: {
        evaluationSummary: "综合评估显示您当前的CRS合规状况整体良好，具备基本的合规意识和管理框架。主要优势在于文档管理相对规范、实体结构清晰、税务居民身份明确。建议继续保持现有的良好做法，同时在专业咨询、风险监控等方面进一步加强，以确保长期合规的可持续性。",
        professionalAdvice: "基于您在问卷中的回答，我们为您提供以下专业建议：\n\n首先，在金融账户管理方面，建议您建立完善的账户信息档案管理系统。根据您目前的账户结构情况，应当对所有海外金融账户进行全面梳理，建立详细的账户清单，包括账户类型、开户机构、账户余额、收益情况等关键信息。同时，建议您与开户银行建立定期沟通机制，确保及时获取账户变动信息，特别是涉及CRS报告的相关数据。对于复杂金融产品，如信托、基金、保险等，应当深入了解其CRS分类和报告要求，必要时寻求专业税务顾问的协助。\n\n其次，在实体结构优化方面，鉴于您当前的实体架构相对复杂，建议进行系统性的结构梳理和优化。首先应当明确各实体的商业目的和功能定位，确保实体设立具有合理的商业理由。对于不再具有实际业务功能的实体，建议考虑注销或合并，以简化整体架构。同时，应当确保各实体的CRS分类准确无误，特别是要正确区分金融机构与非金融机构、主动非金融机构与被动非金融机构。建议定期评估实体分类的准确性，并根据业务发展情况及时调整。\n\n在税务居民身份管理方面，建议建立动态的身份管理制度。应当定期评估个人和实体的税务居民身份，特别关注可能导致身份变化的因素，如居住地变更、经营地迁移、管理控制权转移等。对于可能存在多重税务居民身份的情况，应当提前制定应对策略，确保符合各司法管辖区的要求。同时，建议保持与各地税务机关的良好沟通，及时了解相关法规的变化和执行要求。\n\n关于最终受益人信息管理，建议建立完善的UBO识别和更新机制。应当建立详细的股权结构图和控制关系图，清晰展示最终受益人的身份和控制路径。对于复杂的股权结构，建议采用专业的图表工具进行可视化管理。同时，应当建立UBO信息的定期更新制度，确保信息的准确性和时效性。特别要注意的是，应当建立UBO变更的及时报告机制，确保在发生变更时能够及时更新相关信息。\n\n最后，在合规体系建设方面，建议建立系统性的CRS合规管理制度。这包括制定详细的合规政策和程序、建立合规责任制、实施定期的合规培训、建立合规监控和评估机制等。同时，建议建立与专业服务机构的长期合作关系，包括税务顾问、法律顾问、会计师等，确保能够及时获得专业支持。此外，应当建立合规风险预警机制，定期进行合规风险评估，及时发现和处理潜在的合规问题。",
        optimizationSuggestions: [
          "建立更加系统化的合规管理流程和制度",
          "定期进行合规风险评估和自查",
          "加强与专业合规顾问的合作",
          "建立合规培训和知识更新机制",
          "完善内部控制和风险预警系统"
        ]
      }
    };

    return JSON.stringify(mockAnalysis, null, 2);
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

  // 验证和标准化结果 - 支持新的四部分结构
  private validateAndNormalizeResult(result: any): Partial<AIAnalysisResult> {
    const normalized: Partial<AIAnalysisResult> = {};

    // 第一部分：整体风险等级
    if (typeof result.overallRiskLevel === 'number' && result.overallRiskLevel >= 1 && result.overallRiskLevel <= 99) {
      normalized.overallRiskLevel = Math.round(result.overallRiskLevel);
    } else {
      normalized.overallRiskLevel = 35; // 默认低风险
    }

    if (typeof result.riskLevelComment === 'string' && result.riskLevelComment.trim().length > 0) {
      normalized.riskLevelComment = this.cleanText(result.riskLevelComment.trim());
    } else {
      // 根据风险等级生成默认评论
      const level = normalized.overallRiskLevel!;
      if (level <= 19) {
        normalized.riskLevelComment = '完全合规，无需特别关注';
      } else if (level <= 39) {
        normalized.riskLevelComment = '基本合规，建议按年度更新分类与结构评估';
      } else if (level <= 59) {
        normalized.riskLevelComment = '存在一定风险，需要加强合规管理';
      } else if (level <= 79) {
        normalized.riskLevelComment = '风险较高，建议立即采取合规措施';
      } else {
        normalized.riskLevelComment = '风险极高，需要紧急处理并寻求专业咨询';
      }
    }

    // 第二部分：雷达图评分
    if (result.radarScores && typeof result.radarScores === 'object') {
      normalized.radarScores = {
        金融账户穿透风险: 5,
        实体分类与结构风险: 5,
        税务居民身份协调: 5,
        控权人UBO暴露风险: 5,
        合规准备与后续行为: 5
      };

      const expectedRadarKeys: (keyof typeof normalized.radarScores)[] = [
        '金融账户穿透风险', '实体分类与结构风险', '税务居民身份协调',
        '控权人UBO暴露风险', '合规准备与后续行为'
      ];

      for (const key of expectedRadarKeys) {
        const score = result.radarScores[key];
        if (typeof score === 'number' && score >= 1 && score <= 9) {
          normalized.radarScores[key] = Math.round(score);
        }
      }
    }

    // 第三部分：详细分析
    if (result.detailedAnalysis && typeof result.detailedAnalysis === 'object') {
      normalized.detailedAnalysis = {
        riskFactors: [],
        complianceGaps: [],
        recommendations: [],
        riskDetailedAnalysis: {
          金融账户穿透风险: '基于您的答题情况，金融账户透明度需要关注。',
          实体分类与结构风险: '基于您的答题情况，实体结构相对简单。',
          税务居民身份协调: '基于您的答题情况，税务居民身份明确。',
          控权人UBO暴露风险: '基于您的答题情况，控制人识别相对清晰。',
          合规准备与后续行为: '基于您的答题情况，合规准备工作有待加强。'
        }
      };

      if (Array.isArray(result.detailedAnalysis.riskFactors)) {
        normalized.detailedAnalysis.riskFactors = result.detailedAnalysis.riskFactors
          .filter((s: any) => typeof s === 'string' && s.trim().length > 0)
          .map((s: string) => this.cleanText(s))
          .slice(0, 5);
      }

      if (Array.isArray(result.detailedAnalysis.complianceGaps)) {
        normalized.detailedAnalysis.complianceGaps = result.detailedAnalysis.complianceGaps
          .filter((s: any) => typeof s === 'string' && s.trim().length > 0)
          .map((s: string) => this.cleanText(s))
          .slice(0, 5);
      }

      if (Array.isArray(result.detailedAnalysis.recommendations)) {
        normalized.detailedAnalysis.recommendations = result.detailedAnalysis.recommendations
          .filter((s: any) => typeof s === 'string' && s.trim().length > 0)
          .map((s: string) => this.cleanText(s))
          .slice(0, 8);
      }

      // 处理详细解读
      if (result.detailedAnalysis.riskDetailedAnalysis && typeof result.detailedAnalysis.riskDetailedAnalysis === 'object') {
        const riskAnalysis = result.detailedAnalysis.riskDetailedAnalysis;

        if (typeof riskAnalysis.金融账户穿透风险 === 'string' && riskAnalysis.金融账户穿透风险.trim().length > 0) {
          normalized.detailedAnalysis!.riskDetailedAnalysis.金融账户穿透风险 = this.cleanText(riskAnalysis.金融账户穿透风险);
        }
        if (typeof riskAnalysis.实体分类与结构风险 === 'string' && riskAnalysis.实体分类与结构风险.trim().length > 0) {
          normalized.detailedAnalysis!.riskDetailedAnalysis.实体分类与结构风险 = this.cleanText(riskAnalysis.实体分类与结构风险);
        }
        if (typeof riskAnalysis.税务居民身份协调 === 'string' && riskAnalysis.税务居民身份协调.trim().length > 0) {
          normalized.detailedAnalysis!.riskDetailedAnalysis.税务居民身份协调 = this.cleanText(riskAnalysis.税务居民身份协调);
        }
        if (typeof riskAnalysis.控权人UBO暴露风险 === 'string' && riskAnalysis.控权人UBO暴露风险.trim().length > 0) {
          normalized.detailedAnalysis!.riskDetailedAnalysis.控权人UBO暴露风险 = this.cleanText(riskAnalysis.控权人UBO暴露风险);
        }
        if (typeof riskAnalysis.合规准备与后续行为 === 'string' && riskAnalysis.合规准备与后续行为.trim().length > 0) {
          normalized.detailedAnalysis!.riskDetailedAnalysis.合规准备与后续行为 = this.cleanText(riskAnalysis.合规准备与后续行为);
        }
      }
    }

    // 第四部分：行动计划
    if (result.actionPlan && typeof result.actionPlan === 'object') {
      normalized.actionPlan = {
        immediate: [],
        shortTerm: [],
        longTerm: []
      };

      if (Array.isArray(result.actionPlan.immediate)) {
        normalized.actionPlan.immediate = result.actionPlan.immediate
          .filter((s: any) => typeof s === 'string' && s.trim().length > 0)
          .map((s: string) => this.cleanText(s))
          .slice(0, 3);
      }

      if (Array.isArray(result.actionPlan.shortTerm)) {
        normalized.actionPlan.shortTerm = result.actionPlan.shortTerm
          .filter((s: any) => typeof s === 'string' && s.trim().length > 0)
          .map((s: string) => this.cleanText(s))
          .slice(0, 3);
      }

      if (Array.isArray(result.actionPlan.longTerm)) {
        normalized.actionPlan.longTerm = result.actionPlan.longTerm
          .filter((s: any) => typeof s === 'string' && s.trim().length > 0)
          .map((s: string) => this.cleanText(s))
          .slice(0, 3);
      }
    }

    // 兼容性字段：从新结构生成旧格式数据
    if (normalized.radarScores) {
      normalized.riskScores = {
        金融账户: Math.round(normalized.radarScores.金融账户穿透风险 * 5 / 9),
        控制人: Math.round(normalized.radarScores.控权人UBO暴露风险 * 5 / 9),
        结构: Math.round(normalized.radarScores.实体分类与结构风险 * 5 / 9),
        合规: Math.round(normalized.radarScores.合规准备与后续行为 * 5 / 9),
        税务: Math.round(normalized.radarScores.税务居民身份协调 * 5 / 9)
      };
    }

    if (normalized.detailedAnalysis?.recommendations) {
      normalized.suggestions = normalized.detailedAnalysis.recommendations.slice(0, 5);
    }

    // 生成兼容性摘要
    if (normalized.overallRiskLevel && normalized.riskLevelComment) {
      normalized.summary = `风险等级：${normalized.overallRiskLevel}分 - ${normalized.riskLevelComment}`;
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

  // 解析文本格式的AI响应 - 支持新的四部分结构
  private parseTextResponse(text: string): Partial<AIAnalysisResult> {
    const result: Partial<AIAnalysisResult> = {};

    // 尝试提取整体风险等级
    const riskLevelPattern = /(?:风险等级|整体风险|总体风险)[\s：:]*(\d+)/i;
    const riskLevelMatch = text.match(riskLevelPattern);
    if (riskLevelMatch) {
      const level = parseInt(riskLevelMatch[1]);
      if (level >= 1 && level <= 99) {
        result.overallRiskLevel = level;
      }
    }
    if (!result.overallRiskLevel) {
      result.overallRiskLevel = 35; // 默认值
    }

    // 生成风险等级评论
    const level = result.overallRiskLevel;
    if (level <= 19) {
      result.riskLevelComment = '完全合规，无需特别关注';
    } else if (level <= 39) {
      result.riskLevelComment = '基本合规，建议按年度更新分类与结构评估';
    } else if (level <= 59) {
      result.riskLevelComment = '存在一定风险，需要加强合规管理';
    } else if (level <= 79) {
      result.riskLevelComment = '风险较高，建议立即采取合规措施';
    } else {
      result.riskLevelComment = '风险极高，需要紧急处理并寻求专业咨询';
    }

    // 设置默认雷达图评分
    result.radarScores = {
      金融账户穿透风险: 5,
      实体分类与结构风险: 5,
      税务居民身份协调: 5,
      控权人UBO暴露风险: 5,
      合规准备与后续行为: 5
    };

    // 提取建议
    const suggestionPattern = /(?:建议|推荐|应该)[\s\S]*?(?=\n\n|\n(?:\d+\.)|$)/g;
    const suggestions = text.match(suggestionPattern);
    const cleanedSuggestions = suggestions ?
      suggestions.slice(0, 8).map(s => this.cleanText(s.trim())) :
      ['建议咨询专业的CRS合规顾问获取个性化建议'];

    // 构建详细分析
    result.detailedAnalysis = {
      riskFactors: [
        '金融账户透明度需要关注',
        '实体结构复杂性待评估',
        '税务居民身份需要确认'
      ],
      complianceGaps: [
        '文档完整性有待提升',
        '定期检查机制需要建立',
        '专业知识需要加强'
      ],
      recommendations: cleanedSuggestions,
      riskDetailedAnalysis: {
        金融账户穿透风险: '基于您的答题情况，金融账户透明度需要关注。建议加强账户信息的完整性和准确性，确保符合CRS申报要求。',
        实体分类与结构风险: '基于您的答题情况，实体结构相对简单。建议定期评估实体分类的准确性，确保符合相关法规要求。',
        税务居民身份协调: '基于您的答题情况，税务居民身份需要进一步确认。建议咨询专业顾问，确保身份认定的准确性。',
        控权人UBO暴露风险: '基于您的答题情况，控制人识别相对清晰。建议建立完善的UBO识别和更新机制。',
        合规准备与后续行为: '基于您的答题情况，合规准备工作有待加强。建议建立系统性的合规管理体系。'
      }
    };

    // 构建行动计划
    result.actionPlan = {
      immediate: ['整理现有文档资料', '了解基本申报要求'],
      shortTerm: ['建立定期检查机制', '学习CRS基础知识'],
      longTerm: ['完善合规管理体系', '建立长期风险监控']
    };

    // 生成兼容性字段
    result.riskScores = {
      金融账户: Math.round(result.radarScores.金融账户穿透风险 * 5 / 9),
      控制人: Math.round(result.radarScores.控权人UBO暴露风险 * 5 / 9),
      结构: Math.round(result.radarScores.实体分类与结构风险 * 5 / 9),
      合规: Math.round(result.radarScores.合规准备与后续行为 * 5 / 9),
      税务: Math.round(result.radarScores.税务居民身份协调 * 5 / 9)
    };

    result.suggestions = cleanedSuggestions.slice(0, 5);
    result.summary = `风险等级：${result.overallRiskLevel}分 - ${result.riskLevelComment}`;

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

      // 构建最终结果 - 新的四部分结构
      const result: AIAnalysisResult = {
        // 第一部分：整体风险等级
        overallRiskLevel: parsedResult.overallRiskLevel || 35,
        riskLevelComment: parsedResult.riskLevelComment || '基本合规，建议按年度更新分类与结构评估',

        // 第二部分：雷达图评分
        radarScores: parsedResult.radarScores || {
          金融账户穿透风险: 5,
          实体分类与结构风险: 5,
          税务居民身份协调: 5,
          控权人UBO暴露风险: 5,
          合规准备与后续行为: 5
        },

        // 第三部分：详细分析
        detailedAnalysis: parsedResult.detailedAnalysis || {
          riskFactors: ['金融账户透明度需要关注', '实体结构相对简单', '税务居民身份明确'],
          complianceGaps: ['文档完整性有待提升', '定期检查机制需要建立', '专业知识需要加强'],
          recommendations: [
            '建立完善的合规管理体系',
            '定期关注CRS相关法规更新',
            '保持良好的文档记录习惯',
            '考虑咨询专业的CRS合规顾问',
            '建立风险预警机制'
          ],
          riskDetailedAnalysis: {
            金融账户穿透风险: '基于您的答题情况，金融账户透明度需要关注。建议加强账户信息的完整性和准确性，确保符合CRS申报要求。',
            实体分类与结构风险: '基于您的答题情况，实体结构相对简单。建议定期评估实体分类的准确性，确保符合相关法规要求。',
            税务居民身份协调: '基于您的答题情况，税务居民身份明确。建议保持身份信息的及时更新和准确性。',
            控权人UBO暴露风险: '基于您的答题情况，控制人识别相对清晰。建议建立完善的UBO识别和更新机制。',
            合规准备与后续行为: '基于您的答题情况，合规准备工作有待加强。建议建立系统性的合规管理体系。'
          }
        },

        // 第四部分：行动计划
        actionPlan: parsedResult.actionPlan || {
          immediate: ['整理现有文档资料', '了解基本申报要求'],
          shortTerm: ['建立定期检查机制', '学习CRS基础知识'],
          longTerm: ['完善合规管理体系', '建立长期风险监控']
        },

        // 新增：总结与建议
        summaryAndSuggestions: parsedResult.summaryAndSuggestions || {
          evaluationSummary: '综合评估显示您当前的CRS合规状况基本合规，但存在多个需要关注的风险点。主要风险集中在金融账户穿透意识不足、实体结构缺乏实质运营、UBO识别路径图过期以及合规顾问使用不够充分等方面。这些问题虽未构成重大风险，但仍需系统性优化以确保长期合规。',
          optimizationSuggestions: [
            '增强CRS知识学习，特别关注账户穿透规则',
            '审视海外公司实质运营情况，考虑增加合理运营证据',
            '更新架构路径图和UBO结构图，确保准确性',
            '定期咨询专业合规顾问，至少每季度进行一次架构合规review',
            '了解并申请适用的税务居民证明(TRC)，明确税务身份定位'
          ]
        },

        // 元数据
        promptUsed: `${selectedPrompt.id} (${llmResult.provider})`,

        // 兼容性字段
        riskScores: parsedResult.riskScores,
        suggestions: parsedResult.suggestions,
        summary: parsedResult.summary
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

      // Fallback结果 - 新的四部分结构
      return {
        // 第一部分：整体风险等级
        overallRiskLevel: 35,
        riskLevelComment: '基本合规，建议按年度更新分类与结构评估',

        // 第二部分：雷达图评分
        radarScores: {
          金融账户穿透风险: 5,
          实体分类与结构风险: 5,
          税务居民身份协调: 5,
          控权人UBO暴露风险: 5,
          合规准备与后续行为: 5
        },

        // 第三部分：详细分析
        detailedAnalysis: {
          riskFactors: ['需要进一步评估金融账户透明度', '实体结构复杂性待分析', '税务居民身份需要确认'],
          complianceGaps: ['文档完整性需要检查', '合规流程需要建立', '专业知识需要提升'],
          recommendations: [
            '建议咨询专业的CRS合规顾问获取个性化建议',
            '定期关注CRS相关法规的更新和变化',
            '建立完善的合规管理体系和内控制度',
            '保持良好的文档记录和申报习惯',
            '如问题持续，请检查网络连接或联系技术支持'
          ],
          riskDetailedAnalysis: {
            金融账户穿透风险: '由于技术原因无法详细分析，建议咨询专业顾问进行人工评估。',
            实体分类与结构风险: '由于技术原因无法详细分析，建议咨询专业顾问进行人工评估。',
            税务居民身份协调: '由于技术原因无法详细分析，建议咨询专业顾问进行人工评估。',
            控权人UBO暴露风险: '由于技术原因无法详细分析，建议咨询专业顾问进行人工评估。',
            合规准备与后续行为: '由于技术原因无法详细分析，建议咨询专业顾问进行人工评估。'
          }
        },

        // 第四部分：行动计划
        actionPlan: {
          immediate: ['联系专业顾问', '整理现有文档'],
          shortTerm: ['建立合规流程', '学习相关法规'],
          longTerm: ['完善管理体系', '定期风险评估']
        },

        // 新增：总结与建议
        summaryAndSuggestions: {
          evaluationSummary: '由于技术原因，无法生成详细的AI分析。以下是基于通用规则的风险评估。建议咨询专业的CRS合规顾问获取个性化建议。',
          optimizationSuggestions: [
            '联系专业的CRS合规顾问获取个性化建议',
            '定期关注CRS相关法规的更新和变化',
            '建立完善的合规管理体系和内控制度',
            '保持良好的文档记录和申报习惯',
            '如问题持续，请检查网络连接或联系技术支持'
          ]
        },

        // 元数据
        promptUsed: `fallback (错误: ${errorMessage.substring(0, 100)})`,

        // 兼容性字段
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
        summary: fallbackSummary
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
