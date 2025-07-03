'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authService';
// 移除直接导入 SurveyService，改用 API 调用
import { storage } from '@/lib/utils';
import { Response, Survey, User } from '@/types';

interface ResponseWithSurvey extends Response {
  survey?: Survey;
}

export default function UserHistoryPage() {
  const router = useRouter();
  const { getCurrentUser } = useAuth();
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [responses, setResponses] = useState<ResponseWithSurvey[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push('/');
      return;
    }
    setCurrentUser(user);
    loadUserResponses(user.id);
  }, []);

  const loadUserResponses = async (userId: string) => {
    try {
      setIsLoading(true);
      
      // 从本地存储获取用户的所有回答记录
      const allResponses: ResponseWithSurvey[] = [];
      const storageKeys = Object.keys(localStorage);
      
      for (const key of storageKeys) {
        if (key.startsWith('response_')) {
          try {
            const response = storage.get<Response>(key);
            if (response && response.userId === userId && response.completed) {
              // 获取对应的问卷信息
              // 通过API获取问卷信息
              const surveyResponse = await fetch(`/api/surveys/${response.surveyId}`);
              const surveyData = await surveyResponse.json();
              const survey = surveyData.success ? surveyData.data : null;
              allResponses.push({
                ...response,
                survey,
                createdAt: new Date(response.createdAt)
              });
            }
          } catch (error) {
            console.error('Error loading response:', error);
          }
        }
      }
      
      // 按时间倒序排列
      allResponses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setResponses(allResponses);
    } catch (error) {
      console.error('Failed to load user responses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateScore = (response: Response): number => {
    let totalScore = 0;
    response.answers.forEach(answer => {
      if (answer.option) {
        totalScore += answer.option.score;
      } else if (answer.options) {
        totalScore += answer.options.reduce((sum, opt) => sum + opt.score, 0);
      } else if (answer.scaleValue) {
        totalScore += answer.scaleValue;
      }
    });
    return totalScore;
  };

  const getRiskLevel = (score: number, maxScore: number): { level: string; color: string } => {
    const percentage = (score / maxScore) * 100;
    
    if (percentage >= 80) {
      return { level: '高风险', color: 'text-red-600 bg-red-100' };
    } else if (percentage >= 60) {
      return { level: '中高风险', color: 'text-orange-600 bg-orange-100' };
    } else if (percentage >= 40) {
      return { level: '中等风险', color: 'text-yellow-600 bg-yellow-100' };
    } else if (percentage >= 20) {
      return { level: '低风险', color: 'text-green-600 bg-green-100' };
    } else {
      return { level: '极低风险', color: 'text-blue-600 bg-blue-100' };
    }
  };

  const handleViewResult = (response: ResponseWithSurvey) => {
    router.push(`/result?surveyId=${response.surveyId}&userId=${response.userId}&responseId=${response.id}`);
  };

  const handleRetakeSurvey = (surveyId: string) => {
    // 已登录用户直接跳转到问卷（这里用户肯定已登录，因为能访问历史页面）
    router.push(`/survey/${surveyId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载历史记录中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">我的问卷记录</h1>
              <p className="text-gray-600 mt-1">
                欢迎回来，{currentUser?.name}！查看您的问卷填写历史和分析结果
              </p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 text-purple-600 hover:text-purple-700 transition-colors"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {responses.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无问卷记录</h3>
            <p className="text-gray-500 mb-6">您还没有完成任何问卷，快去填写一份吧！</p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              开始填写问卷
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {responses.map((response) => {
              const score = calculateScore(response);
              const maxScore = response.answers.length * 5; // 假设最高分为5分
              const riskInfo = getRiskLevel(score, maxScore);
              
              return (
                <div key={response.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {response.survey?.title || '未知问卷'}
                      </h3>
                      <p className="text-gray-600 text-sm mb-3">
                        {response.survey?.description}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {new Date(response.createdAt).toLocaleDateString('zh-CN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {response.answers.length} 道题目
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${riskInfo.color}`}>
                        {riskInfo.level}
                      </span>
                      <p className="text-gray-500 text-sm mt-1">
                        得分: {score}/{maxScore}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleViewResult(response)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                    >
                      查看详细结果
                    </button>
                    <button
                      onClick={() => handleRetakeSurvey(response.surveyId)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      重新填写
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
