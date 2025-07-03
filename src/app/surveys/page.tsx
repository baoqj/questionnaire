'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// 移除直接导入 SurveyService，改用 API 调用
import { useAuth } from '@/lib/authService';
import { Survey } from '@/types';
import LoginModal from '@/components/auth/LoginModal';

export default function SurveysPage() {
  const router = useRouter();
  const { getCurrentUser } = useAuth();
  
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [filteredSurveys, setFilteredSurveys] = useState<Survey[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    loadSurveys();
  }, []);

  useEffect(() => {
    filterSurveys();
  }, [surveys, selectedCategory, searchQuery]);

  const loadSurveys = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/surveys');
      const data = await response.json();
      if (data.success) {
        setSurveys(data.surveys || []);

        // 获取分类
        const categorySet = new Set(data.surveys.map((s: any) => s.category).filter(Boolean));
        const categories = Array.from(categorySet) as string[];
        setCategories(categories);
      }
    } catch (error) {
      console.error('Failed to load surveys:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterSurveys = () => {
    let filtered = surveys;

    // 按分类筛选
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(survey => survey.category === selectedCategory);
    }

    // 按搜索关键词筛选
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(survey =>
        survey.title.toLowerCase().includes(query) ||
        survey.description.toLowerCase().includes(query)
      );
    }

    setFilteredSurveys(filtered);
  };

  const handleSurveySelect = (surveyId: string) => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      // 未登录用户跳转到信息收集页面
      router.push(`/guest-info?surveyId=${surveyId}`);
      return;
    }
    // 已登录用户直接跳转到问卷
    router.push(`/survey/${surveyId}`);
  };

  const handleLogin = () => {
    setShowLoginModal(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载问卷列表中...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">问卷列表</h1>
              <p className="text-gray-600 mt-1">选择您感兴趣的问卷进行填写</p>
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

      {/* 筛选和搜索 */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* 搜索框 */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="搜索问卷..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          {/* 分类筛选 */}
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              全部
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedCategory === category
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* 问卷列表 */}
        {filteredSurveys.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-500 text-lg">没有找到匹配的问卷</p>
            <p className="text-gray-400 text-sm mt-2">尝试调整搜索条件或分类筛选</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredSurveys.map((survey) => (
              <div
                key={survey.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleSurveySelect(survey.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 text-lg leading-tight">
                    {survey.title}
                  </h3>
                  {survey.category && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-600 text-xs rounded-full ml-2 flex-shrink-0">
                      {survey.category}
                    </span>
                  )}
                </div>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {survey.description}
                </p>
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {survey.questions.length} 道题目
                  </span>
                  {survey.estimatedTime && (
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {survey.estimatedTime} 分钟
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 登录模态框 */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleLogin}
      />
    </div>
  );
}
