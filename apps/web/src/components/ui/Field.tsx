import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

const CONTROL_BASE =
  'block w-full rounded-lg border-0 bg-white px-3 text-base text-slate-900 shadow-sm ring-1 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:outline-none sm:text-sm';

function controlClasses(hasError: boolean): string {
  return `${CONTROL_BASE} ${hasError ? 'ring-rose-400 focus:ring-rose-500' : 'ring-slate-300 focus:ring-indigo-600'}`;
}

interface FieldShellProps {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

function FieldShell({ id, label, error, required, children, className = '' }: FieldShellProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {/* Звёздочка — только визуальная подсказка; скринридеру обязательность сообщает aria-required */}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-rose-500">
            *
          </span>
        )}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}

interface CommonProps {
  label: string;
  error?: string;
  containerClassName?: string;
}

export function TextField({
  label,
  error,
  containerClassName,
  required,
  ...props
}: CommonProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} required={required} className={containerClassName}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-required={required ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${controlClasses(Boolean(error))} h-10`}
        {...props}
      />
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  error,
  containerClassName,
  ...props
}: CommonProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} className={containerClassName}>
      <textarea id={id} className={`${controlClasses(Boolean(error))} py-2`} rows={3} {...props} />
    </FieldShell>
  );
}

export function SelectField({
  label,
  error,
  containerClassName,
  children,
  ...props
}: CommonProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} className={containerClassName}>
      <select id={id} className={`${controlClasses(Boolean(error))} h-10 pr-8`} {...props}>
        {children}
      </select>
    </FieldShell>
  );
}
