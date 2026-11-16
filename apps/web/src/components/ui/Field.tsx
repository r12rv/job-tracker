import { ChevronDownIcon } from './Icons';
import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

const CONTROL_BASE =
  'block w-full rounded-lg border-0 bg-white dark:bg-slate-900 px-3 text-base text-slate-900 dark:text-slate-100 shadow-sm ring-1 ring-inset placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:outline-none sm:text-sm';

function controlClasses(hasError: boolean): string {
  return `${CONTROL_BASE} ${hasError ? 'ring-rose-400 dark:ring-rose-500/70 focus:ring-rose-500' : 'ring-slate-300 dark:ring-slate-700 focus:ring-indigo-600 dark:focus:ring-indigo-500'}`;
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
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
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
        <p id={`${id}-error`} className="mt-1 text-xs text-rose-600 dark:text-rose-400">
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
      {/* Своя стрелка вместо системной: у системной нельзя задать отступ от края, и она прилипает к рамке */}
      <div className="relative">
        <select
          id={id}
          className={`${controlClasses(Boolean(error))} h-10 cursor-pointer appearance-none pr-9`}
          {...props}
        >
          {children}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
      </div>
    </FieldShell>
  );
}
