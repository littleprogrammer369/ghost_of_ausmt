import * as React from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export type ContainerProps = {
  width?: 'narrow' | 'wide';
} & React.HTMLAttributes<HTMLDivElement>;

export function Container({
  width = 'wide',
  className,
  ...props
}: ContainerProps) {
  return (
    <div
      className={twMerge(
        'ui-container',
        width === 'narrow' ? 'ui-container--narrow' : 'ui-container--wide',
        className
      )}
      {...props}
    />
  );
}