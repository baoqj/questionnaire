import { Survey, User, Response, Feedback, ApiResponse } from '@/types';
import { SurveyService } from '@/lib/surveyService';

// 模拟 API 延迟
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 模拟 API 错误
const simulateError = (errorRate: number = 0.1) => {
  if (Math.random() < errorRate) {
    throw new Error('Network error');
  }
};

export class ApiService {
  private static baseUrl = '/api';

  // 获取问卷
  static async getSurvey(surveyId: string): Promise<ApiResponse<Survey>> {
    try {
      await delay(500);
      simulateError(0.05);

      if (surveyId === 'crs-survey-001') {
        // 返回一个简单的模拟问卷
        const mockSurvey = {
          id: 'crs-survey-001',
          title: 'CRS合规风险评估',
          description: '评估您的CRS合规风险等级',
          category: '金融合规',
          questions: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        return {
          success: true,
          data: mockSurvey,
          message: 'Survey loaded successfully'
        };
      }

      return {
        success: false,
        error: 'Survey not found'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // 创建用户
  static async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<ApiResponse<User>> {
    try {
      await delay(800);
      simulateError(0.05);

      const user: User = {
        id: `user_${Date.now()}`,
        ...userData,
        createdAt: new Date()
      };

      return {
        success: true,
        data: user,
        message: 'User created successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create user'
      };
    }
  }

  // 提交问卷回答
  static async submitResponse(response: Response): Promise<ApiResponse<Response>> {
    try {
      await delay(1000);
      simulateError(0.05);

      const submittedResponse: Response = {
        ...response,
        completed: true,
        createdAt: new Date()
      };

      return {
        success: true,
        data: submittedResponse,
        message: 'Response submitted successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit response'
      };
    }
  }

  // 生成AI反馈
  static async generateFeedback(responseId: string): Promise<ApiResponse<Feedback>> {
    try {
      await delay(2000); // AI 分析需要更长时间
      simulateError(0.05);

      // 模拟AI分析结果
      const feedback: Feedback = {
        id: `feedback_${Date.now()}`,
        responseId,
        aiSummary: '基于您的回答，我们为您生成了个性化的CRS合规风险分析报告。',
        riskAnalysis: {
          金融账户: Math.floor(Math.random() * 5) + 1,
          控制人: Math.floor(Math.random() * 5) + 1,
          结构: Math.floor(Math.random() * 5) + 1,
          合规: Math.floor(Math.random() * 5) + 1,
          税务: Math.floor(Math.random() * 5) + 1
        },
        suggestions: [
          '建议完善海外金融账户的申报流程，确保符合CRS要求。',
          '需要明确实际控制人信息，避免穿透识别风险。',
          '建议优化企业结构，提高透明度和合规性。',
          '完善税务居民身份证明，避免多重征税风险。'
        ],
        createdAt: new Date()
      };

      return {
        success: true,
        data: feedback,
        message: 'Feedback generated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate feedback'
      };
    }
  }

  // 获取用户的所有回答记录
  static async getUserResponses(userId: string): Promise<ApiResponse<Response[]>> {
    try {
      await delay(500);
      simulateError(0.05);

      // 从本地存储获取用户的回答记录
      const responses: Response[] = [];
      
      // 这里应该从实际数据库获取，现在模拟返回空数组
      return {
        success: true,
        data: responses,
        message: 'User responses loaded successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load user responses'
      };
    }
  }

  // 获取问卷统计数据
  static async getSurveyStats(surveyId: string): Promise<ApiResponse<any>> {
    try {
      await delay(800);
      simulateError(0.05);

      const stats = {
        totalResponses: Math.floor(Math.random() * 1000) + 100,
        completionRate: Math.floor(Math.random() * 30) + 70,
        averageScore: Math.floor(Math.random() * 50) + 50,
        questionStats: []
      };

      return {
        success: true,
        data: stats,
        message: 'Survey stats loaded successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load survey stats'
      };
    }
  }
}

// React hooks for API calls
export const useApi = () => {
  return {
    getSurvey: ApiService.getSurvey,
    createUser: ApiService.createUser,
    submitResponse: ApiService.submitResponse,
    generateFeedback: ApiService.generateFeedback,
    getUserResponses: ApiService.getUserResponses,
    getSurveyStats: ApiService.getSurveyStats,
  };
};
