import React, { useEffect } from 'react'
import Icon from './Icon.jsx'

export const Card = ({ className = '', children, ...rest }) => (
  <div className={`card ${className}`} {...rest}>
    {children}
  </div>
)

export const SectionCard = ({
  title,
  description,
  action,
  className = '',
  bodyClassName = '',
  children,
}) => (
  <section className={`card ${className}`}>
    <div className="flex flex-wrap items-start justify-between gap-2 px-5 pb-3.5 pt-5">
      <div className="min-w-0">
        <h2 className="text-[15px] font-medium tracking-[-0.02em] text-white">{title}</h2>
        {description ? (
          <p className="mt-1 text-[11.5px] leading-snug text-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
    <div className={`px-5 pb-5 ${bodyClassName}`}>{children}</div>
  </section>
)

const TONE_TEXT = {
  neutral: 'text-ink',
  positive: 'text-ink',
  warning: 'text-coral',
  muted: 'text-muted',
}

export const Stat = ({ label, value, hint, tone = 'neutral', icon, accent = false, index }) => (
  <div
    className={`reveal relative overflow-hidden rounded-[var(--radius-card)] px-5 py-4 ${
      accent ? 'plate text-cream' : 'card text-ink'
    }`}
  >
    {!accent ? <span className="absolute inset-x-0 top-0 h-px bg-rule-strong" aria-hidden="true" /> : null}
    <div className="flex items-start justify-between gap-2">
      <p className={`eyebrow ${accent ? 'text-cream/55' : ''}`}>
        {index ? <span className="mr-1.5 text-coral eyebrow-accent">{index}</span> : null}
        {label}
      </p>
      {icon ? (
        <Icon name={icon} className={`h-3.5 w-3.5 shrink-0 ${accent ? 'text-coral' : 'text-ink/30'}`} />
      ) : null}
    </div>
    <p
      className={`num mt-2 text-[21px] leading-none ${accent ? 'text-white' : TONE_TEXT[tone] || 'text-ink'}`}
    >
      <span key={String(value)} className="metric-swap">
        {value}
      </span>
    </p>
    {hint ? (
      <p className={`mt-1.5 text-[11px] leading-snug ${accent ? 'text-cream/60' : 'text-muted'}`}>
        {hint}
      </p>
    ) : null}
  </div>
)

const PROGRESS_TONE = {
  navy: 'bg-cream/85',
  soft: 'bg-cream/55',
  coral: 'bg-coral',
  muted: 'bg-cream/25',
}

export const ProgressBar = ({ value = 0, tone = 'navy', height = 5, label }) => {
  const safe = Number.isFinite(Number(value)) ? Number(value) : 0
  const width = Math.min(Math.max(safe, 0), 100)
  const overflow = safe > 100

  return (
    <div
      className="w-full overflow-hidden"
      style={{ height, backgroundColor: 'rgba(244,237,224,0.10)', borderRadius: '999px' }}
      role="progressbar"
      aria-valuenow={Math.round(safe)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || 'Progress'}
    >
      <div
        className={`bar-fill h-full rounded-full ${
          overflow ? 'bg-coral shadow-[0_0_14px_rgba(255,107,91,0.55)]' : PROGRESS_TONE[tone] || PROGRESS_TONE.navy
        }`}
        style={{ width: `${width}%` }}
      />
    </div>
  )
}

const BADGE_TONE = {
  neutral: 'border-cream/16 bg-white/5 text-cream/85',
  positive: 'border-cream/22 bg-cream/10 text-cream',
  warning: 'border-coral/50 bg-coral/14 text-coral',
  soft: 'border-cream/16 bg-white/[0.06] text-cream/70',
  muted: 'border-transparent bg-transparent text-muted',
  inverse: 'border-cream/30 bg-white/10 text-cream',
}

export const Badge = ({ children, tone = 'neutral', className = '' }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-medium uppercase tracking-[0.07em] ${
      BADGE_TONE[tone] || BADGE_TONE.neutral
    } ${className}`}
  >
    {children}
  </span>
)

export const EmptyState = ({ icon = 'info', title, description, action }) => (
  <div className="flex flex-col items-start px-6 py-12">
    <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-rule-strong bg-white/5 text-cream/60">
      <Icon name={icon} className="h-4 w-4" />
    </span>
    <p className="display text-[19px] text-ink">{title}</p>
    {description ? (
      <p className="mt-1.5 max-w-md text-[12px] leading-relaxed text-muted">{description}</p>
    ) : null}
    {action ? <div className="mt-4">{action}</div> : null}
  </div>
)

export const InlineAlert = ({ tone = 'warning', children, onDismiss }) => {
  const styles =
    tone === 'positive'
      ? 'border-cream/18 bg-cream/[0.07] text-cream'
      : tone === 'info'
      ? 'border-rule-strong bg-white/[0.045] text-cream/80'
      : 'border-coral/45 bg-coral/12 text-coral'

  return (
    <div
      className={`reveal flex items-start gap-2.5 rounded-[var(--radius-sm)] border px-3.5 py-2.5 text-[11.5px] leading-relaxed backdrop-blur-xl ${styles}`}
    >
      <Icon
        name={tone === 'positive' ? 'check' : tone === 'info' ? 'info' : 'alert'}
        className="mt-0.5 h-3.5 w-3.5 shrink-0"
      />
      <div className="flex-1">{children}</div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="shrink-0 p-0.5 text-current/55 transition-colors hover:text-current"
        >
          <Icon name="close" className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  )
}

export const Modal = ({ open, onClose, title, description, children, footer, width = 'max-w-md' }) => {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="scrim absolute inset-0 h-full w-full cursor-default bg-navy-deep/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`dialog-panel relative w-full ${width} rounded-[24px] border border-cream/16 bg-[rgba(13,22,42,0.96)] p-5 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.95)] backdrop-blur-2xl`}
      >
        <div className="mb-3.5 flex items-start justify-between gap-4 border-b border-rule-strong pb-3">
          <div>
            <h2 className="display text-[19px] text-ink">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-[11.5px] leading-snug text-muted">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 p-0.5 text-muted transition-colors hover:text-coral"
          >
            <Icon name="close" className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="space-y-3.5">{children}</div>
        {footer ? <div className="mt-4 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  )
}

export const FieldError = ({ children }) =>
  children ? (
    <p className="mt-1 text-[11px] font-medium text-coral" role="alert">
      {children}
    </p>
  ) : null
