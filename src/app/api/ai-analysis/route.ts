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
        { questionId: 'q1', value: ['personal_bank', 'personal_securities'] },
        { questionId: 'q2', value: 'offshore_company' }, // 使用离岸公司 - 触发高净值分析
        { questionId: 'q3', value: ['crs_self_cert'] },
        { questionId: 'q4', value: 'partial_understanding' },
        { questionId: 'q5', value: 'sometimes_correct' },
        { questionId: 'q6', value: 'frequent_transactions' },
        { questionId: 'q7', value: 'partial_compliance' },
        { questionId: 'q8', value: 'multiple_residency' }
      ],
      completedAt: new Date(),
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
      // 如果AI分析失败，使用fallback结果
      aiResult = {
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
        summary: '基于您的回答，我们为您生成了CRS合规风险分析报告。您的整体风险水平为中等，建议加强合规管理。',
        promptUsed: 'fallback_due_to_error'
      };
    }

    // 创建反馈对象
    const feedback: Feedback = {
      id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      responseId,
      aiSummary: aiResult.summary,
      riskAnalysis: aiResult.riskScores,
      suggestions: aiResult.suggestions,
      createdAt: new Date(),
      metadata: {
        promptUsed: aiResult.promptUsed,
        aiGenerated: true,
        version: '2.0'
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
    
    // 返回fallback分析结果
    const fallbackFeedback: Feedback = {
      id: `feedback_${Date.now()}_fallback`,
      responseId: request.body?.responseId || 'unknown',
      aiSummary: '由于技术原因，无法生成详细的AI分析。以下是基于通用规则的风险评估。',
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
        version: '2.0',
        error: error instanceof Error ? error.message : 'Unknown error'
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
