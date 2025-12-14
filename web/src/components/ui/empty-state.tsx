import * as React from 'react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon, title, description, action, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center p-12 text-center',
          className
        )}
        {...props}
      >
        {icon && (
          <div className="mb-4 text-secondary-400" aria-hidden="true">
            {icon}
          </div>
        )}
        <h3 className="text-lg font-semibold text-secondary-900 mb-2">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-secondary-500 max-w-sm mb-4">
            {description}
          </p>
        )}
        {action && <div>{action}</div>}
      </div>
    );
  }
);
EmptyState.displayName = 'EmptyState';

export { EmptyState };

