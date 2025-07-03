'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/authService';
// 移除直接导入 SurveyService，改用 API 调用
import LoginModal from '@/components/auth/LoginModal';
import { User } from '@/types';
import bannerImage from '@/pic/banner.png';


export default function HomePage() {
  const router = useRouter();
  const { getCurrentUser } = useAuth();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    // 检查用户登录状态
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setShowLoginModal(false);

    // 根据用户角色跳转
    if (user.role === 'admin') {
      router.push('/admin');
    } else {
      router.push('/surveys');
    }
  };



  const handleSurveySelect = (surveyId: string) => {
    if (!currentUser) {
      // 未登录用户跳转到信息收集页面
      router.push(`/guest-info?surveyId=${surveyId}`);
      return;
    }
    // 已登录用户直接跳转到问卷
    router.push(`/survey/${surveyId}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-8 px-4">
      {/* 顶部导航 */}
      <div className="absolute top-4 right-4 flex items-center space-x-3">
        {/* 选择按钮 */}
        <button
          onClick={() => router.push('/surveys')}
          className="text-white/90 text-sm bg-white/20 px-4 py-2 rounded-full hover:bg-white/30 transition-colors"
        >
          自选
        </button>

        {/* 登录按钮 */}
        <button
          onClick={() => setShowLoginModal(true)}
          className="text-white/90 text-sm bg-white/20 px-4 py-2 rounded-full hover:bg-white/30 transition-colors"
        >
          登录
        </button>
      </div>

      {/* 主要内容区域 */}
      <div className="flex flex-col items-center text-center w-full animate-fade-in pt-10">
        {/* Logo 和标题 */}
        <div className="mb-4">
          <div className="flex items-center justify-center space-x-3">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/30">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <h1 className="text-3xl font-bold text-white text-shadow">
              CRS Check
            </h1>
          </div>

        </div>

        {/* Banner 图片 */}
        <div className="w-[75vw] max-w-[400px] mb-2 mx-auto">
          <div className="relative w-full aspect-[4/3]">
            <Image
              src={bannerImage}
              alt="CRS Check Banner"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>


      {/* CRS合规风险自测主要入口 */}

      <div className="w-full max-w-[500px] bg-white rounded-3xl shadow-2xl p-8 pt-10 flex flex-col items-center relative">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">
          CRS合规风险自测
        </h2>
        <h3 className="text-xl font-semibold text-purple-700 mb-6 text-center">
          跨境合规智能分析 AI
        </h3>
        <p className="text-gray-600 text-sm mb-8 text-center px-4">
          你真的了解自己的CRS合规风险吗？本工具基于国际标准，智能识别合规风险用一次自测，厘清跨境合规盲区
        </p>
          <button
            onClick={() => handleSurveySelect('bank_crs_01')}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-4 px-6 rounded-2xl font-semibold text-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            立即开始自测
          </button>
      </div>


      </div>

      {/* 底部标识 */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <p className="text-white/60 text-sm">
          Powered by AIBao 2025
        </p>
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
