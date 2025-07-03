'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
// 移除直接导入 SurveyService，改用 API 调用
import { Survey, Answer, Response, User } from '@/types';
import { generateId, storage } from '@/lib/utils';

export default function SurveyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const surveyId = searchParams.get('surveyId');

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    // 加载问卷数据
    const loadSurvey = async () => {
      if (!surveyId) {
        router.push('/surveys');
        return;
      }

      setIsLoading(true);

      try {
        const response = await fetch(`/api/surveys/${surveyId}`);
        const data = await response.json();
        const surveyData = data.success ? data.data : null;
        if (surveyData) {
          setSurvey(surveyData);

          // 尝试从本地存储恢复答题进度
          const savedProgress = storage.get<{
            questionIndex: number;
            answers: Answer[];
          }>(`survey_progress_${surveyId}`);

          if (savedProgress) {
            setCurrentQuestionIndex(savedProgress.questionIndex);
            setAnswers(savedProgress.answers);
          }
        } else {
          router.push('/surveys');
        }
      } catch (error) {
        console.error('Failed to load survey:', error);
        router.push('/surveys');
      }
      
      setIsLoading(false);
    };

    loadSurvey();
  }, [surveyId]);

  const currentQuestion = survey?.questions[currentQuestionIndex];
  const totalQuestions = survey?.questions.length || 0;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  // 保存答题进度到本地存储
  const saveProgress = (questionIndex: number, newAnswers: Answer[]) => {
    if (surveyId) {
      storage.set(`survey_progress_${surveyId}`, {
        questionIndex,
        answers: newAnswers
      });
    }
  };

  const handleOptionSelect = (optionId: string) => {
    setSelectedOptionId(optionId);
  };

  const handleNext = () => {
    if (!selectedOptionId) {
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
      return;
    }

    if (!currentQuestion) return;

    // 保存当前答案
    const newAnswer: Answer = {
      id: generateId(),
      responseId: generateId(),
      questionId: currentQuestion.id,
      optionId: selectedOptionId,
      question: currentQuestion,
      option: currentQuestion.options.find(opt => opt.id === selectedOptionId)!
    };

    const updatedAnswers = [...answers];
    const existingAnswerIndex = updatedAnswers.findIndex(
      answer => answer.questionId === currentQuestion.id
    );

    if (existingAnswerIndex >= 0) {
      updatedAnswers[existingAnswerIndex] = newAnswer;
    } else {
      updatedAnswers.push(newAnswer);
    }

    setAnswers(updatedAnswers);

    if (isLastQuestion) {
      // 完成问卷，跳转到结果页
      completeSurvey(updatedAnswers);
    } else {
      // 下一题
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setSelectedOptionId('');
      saveProgress(nextIndex, updatedAnswers);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      const prevIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIndex);
      
      // 恢复上一题的选择
      const prevAnswer = answers.find(
        answer => answer.questionId === survey?.questions[prevIndex].id
      );
      setSelectedOptionId(prevAnswer?.optionId || '');
      
      saveProgress(prevIndex, answers);
    }
  };

  const completeSurvey = async (finalAnswers: Answer[]) => {
    const currentUser = storage.get<User>('currentUser');
    if (!currentUser || !surveyId) return;

    const response: Response = {
      id: generateId(),
      userId: currentUser.id,
      surveyId: surveyId,
      answers: finalAnswers,
      createdAt: new Date(),
      completed: true
    };

    // 保存完整回答
    storage.set(`response_${response.id}`, response);
    storage.remove(`survey_progress_${surveyId}`);

    // 跳转到结果页
    router.push(`/result?surveyId=${surveyId}&userId=${currentUser.id}&responseId=${response.id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">加载问卷中...</p>
        </div>
      </div>
    );
  }

  if (!survey || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-white">问卷不存在</p>
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
    <div className="min-h-screen flex flex-col">
      {/* 头部导航 */}
      <div className="flex items-center justify-between p-4">
        <button
          onClick={() => router.back()}
          className="flex items-center text-white/80 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h1 className="text-lg font-semibold text-white">
          我们想知道
        </h1>
        
        <button className="text-white/80 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>

      {/* 主要内容 */}
      <div className="flex-1 px-4 pb-4">
        <div className="bg-white rounded-3xl p-6 h-full flex flex-col">
          {/* 进度指示 */}
          <div className="mb-6">
            <p className="text-gray-500 text-sm font-medium mb-2">
              QUESTION {currentQuestionIndex + 1} OF {totalQuestions}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* 题目内容 */}
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-800 mb-6 leading-relaxed">
              {currentQuestion.content}
            </h2>

            {/* 选项列表 */}
            <div className="space-y-3">
              {currentQuestion.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleOptionSelect(option.id)}
                  className={`w-full p-4 text-left rounded-xl border transition-all duration-300 ${
                    selectedOptionId === option.id
                      ? 'bg-purple-50 border-purple-300 text-purple-700'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                      selectedOptionId === option.id
                        ? 'border-purple-500 bg-purple-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedOptionId === option.id && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                    <span className="flex-1">{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 底部导航 */}
          <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className="nav-button secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              上一题
            </button>

            <button
              onClick={handleNext}
              className="nav-button primary"
            >
              {isLastQuestion ? '完成' : '下一题'}
              {!isLastQuestion && (
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 提示弹窗 */}
      {showAlert && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in">
            请选择一个选项后再继续
          </div>
        </div>
      )}

      {/* 底部标识 */}
      <div className="text-center pb-4">
        <p className="text-white/60 text-sm">
          Powered by AIBao 2025
        </p>
      </div>
    </div>
  );
}
