import React from 'react'
import { getInitials } from '../../utils/time'

export function Avatar({ name, color = '#D9532F', size = 'md' }) {
  const sizes = {
    xs: 'w-5 h-5 text-[10px]',
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
  }

  return (
    <div
      className={`${sizes[size] || sizes.md} rounded-full flex items-center justify-center font-semibold text-white shrink-0 border border-white/10`}
      style={{ backgroundColor: color }}
      title={name}
    >
      {getInitials(name)}
    </div>
  )
}
