/**
 * FinPilot - Budget service
 *
 * Category limits are monthly. Utilisation is always derived from the
 * transactions of the selected month so budgets react immediately to any
 * spending change.
 */

import {
  calculateTotalExpenses,
  getExpensesForMonth,
  getSpendingByCategory,
} from './transactionService.js'
import { previousMonth } from '../utils/format.js'

export const BUDGET_STATUS = {
  UNUSED: 'unused',
  ON_TRACK: 'on_track',
  AT_RISK: 'at_risk',
  OVER: 'over',
}

export const validateBudget = (category, amount) => {
  const errors = {}
  if (!category) errors.category = 'Choose a category.'
  const value = Number(amount)
  if (amount === '' || amount === null || amount === undefined) errors.amount = 'Enter a limit.'
  else if (!Number.isFinite(value)) errors.amount = 'Limit must be a number.'
  else if (value <= 0) errors.amount = 'Limit must be greater than zero.'
  else if (value > 100000000) errors.amount = 'Limit looks too large.'

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    amount: Math.round(value * 100) / 100,
  }
}

const statusFor = (limit, actual) => {
  if (limit <= 0) return BUDGET_STATUS.UNUSED
  if (actual > limit) return BUDGET_STATUS.OVER
  if (actual / limit >= 0.8) return BUDGET_STATUS.AT_RISK
  return BUDGET_STATUS.ON_TRACK
}

export const getMonthlyBudgets = (budgets = {}, transactions = [], monthYear) => {
  const spending = getSpendingByCategory(transactions, monthYear)

  return Object.entries(budgets).reduce((rows, [category, limitValue]) => {
    const limit = Number(limitValue) || 0
    const actual = spending[category] || 0
    const remaining = limit - actual
    const utilization = limit > 0 ? (actual / limit) * 100 : 0

    rows[category] = {
      category,
      limit,
      actual,
      remaining,
      utilization,
      status: statusFor(limit, actual),
      overspend: Math.max(0, actual - limit),
    }
    return rows
  }, {})
}

export const getBudgetSummary = (budgets = {}, transactions = [], monthYear) => {
  const rows = getMonthlyBudgets(budgets, transactions, monthYear)
  const list = Object.values(rows)

  const totalBudget = list.reduce((total, row) => total + row.limit, 0)
  const totalSpent = list.reduce((total, row) => total + row.actual, 0)
  const totalRemaining = totalBudget - totalSpent
  const totalExpenses = calculateTotalExpenses(transactions, monthYear)

  return {
    rows,
    list,
    totalBudget,
    totalSpent,
    totalRemaining,
    totalExpenses,
    unbudgetedSpending: Math.max(0, totalExpenses - totalSpent),
    overallUtilization: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
    overspendingCategories: list.filter((row) => row.status === BUDGET_STATUS.OVER),
    atRiskCategories: list.filter((row) => row.status === BUDGET_STATUS.AT_RISK),
    onTrackCategories: list.filter((row) => row.status === BUDGET_STATUS.ON_TRACK && row.actual > 0),
    unusedCategories: list.filter((row) => row.actual === 0),
  }
}

/** Average spend for a category over the months that contain data. */
export const suggestBudgetLimit = (category, transactions = [], months = []) => {
  const values = months
    .map((month) => getSpendingByCategory(transactions, month)[category] || 0)
    .filter((value) => value > 0)

  if (values.length === 0) return 0
  const average = values.reduce((total, value) => total + value, 0) / values.length
  return Math.round((average * 1.1) / 50) * 50
}

export const getCategorySpendingTrend = (transactions = [], currentMonth) => {
  const previous = previousMonth(currentMonth)
  const current = getSpendingByCategory(transactions, currentMonth)
  const before = getSpendingByCategory(transactions, previous)
  const categories = new Set([...Object.keys(current), ...Object.keys(before)])

  return [...categories]
    .map((category) => {
      const currentAmount = current[category] || 0
      const previousAmount = before[category] || 0
      const change =
        previousAmount === 0
          ? currentAmount > 0
            ? 100
            : 0
          : ((currentAmount - previousAmount) / previousAmount) * 100

      return {
        category,
        current: currentAmount,
        previous: previousAmount,
        change,
        difference: currentAmount - previousAmount,
      }
    })
    .sort((a, b) => b.current - a.current)
}

/** Categories that have spending but no budget limit yet. */
export const getUnbudgetedCategories = (budgets = {}, transactions = [], monthYear) => {
  const spending = getSpendingByCategory(transactions, monthYear)
  return Object.entries(spending)
    .filter(([category]) => !Object.prototype.hasOwnProperty.call(budgets, category))
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
}

export const getSpendingCategoriesForMonth = (transactions = [], monthYear) =>
  getExpensesForMonth(transactions, monthYear)
    .map((transaction) => transaction.category)
    .filter((category, index, list) => list.indexOf(category) === index)
