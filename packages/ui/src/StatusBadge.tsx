import * as React from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info';

export type StatusBadgeProps = {
  tone: StatusTone;
  /** Localized label. Colour alone never carries the meaning. */
  label: string;
};

export function StatusBadge({ tone, label }: StatusBadgeProps) {
  return (
    <span className={twMerge('ui-status', `ui-status--${tone}`)}>
      {label}
    </span>
  );
}