/**
 * FinPilot - formatting and date helpers
 *
 * All monetary values are stored in INR. Dates are stored as ISO calendar
 * dates ("YYYY-MM-DD") so they never shift when the local timezone changes.
 */

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const CURRENCY_FORMATTER_CENTS = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export const formatCurrency = (value, { cents = false } = {}) => {
  const amount = Number.isFinite(Number(value)) ? Number(value) : 0
  return (cents ? CURRENCY_FORMATTER_CENTS : CURRENCY_FORMATTER).format(amount)
}

export const formatCompactCurrency = (value) => {
  const amount = Number.isFinite(Number(value)) ? Number(value) : 0
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''

  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(1)}Cr`
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(1)}L`
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`
  return `${sign}₹${Math.round(abs)}`
}

export const formatPercent = (value, digits = 1) => {
  const amount = Number.isFinite(Number(value)) ? Number(value) : 0
  return `${amount.toFixed(digits)}%`
}

export const formatSignedPercent = (value, digits = 1) => {
  const amount = Number.isFinite(Number(value)) ? Number(value) : 0
  const prefix = amount > 0 ? '+' : ''
  return `${prefix}${amount.toFixed(digits)}%`
}

const DATE_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
})

// Parses "YYYY-MM-DD" in local time, avoiding the UTC offset drift of
// `new Date("2024-01-01")` which renders as the previous day in some zones.
export const parseISODate = (value) => {
  if (!value || typeof value !== 'string') return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? null : date
}

export const formatDate = (value, { short = false } = {}) => {
  const date = parseISODate(value)
  if (!date) return '—'
  return (short ? SHORT_DATE_FORMATTER : DATE_FORMATTER).format(date)
}

export const todayISO = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`
}

export const currentMonth = () => todayISO().slice(0, 7)

export const monthLabel = (monthYear, { short = false } = {}) => {
  const date = parseISODate(`${monthYear}-01`)
  if (!date) return monthYear
  return date.toLocaleDateString('en-US', {
    month: short ? 'short' : 'long',
    year: 'numeric',
  })
}

export const addMonths = (monthYear, delta) => {
  const date = parseISODate(`${monthYear}-01`)
  if (!date) return monthYear
  date.setMonth(date.getMonth() + delta)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export const previousMonth = (monthYear) => addMonths(monthYear, -1)

export const monthsBetween = (fromMonth, toMonth) => {
  const start = parseISODate(`${fromMonth}-01`)
  const end = parseISODate(`${toMonth}-01`)
  if (!start || !end) return 0
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
}

export const daysUntil = (isoDate) => {
  const target = parseISODate(isoDate)
  if (!target) return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

export const uid = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}
