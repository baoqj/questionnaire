'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authService';
import { generateId } from '@/lib/utils';
import { Survey, Question, Option, QuestionTemplate } from '@/types';

export default function CreateSurveyPage() {
  const router = useRouter();
  const { getCurrentUser, isAdmin } = useAuth();
  
  const [survey, setSurvey] = useState<Partial<Survey>>({
    title: '',
    description: '',
    category: '',
    estimatedTime: 5,
    questions: []
  });
  
  const [questionTemplates, setQuestionTemplates] = useState<QuestionTemplate[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Partial<Question>>({
    type: 'single_choice',
    content: '',
    description: '',
    required: true,
    options: []
  });
  
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user || !isAdmin()) {
      router.push('/');
      return;
    }
    loadQuestionTemplates();
  }, []);

  const loadQuestionTemplates = async () => {
    try {
      setIsLoading(true);
      // 模拟加载题目类型模板
      const templates: QuestionTemplate[] = [
        {
          id: 'single_choice',
          name: '单选题',
          description: '用户只能选择一个选项',
          type: 'single_choice',
          icon: '🔘',
          template: {},
          validation: {},
          defaultOptions: [
            { id: generateId(), label: '选项A', value: 'A', score: 1, questionId: '' },
            { id: generateId(), label: '选项B', value: 'B', score: 2, questionId: '' }
          ]
        },
        {
          id: 'multiple_choice',
          name: '多选题',
          description: '用户可以选择多个选项',
          type: 'multiple_choice',
          icon: '☑️',
          template: {},
          validation: {},
          defaultOptions: [
            { id: generateId(), label: '选项A', value: 'A', score: 1, questionId: '' },
            { id: generateId(), label: '选项B', value: 'B', score: 2, questionId: '' }
          ]
        },
        {
          id: 'text',
          name: '简答题',
          description: '用户输入文本回答',
          type: 'text',
          icon: '📝',
          template: {},
          validation: {},
          defaultOptions: []
        },
        {
          id: 'scale',
          name: '量表题',
          description: '用户在量表上选择评分',
          type: 'scale',
          icon: '📊',
          template: {},
          validation: {},
          defaultOptions: []
        }
      ];
      setQuestionTemplates(templates);
    } catch (error) {
      console.error('Failed to load question templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSurveyChange = (field: keyof Survey, value: any) => {
    setSurvey(prev => ({ ...prev, [field]: value }));
  };

  const handleQuestionChange = (field: keyof Question, value: any) => {
    setCurrentQuestion(prev => ({ ...prev, [field]: value }));
  };

  const handleAddOption = () => {
    const newOption: Option = {
      id: generateId(),
      label: '',
      score: 1
    };
    setCurrentQuestion(prev => ({
      ...prev,
      options: [...(prev.options || []), newOption]
    }));
  };

  const handleOptionChange = (optionId: string, field: keyof Option, value: any) => {
    setCurrentQuestion(prev => ({
      ...prev,
      options: prev.options?.map(option =>
        option.id === optionId ? { ...option, [field]: value } : option
      ) || []
    }));
  };

  const handleRemoveOption = (optionId: string) => {
    setCurrentQuestion(prev => ({
      ...prev,
      options: prev.options?.filter(option => option.id !== optionId) || []
    }));
  };

  const handleAddQuestion = () => {
    setCurrentQuestion({
      type: 'single_choice',
      content: '',
      description: '',
      required: true,
      options: []
    });
    setEditingQuestionIndex(null);
    setShowQuestionModal(true);
  };

  const handleEditQuestion = (index: number) => {
    const question = survey.questions?.[index];
    if (question) {
      setCurrentQuestion(question);
      setEditingQuestionIndex(index);
      setShowQuestionModal(true);
    }
  };

  const handleSaveQuestion = () => {
    if (!currentQuestion.content) {
      alert('请输入题目内容');
      return;
    }

    const question: Question = {
      id: currentQuestion.id || generateId(),
      type: currentQuestion.type!,
      content: currentQuestion.content,
      description: currentQuestion.description,
      required: currentQuestion.required || false,
      options: currentQuestion.options || [],
      validation: currentQuestion.validation
    };

    setSurvey(prev => {
      const questions = [...(prev.questions || [])];
      if (editingQuestionIndex !== null) {
        questions[editingQuestionIndex] = question;
      } else {
        questions.push(question);
      }
      return { ...prev, questions };
    });

    setShowQuestionModal(false);
    setCurrentQuestion({
      type: 'single_choice',
      content: '',
      description: '',
      required: true,
      options: []
    });
    setEditingQuestionIndex(null);
  };

  const handleRemoveQuestion = (index: number) => {
    if (confirm('确定要删除这个题目吗？')) {
      setSurvey(prev => ({
        ...prev,
        questions: prev.questions?.filter((_, i) => i !== index) || []
      }));
    }
  };

  const handleSelectTemplate = (template: QuestionTemplate) => {
    setCurrentQuestion({
      type: template.type,
      content: '',
      description: '',
      required: true,
      options: template.defaultOptions.map(opt => ({ ...opt, id: generateId() }))
    });
  };

  const handleSaveSurvey = async () => {
    if (!survey.title || !survey.description || !survey.questions?.length) {
      alert('请填写完整的问卷信息');
      return;
    }

    try {
      const newSurvey: Survey = {
        id: generateId(),
        title: survey.title,
        description: survey.description,
        category: survey.category || '未分类',
        estimatedTime: survey.estimatedTime || 5,
        questions: survey.questions,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: '1.0',
        tags: [],
        settings: {
          allowAnonymous: true,
          showProgress: true,
          randomizeQuestions: false
        }
      };

      // 这里应该调用API保存问卷，现在先模拟
      console.log('Saving survey:', newSurvey);
      
      alert('问卷创建成功！');
      router.push('/admin');
    } catch (error) {
      console.error('Failed to save survey:', error);
      alert('保存失败，请重试');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">创建问卷</h1>
              <p className="text-gray-600 mt-1">设计您的问卷并添加题目</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/admin')}
                className="px-4 py-2 text-gray-600 hover:text-gray-700 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveSurvey}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                保存问卷
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 问卷基本信息 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">基本信息</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                问卷标题 *
              </label>
              <input
                type="text"
                value={survey.title || ''}
                onChange={(e) => handleSurveyChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="请输入问卷标题"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                问卷描述 *
              </label>
              <textarea
                value={survey.description || ''}
                onChange={(e) => handleSurveyChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="请输入问卷描述"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  问卷分类
                </label>
                <input
                  type="text"
                  value={survey.category || ''}
                  onChange={(e) => handleSurveyChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="如：合规检查、满意度调查等"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  预计用时（分钟）
                </label>
                <input
                  type="number"
                  value={survey.estimatedTime || 5}
                  onChange={(e) => handleSurveyChange('estimatedTime', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  min="1"
                  max="60"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 题目列表 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">题目设置</h2>
            <button
              onClick={handleAddQuestion}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              添加题目
            </button>
          </div>

          {survey.questions && survey.questions.length > 0 ? (
            <div className="space-y-4">
              {survey.questions.map((question, index) => (
                <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className="text-sm font-medium text-gray-500 mr-2">
                          题目 {index + 1}
                        </span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-600 text-xs rounded">
                          {questionTemplates.find(t => t.type === question.type)?.name || question.type}
                        </span>
                        {question.required && (
                          <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded ml-2">
                            必答
                          </span>
                        )}
                      </div>
                      <h3 className="font-medium text-gray-900 mb-1">{question.content}</h3>
                      {question.description && (
                        <p className="text-sm text-gray-600 mb-2">{question.description}</p>
                      )}
                      {question.options && question.options.length > 0 && (
                        <div className="text-sm text-gray-500">
                          选项: {question.options.map(opt => opt.label).join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleEditQuestion(index)}
                        className="text-purple-600 hover:text-purple-700 text-sm"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleRemoveQuestion(index)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500 mb-4">还没有添加任何题目</p>
              <button
                onClick={handleAddQuestion}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                添加第一个题目
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 题目编辑模态框 */}
      {showQuestionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingQuestionIndex !== null ? '编辑题目' : '添加题目'}
              </h3>
            </div>

            <div className="p-6 space-y-6">
              {/* 题目类型选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  题目类型
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {questionTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleSelectTemplate(template)}
                      className={`p-3 border rounded-lg text-left transition-colors ${
                        currentQuestion.type === template.type
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium">{template.name}</div>
                      <div className="text-sm text-gray-500 mt-1">{template.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 题目内容 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  题目内容 *
                </label>
                <textarea
                  value={currentQuestion.content || ''}
                  onChange={(e) => handleQuestionChange('content', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="请输入题目内容"
                />
              </div>

              {/* 题目描述 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  题目描述（可选）
                </label>
                <textarea
                  value={currentQuestion.description || ''}
                  onChange={(e) => handleQuestionChange('description', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="为题目添加额外说明"
                />
              </div>

              {/* 必答设置 */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="required"
                  checked={currentQuestion.required || false}
                  onChange={(e) => handleQuestionChange('required', e.target.checked)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label htmlFor="required" className="ml-2 text-sm text-gray-700">
                  此题为必答题
                </label>
              </div>

              {/* 选项设置（仅对选择题显示） */}
              {(currentQuestion.type === 'single_choice' || currentQuestion.type === 'multiple_choice') && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      选项设置
                    </label>
                    <button
                      onClick={handleAddOption}
                      className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors"
                    >
                      添加选项
                    </button>
                  </div>
                  <div className="space-y-3">
                    {currentQuestion.options?.map((option, index) => (
                      <div key={option.id} className="flex items-center space-x-3">
                        <span className="text-sm text-gray-500 w-8">
                          {String.fromCharCode(65 + index)}.
                        </span>
                        <input
                          type="text"
                          value={option.label}
                          onChange={(e) => handleOptionChange(option.id, 'label', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder={`选项 ${String.fromCharCode(65 + index)}`}
                        />
                        <input
                          type="number"
                          value={option.score || 0}
                          onChange={(e) => handleOptionChange(option.id, 'score', parseInt(e.target.value) || 0)}
                          className="w-20 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="分值"
                        />
                        <button
                          onClick={() => handleRemoveOption(option.id)}
                          className="text-red-600 hover:text-red-700 p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 量表设置（仅对量表题显示） */}
              {currentQuestion.type === 'scale' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    量表设置
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">最小值</label>
                      <input
                        type="number"
                        value={currentQuestion.validation?.min || 1}
                        onChange={(e) => handleQuestionChange('validation', {
                          ...currentQuestion.validation,
                          min: parseInt(e.target.value) || 1
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">最大值</label>
                      <input
                        type="number"
                        value={currentQuestion.validation?.max || 5}
                        onChange={(e) => handleQuestionChange('validation', {
                          ...currentQuestion.validation,
                          max: parseInt(e.target.value) || 5
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">步长</label>
                      <input
                        type="number"
                        value={currentQuestion.validation?.step || 1}
                        onChange={(e) => handleQuestionChange('validation', {
                          ...currentQuestion.validation,
                          step: parseInt(e.target.value) || 1
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowQuestionModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-700 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveQuestion}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                保存题目
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
