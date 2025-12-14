import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'error' | 'warning' | 'secondary';
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-secondary-100 text-secondary-800 border-secondary-300',
      success: 'bg-success-100 text-success-800 border-success-300',
      error: 'bg-error-100 text-error-800 border-error-300',
      warning: 'bg-warning-100 text-warning-800 border-warning-300',
      secondary: 'bg-secondary-200 text-secondary-900 border-secondary-400',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';

export { Badge };

