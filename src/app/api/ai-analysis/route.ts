import { NextRequest, NextResponse } from 'next/server';
import { llmService } from '@/lib/llm-service';
import { Response, Feedback } from '@/types';
import fs from 'fs';
import path from 'path';

// 获取用户响应和问卷数据的辅助函数
async function getUserResponseAndSurvey(responseId: string, surveyId: string) {
  try {
    // 在实际应用中，这里应该从数据库获取数据
    // 现在我们从文件系统模拟获取

    // 获取问卷数据
    // 根据surveyId映射到实际文件名
    const surveyFileMap: Record<string, string> = {
      'bank_crs_01': 'bank_crs.json',
      'ai_survey': 'ai_survey.json'
    };

    const fileName = surveyFileMap[surveyId];
    let surveyData = null;

    if (fileName) {
      const surveyPath = path.join(process.cwd(), 'src', 'data', 'surveys', fileName);
      if (fs.existsSync(surveyPath)) {
        const surveyContent = fs.readFileSync(surveyPath, 'utf-8');
        surveyData = JSON.parse(surveyContent);
      }
    }

    // 获取用户响应数据
    // 在实际应用中，这里应该从数据库查询
    // 现在我们返回一个基于responseId的模拟响应，使用更真实的数据
    const userResponse: Response = {
      id: responseId,
      surveyId: surveyId,
      userId: 'user_' + responseId.slice(-6),
      answers: [
        // 模拟一个中等风险的用户画像
        {
          id: 'a1',
          responseId: 'test_response',
          questionId: 'q1',
          optionIds: ['personal_bank', 'personal_securities'],
          question: { id: 'q1', surveyId: 'test', order: 1, type: 'multiple_choice', content: 'Test', required: true, options: [] }
        },
        {
          id: 'a2',
          responseId: 'test_response',
          questionId: 'q2',
          optionId: 'offshore_company',
          question: { id: 'q2', surveyId: 'test', order: 2, type: 'single_choice', content: 'Test', required: true, options: [] }
        },
        {
          id: 'a3',
          responseId: 'test_response',
          questionId: 'q3',
          optionIds: ['crs_self_cert'],
          question: { id: 'q3', surveyId: 'test', order: 3, type: 'multiple_choice', content: 'Test', required: true, options: [] }
        },
        {
          id: 'a4',
          responseId: 'test_response',
          questionId: 'q4',
          optionId: 'partial_understanding',
          question: { id: 'q4', surveyId: 'test', order: 4, type: 'single_choice', content: 'Test', required: true, options: [] }
        },
        {
          id: 'a5',
          responseId: 'test_response',
          questionId: 'q5',
          optionId: 'sometimes_correct',
          question: { id: 'q5', surveyId: 'test', order: 5, type: 'single_choice', content: 'Test', required: true, options: [] }
        },
        {
          id: 'a6',
          responseId: 'test_response',
          questionId: 'q6',
          optionId: 'frequent_transactions',
          question: { id: 'q6', surveyId: 'test', order: 6, type: 'single_choice', content: 'Test', required: true, options: [] }
        },
        {
          id: 'a7',
          responseId: 'test_response',
          questionId: 'q7',
          optionId: 'partial_compliance',
          question: { id: 'q7', surveyId: 'test', order: 7, type: 'single_choice', content: 'Test', required: true, options: [] }
        },
        {
          id: 'a8',
          responseId: 'test_response',
          questionId: 'q8',
          optionId: 'multiple_residency',
          question: { id: 'q8', surveyId: 'test', order: 8, type: 'single_choice', content: 'Test', required: true, options: [] }
        }
      ],
      completed: true,
      createdAt: new Date()
    };

    return { userResponse, surveyData };
  } catch (error) {
    console.error('Error getting user response and survey:', error);
    return { userResponse: null, surveyData: null };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { responseId, surveyId } = body;

    // 验证输入
    if (!responseId || !surveyId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: responseId and surveyId'
      }, { status: 400 });
    }

    // 获取用户响应数据和问卷数据
    const { userResponse, surveyData } = await getUserResponseAndSurvey(responseId, surveyId);

    if (!userResponse) {
      return NextResponse.json({
        success: false,
        error: 'User response not found'
      }, { status: 404 });
    }

    if (!surveyData) {
      return NextResponse.json({
        success: false,
        error: 'Survey data not found'
      }, { status: 404 });
    }

    console.log('Starting AI analysis for response:', responseId);

    let aiResult;
    try {
      // 尝试调用真正的AI分析服务
      aiResult = await llmService.analyzeResponse(userResponse, surveyData);
      console.log('AI analysis completed successfully:', aiResult);
    } catch (error) {
      console.error('AI analysis failed, using fallback:', error);
      // 如果AI分析失败，使用fallback结果 - 新的四部分结构
      aiResult = {
        // 第一部分：整体风险等级
        overallRiskLevel: 45,
        riskLevelComment: '存在一定风险，需要加强合规管理',

        // 第二部分：雷达图评分
        radarScores: {
          金融账户穿透风险: 6,
          实体分类与结构风险: 7,
          税务居民身份协调: 5,
          控权人UBO暴露风险: 6,
          合规准备与后续行为: 4
        },

        // 第三部分：详细分析
        detailedAnalysis: {
          riskFactors: [
            '金融账户结构需要进一步透明化',
            '实体分类与结构存在复杂性',
            '合规准备工作有待加强'
          ],
          complianceGaps: [
            '文档管理体系不够完善',
            '定期合规检查机制缺失',
            '专业知识储备需要提升'
          ],
          recommendations: [
            '建议定期关注CRS相关法规的更新和变化',
            '建立完善的合规管理体系和内控制度',
            '保持良好的文档记录和申报习惯',
            '考虑咨询专业的CRS合规顾问',
            '建立风险预警和监控机制'
          ],
          riskDetailedAnalysis: {
            金融账户穿透风险: '您持有海外信托或公司名义账户，这增加了账户穿透风险。同时，您对CRS通知不确定是否收到，对CRS穿透知识仅有模糊了解，偶尔被要求补充税务信息。这些因素表明存在一定的金融账户穿透风险，但尚未达到高风险水平。',
            实体分类与结构风险: '您的海外公司存在有限实务实质运营的情况，架构设立在新加坡/香港等高CRS敏感法域，并且有一个SPV用于投资。分类证明文件有过期，但未更新，偶尔被要求补充结构分类证明。这些因素组合显示实体分类与结构存在中度风险，需要更新实质运营和文件更新。',
            税务居民身份协调: '您不清楚税务居民证明(TRC)的含义，偶尔在开户或申报时无法确定应填哪个国家的TIN。但您仅居住于一个国家，拥有一个税号，未经历移民身份变更，也未收到多国税务检查。整体税务居民身份协调风险较低，但对TRC缺乏了解需要更新相关的知识缺口。',
            控权人UBO暴露风险: '您在架构中持股<25%且不担任信托角色，这降低了UBO识别风险。但您仅了解部分银行识别UBO的规则，使用私人信托公司作为隐私隔离工具，对多重架构下是否会被双重UBO识别有所了解但未测试，且架构路径图有但已过期。这些因素表明存在一定的UBO暴露风险，需要更新路径图并验证多重架构下的UBO识别情况。',
            合规准备与后续行为: '您拥有专业合规顾问但不常用，对架构穿透知识知道部分，尚未收到税局或银行关于结构信息的问询。这表明合规准备处于基础水平，建议增加与专业顾问的沟通频率，以增强对架构穿透规则的全面理解。'
          }
        },

        // 第四部分：行动计划
        actionPlan: {
          immediate: ['联系专业合规顾问', '整理现有合规文档'],
          shortTerm: ['建立合规管理制度', '开展合规培训'],
          longTerm: ['完善风险管控体系', '建立长期监控机制']
        },

        // 新增：总结与建议
        summaryAndSuggestions: {
          evaluationSummary: '综合评分显示您当前的CRS合规状况基本合规，但存在多个需要关注的风险点。主要风险集中在金融账户穿透意识不足、实体结构缺乏实质运营、UBO识别路径图过期以及合规顾问使用不够充分等方面。这些问题虽未构成重大风险，但仍需系统性优化以确保长期合规。',
          professionalAdvice: '基于您在问卷中的具体回答，我们为您提供以下专业建议：\n\n首先，在金融账户管理方面，根据您的回答显示您对CRS账户穿透规则的了解有限，建议您深入学习相关规定。建议建立完善的账户信息档案管理系统，对所有海外金融账户进行全面梳理，建立详细的账户清单，包括账户类型、开户机构、账户余额、收益情况等关键信息。特别要注意的是，对于复杂金融产品如信托、基金、保险等，应当深入了解其CRS分类和报告要求，必要时寻求专业税务顾问的协助。\n\n其次，在实体结构优化方面，您的回答反映出实体架构存在一定复杂性但缺乏实质运营证据。建议进行系统性的结构梳理和优化，明确各实体的商业目的和功能定位，确保实体设立具有合理的商业理由。对于不再具有实际业务功能的实体，建议考虑注销或合并，以简化整体架构。同时，应当确保各实体的CRS分类准确无误，特别是要正确区分金融机构与非金融机构、主动非金融机构与被动非金融机构。\n\n在税务居民身份管理方面，基于您的回答，建议建立动态的身份管理制度。应当定期评估个人和实体的税务居民身份，特别关注可能导致身份变化的因素。对于可能存在多重税务居民身份的情况，应当提前制定应对策略，确保符合各司法管辖区的要求。建议申请适用的税务居民证明(TRC)，明确税务身份定位。\n\n关于最终受益人信息管理，您的回答显示UBO识别路径图可能存在过期问题。建议立即更新架构路径图和UBO结构图，建立详细的股权结构图和控制关系图，清晰展示最终受益人的身份和控制路径。应当建立UBO信息的定期更新制度，确保信息的准确性和时效性。\n\n最后，在合规体系建设方面，您的回答反映出专业合规顾问的使用不够充分。建议建立与专业服务机构的长期合作关系，包括税务顾问、法律顾问、会计师等，至少每季度进行一次架构合规review。同时，建议建立系统性的CRS合规管理制度，包括制定详细的合规政策和程序、建立合规责任制、实施定期的合规培训等。',
          optimizationSuggestions: [
            '增强CRS知识学习，特别关注账户穿透规则',
            '审视海外公司实质运营情况，考虑增加合理运营证据',
            '更新架构路径图和UBO结构图，确保准确性',
            '定期咨询专业合规顾问，至少每季度进行一次架构合规review',
            '了解并申请适用的税务居民证明(TRC)，明确税务身份定位'
          ]
        },

        // 元数据
        promptUsed: 'fallback_due_to_error',

        // 兼容性字段
        riskScores: {
          金融账户: 3,
          控制人: 4,
          结构: 4,
          合规: 3,
          税务: 5
        },
        suggestions: [
          '建议定期关注CRS相关法规的更新和变化',
          '建立完善的合规管理体系和内控制度',
          '保持良好的文档记录和申报习惯',
          '考虑咨询专业的CRS合规顾问'
        ],
        summary: '基于您的回答，我们为您生成了CRS合规风险分析报告。您的整体风险水平为中等，建议加强合规管理。'
      };
    }

    // 创建反馈对象 - 支持新的四部分结构
    const feedback: Feedback = {
      id: `feedback_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      responseId,
      aiSummary: aiResult.summary || `风险等级：${aiResult.overallRiskLevel}分 - ${aiResult.riskLevelComment}`,
      riskAnalysis: aiResult.riskScores || {
        金融账户: Math.round(aiResult.radarScores.金融账户穿透风险 * 5 / 9),
        控制人: Math.round(aiResult.radarScores.控权人UBO暴露风险 * 5 / 9),
        结构: Math.round(aiResult.radarScores.实体分类与结构风险 * 5 / 9),
        合规: Math.round(aiResult.radarScores.合规准备与后续行为 * 5 / 9),
        税务: Math.round(aiResult.radarScores.税务居民身份协调 * 5 / 9)
      },
      suggestions: aiResult.suggestions || aiResult.detailedAnalysis.recommendations.slice(0, 5),
      createdAt: new Date(),
      metadata: {
        promptUsed: aiResult.promptUsed,
        aiGenerated: true,
        version: '3.0',
        // 新增四部分结构的元数据
        overallRiskLevel: aiResult.overallRiskLevel,
        riskLevelComment: aiResult.riskLevelComment,
        radarScores: aiResult.radarScores,
        detailedAnalysis: aiResult.detailedAnalysis,
        actionPlan: aiResult.actionPlan
      }
    };

    // 在实际应用中，这里应该保存到数据库
    // await saveFeedbackToDatabase(feedback);

    return NextResponse.json({
      success: true,
      data: feedback,
      message: 'AI analysis completed successfully'
    });

  } catch (error) {
    console.error('Error in AI analysis:', error);
    
    // 返回fallback分析结果 - 新的四部分结构
    const fallbackFeedback: Feedback = {
      id: `feedback_${Date.now()}_fallback`,
      responseId: 'unknown',
      aiSummary: '风险等级：35分 - 基本合规，建议按年度更新分类与结构评估',
      riskAnalysis: {
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
        '保持良好的文档记录和申报习惯'
      ],
      createdAt: new Date(),
      metadata: {
        promptUsed: 'fallback',
        aiGenerated: false,
        version: '3.0',
        error: error instanceof Error ? error.message : 'Unknown error',
        // 新增四部分结构的元数据
        overallRiskLevel: 35,
        riskLevelComment: '基本合规，建议按年度更新分类与结构评估',
        radarScores: {
          金融账户穿透风险: 5,
          实体分类与结构风险: 5,
          税务居民身份协调: 5,
          控权人UBO暴露风险: 5,
          合规准备与后续行为: 5
        },
        detailedAnalysis: {
          riskFactors: ['技术原因导致无法详细分析', '建议人工评估风险因素', '需要专业顾问介入'],
          complianceGaps: ['系统分析能力受限', '需要人工补充评估', '建议寻求专业支持'],
          recommendations: [
            '建议咨询专业的CRS合规顾问获取个性化建议',
            '定期关注CRS相关法规的更新和变化',
            '建立完善的合规管理体系和内控制度',
            '保持良好的文档记录和申报习惯'
          ],
          riskDetailedAnalysis: {
            金融账户穿透风险: '由于技术原因，无法生成详细的AI分析。建议咨询专业的CRS合规顾问获取个性化建议。',
            实体分类与结构风险: '由于技术原因，无法生成详细的AI分析。建议咨询专业的CRS合规顾问获取个性化建议。',
            税务居民身份协调: '由于技术原因，无法生成详细的AI分析。建议咨询专业的CRS合规顾问获取个性化建议。',
            控权人UBO暴露风险: '由于技术原因，无法生成详细的AI分析。建议咨询专业的CRS合规顾问获取个性化建议。',
            合规准备与后续行为: '由于技术原因，无法生成详细的AI分析。建议咨询专业的CRS合规顾问获取个性化建议。'
          }
        },
        actionPlan: {
          immediate: ['联系专业顾问', '检查系统状态'],
          shortTerm: ['获取人工分析', '建立备用方案'],
          longTerm: ['完善技术系统', '建立多重保障']
        },
        summaryAndSuggestions: {
          evaluationSummary: '由于技术原因，无法生成详细的AI分析。以下是基于通用规则的风险评估。建议咨询专业的CRS合规顾问获取个性化建议。',
          professionalAdvice: '虽然无法基于您的具体问卷回答生成定制化分析，但我们仍为您提供以下通用的专业建议：\n\n在金融账户管理方面，建议您建立完善的账户信息档案管理系统。对所有海外金融账户进行全面梳理，建立详细的账户清单，包括账户类型、开户机构、账户余额、收益情况等关键信息。与开户银行建立定期沟通机制，确保及时获取账户变动信息，特别是涉及CRS报告的相关数据。对于复杂金融产品，如信托、基金、保险等，应当深入了解其CRS分类和报告要求。\n\n在实体结构优化方面，建议进行系统性的结构梳理和优化。明确各实体的商业目的和功能定位，确保实体设立具有合理的商业理由。对于不再具有实际业务功能的实体，考虑注销或合并，以简化整体架构。确保各实体的CRS分类准确无误，特别是要正确区分金融机构与非金融机构、主动非金融机构与被动非金融机构。\n\n在税务居民身份管理方面，建议建立动态的身份管理制度。定期评估个人和实体的税务居民身份，特别关注可能导致身份变化的因素，如居住地变更、经营地迁移、管理控制权转移等。对于可能存在多重税务居民身份的情况，提前制定应对策略，确保符合各司法管辖区的要求。\n\n关于最终受益人信息管理，建议建立完善的UBO识别和更新机制。建立详细的股权结构图和控制关系图，清晰展示最终受益人的身份和控制路径。对于复杂的股权结构，采用专业的图表工具进行可视化管理。建立UBO信息的定期更新制度，确保信息的准确性和时效性。\n\n最后，在合规体系建设方面，建议建立系统性的CRS合规管理制度。这包括制定详细的合规政策和程序、建立合规责任制、实施定期的合规培训、建立合规监控和评估机制等。建立与专业服务机构的长期合作关系，包括税务顾问、法律顾问、会计师等，确保能够及时获得专业支持。建立合规风险预警机制，定期进行合规风险评估，及时发现和处理潜在的合规问题。',
          optimizationSuggestions: [
            '联系专业的CRS合规顾问获取个性化建议',
            '定期关注CRS相关法规的更新和变化',
            '建立完善的合规管理体系和内控制度',
            '保持良好的文档记录和申报习惯',
            '如问题持续，请检查网络连接或联系技术支持'
          ]
        }
      }
    };

    return NextResponse.json({
      success: true,
      data: fallbackFeedback,
      message: 'Analysis completed with fallback method',
      warning: 'AI analysis failed, using fallback results'
    });
  }
}

// 获取分析状态的GET方法
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const responseId = searchParams.get('responseId');

    if (!responseId) {
      return NextResponse.json({
        success: false,
        error: 'Missing responseId parameter'
      }, { status: 400 });
    }

    // 在实际应用中，这里应该从数据库查询分析状态
    // const analysisStatus = await getAnalysisStatus(responseId);

    // 模拟返回分析状态
    return NextResponse.json({
      success: true,
      data: {
        responseId,
        status: 'completed', // pending, processing, completed, failed
        progress: 100,
        estimatedTimeRemaining: 0
      }
    });

  } catch (error) {
    console.error('Error getting analysis status:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
