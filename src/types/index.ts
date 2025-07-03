// 用户相关类型
export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  password?: string;
  role: 'user' | 'admin';
  createdAt: Date;
  lastLoginAt?: Date;
}

// 问卷选项类型
export interface Option {
  id: string;
  label: string;
  value: string;
  score: number;
  questionId: string;
}

// 问卷题目类型
export interface Question {
  id: string;
  surveyId: string;
  order: number;
  type: 'single_choice' | 'multiple_choice' | 'text' | 'scale' | 'rating' | 'matrix';
  content: string;
  description?: string;
  required: boolean;
  options: Option[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    minSelections?: number;
    maxSelections?: number;
  };
}

// 问卷类型
export interface Survey {
  id: string;
  title: string;
  description: string;
  category?: string;
  version?: string;
  estimatedTime?: string | number;
  tags?: string[];
  questions: Question[];
  settings?: {
    allowAnonymous?: boolean;
    requireCompletion?: boolean;
    randomizeOptions?: boolean;
    showProgress?: boolean;
    enableAiAssistance?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

// 用户答案类型
export interface Answer {
  id: string;
  responseId: string;
  questionId: string;
  optionId?: string;
  optionIds?: string[]; // 用于多选题
  textValue?: string; // 用于文本题
  scaleValue?: number; // 用于量表题
  question: Question;
  option?: Option;
  options?: Option[]; // 用于多选题
}

// 用户回答记录类型
export interface Response {
  id: string;
  userId: string;
  surveyId: string;
  answers: Answer[];
  createdAt: Date;
  completed: boolean;
}

// 风险分析结果类型
export interface RiskAnalysis {
  金融账户: number;
  控制人: number;
  结构: number;
  合规: number;
  税务: number;
}

// AI 反馈类型
export interface Feedback {
  id: string;
  responseId: string;
  aiSummary: string;
  riskAnalysis: RiskAnalysis;
  suggestions: string[];
  createdAt: Date;
}

// 应用状态类型
export interface AppState {
  currentUser: User | null;
  currentSurvey: Survey | null;
  currentResponse: Response | null;
  currentQuestionIndex: number;
  isLoading: boolean;
  error: string | null;
}

// API 响应类型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 路由参数类型
export interface SurveyParams {
  surveyId: string;
}

export interface ResultParams {
  surveyId: string;
  userId: string;
}

// 表单数据类型
export interface UserFormData {
  name: string;
  phone: string;
}

// 统计数据类型
export interface SurveyStats {
  totalResponses: number;
  completionRate: number;
  averageScore: number;
  questionStats: QuestionStats[];
}

export interface QuestionStats {
  questionId: string;
  question: string;
  optionStats: OptionStats[];
}

export interface OptionStats {
  optionId: string;
  label: string;
  count: number;
  percentage: number;
}

// 认证相关类型
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  phone: string;
  password?: string;
  name?: string;
}

// 问卷模板类型
export interface QuestionTemplate {
  type: string;
  name: string;
  description: string;
  icon: string;
  template: any;
  validation: any;
}

// 管理员相关类型
export interface AdminStats {
  totalSurveys: number;
  totalUsers: number;
  totalResponses: number;
  activeUsers: number;
}

export interface SurveyListItem {
  id: string;
  title: string;
  description: string;
  category?: string;
  estimatedTime?: string | number;
  responseCount: number;
  createdAt: Date;
  isActive: boolean;
}
