import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Survey, Response, Answer, AppState } from '@/types';
import { storage } from '@/lib/utils';

interface AppStore extends AppState {
  // Actions
  setCurrentUser: (user: User | null) => void;
  setCurrentSurvey: (survey: Survey | null) => void;
  setCurrentResponse: (response: Response | null) => void;
  setCurrentQuestionIndex: (index: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Survey actions
  saveAnswer: (answer: Answer) => void;
  updateAnswer: (questionId: string, optionId: string) => void;
  clearAnswers: () => void;
  
  // Progress actions
  saveProgress: () => void;
  loadProgress: (surveyId: string) => void;
  clearProgress: (surveyId: string) => void;
  
  // Reset
  reset: () => void;
}

const initialState: AppState = {
  currentUser: null,
  currentSurvey: null,
  currentResponse: null,
  currentQuestionIndex: 0,
  isLoading: false,
  error: null,
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setCurrentUser: (user) => set({ currentUser: user }),
      
      setCurrentSurvey: (survey) => set({ currentSurvey: survey }),
      
      setCurrentResponse: (response) => set({ currentResponse: response }),
      
      setCurrentQuestionIndex: (index) => set({ currentQuestionIndex: index }),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      setError: (error) => set({ error }),

      saveAnswer: (answer) => {
        const { currentResponse } = get();
        if (!currentResponse) return;

        const updatedAnswers = [...currentResponse.answers];
        const existingIndex = updatedAnswers.findIndex(
          a => a.questionId === answer.questionId
        );

        if (existingIndex >= 0) {
          updatedAnswers[existingIndex] = answer;
        } else {
          updatedAnswers.push(answer);
        }

        const updatedResponse = {
          ...currentResponse,
          answers: updatedAnswers
        };

        set({ currentResponse: updatedResponse });
      },

      updateAnswer: (questionId, optionId) => {
        const { currentResponse, currentSurvey } = get();
        if (!currentResponse || !currentSurvey) return;

        const question = currentSurvey.questions.find(q => q.id === questionId);
        const option = question?.options.find(o => o.id === optionId);
        
        if (!question || !option) return;

        const answer: Answer = {
          id: `answer_${Date.now()}`,
          responseId: currentResponse.id,
          questionId,
          optionId,
          question,
          option
        };

        get().saveAnswer(answer);
      },

      clearAnswers: () => {
        const { currentResponse } = get();
        if (!currentResponse) return;

        set({
          currentResponse: {
            ...currentResponse,
            answers: []
          }
        });
      },

      saveProgress: () => {
        const { currentSurvey, currentResponse, currentQuestionIndex } = get();
        if (!currentSurvey || !currentResponse) return;

        const progressKey = `survey_progress_${currentSurvey.id}`;
        storage.set(progressKey, {
          questionIndex: currentQuestionIndex,
          answers: currentResponse.answers,
          responseId: currentResponse.id
        });
      },

      loadProgress: (surveyId) => {
        const progressKey = `survey_progress_${surveyId}`;
        const progress = storage.get<{
          questionIndex: number;
          answers: Answer[];
          responseId: string;
        }>(progressKey);

        if (progress) {
          set({
            currentQuestionIndex: progress.questionIndex,
            currentResponse: {
              id: progress.responseId,
              userId: get().currentUser?.id || '',
              surveyId,
              answers: progress.answers,
              createdAt: new Date(),
              completed: false
            }
          });
        }
      },

      clearProgress: (surveyId) => {
        const progressKey = `survey_progress_${surveyId}`;
        storage.remove(progressKey);
      },

      reset: () => set(initialState),
    }),
    {
      name: 'app-store',
      partialize: (state) => ({
        currentUser: state.currentUser,
        currentQuestionIndex: state.currentQuestionIndex,
      }),
    }
  )
);

// Selectors
export const useCurrentUser = () => useAppStore(state => state.currentUser);
export const useCurrentSurvey = () => useAppStore(state => state.currentSurvey);
export const useCurrentResponse = () => useAppStore(state => state.currentResponse);
export const useCurrentQuestionIndex = () => useAppStore(state => state.currentQuestionIndex);
export const useIsLoading = () => useAppStore(state => state.isLoading);
export const useError = () => useAppStore(state => state.error);

// Action hooks
export const useAppActions = () => {
  const store = useAppStore();
  return {
    setCurrentUser: store.setCurrentUser,
    setCurrentSurvey: store.setCurrentSurvey,
    setCurrentResponse: store.setCurrentResponse,
    setCurrentQuestionIndex: store.setCurrentQuestionIndex,
    setLoading: store.setLoading,
    setError: store.setError,
    saveAnswer: store.saveAnswer,
    updateAnswer: store.updateAnswer,
    clearAnswers: store.clearAnswers,
    saveProgress: store.saveProgress,
    loadProgress: store.loadProgress,
    clearProgress: store.clearProgress,
    reset: store.reset,
  };
};
