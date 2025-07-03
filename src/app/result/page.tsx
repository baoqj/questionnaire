'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import { Response, RiskAnalysis, Feedback } from '@/types';
import { storage } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
// 风险分析维度
const riskDimensions = [
  { key: '金融账户', label: '金融账户', color: '#7C3AED' },
  { key: '控制人', label: '控制人', color: '#A855F7' },
  { key: '结构', label: '结构', color: '#C084FC' },
  { key: '合规', label: '合规', color: '#D8B4FE' },
  { key: '税务', label: '税务', color: '#E9D5FF' }
];

// 模拟分析建议
const mockSuggestions = [
  {
    title: '金融账户穿透风险',
    content: '您没有持有任何海外金融账户，这大幅降低了金融账户穿透风险。不过，您的资产由控股平台或合伙企业持有，且对CRS穿透规则仅模糊了解，偶尔需要更正税务信息，这些因素带来了一定风险。',
    level: 'medium'
  },
  {
    title: '实体分类与结构风险',
    content: '您的海外公司存在有服务无实质运营的情况，采购中经常无法提供完整的发票或合同，补充结构分类证明，虽然您了解实体在CRS下的金融机构分类并准备了完整证明文件，但这些因素构成了一定的结构风险。',
    level: 'high'
  },
  {
    title: '税务居民身份协调',
    content: '您正在办理移民身份变更，拥有多个税号但未理清申报链路，偶尔在申报时无法确定应哪个国家的TIN。不过您已申请国际/DIFC税务居民证明，且正收到各国税务核查，身份协调',
    level: 'high'
  }
];

export default function ResultPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const surveyId = searchParams.get('surveyId');
  const userId = searchParams.get('userId');
  const responseId = searchParams.get('responseId');

  const [response, setResponse] = useState<Response | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  useEffect(() => {
    const loadResults = async () => {
      setIsLoading(true);
      
      if (responseId) {
        const savedResponse = storage.get<Response>(`response_${responseId}`);
        if (savedResponse) {
          setResponse(savedResponse);
          
          // 模拟AI分析生成
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const mockFeedback: Feedback = {
            id: 'feedback-001',
            responseId: responseId,
            aiSummary: '基于您的回答，我们为您生成了个性化的CRS合规风险分析报告。',
            riskAnalysis: {
              金融账户: 2,
              控制人: 4,
              结构: 4,
              合规: 3,
              税务: 5
            },
            suggestions: mockSuggestions.map(s => s.content),
            createdAt: new Date()
          };
          
          setFeedback(mockFeedback);
        }
      }
      
      setIsLoading(false);
    };

    loadResults();
  }, [responseId]);

  const radarData = feedback ? riskDimensions.map(dim => ({
    dimension: dim.label,
    value: feedback.riskAnalysis[dim.key as keyof RiskAnalysis],
    fullMark: 5
  })) : [];

  // 邮件发送功能
  const handleSendReport = () => {
    setShowEmailModal(true);
  };

  const handleEmailSubmit = async () => {
    if (!email.trim()) {
      alert('请输入邮箱地址');
      return;
    }

    // 简单的邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('请输入正确的邮箱格式');
      return;
    }

    setIsSending(true);

    try {
      // 准备报告数据
      const reportData = {
        surveyId,
        userId,
        responseId,
        radarData,
        suggestions: mockSuggestions,
        riskAnalysis: feedback?.riskAnalysis,
        timestamp: new Date().toISOString()
      };

      // 调用API发送邮件
      const response = await fetch('/api/send-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          reportData
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSendSuccess(true);
        setTimeout(() => {
          setShowEmailModal(false);
          setSendSuccess(false);
          setEmail('');
        }, 2000);
      } else {
        alert(result.error || '发送失败，请稍后重试');
      }
    } catch (error) {
      console.error('发送邮件失败:', error);
      alert('发送失败，请稍后重试');
    } finally {
      setIsSending(false);
    }
  };

  const handleBackToHome = () => {
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">正在生成您的专属分析报告...</p>
        </div>
      </div>
    );
  }

  if (!response || !feedback) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-white">未找到分析结果</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 btn-primary"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4">
        <button
          onClick={handleBackToHome}
          className="text-white/80 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <h1 className="text-lg font-semibold text-white">
          你的风险分析及建议
        </h1>

        <div className="w-6"></div>
      </div>

      {/* 雷达图区域 */}
      <div className="px-4 mb-6">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <h2 className="text-white text-lg font-semibold mb-4 text-center">风险评估雷达图</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#ffffff40" />
                <PolarAngleAxis
                  dataKey="dimension"
                  tick={{ fill: '#ffffff', fontSize: 12 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 5]}
                  tick={{ fill: '#ffffff80', fontSize: 10 }}
                />
                <Radar
                  name="风险评分"
                  dataKey="value"
                  stroke="#7C3AED"
                  fill="#7C3AED"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 分析建议内容 */}
      <div className="px-4 pb-32">
        <div className="bg-white rounded-t-3xl p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            详细分析报告
          </h2>

          {/* 显示所有建议 */}
          <div className="space-y-8">
            {mockSuggestions.map((suggestion, index) => (
              <div key={index} className="border-b border-gray-200 pb-8 last:border-b-0">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                    {index + 1}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800">
                    {suggestion.title}
                  </h3>
                  <div className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${
                    suggestion.level === 'high' ? 'bg-red-100 text-red-800' :
                    suggestion.level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {suggestion.level === 'high' ? '高风险' :
                     suggestion.level === 'medium' ? '中风险' : '低风险'}
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed text-base">
                  {suggestion.content}
                </p>
              </div>
            ))}
          </div>

          {/* 底部按钮 */}
          <div className="flex flex-col space-y-4 mt-8 pt-8 border-t border-gray-200">
            <button
              onClick={handleSendReport}
              className="w-full bg-purple-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-purple-700 transition-colors"
            >
              发送报告
            </button>
            <button
              onClick={handleBackToHome}
              className="w-full bg-gray-100 text-gray-700 py-4 rounded-xl font-semibold text-lg hover:bg-gray-200 transition-colors"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>

      {/* 邮件发送模态框 */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">
              发送报告到邮箱
            </h3>

            {sendSuccess ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-gray-700 mb-4">报告发送成功！</p>
                <p className="text-sm text-gray-500">请查收您的邮箱</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    邮箱地址
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="请输入您的邮箱地址"
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
                    disabled={isSending}
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowEmailModal(false)}
                    className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                    disabled={isSending}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleEmailSubmit}
                    disabled={isSending}
                    className="flex-1 py-3 px-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    {isSending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        发送中...
                      </>
                    ) : (
                      '确认发送'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 底部标识 */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2">
        <p className="text-white/60 text-sm">
          Powered by Knowcore AI
        </p>
      </div>
    </div>
  );
}
