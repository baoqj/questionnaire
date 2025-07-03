'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authService';
import { User } from '@/types';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function ProfilePage() {
  const router = useRouter();
  const { getCurrentUser, updateUser } = useAuth();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push('/');
      return;
    }
    setCurrentUser(user);
    setFormData({
      name: user.name || '',
      phone: user.phone || ''
    });
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!formData.name.trim()) {
        setError('请输入姓名');
        return;
      }

      if (!formData.phone.trim()) {
        setError('请输入手机号');
        return;
      }

      if (currentUser) {
        const updates = {
          name: formData.name,
          phone: formData.phone
        };

        const result = await updateUser(currentUser.id, updates);
        if (result.success) {
          // 跳转到CRS问卷
          router.push('/survey/bank_crs_01');
        } else {
          setError(result.error || '更新失败');
        }
      }
    } catch (error) {
      setError('操作失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 flex flex-col">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between p-4">
        <button
          onClick={() => router.back()}
          className="text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-white text-lg font-semibold">你的档案</h1>
        <div className="w-10"></div>
      </div>

      {/* 主要内容 */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* 用户头像区域 */}
          <div className="bg-white/20 rounded-3xl p-8 mb-6 text-center backdrop-blur-sm">
            <div className="w-20 h-20 bg-white rounded-full mx-auto mb-4 flex items-center justify-center">
              <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
          </div>

          {/* 表单区域 */}
          <div className="bg-white rounded-3xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-800 text-center mb-6">
              建立你的专属合规分析
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="姓名：用于报告归纳"
                  className="w-full"
                  required
                />
              </div>

              {error && (
                <div className="text-red-500 text-sm text-center">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-4 rounded-2xl font-semibold text-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                {isLoading ? '处理中...' : '建档并自测'}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* 底部标识 */}
      <div className="p-4 text-center">
        <p className="text-white/60 text-sm">
          Powered by AIBao 2025
        </p>
      </div>
    </div>
  );
}
