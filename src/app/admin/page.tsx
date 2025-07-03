'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authService';
// 移除直接导入 SurveyService，改用 API 调用
import { storage } from '@/lib/utils';
import { Survey, User, Response, AdminStats } from '@/types';

export default function AdminDashboard() {
  const router = useRouter();
  const { getCurrentUser, getAllUsers, isAdmin } = useAuth();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'surveys' | 'users' | 'analytics'>('overview');
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalSurveys: 0,
    totalUsers: 0,
    totalResponses: 0,
    activeUsers: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user || !isAdmin()) {
      router.push('/');
      return;
    }
    setCurrentUser(user);
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // 加载问卷列表
      const response = await fetch('/api/surveys');
      const data = await response.json();
      const surveyList = data.success ? data.surveys : [];
      setSurveys(surveyList);

      // 加载用户列表
      const userList = await getAllUsers();
      setUsers(userList);

      // 计算统计数据
      const responses = getAllResponses();
      const activeUserIds = new Set(responses.map(r => r.userId));

      setStats({
        totalSurveys: surveyList.length,
        totalUsers: userList.length,
        totalResponses: responses.length,
        activeUsers: activeUserIds.size
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAllResponses = (): Response[] => {
    const responses: Response[] = [];
    const storageKeys = Object.keys(localStorage);

    for (const key of storageKeys) {
      if (key.startsWith('response_')) {
        try {
          const response = storage.get<Response>(key);
          if (response && response.completed) {
            responses.push({
              ...response,
              createdAt: new Date(response.createdAt)
            });
          }
        } catch (error) {
          console.error('Error loading response:', error);
        }
      }
    }

    return responses;
  };

  const getSurveyResponseCount = (surveyId: string): number => {
    const responses = getAllResponses();
    return responses.filter(r => r.surveyId === surveyId).length;
  };

  const handleCreateSurvey = () => {
    router.push('/admin/surveys/create');
  };

  const handleEditSurvey = (surveyId: string) => {
    router.push(`/admin/surveys/edit/${surveyId}`);
  };

  const handleViewSurveyAnalytics = (surveyId: string) => {
    router.push(`/admin/surveys/analytics/${surveyId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载管理面板中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">管理员面板</h1>
              <p className="text-gray-600 mt-1">
                欢迎回来，{currentUser?.name}！管理您的问卷系统
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 text-gray-600 hover:text-gray-700 transition-colors"
              >
                返回首页
              </button>
              <button
                onClick={handleCreateSurvey}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                创建问卷
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 导航标签 */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: '概览', icon: '📊' },
              { id: 'surveys', name: '问卷管理', icon: '📝' },
              { id: 'users', name: '用户管理', icon: '👥' },
              { id: 'analytics', name: '数据分析', icon: '📈' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 概览标签 */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-purple-600 text-lg">📝</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">总问卷数</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.totalSurveys}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 text-lg">👥</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">总用户数</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-green-600 text-lg">📊</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">总回答数</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.totalResponses}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <span className="text-orange-600 text-lg">🔥</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">活跃用户</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.activeUsers}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 最近活动 */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">最近活动</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-500">暂无最近活动记录</p>
              </div>
            </div>
          </div>
        )}

        {/* 问卷管理标签 */}
        {activeTab === 'surveys' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">问卷管理</h2>
              <button
                onClick={handleCreateSurvey}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                创建新问卷
              </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      问卷标题
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      分类
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      题目数
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      回答数
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      创建时间
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {surveys.map((survey) => (
                    <tr key={survey.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{survey.title}</div>
                        <div className="text-sm text-gray-500">{survey.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                          {survey.category || '未分类'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {survey.questions.length}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getSurveyResponseCount(survey.id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(survey.createdAt).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleEditSurvey(survey.id)}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleViewSurveyAnalytics(survey.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          分析
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 用户管理和数据分析标签 */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">用户管理</h2>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-500">用户管理功能正在开发中...</p>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">数据分析</h2>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-500">数据分析功能正在开发中...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
