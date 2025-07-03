import { NextRequest, NextResponse } from 'next/server';
import { Feedback, RiskAnalysis } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { responseId, answers } = body;

    // 验证输入
    if (!responseId || !answers || !Array.isArray(answers)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data'
      }, { status: 400 });
    }

    // 模拟AI分析延迟
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 基于答案计算风险分析
    const riskAnalysis = calculateRiskAnalysis(answers);
    
    // 生成建议
    const suggestions = generateSuggestions(riskAnalysis);

    // 创建反馈对象
    const feedback: Feedback = {
      id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      responseId,
      aiSummary: generateAISummary(riskAnalysis),
      riskAnalysis,
      suggestions,
      createdAt: new Date()
    };

    // 在实际应用中，这里应该保存到数据库
    // await saveFeedbackToDatabase(feedback);

    return NextResponse.json({
      success: true,
      data: feedback,
      message: 'Feedback generated successfully'
    });

  } catch (error) {
    console.error('Error generating feedback:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// 计算风险分析
function calculateRiskAnalysis(answers: any[]): RiskAnalysis {
  // 这里应该实现真实的风险计算逻辑
  // 现在使用模拟数据
  return {
    金融账户: Math.floor(Math.random() * 3) + 2, // 2-4
    控制人: Math.floor(Math.random() * 3) + 3,   // 3-5
    结构: Math.floor(Math.random() * 3) + 3,     // 3-5
    合规: Math.floor(Math.random() * 3) + 2,     // 2-4
    税务: Math.floor(Math.random() * 2) + 4      // 4-5
  };
}

// 生成AI摘要
function generateAISummary(riskAnalysis: RiskAnalysis): string {
  const avgRisk = Object.values(riskAnalysis).reduce((a, b) => a + b, 0) / 5;
  
  if (avgRisk >= 4) {
    return '您的CRS合规风险较高，建议尽快采取相应措施降低风险。';
  } else if (avgRisk >= 3) {
    return '您的CRS合规风险中等，建议关注重点风险领域并采取预防措施。';
  } else {
    return '您的CRS合规风险相对较低，但仍需保持关注并定期评估。';
  }
}

// 生成建议
function generateSuggestions(riskAnalysis: RiskAnalysis): string[] {
  const suggestions: string[] = [];

  if (riskAnalysis.金融账户 >= 3) {
    suggestions.push('建议完善海外金融账户的申报流程，确保符合CRS要求。');
  }

  if (riskAnalysis.控制人 >= 4) {
    suggestions.push('需要明确实际控制人信息，避免穿透识别风险。');
  }

  if (riskAnalysis.结构 >= 4) {
    suggestions.push('建议优化企业结构，提高透明度和合规性。');
  }

  if (riskAnalysis.合规 >= 3) {
    suggestions.push('建议建立完善的合规管理体系，定期进行合规检查。');
  }

  if (riskAnalysis.税务 >= 4) {
    suggestions.push('完善税务居民身份证明，避免多重征税风险。');
  }

  // 确保至少有一条建议
  if (suggestions.length === 0) {
    suggestions.push('继续保持良好的合规状态，定期关注相关法规变化。');
  }

  return suggestions;
}
