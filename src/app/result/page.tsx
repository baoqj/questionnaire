'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import { Response, RiskAnalysis, Feedback } from '@/types';
import { storage } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
// 风险分析维度 - 更新为新的五个维度
const riskDimensions = [
  { key: '金融账户穿透风险', label: '金融账户穿透', color: '#7C3AED' },
  { key: '实体分类与结构风险', label: '实体分类结构', color: '#A855F7' },
  { key: '税务居民身份协调', label: '税务居民身份', color: '#C084FC' },
  { key: '控权人UBO暴露风险', label: '控权人UBO', color: '#D8B4FE' },
  { key: '合规准备与后续行为', label: '合规准备行为', color: '#E9D5FF' }
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

function ResultContent() {
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
  const [analysisTime, setAnalysisTime] = useState<number | null>(null);

  useEffect(() => {
    const loadResults = async () => {
      setIsLoading(true);

      if (responseId && surveyId) {
        const savedResponse = storage.get<Response>(`response_${responseId}`);
        if (savedResponse) {
          setResponse(savedResponse);

          try {
            // 调用AI分析API
            console.log('🚀 开始AI分析...');
            const startTime = Date.now();

            const analysisResponse = await fetch('/api/ai-analysis', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                responseId: responseId,
                surveyId: surveyId
              }),
            });

            const analysisResult = await analysisResponse.json();
            const endTime = Date.now();
            const totalTime = endTime - startTime;

            setAnalysisTime(totalTime);
            console.log(`⚡ AI分析完成，总耗时: ${totalTime}ms`);

            if (analysisResult.success && analysisResult.data) {
              console.log('AI analysis completed:', analysisResult.data);
              setFeedback(analysisResult.data);
            } else {
              console.error('AI analysis failed:', analysisResult.error);
              // 使用fallback分析
              setFeedback(createFallbackFeedback(responseId));
            }
          } catch (error) {
            console.error('Error calling AI analysis:', error);
            // 使用fallback分析
            setFeedback(createFallbackFeedback(responseId));
          }
        } else {
          console.error('No saved response found for ID:', responseId);
        }
      }

      setIsLoading(false);
    };

    // 创建fallback反馈
    const createFallbackFeedback = (responseId: string): Feedback => ({
      id: 'feedback-fallback',
      responseId: responseId,
      aiSummary: '基于您的回答，我们为您生成了CRS合规风险分析报告。',
      riskAnalysis: {
        金融账户: 2,
        控制人: 4,
        结构: 4,
        合规: 3,
        税务: 5
      },
      suggestions: mockSuggestions.map(s => s.content),
      createdAt: new Date()
    });

    loadResults();
  }, [responseId, surveyId]);

  const radarData = feedback ? riskDimensions.map(dim => ({
    dimension: dim.label,
    value: feedback.metadata?.radarScores?.[dim.key] || feedback.riskAnalysis?.[dim.key as keyof RiskAnalysis] || 3,
    fullMark: 9
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
      // 准备AI报告数据
      const reportData = {
        surveyId,
        userId,
        responseId,
        radarData,
        aiSummary: feedback?.aiSummary,
        suggestions: feedback?.suggestions || [],
        riskAnalysis: feedback?.riskAnalysis,
        timestamp: new Date().toISOString(),
        aiGenerated: true,
        promptUsed: feedback?.metadata?.promptUsed || 'unknown'
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

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/?surveyId=${surveyId}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'CRS合规风险评估',
          text: '快来测试你的CRS合规风险等级！',
          url: shareUrl,
        });
      } catch (error) {
        console.log('分享取消或失败:', error);
      }
    } else {
      // 复制到剪贴板
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert('链接已复制到剪贴板！');
      } catch (error) {
        console.error('复制失败:', error);
        // 降级方案：显示链接
        prompt('请复制以下链接:', shareUrl);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-6"></div>
          <h2 className="text-2xl font-semibold text-white mb-4">AI智能分析中...</h2>
          <p className="text-white/80 mb-2">正在运用先进的AI技术分析您的回答</p>
          <p className="text-white/60 text-sm">预计需要10-30秒，请稍候</p>
          <div className="mt-6 flex justify-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
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
          AI智能风险分析报告
        </h1>

        <div className="w-6"></div>
      </div>



      {/* 分析建议内容 */}
      <div className="px-4 pb-32">
        <div className="bg-white rounded-t-3xl p-6">
          <div className="flex items-center mb-6 justify-center">
            <h2 className="text-2xl font-bold text-gray-800">
              AI智能分析报告
            </h2>
            <div className="ml-3 px-3 py-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-medium rounded-full">
              AI生成
            </div>
          </div>

          {/* 第一部分：整体风险等级 */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">1</span>
              整体风险等级
            </h3>
            <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-400 p-6 rounded-r-lg">
              <div className="flex items-center mb-3">
                <span className="text-3xl font-bold text-red-600 mr-4">
                  {feedback.metadata?.overallRiskLevel || 35}
                </span>
                <span className="text-gray-600">/ 99</span>
              </div>
              <p className="text-gray-700 leading-relaxed font-medium">
                {feedback.metadata?.riskLevelComment || feedback.aiSummary}
              </p>
            </div>
          </div>

          {/* 第二部分：风险评分雷达图 */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">2</span>
              风险评分
            </h3>
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-200">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#6366f1" strokeOpacity={0.3} />
                    <PolarAngleAxis
                      dataKey="dimension"
                      tick={{ fill: '#374151', fontSize: 12, fontWeight: 'bold' }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 9]}
                      tick={{ fill: '#6b7280', fontSize: 10 }}
                    />
                    <Radar
                      name="风险评分"
                      dataKey="value"
                      stroke="#7C3AED"
                      fill="#7C3AED"
                      fillOpacity={0.2}
                      strokeWidth={3}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 第三部分：详细风险解读 */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
              <span className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">3</span>
              详细风险解读
            </h3>

            {/* 显示新的详细解读 */}
            {feedback.metadata?.detailedAnalysis?.riskDetailedAnalysis && (
              <div className="space-y-4 mb-6">
                {Object.entries(feedback.metadata.detailedAnalysis.riskDetailedAnalysis).map(([key, value], index) => (
                  <div key={key} className="bg-gradient-to-r from-green-50 to-teal-50 border-l-4 border-green-400 p-4 rounded-r-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">{key}</h4>
                    <p className="text-gray-700 leading-relaxed text-sm">{value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* 传统的风险因素、合规缺口、建议 */}
            {feedback.metadata?.detailedAnalysis && (
              <div className="space-y-6">
                {feedback.metadata.detailedAnalysis.riskFactors?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3">风险因素</h4>
                    <ul className="space-y-2">
                      {feedback.metadata.detailedAnalysis.riskFactors.map((factor, index) => (
                        <li key={index} className="flex items-start">
                          <span className="w-2 h-2 bg-red-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                          <span className="text-gray-700 text-sm">{factor}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {feedback.metadata.detailedAnalysis.complianceGaps?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3">合规缺口</h4>
                    <ul className="space-y-2">
                      {feedback.metadata.detailedAnalysis.complianceGaps.map((gap, index) => (
                        <li key={index} className="flex items-start">
                          <span className="w-2 h-2 bg-yellow-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                          <span className="text-gray-700 text-sm">{gap}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {feedback.metadata.detailedAnalysis.recommendations?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3">专业建议</h4>
                    <ul className="space-y-2">
                      {feedback.metadata.detailedAnalysis.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start">
                          <span className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                          <span className="text-gray-700 text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 第四部分：评估总结 */}
          {feedback.metadata?.summaryAndSuggestions && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <span className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">4</span>
                评估总结
              </h3>

              {/* 评估总结 */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-l-4 border-purple-400 p-6 rounded-r-lg mb-4">
                <p className="text-purple-700 leading-relaxed text-sm">
                  {feedback.metadata.summaryAndSuggestions.evaluationSummary}
                </p>
              </div>

              {/* 专业建议 */}
              {feedback.metadata.summaryAndSuggestions.professionalAdvice && (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-l-4 border-indigo-400 p-6 rounded-r-lg">
                  <h4 className="font-semibold text-indigo-800 mb-4">专业建议</h4>
                  <div className="text-indigo-700 text-sm leading-relaxed whitespace-pre-line">
                    {feedback.metadata.summaryAndSuggestions.professionalAdvice}
                  </div>
                </div>
              )}

              {/* 兼容性：显示传统优化建议（如果新结构不存在） */}
              {!feedback.metadata.summaryAndSuggestions.professionalAdvice && feedback.metadata.summaryAndSuggestions.optimizationSuggestions?.length > 0 && (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-l-4 border-indigo-400 p-6 rounded-r-lg">
                  <h4 className="font-semibold text-indigo-800 mb-3">专业建议</h4>
                  <ul className="space-y-2">
                    {feedback.metadata.summaryAndSuggestions.optimizationSuggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start">
                        <span className="w-2 h-2 bg-indigo-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                        <span className="text-indigo-700 text-sm">{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}



          {/* 兼容性：显示传统建议（如果新结构不存在） */}
          {!feedback.metadata?.summaryAndSuggestions && feedback.suggestions && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4">专业建议</h3>
              <div className="space-y-6">
                {feedback.suggestions.map((suggestion, index) => (
                  <div key={index} className="border-b border-gray-200 pb-6 last:border-b-0">
                    <div className="flex items-start mb-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold mr-4 mt-1">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-800 mb-2">
                          专业建议 {index + 1}
                        </h4>
                        <p className="text-gray-700 leading-relaxed">
                          {suggestion}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 底部按钮 */}
          <div className="mt-8 pt-8 border-t border-gray-200 space-y-4">
            {/* 发送报告和分享按钮在同一行 */}
            <div className="flex space-x-3">
              <button
                onClick={handleSendReport}
                className="flex-1 bg-purple-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-purple-700 transition-colors"
              >
                发送报告
              </button>
              <button
                onClick={handleShare}
                className="w-16 h-16 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center"
                title="分享问卷"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
              </button>
            </div>
            {/* 返回首页按钮 */}
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
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 text-center">
        <p className="text-white/60 text-sm">
          Powered by AIBao 2025
        </p>
        {analysisTime && (
          <p className="text-white/40 text-xs mt-1">
            ⚡ AI分析耗时: {(analysisTime / 1000).toFixed(1)}秒
          </p>
        )}
      </div>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResultContent />
    </Suspense>
  );
}
