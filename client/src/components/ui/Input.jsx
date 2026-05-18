import { forwardRef } from 'react';

const Input = forwardRef(({
  label,
  error,
  hint,
  icon: Icon,
  className = '',
  ...props
}, ref) => (
  <div className="w-full">
    {label && (
      <label className="block text-sm font-medium text-text-primary mb-1.5">
        {label}
      </label>
    )}
    <div className="relative">
      {Icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
          <Icon size={18} />
        </div>
      )}
      <input
        ref={ref}
        className={`input-field ${Icon ? 'pl-10' : ''} ${error ? 'border-error focus:ring-error/30 focus:border-error' : ''} ${className}`}
        {...props}
      />
    </div>
    {error && <p className="text-error text-sm mt-1">{error}</p>}
    {hint && !error && <p className="text-text-secondary text-sm mt-1">{hint}</p>}
  </div>
));

Input.displayName = 'Input';
export default Input;
