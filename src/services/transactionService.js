/**
 * FinPilot - Transaction service
 *
 * Pure business logic for transactions: validation, filtering, sorting,
 * monthly aggregation and trend calculations. Every function receives the
 * transaction list explicitly so results are predictable and testable.
 */

import { parseISODate } from '../utils/format.js'

export const TRANSACTION_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense',
}

export const INCOME_CATEGORIES = ['Salary', 'Freelance Income', 'Investment Income', 'Other']

export const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Education',
  'Healthcare',
  'Housing',
  'Other',
]

export const CATEGORIES = [...EXPENSE_CATEGORIES, 'Salary', 'Freelance Income', 'Investment Income']

export const MONTH_PREFIX = /^\d{4}-\d{2}$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export const transactionMonth = (transaction) => {
  if (!transaction || typeof transaction.date !== 'string') return ''
  return transaction.date.slice(0, 7)
}

/**
 * Validates a transaction payload and returns normalised data.
 * Rejects zero, negative, non-numeric and oversized amounts as well as
 * missing descriptions, invalid dates and unknown categories.
 */
export const validateTransaction = (data = {}) => {
  const errors = {}
  const description = typeof data.description === 'string' ? data.description.trim() : ''
  const rawAmount = typeof data.amount === 'string' ? data.amount.replace(/,/g, '') : data.amount
  const amount = Number(rawAmount)
  const type = data.type
  const category = data.category
  const date = data.date

  if (!description) errors.description = 'Add a short description.'
  else if (description.length > 80) errors.description = 'Keep the description under 80 characters.'

  if (rawAmount === '' || rawAmount === null || rawAmount === undefined) {
    errors.amount = 'Enter an amount.'
  } else if (!Number.isFinite(amount)) {
    errors.amount = 'Amount must be a number.'
  } else if (amount <= 0) {
    errors.amount = 'Amount must be greater than zero.'
  } else if (amount > 100000000) {
    errors.amount = 'Amount looks too large.'
  }

  if (![TRANSACTION_TYPES.INCOME, TRANSACTION_TYPES.EXPENSE].includes(type)) {
    errors.type = 'Choose income or expense.'
  }

  if (!CATEGORIES.includes(category)) errors.category = 'Choose a category.'

  const parsedDate = ISO_DATE.test(String(date || '')) ? parseISODate(date) : null
  if (!parsedDate) errors.date = 'Choose a valid date.'
  else {
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    if (parsedDate.getTime() > today.getTime()) {
      errors.date = 'Date cannot be in the future.'
    }
  }

  const isValid = Object.keys(errors).length === 0

  return {
    isValid,
    errors,
    data: isValid
      ? {
          description,
          amount: Math.round(amount * 100) / 100,
          type,
          category,
          date,
          notes: typeof data.notes === 'string' ? data.notes.trim().slice(0, 160) : '',
        }
      : null,
  }
}

/** Detects an identical record so users cannot add the same entry twice. */
export const isDuplicateTransaction = (transactions, candidate, ignoreId = null) => {
  return transactions.some(
    (t) =>
      t.id !== ignoreId &&
      t.date === candidate.date &&
      t.type === candidate.type &&
      Math.abs(Number(t.amount) - Number(candidate.amount)) < 0.005 &&
      t.description.trim().toLowerCase() === candidate.description.trim().toLowerCase()
  )
}

export const getTransactionsForMonth = (transactions = [], monthYear) => {
  if (!monthYear) return []
  return transactions.filter((t) => transactionMonth(t) === monthYear)
}

export const getIncomeForMonth = (transactions = [], monthYear) =>
  getTransactionsForMonth(transactions, monthYear).filter((t) => t.type === TRANSACTION_TYPES.INCOME)

export const getExpensesForMonth = (transactions = [], monthYear) =>
  getTransactionsForMonth(transactions, monthYear).filter((t) => t.type === TRANSACTION_TYPES.EXPENSE)

const sum = (items) => items.reduce((total, item) => total + Number(item.amount || 0), 0)

export const calculateTotalIncome = (transactions = [], monthYear) =>
  sum(getIncomeForMonth(transactions, monthYear))

