'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
// 移除直接导入 SurveyService，改用 API 调用
import { useAuth } from '@/lib/authService';
import { Survey, Question, Answer, Response } from '@/types';
import { generateId, storage } from '@/lib/utils';

export default function SurveyPage() {
  const router = useRouter();
  const params = useParams();
  const { getCurrentUser } = useAuth();
  const surveyId = params.id as string;

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [textValue, setTextValue] = useState<string>('');
  const [scaleValue, setScaleValue] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    loadSurvey();
  }, [surveyId]);

  const loadSurvey = async () => {
    try {
      setIsLoading(true);
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
          
          // 恢复当前题目的答案
          const currentAnswer = savedProgress.answers.find(
            answer => answer.questionId === surveyData.questions[savedProgress.questionIndex]?.id
          );
          if (currentAnswer) {
            restoreAnswerState(currentAnswer);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load survey:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const restoreAnswerState = (answer: Answer) => {
    if (answer.optionId) {
      setSelectedOptionId(answer.optionId);
    }
    if (answer.optionIds) {
      setSelectedOptionIds(answer.optionIds);
    }
    if (answer.textValue) {
      setTextValue(answer.textValue);
    }
    if (answer.scaleValue) {
      setScaleValue(answer.scaleValue);
    }
  };

  const clearAnswerState = () => {
    setSelectedOptionId('');
    setSelectedOptionIds([]);
    setTextValue('');
    setScaleValue(null);
  };

  const currentQuestion = survey?.questions[currentQuestionIndex];
  const totalQuestions = survey?.questions.length || 0;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  // 保存答题进度到本地存储
  const saveProgress = (questionIndex: number, newAnswers: Answer[]) => {
    storage.set(`survey_progress_${surveyId}`, {
      questionIndex,
      answers: newAnswers
    });
  };

  const handleSingleChoiceSelect = (optionId: string) => {
    setSelectedOptionId(optionId);
  };

  const handleMultipleChoiceSelect = (optionId: string) => {
    setSelectedOptionIds(prev => {
      if (prev.includes(optionId)) {
        return prev.filter(id => id !== optionId);
      } else {
        return [...prev, optionId];
      }
    });
  };

  const handleTextChange = (value: string) => {
    setTextValue(value);
  };

  const handleScaleSelect = (value: number) => {
    setScaleValue(value);
  };

  const validateAnswer = (): boolean => {
    if (!currentQuestion) return false;

    switch (currentQuestion.type) {
      case 'single_choice':
        return !!selectedOptionId;
      case 'multiple_choice':
        const minSelections = currentQuestion.validation?.minSelections || 1;
        return selectedOptionIds.length >= minSelections;
      case 'text':
        const minLength = currentQuestion.validation?.minLength || 0;
        return textValue.length >= minLength;
      case 'scale':
      case 'rating':
        return scaleValue !== null;
      default:
        return true;
    }
  };

  const createAnswer = (): Answer => {
    if (!currentQuestion) throw new Error('No current question');

    const baseAnswer = {
      id: generateId(),
      responseId: generateId(),
      questionId: currentQuestion.id,
      question: currentQuestion
    };

    switch (currentQuestion.type) {
      case 'single_choice':
        const option = currentQuestion.options.find(opt => opt.id === selectedOptionId);
        return {
          ...baseAnswer,
          optionId: selectedOptionId,
          option
        };
      case 'multiple_choice':
        const options = currentQuestion.options.filter(opt => selectedOptionIds.includes(opt.id));
        return {
          ...baseAnswer,
          optionIds: selectedOptionIds,
          options
        };
      case 'text':
        return {
          ...baseAnswer,
          textValue
        };
      case 'scale':
      case 'rating':
        return {
          ...baseAnswer,
          scaleValue
        };
      default:
        return baseAnswer as Answer;
    }
  };

  const showAlertMessage = (message: string) => {
    setAlertMessage(message);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 3000);
  };

  const handleNext = () => {
    if (!validateAnswer()) {
      showAlertMessage(getValidationMessage());
      return;
    }

    if (!currentQuestion) return;

    // 保存当前答案
    const newAnswer = createAnswer();
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
      clearAnswerState();
      
      // 恢复下一题的答案（如果有的话）
      const nextAnswer = updatedAnswers.find(
        answer => answer.questionId === survey?.questions[nextIndex]?.id
      );
      if (nextAnswer) {
        restoreAnswerState(nextAnswer);
      }
      
      saveProgress(nextIndex, updatedAnswers);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      const prevIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIndex);
      clearAnswerState();
      
      // 恢复上一题的选择
      const prevAnswer = answers.find(
        answer => answer.questionId === survey?.questions[prevIndex].id
      );
      if (prevAnswer) {
        restoreAnswerState(prevAnswer);
      }
      
      saveProgress(prevIndex, answers);
    }
  };

  const getValidationMessage = (): string => {
    if (!currentQuestion) return '请完成当前题目';

    switch (currentQuestion.type) {
      case 'single_choice':
        return '请选择一个选项';
      case 'multiple_choice':
        const minSelections = currentQuestion.validation?.minSelections || 1;
        return `请至少选择 ${minSelections} 个选项`;
      case 'text':
        const minLength = currentQuestion.validation?.minLength || 0;
        return `请输入至少 ${minLength} 个字符`;
      case 'scale':
      case 'rating':
        return '请选择一个评分';
      default:
        return '请完成当前题目';
    }
  };

  const completeSurvey = async (finalAnswers: Answer[]) => {
    const currentUser = getCurrentUser();
    const guestUser = storage.get('guest_user');

    // 确定用户ID和类型
    let userId: string;
    let userType: string;

    if (currentUser) {
      // 已登录用户
      userId = currentUser.id;
      userType = 'registered';
    } else if (guestUser) {
      // 临时用户（填写了姓名和手机号）
      userId = guestUser.id;
      userType = 'guest';
    } else {
      // 完全匿名用户
      userId = 'anonymous_' + Date.now();
      userType = 'anonymous';
    }

    const response: Response = {
      id: generateId(),
      userId: userId,
      surveyId: surveyId,
      answers: finalAnswers,
      createdAt: new Date(),
      completed: true
    };

    // 保存完整回答
    storage.set(`response_${response.id}`, response);
    storage.remove(`survey_progress_${surveyId}`);

    // 清除临时用户信息（如果存在）
    if (guestUser) {
      storage.remove('guest_user');
    }

    // 跳转到结果页
    router.push(`/result?surveyId=${surveyId}&userId=${userId}&responseId=${response.id}&userType=${userType}`);
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
            className="mt-4 px-6 py-2 bg-white text-purple-600 rounded-lg hover:bg-gray-100 transition-colors"
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
          {survey.title}
        </h1>
        
        <div className="w-6"></div>
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
            <h2 className="text-lg font-semibold text-gray-800 mb-2 leading-relaxed">
              {currentQuestion.content}
            </h2>
            {currentQuestion.description && (
              <p className="text-gray-600 text-sm mb-6">
                {currentQuestion.description}
              </p>
            )}

            {/* 根据题目类型渲染不同的输入组件 */}
            {currentQuestion.type === 'single_choice' && (
              <div className="space-y-3">
                {currentQuestion.options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleSingleChoiceSelect(option.id)}
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
            )}

            {/* 多选题 */}
            {currentQuestion.type === 'multiple_choice' && (
              <div className="space-y-3">
                {currentQuestion.options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleMultipleChoiceSelect(option.id)}
                    className={`w-full p-4 text-left rounded-xl border transition-all duration-300 ${
                      selectedOptionIds.includes(option.id)
                        ? 'bg-purple-50 border-purple-300 text-purple-700'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center ${
                        selectedOptionIds.includes(option.id)
                          ? 'border-purple-500 bg-purple-500'
                          : 'border-gray-300'
                      }`}>
                        {selectedOptionIds.includes(option.id) && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <span className="flex-1">{option.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* 文本题 */}
            {currentQuestion.type === 'text' && (
              <div>
                <textarea
                  value={textValue}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder="请在此输入您的答案..."
                  className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none bg-white text-gray-900 placeholder-gray-500"
                  rows={4}
                  maxLength={currentQuestion.validation?.maxLength}
                />
                {currentQuestion.validation?.maxLength && (
                  <p className="text-gray-500 text-sm mt-2">
                    {textValue.length}/{currentQuestion.validation.maxLength} 字符
                  </p>
                )}
              </div>
            )}

            {/* 量表题 */}
            {(currentQuestion.type === 'scale' || currentQuestion.type === 'rating') && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      onClick={() => handleScaleSelect(value)}
                      className={`w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                        scaleValue === value
                          ? 'border-purple-500 bg-purple-500 text-white'
                          : 'border-gray-300 text-gray-600 hover:border-purple-300'
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>非常不同意</span>
                  <span>非常同意</span>
                </div>
              </div>
            )}
          </div>

          {/* 底部导航 */}
          <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              上一题
            </button>

            <button
              onClick={handleNext}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              {isLastQuestion ? '完成' : '下一题'}
              {!isLastQuestion && (
                <svg className="w-5 h-5 ml-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            {alertMessage}
          </div>
        </div>
      )}

      {/* 底部标识 */}
      <div className="text-center pb-4">
        <p className="text-white/60 text-sm">
          Powered by AIBao
        </p>
      </div>
    </div>
  );
}
