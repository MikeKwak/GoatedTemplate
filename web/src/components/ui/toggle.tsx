import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ToggleProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

const Toggle = React.forwardRef<HTMLInputElement, ToggleProps>(
  ({ className, label, description, id, ...props }, ref) => {
    const toggleId = id || React.useId();

    return (
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          {label && (
            <label
              htmlFor={toggleId}
              className="text-sm font-medium text-secondary-700 cursor-pointer"
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-xs text-secondary-500 mt-1">{description}</p>
          )}
        </div>
        <label
          htmlFor={toggleId}
          className="relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full bg-secondary-300 transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2 peer-checked:bg-primary-600 peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
        >
          <input
            type="checkbox"
            id={toggleId}
            className="peer sr-only"
            ref={ref}
            {...props}
          />
          <span className="peer-checked:translate-x-5 peer h-4 w-4 translate-x-1 transform rounded-full bg-white transition-transform"></span>
        </label>
      </div>
    );
  }
);
Toggle.displayName = 'Toggle';

export { Toggle };

