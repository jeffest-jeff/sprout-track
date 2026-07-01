'use client';

import * as React from 'react';
import { cn } from '@/src/lib/utils';
import { Icon } from '@/src/components/ui/icon';
import { mdiCheck } from '@mdi/js';
import { useTheme } from '@/src/context/theme';

import { checkboxVariants } from './checkbox.styles';
import { CheckboxProps } from './checkbox.types';
import './checkbox.css';

/**
 * Checkbox component
 * 
 * A custom checkbox component with a styled appearance that follows the project's design system.
 * It's designed to be cross-platform compatible with minimal changes required for React Native.
 *
 * Features:
 * - Multiple visual variants (default, primary, secondary, etc.)
 * - Multiple size options (default, sm, lg)
 * - Support for all standard input HTML attributes
 * - Accessible focus states with keyboard navigation support
 *
 * @example
 * ```tsx
 * <Checkbox 
 *   variant="primary" 
 *   size="lg" 
 *   checked={isChecked} 
 *   onCheckedChange={setIsChecked} 
 * />
 * ```
 */
const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, variant, size, checked, onCheckedChange, ...props }, ref) => {
    const { theme } = useTheme();
    
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (onCheckedChange) {
        onCheckedChange(event.target.checked);
      }
    };

    return (
      <div className="relative inline-flex items-center">
        <input
          type="checkbox"
          className="sr-only"
          ref={ref}
          checked={checked}
          onChange={handleChange}
          {...props}
        />
        <div
          className={cn(
            checkboxVariants({ variant, size }),
            checked ? "" : "bg-white",
            className,
            "checkbox",
            `checkbox-${variant || 'default'}`
          )}
          data-state={checked ? "checked" : "unchecked"}
          onClick={() => onCheckedChange?.(!checked)}
        >
          {checked && <Icon path={mdiCheck} size="0.875rem" className="text-white checkbox-check" />}
        </div>
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox, checkboxVariants };
export type { CheckboxProps };
export default Checkbox;
