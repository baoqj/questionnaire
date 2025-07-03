import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
  color?: 'purple' | 'green' | 'blue' | 'red';
  size?: 'sm' | 'md' | 'lg';
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  className,
  showLabel = false,
  color = 'purple',
  size = 'md'
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const colorClasses = {
    purple: 'bg-purple-600',
    green: 'bg-green-600',
    blue: 'bg-blue-600',
    red: 'bg-red-600'
  };

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            进度
          </span>
          <span className="text-sm text-gray-500">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      <div className={cn(
        'w-full bg-gray-200 rounded-full overflow-hidden',
        sizeClasses[size]
      )}>
        <div
          className={cn(
            'transition-all duration-300 ease-out rounded-full',
            colorClasses[color],
            sizeClasses[size]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

export const StepProgress: React.FC<StepProgressProps> = ({
  currentStep,
  totalSteps,
  className
}) => {
  return (
    <div className={cn('flex items-center space-x-2', className)}>
      {Array.from({ length: totalSteps }, (_, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;
        
        return (
          <React.Fragment key={stepNumber}>
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300',
                isCompleted
                  ? 'bg-purple-600 text-white'
                  : isCurrent
                  ? 'bg-purple-100 text-purple-600 border-2 border-purple-600'
                  : 'bg-gray-200 text-gray-500'
              )}
            >
              {isCompleted ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                stepNumber
              )}
            </div>
            {stepNumber < totalSteps && (
              <div
                className={cn(
                  'flex-1 h-1 rounded-full transition-all duration-300',
                  isCompleted ? 'bg-purple-600' : 'bg-gray-200'
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
