'use client';

import React from 'react';
import MdiIcon from '@mdi/react';

interface IconProps {
  path: string;
  size?: number | string;
  className?: string;
  spin?: boolean | number;
  color?: string;
}

export function Icon({ path, size = 1, className, spin, color }: IconProps) {
  return (
    <MdiIcon
      path={path}
      size={size}
      className={className}
      spin={spin}
      color={color}
    />
  );
}
