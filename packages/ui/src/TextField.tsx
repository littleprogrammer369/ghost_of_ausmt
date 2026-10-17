import * as React from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export type TextFieldProps = {
  label: string;
  help?: string;
  error?: string;
  optionalLabel?: string;
  requiredLabel?: string;
  required?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'> & {
    id?: string;
  };

export function TextField({
  label,
  help,
  error,
  optionalLabel,
  requiredLabel,
  required = false,
  className,
  ...props
}: TextFieldProps) {
  const generatedId = React.useId();
  const inputId = props.id ?? generatedId;
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;
  const describedBy = [error ? errorId : null, help ? helpId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={twMerge('ui-field', className)}>
      <label className="ui-field__label" htmlFor={inputId}>
        {label}
        {required ? (
          <span className="ui-field__state"> ({requiredLabel ?? 'required'})</span>
        ) : optionalLabel ? (
          <span className="ui-field__state"> ({optionalLabel})</span>
        ) : null}
      </label>
      <input
        id={inputId}
        className={twMerge('ui-field__input', error ? 'ui-field__input--error' : '')}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        required={required}
        {...props}
      />
      {error ? (
        <p className="ui-field__error" id={errorId}>
          <span className="ui-field__error-icon" aria-hidden="true">
            !
          </span>
          {error}
        </p>
      ) : help ? (
        <p className="ui-field__help" id={helpId}>
          {help}
        </p>
      ) : null}
    </div>
  );
}