export const calculateTotalExpenses = (transactions = [], monthYear) =>
  sum(getExpensesForMonth(transactions, monthYear))

export const calculateNetSavings = (transactions = [], monthYear) =>
  calculateTotalIncome(transactions, monthYear) - calculateTotalExpenses(transactions, monthYear)

export const calculateSavingsRate = (transactions = [], monthYear) => {
  const income = calculateTotalIncome(transactions, monthYear)
  if (income <= 0) return 0
  return (calculateNetSavings(transactions, monthYear) / income) * 100
}

/** Total balance across every recorded transaction (all time). */
export const calculateTotalBalance = (transactions = []) => {
  return transactions.reduce((total, t) => {
    const amount = Number(t.amount || 0)
    return t.type === TRANSACTION_TYPES.INCOME ? total + amount : total - amount
  }, 0)
}

export const getSpendingByCategory = (transactions = [], monthYear) => {
  const expenses = getExpensesForMonth(transactions, monthYear)
  return expenses.reduce((totals, transaction) => {
    const key = transaction.category || 'Other'
    totals[key] = (totals[key] || 0) + Number(transaction.amount || 0)
    return totals
  }, {})
}

export const getIncomeByCategory = (transactions = [], monthYear) => {
  const income = getIncomeForMonth(transactions, monthYear)
  return income.reduce((totals, transaction) => {
    const key = transaction.category || 'Other'
    totals[key] = (totals[key] || 0) + Number(transaction.amount || 0)
    return totals
  }, {})
}

export const sortTransactions = (transactions = [], sortKey = 'date', direction = 'desc') => {
  const factor = direction === 'asc' ? 1 : -1
  return [...transactions].sort((a, b) => {
    if (sortKey === 'amount') return (Number(a.amount) - Number(b.amount)) * factor
    if (sortKey === 'description') return a.description.localeCompare(b.description) * factor
    if (sortKey === 'category') return a.category.localeCompare(b.category) * factor
    const dateA = a.date || ''
    const dateB = b.date || ''
    if (dateA === dateB) return (a.createdAt || '').localeCompare(b.createdAt || '')
    return dateA < dateB ? -factor : factor
  })
}

export const filterTransactions = (transactions = [], filters = {}) => {
  const { search = '', type = '', category = '', from = '', to = '' } = filters
  const needle = search.trim().toLowerCase()

  return transactions.filter((t) => {
    if (type && t.type !== type) return false
    if (category && t.category !== category) return false
    if (from && t.date < from) return false
    if (to && t.date > to) return false
    if (needle) {
      const haystack = `${t.description} ${t.category} ${t.notes || ''}`.toLowerCase()
      if (!haystack.includes(needle)) return false
    }
    return true
  })
}

export const getSummary = (transactions = [], monthYear) => {
  const income = getIncomeForMonth(transactions, monthYear)
  const expenses = getExpensesForMonth(transactions, monthYear)
  const totalIncome = sum(income)
  const totalExpenses = sum(expenses)

  return {
    monthYear,
    totalIncome,
    totalExpenses,
    netSavings: totalIncome - totalExpenses,
    savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0,
    transactionCount: {
      income: income.length,
      expense: expenses.length,
      total: income.length + expenses.length,
    },
  }
}

/** Monthly income/expense totals for a list of "YYYY-MM" values. */
export const getMonthlyTotals = (transactions = [], months = []) =>
  months.map((monthYear) => {
    const summary = getSummary(transactions, monthYear)
    return {
      month: monthYear,
      income: summary.totalIncome,
      expenses: summary.totalExpenses,
      net: summary.netSavings,
    }
  })

/** Every month that contains a transaction, newest first. */
export const getAvailableMonths = (transactions = []) => {
  const months = new Set(transactions.map(transactionMonth).filter((m) => MONTH_PREFIX.test(m)))
  return [...months].sort().reverse()
}

export const getRecentTransactions = (transactions = [], limit = 5) =>
  sortTransactions(transactions, 'date', 'desc').slice(0, limit)

export const getTopCategories = (transactions = [], monthYear, limit = 5) =>
  Object.entries(getSpendingByCategory(transactions, monthYear))
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([category, amount]) => ({ category, amount }))
