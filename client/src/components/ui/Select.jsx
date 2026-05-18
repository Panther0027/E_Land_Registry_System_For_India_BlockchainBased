import { forwardRef } from 'react';

const Select = forwardRef(({
  label,
  error,
  options = [],
  placeholder = 'Select...',
  className = '',
  ...props
}, ref) => (
  <div className="w-full">
    {label && (
      <label className="block text-sm font-medium text-text-primary mb-1.5">
        {label}
      </label>
    )}
    <select
      ref={ref}
      className={`input-field appearance-none bg-no-repeat bg-right ${error ? 'border-error' : ''} ${className}`}
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1.5rem', backgroundPosition: 'right 0.75rem center' }}
      {...props}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value || opt} value={opt.value || opt}>
          {opt.label || opt}
        </option>
      ))}
    </select>
    {error && <p className="text-error text-sm mt-1">{error}</p>}
  </div>
));

Select.displayName = 'Select';
export default Select;
