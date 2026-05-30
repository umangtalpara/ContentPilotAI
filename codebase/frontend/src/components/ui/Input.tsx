'use client';

import React from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, id, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-2">
        {label && (
          <label
            htmlFor={id}
            className="text-sm font-medium text-slate-300 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {label}
          </label>
        )}
        <input
          id={id}
          type={type}
          ref={ref}
          className={cn(
            'flex h-12 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm md:text-base text-white placeholder-slate-500 transition-all duration-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
        />
        {error && (
          <span
            id={`${id}-error`}
            className="text-xs text-red-500 font-medium mt-1 animate-pulse"
          >
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
