'use client';

import React from 'react';
import MdiIcon from '@mdi/react';

interface IconProps {
  path: string;
  size?: number | string;
  className?: string;
  spin?: boolean | number;
  color?: string;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler<HTMLSpanElement>;
  title?: string;
  'aria-hidden'?: boolean;
  'aria-label'?: string;
}

export function Icon({ path, size = 1, className, spin, color, style, onClick, title }: IconProps) {
  const icon = (
    <MdiIcon
      path={path}
      size={size}
      className={onClick ? undefined : className}
      spin={spin}
      color={color}
      style={onClick ? undefined : style}
      title={title ?? null}
    />
  );
  if (onClick) {
    return (
      <span onClick={onClick} className={className} style={{ display: 'inline-flex', ...style }}>
        {icon}
      </span>
    );
  }
  return icon;
}
