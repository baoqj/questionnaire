import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  className,
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <input
        className={cn(
          'w-full px-4 py-3 rounded-xl border transition-all duration-300',
          'bg-white/90 text-gray-800 placeholder-gray-500',
          'focus:outline-none focus:ring-2 focus:ring-purple-400',
          error
            ? 'border-red-400 focus:ring-red-400'
            : 'border-purple-300',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-red-500 text-sm mt-1 ml-1">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-gray-500 text-sm mt-1 ml-1">{helperText}</p>
      )}
    </div>
  );
};
