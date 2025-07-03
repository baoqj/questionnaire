import { Survey, Question, Option } from '@/types';

// 问卷数据服务类
export class SurveyService {
  private static surveysPath = typeof window === 'undefined' ?
    require('path').join(process.cwd(), 'src/data/surveys') : '';

  // 获取所有问卷列表
  static async getAllSurveys(): Promise<Survey[]> {
    try {
      // 在客户端环境下，使用 API 路由
      if (typeof window !== 'undefined') {
        const response = await fetch('/api/surveys');
        const data = await response.json();
        return data.surveys || [];
      }

      // 在服务端环境下，直接读取文件
      const fs = require('fs');
      const path = require('path');

      const files = fs.readdirSync(this.surveysPath);
      const jsonFiles = files.filter((file: string) => file.endsWith('.json'));

      const surveys: Survey[] = [];

      for (const file of jsonFiles) {
        const filePath = path.join(this.surveysPath, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const surveyData = JSON.parse(fileContent);

        // 转换为标准格式
        const survey = this.convertToStandardFormat(surveyData);
        surveys.push(survey);
      }
      
      return surveys;
    } catch (error) {
      console.error('Error loading surveys:', error);
      return [];
    }
  }

  // 根据ID获取特定问卷
  static async getSurveyById(surveyId: string): Promise<Survey | null> {
    try {
      // 在客户端环境下，使用 API 路由
      if (typeof window !== 'undefined') {
        const response = await fetch(`/api/surveys/${surveyId}`);
        const data = await response.json();
        return data.survey || null;
      }

      // 在服务端环境下，直接读取文件
      const fs = require('fs');
      const path = require('path');

      const files = fs.readdirSync(this.surveysPath);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(this.surveysPath, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const surveyData = JSON.parse(fileContent);

        if (surveyData.id === surveyId) {
          return this.convertToStandardFormat(surveyData);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error loading survey:', error);
      return null;
    }
  }

  // 将JSON格式转换为标准Survey格式
  private static convertToStandardFormat(surveyData: any): Survey {
    const questions: Question[] = surveyData.questions.map((q: any, index: number) => {
      const options: Option[] = q.options?.map((opt: any, optIndex: number) => ({
        id: opt.id || `${q.id}-o${optIndex + 1}`,
        questionId: q.id,
        label: opt.text,
        value: opt.value,
        score: this.calculateOptionScore(q.type, optIndex, q.options?.length || 1)
      })) || [];

      return {
        id: q.id,
        surveyId: surveyData.id,
        order: index + 1,
        type: q.type || 'single_choice',
        content: q.title,
        description: q.description,
        required: q.required !== false,
        options
      };
    });

    return {
      id: surveyData.id,
      title: surveyData.title,
      description: surveyData.description,
      category: surveyData.category,
      version: surveyData.version || '1.0',
      estimatedTime: surveyData.estimatedTime || surveyData.estimated_time,
      tags: surveyData.tags || [],
      questions,
      settings: {
        allowAnonymous: surveyData.settings?.allowAnonymous ?? true,
        requireCompletion: surveyData.settings?.requireCompletion ?? false,
        randomizeOptions: surveyData.settings?.randomizeOptions ?? false,
        showProgress: surveyData.settings?.showProgress ?? true,
        enableAiAssistance: surveyData.settings?.enableAiAssistance ?? true
      },
      createdAt: new Date(surveyData.createdAt || surveyData.created_at || Date.now()),
      updatedAt: new Date(surveyData.updatedAt || surveyData.updated_at || Date.now())
    };
  }

  // 计算选项分数（用于风险评估）
  private static calculateOptionScore(questionType: string, optionIndex: number, totalOptions: number): number {
    switch (questionType) {
      case 'single_choice':
      case 'multiple_choice':
        // 根据选项位置计算分数，第一个选项通常风险最高
        return Math.max(1, totalOptions - optionIndex);
      case 'scale':
        // 量表题直接使用索引+1作为分数
        return optionIndex + 1;
      case 'text':
        // 文本题默认分数
        return 1;
      default:
        return 1;
    }
  }

  // 获取问卷分类
  static async getSurveyCategories(): Promise<string[]> {
    const surveys = await this.getAllSurveys();
    const categories = [...new Set(surveys.map(s => s.category).filter(Boolean))];
    return categories;
  }

  // 搜索问卷
  static async searchSurveys(query: string): Promise<Survey[]> {
    const surveys = await this.getAllSurveys();
    const lowercaseQuery = query.toLowerCase();
    
    return surveys.filter(survey => 
      survey.title.toLowerCase().includes(lowercaseQuery) ||
      survey.description.toLowerCase().includes(lowercaseQuery) ||
      survey.category?.toLowerCase().includes(lowercaseQuery)
    );
  }
}

// 风险分析维度（从原 mockData 迁移）
export const riskDimensions = [
  { key: '金融账户', label: '金融账户', color: '#7C3AED' },
  { key: '控制人', label: '控制人', color: '#A855F7' },
  { key: '结构', label: '结构', color: '#C084FC' },
  { key: '合规', label: '合规', color: '#D8B4FE' },
  { key: '税务', label: '税务', color: '#E9D5FF' }
];

// 默认建议模板
export const defaultSuggestions = [
  {
    title: '合规风险评估',
    content: '基于您的回答，建议定期进行合规风险评估，确保符合相关法规要求。',
    level: 'medium' as const
  },
  {
    title: '专业咨询建议',
    content: '如有疑问，建议咨询专业的法律或税务顾问，获取个性化的合规建议。',
    level: 'low' as const
  }
];
