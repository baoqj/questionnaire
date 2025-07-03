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
      questionId: 'q1',
      value: ['personal_bank', 'personal_securities']
    },
    {
      questionId: 'q2',
      value: 'personal_direct'
    },
    {
      questionId: 'q3',
      value: 'clear_understanding'
    }
  ],
  completedAt: new Date(),
  createdAt: new Date()
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
    console.log('- 风险评分:', analysisResult.riskScores);
    console.log('- 建议数量:', analysisResult.suggestions.length);
    console.log('- 摘要:', analysisResult.summary.substring(0, 100) + '...');
    
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
