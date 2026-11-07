/**
 * FinPilot - Storage service
 *
 * Owns the versioned LocalStorage document. Every read is sanitised so a
 * partially corrupted record can never break a calculation or a chart, and
 * older payloads are migrated forward on load.
 */

import { CATEGORIES, TRANSACTION_TYPES } from './transactionService.js'
import { MONTH_PREFIX } from './transactionService.js'
import { uid } from '../utils/format.js'

export const STORAGE_KEY = 'finpilot_data'
export const STORAGE_VERSION = '2.0.0'

export const createEmptyState = () => ({
  version: STORAGE_VERSION,
  transactions: [],
  budgets: {},
  goals: [],
  preferences: {
    currency: 'INR',
    dateFormat: 'DD MMM YYYY',
    createdAt: new Date().toISOString(),
  },
})

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const finitePositive = (value) => {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : null
}

const normalizeTransaction = (raw, index) => {
  if (!isPlainObject(raw)) return null

  const description = typeof raw.description === 'string' ? raw.description.trim() : ''
  const amount = finitePositive(raw.amount)
  const type = raw.type === TRANSACTION_TYPES.INCOME ? TRANSACTION_TYPES.INCOME : TRANSACTION_TYPES.EXPENSE
  const category = CATEGORIES.includes(raw.category) ? raw.category : 'Other'
  const date = typeof raw.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : null

  if (!description || !amount || !date) return null

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : `migrated-${index}-${date}`,
    description,
    amount: Math.round(amount * 100) / 100,
    type,
    category,
    date,
    notes: typeof raw.notes === 'string' ? raw.notes.slice(0, 160) : '',
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : `${date}T00:00:00.000Z`,
  }
}

const normalizeTransactions = (rawList) => {
  if (!Array.isArray(rawList)) return []
  const seen = new Set()
  return rawList
    .map(normalizeTransaction)
    .filter(Boolean)
    .filter((transaction) => {
      if (seen.has(transaction.id)) return false
      seen.add(transaction.id)
      return true
    })
}

const normalizeBudgets = (rawBudgets) => {
  if (!isPlainObject(rawBudgets)) return {}
  return Object.entries(rawBudgets).reduce((budgets, [category, amount]) => {
    const value = finitePositive(amount)
    if (value !== null) budgets[category] = Math.round(value * 100) / 100
    return budgets
  }, {})
}

const normalizeContribution = (raw, goalId, index) => {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return { id: `${goalId}-c${index}`, amount: raw, date: '' }
  }
  if (!isPlainObject(raw)) return null
  const amount = finitePositive(raw.amount)
  if (amount === null) return null
  return {
    id: typeof raw.id === 'string' ? raw.id : `${goalId}-c${index}`,
    amount: Math.round(amount * 100) / 100,
    date: typeof raw.date === 'string' ? raw.date : '',
  }
}

const normalizeGoal = (raw, index) => {
  if (!isPlainObject(raw)) return null
  const name = typeof raw.name === 'string' ? raw.name.trim() : ''
  const targetAmount = finitePositive(raw.targetAmount)
  if (!name || !targetAmount) return null

  const id = typeof raw.id === 'string' && raw.id ? raw.id : `goal-${index}`

  const contributions = Array.isArray(raw.contributions)
    ? raw.contributions.map((c, i) => normalizeContribution(c, id, i)).filter(Boolean)
    : []

  // A goal whose stored balance predates contribution records keeps its value
  // as an opening contribution so progress never drops to zero on migration.
  const contributionsTotal = contributions.reduce((total, c) => total + c.amount, 0)
  const storedCurrent = Number(raw.currentAmount)
  if (Number.isFinite(storedCurrent) && storedCurrent > contributionsTotal + 0.005) {
    contributions.push({
      id: `${id}-opening`,
      amount: Math.round((storedCurrent - contributionsTotal) * 100) / 100,
      date: typeof raw.createdAt === 'string' ? raw.createdAt.slice(0, 10) : '',
    })
  }

  return {
    id,
    name,
    targetAmount: Math.round(targetAmount * 100) / 100,
    targetDate:
      typeof raw.targetDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.targetDate)
        ? raw.targetDate
        : '',
    contributions,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
  }
}

const normalizeGoals = (rawGoals) => {
  if (!Array.isArray(rawGoals)) return []
  return rawGoals.map(normalizeGoal).filter(Boolean)
}

/** Repairs any payload into the current schema. Never throws on bad fields. */
export const normalizeState = (raw) => {
  const base = createEmptyState()
  if (!isPlainObject(raw)) return base

  return {
    version: STORAGE_VERSION,
    transactions: normalizeTransactions(raw.transactions).sort((a, b) =>
      a.date === b.date ? 0 : a.date < b.date ? -1 : 1
    ),
    budgets: normalizeBudgets(raw.budgets),
    goals: normalizeGoals(raw.goals),
    preferences: {
      ...base.preferences,
      ...(isPlainObject(raw.preferences) ? raw.preferences : {}),
    },
  }
}

export const hasStoredState = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null
  } catch {
    return false
  }
}

export const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createEmptyState()

    const parsed = JSON.parse(raw)
    const normalized = normalizeState(parsed)

    // Persist migrated/corrected data so the repair is durable.
    if (!parsed || parsed.version !== STORAGE_VERSION) {
      saveState(normalized)
    }
    return normalized
  } catch (error) {
    console.error('FinPilot could not read saved data; starting fresh.', error)
    return createEmptyState()
  }
}

export const saveState = (state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return true
  } catch (error) {
    console.error('FinPilot could not save data.', error)
    return false
  }
}

/** Seeds demo data exactly once, only when nothing has ever been stored. */
export const ensureSeedData = (buildSeed) => {
  if (hasStoredState()) return loadState()
  const seeded = normalizeState(buildSeed())
  saveState(seeded)
  return seeded
}

export const resetState = (buildSeed) => {
  const next = buildSeed ? normalizeState(buildSeed()) : createEmptyState()
  saveState(next)
  return next
}

/** Rebuilds derived goal balances from their contribution history. */
export const goalWithTotals = (goal) => {
  const currentAmount = (goal.contributions || []).reduce(
    (total, contribution) => total + Number(contribution.amount || 0),
    0
  )
  const targetAmount = Number(goal.targetAmount) || 0
  const progress = targetAmount > 0 ? Math.min((currentAmount / targetAmount) * 100, 100) : 0

  return {
    ...goal,
    currentAmount: Math.round(currentAmount * 100) / 100,
    remaining: Math.max(0, Math.round((targetAmount - currentAmount) * 100) / 100),
    progress,
    isComplete: targetAmount > 0 && currentAmount >= targetAmount,
  }
}

export const makeGoal = ({ name, targetAmount, targetDate, initialAmount = 0 }) => {
  const id = uid()
  const today = new Date().toISOString().slice(0, 10)
  const contributions =
    initialAmount > 0 ? [{ id: uid(), amount: initialAmount, date: today }] : []

  return {
    id,
    name: name.trim(),
    targetAmount: Math.round(targetAmount * 100) / 100,
    targetDate,
    contributions,
    createdAt: new Date().toISOString(),
  }
}

export const isMonthKey = (value) => typeof value === 'string' && MONTH_PREFIX.test(value)
