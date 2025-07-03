import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'white' | 'purple' | 'gray';
  text?: string;
  fullScreen?: boolean;
}

export const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  color = 'white',
  text,
  fullScreen = false
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const colorClasses = {
    white: 'text-white',
    purple: 'text-purple-600',
    gray: 'text-gray-600'
  };

  const spinner = (
    <svg
      className={cn(
        'animate-spin',
        sizeClasses[size],
        colorClasses[color]
      )}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 flex flex-col items-center space-y-4">
          {spinner}
          {text && (
            <p className="text-gray-700 text-sm font-medium">{text}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center space-x-2">
      {spinner}
      {text && (
        <span className={cn('text-sm font-medium', colorClasses[color])}>
          {text}
        </span>
      )}
    </div>
  );
};

export const LoadingDots: React.FC<{ color?: string }> = ({ 
  color = 'text-purple-600' 
}) => {
  return (
    <div className="flex space-x-1">
      <div className={cn('w-2 h-2 rounded-full animate-pulse', color)}></div>
      <div className={cn('w-2 h-2 rounded-full animate-pulse', color)} style={{ animationDelay: '0.1s' }}></div>
      <div className={cn('w-2 h-2 rounded-full animate-pulse', color)} style={{ animationDelay: '0.2s' }}></div>
    </div>
  );
};
