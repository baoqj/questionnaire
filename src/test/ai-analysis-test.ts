// AI分析功能测试
import { llmService } from '@/lib/llm-service';
import { Response } from '@/types';

// 测试用的模拟数据
const mockResponse: Response = {
  id: 'test_response_001',
  surveyId: 'bank_crs_01',
  userId: 'test_user',
  answers: [
    {
      id: 'answer_1',
      responseId: 'test_response_001',
      questionId: 'q1',
      optionIds: ['personal_bank', 'personal_securities'],
      question: {
        id: 'q1',
        surveyId: 'bank_crs_01',
        order: 1,
        type: 'multiple_choice',
        content: '您是否持有以下类型的海外金融账户？',
        required: true,
        options: []
      }
    },
    {
      id: 'answer_2',
      responseId: 'test_response_001',
      questionId: 'q2',
      optionId: 'personal_direct',
      question: {
        id: 'q2',
        surveyId: 'bank_crs_01',
        order: 2,
        type: 'single_choice',
        content: '您的资产是否由以下架构持有？',
        required: true,
        options: []
      }
    },
    {
      id: 'answer_3',
      responseId: 'test_response_001',
      questionId: 'q3',
      optionId: 'clear_understanding',
      question: {
        id: 'q3',
        surveyId: 'bank_crs_01',
        order: 3,
        type: 'single_choice',
        content: '您对CRS穿透规则的了解程度如何？',
        required: true,
        options: []
      }
    }
  ],
  createdAt: new Date(),
  completed: true
};

const mockSurveyData = {
  id: 'bank_crs_01',
  title: 'CRS合规风险自测',
  questions: [
    {
      id: 'q1',
      title: '您是否持有以下类型的海外金融账户？',
      type: 'multiple_choice'
    },
    {
      id: 'q2',
      title: '您的资产是否由以下架构持有？',
      type: 'single_choice'
    },
    {
      id: 'q3',
      title: '您对CRS穿透规则的了解程度如何？',
      type: 'single_choice'
    }
  ]
};

// 测试函数
export async function testAIAnalysis() {
  console.log('开始测试AI分析功能...');
  
  try {
    // 测试prompt配置加载
    console.log('1. 测试prompt配置加载...');
    const promptConfig = await llmService.loadPromptConfig('bank_crs_01');
    console.log('Prompt配置加载结果:', promptConfig ? '成功' : '失败');
    
    if (promptConfig) {
      console.log('可用的prompt类型:', Object.keys(promptConfig.prompts));
    }

    // 测试AI分析
    console.log('2. 测试AI分析...');
    const analysisResult = await llmService.analyzeResponse(mockResponse, mockSurveyData);
    
    console.log('AI分析结果:');
    console.log('- 使用的prompt:', analysisResult.promptUsed);
    console.log('- 整体风险等级:', analysisResult.overallRiskLevel);
    console.log('- 风险等级评论:', analysisResult.riskLevelComment);
    console.log('- 雷达图评分:', analysisResult.radarScores);
    console.log('- 详细分析:', analysisResult.detailedAnalysis);
    console.log('- 行动计划:', analysisResult.actionPlan);
    console.log('- 兼容性风险评分:', analysisResult.riskScores);
    console.log('- 兼容性建议数量:', analysisResult.suggestions?.length || 0);
    console.log('- 兼容性摘要:', analysisResult.summary?.substring(0, 100) + '...' || '无摘要');
    
    return analysisResult;
  } catch (error) {
    console.error('AI分析测试失败:', error);
    throw error;
  }
}

// 如果直接运行此文件，执行测试
if (typeof window === 'undefined') {
  // Node.js环境
  testAIAnalysis().then(result => {
    console.log('测试完成，结果:', result);
  }).catch(error => {
    console.error('测试失败:', error);
  });
}
