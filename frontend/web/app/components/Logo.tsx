'use client'

import Link from 'next/link'
import { useState } from 'react'

type LogoVariant = 'sm' | 'md' | 'lg' | 'xs'

const variantStyles: Record<LogoVariant, { icon: string; title: string; tagline: string }> = {
  xs: { icon: 'h-6 w-6', title: 'text-xs font-semibold', tagline: 'text-[10px]' },
  sm: { icon: 'h-7 w-7 sm:h-8 w-8', title: 'text-sm font-semibold', tagline: 'text-[11px]' },
  md: { icon: 'h-9 w-9', title: 'text-lg font-semibold', tagline: 'text-xs' },
  lg: { icon: 'h-10 w-10', title: 'text-2xl font-bold', tagline: 'text-xs' },
}

export function Logo({
  variant = 'md',
  tagline = 'Pixel transformation for links.',
  href = '/',
  className = '',
  inline = false,
}: {
  variant?: LogoVariant
  tagline?: string
  href?: string
  className?: string
  /** If true, render as span (e.g. inside another Link); otherwise wrap in Link when href is set */
  inline?: boolean
}) {
  const [imgError, setImgError] = useState(false)
  const styles = variantStyles[variant]

  const content = (
    <>
      <div className={`${styles.icon} shrink-0 rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center`}>
        {!imgError ? (
          <img
            src="/thelittleurl-logo.png"
            alt=""
            className="h-full w-full object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-[10px] font-semibold text-white bg-gradient-to-br from-primary to-secondary w-full h-full flex items-center justify-center rounded-xl">
            tl
          </span>
        )}
      </div>
      <div className={`flex flex-col leading-tight min-w-0 ${inline ? '' : 'flex-1'}`}>
        <span className={`${styles.title} text-white`}>The Little URL</span>
        <span className={`${styles.tagline} text-slate-400`}>{tagline}</span>
      </div>
    </>
  )

  const wrapperClass = `flex items-center gap-2 ${className}`.trim()

  if (inline) {
    return <span className={wrapperClass}>{content}</span>
  }
  if (href) {
    return (
      <Link href={href} className={wrapperClass}>
        {content}
      </Link>
    )
  }
  return <div className={wrapperClass}>{content}</div>
}
