import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'elevated';
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'default'
}) => {
  const variantClasses = {
    default: 'bg-white rounded-2xl shadow-lg border border-gray-200',
    glass: 'bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl',
    elevated: 'bg-white rounded-2xl shadow-2xl border border-gray-100'
  };

  return (
    <div className={cn(variantClasses[variant], className)}>
      {children}
    </div>
  );
};

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  className
}) => {
  return (
    <div className={cn('px-6 py-4 border-b border-gray-200', className)}>
      {children}
    </div>
  );
};

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({
  children,
  className
}) => {
  return (
    <div className={cn('px-6 py-4', className)}>
      {children}
    </div>
  );
};

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className
}) => {
  return (
    <div className={cn('px-6 py-4 border-t border-gray-200', className)}>
      {children}
    </div>
  );
};
