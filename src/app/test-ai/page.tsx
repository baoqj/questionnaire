'use client';

import { useState } from 'react';

export default function TestAIPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testAIAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('开始测试AI分析...');
      
      const response = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          responseId: 'test_response_001',
          surveyId: 'bank_crs_01'
        }),
      });

      const data = await response.json();
      console.log('AI分析结果:', data);

      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || '分析失败');
      }
    } catch (err) {
      console.error('测试失败:', err);
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">
          AI分析功能测试
        </h1>

        <div className="bg-white rounded-lg p-6 mb-6">
          <button
            onClick={testAIAnalysis}
            disabled={isLoading}
            className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '分析中...' : '开始AI分析测试'}
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <strong>错误:</strong> {error}
          </div>
        )}

        {result && (
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">AI分析结果</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">基本信息</h3>
                <p><strong>反馈ID:</strong> {result.id}</p>
                <p><strong>响应ID:</strong> {result.responseId}</p>
                <p><strong>创建时间:</strong> {new Date(result.createdAt).toLocaleString()}</p>
                {result.metadata && (
                  <p><strong>使用的Prompt:</strong> {result.metadata.promptUsed}</p>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">AI摘要</h3>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p>{result.aiSummary}</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">风险评分</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {Object.entries(result.riskAnalysis).map(([key, value]) => (
                    <div key={key} className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{value as number}</div>
                      <div className="text-sm text-gray-600">{key}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">专业建议</h3>
                <div className="space-y-3">
                  {result.suggestions.map((suggestion: string, index: number) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-start">
                        <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-semibold mr-3 mt-1">
                          {index + 1}
                        </div>
                        <p className="flex-1">{suggestion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
