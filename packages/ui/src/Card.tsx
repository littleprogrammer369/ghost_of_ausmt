import * as React from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export type CardSurface = 'glass' | 'clay' | 'flat';

export type CardProps = {
  surface?: CardSurface;
} & React.HTMLAttributes<HTMLDivElement>;

export function Card({ surface = 'flat', className, ...props }: CardProps) {
  const surfaceClass =
    surface === 'glass'
      ? 'glass-surface'
      : surface === 'clay'
        ? 'clay-surface'
        : 'ui-card--flat';

  return (
    <div
      className={twMerge('ui-card', surfaceClass, className)}
      {...props}
    />
  );
}