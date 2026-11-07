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
  index,
  className = '',
  bodyClassName = '',
  children,
}) => (
  <section className={`card ${className}`}>
    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-rule-strong px-5 py-4">
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          {index ? <span className="section-index">{index}</span> : null}
          <h2 className="text-[15.5px] text-ink">{title}</h2>
        </div>
        {description ? (
          <p className="mt-0.5 text-[11.5px] leading-snug text-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
    <div className={`px-5 py-4 ${bodyClassName}`}>{children}</div>
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
    className={`reveal relative overflow-hidden px-5 py-4 ${
      accent
        ? 'border border-navy-soft bg-navy text-cream'
        : 'border border-rule-strong bg-surface text-ink'
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
  navy: 'bg-navy',
  soft: 'bg-navy-soft',
  coral: 'bg-coral',
  muted: 'bg-muted/55',
}

export const ProgressBar = ({ value = 0, tone = 'navy', height = 5, label }) => {
  const safe = Number.isFinite(Number(value)) ? Number(value) : 0
  const width = Math.min(Math.max(safe, 0), 100)
  const overflow = safe > 100

  return (
    <div
      className="w-full overflow-hidden"
      style={{ height, backgroundColor: 'rgba(20,33,61,0.12)', borderRadius: 'var(--radius-sm)' }}
      role="progressbar"
      aria-valuenow={Math.round(safe)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || 'Progress'}
    >
      <div
        className={`bar-fill h-full ${overflow ? 'bg-coral' : PROGRESS_TONE[tone] || PROGRESS_TONE.navy}`}
        style={{ width: `${width}%` }}
      />
    </div>
  )
}

const BADGE_TONE = {
  neutral: 'border-ink/18 bg-ink/5 text-ink',
  positive: 'border-ink/20 bg-cream-deep/80 text-ink',
  warning: 'border-coral/60 bg-coral/12 text-coral',
  soft: 'border-ink/20 bg-cream-deep/70 text-navy-soft',
  muted: 'border-transparent bg-transparent text-muted',
  inverse: 'border-cream/40 bg-navy/8 text-cream',
}

export const Badge = ({ children, tone = 'neutral', className = '' }) => (
  <span
    className={`inline-flex items-center gap-1 border px-1.5 py-0.5 font-mono text-[9.5px] font-medium uppercase tracking-[0.1em] ${
      BADGE_TONE[tone] || BADGE_TONE.neutral
    } ${className}`}
  >
    {children}
  </span>
)

export const EmptyState = ({ icon = 'info', title, description, action }) => (
  <div className="flex flex-col items-start px-6 py-12">
    <span className="mb-4 flex h-9 w-9 items-center justify-center border border-rule-strong bg-cream-soft text-ink/55">
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
      ? 'border-ink/20 bg-cream-deep/70 text-ink'
      : tone === 'info'
      ? 'border-rule-strong bg-cream-soft/90 text-ink'
      : 'border-coral/60 bg-coral/14 text-coral'

  return (
    <div
      className={`reveal flex items-start gap-2.5 border px-3 py-2.5 text-[11.5px] leading-relaxed ${styles}`}
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
        className="scrim absolute inset-0 h-full w-full cursor-default bg-navy/60"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`dialog-panel relative w-full ${width} border border-rule-strong bg-surface p-5 shadow-[0_24px_60px_-24px_rgba(11,19,38,0.65)]`}
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
