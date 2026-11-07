import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  ensureSeedData,
  makeGoal,
  goalWithTotals,
  saveState,
  STORAGE_VERSION,
} from '../services/storageService.js'
import { buildSeedState } from '../services/seedData.js'
import {
  currentMonth,
  uid,
} from '../utils/format.js'
import {
  getAvailableMonths,
  isDuplicateTransaction,
  validateTransaction,
} from '../services/transactionService.js'
import { validateBudget } from '../services/budgetService.js'

const FinanceContext = createContext(null)

export const FinanceProvider = ({ children }) => {
  const [state, setState] = useState(() => ensureSeedData(buildSeedState))
  const [month, setMonth] = useState(() => currentMonth())
  const [persistenceError, setPersistenceError] = useState(false)
  const hydrated = useRef(false)

  const commit = useCallback((updater) => {
    setState((previous) => updater(previous))
  }, [])

  // Persisting outside the state updater keeps the updater pure, so React can
  // safely run it twice (StrictMode) without writing the document twice.
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true
      return
    }
    const saved = saveState({ ...state, version: STORAGE_VERSION })
    setPersistenceError(!saved)
  }, [state])

  const addTransaction = useCallback(
    (payload) => {
      const validation = validateTransaction(payload)
      if (!validation.isValid) return { ok: false, errors: validation.errors }

      if (isDuplicateTransaction(state.transactions, validation.data)) {
        return {
          ok: false,
          errors: { form: 'An identical transaction already exists for that date.' },
        }
      }

      const record = {
        ...validation.data,
        id: uid(),
        createdAt: new Date().toISOString(),
      }

      commit((previous) => ({
        ...previous,
        transactions: [...previous.transactions, record],
      }))

      setMonth(record.date.slice(0, 7))
      return { ok: true, transaction: record }
    },
    [commit, state.transactions]
  )

  const updateTransaction = useCallback(
    (id, payload) => {
      const validation = validateTransaction(payload)
      if (!validation.isValid) return { ok: false, errors: validation.errors }

      if (isDuplicateTransaction(state.transactions, validation.data, id)) {
        return {
          ok: false,
          errors: { form: 'Another transaction with the same details already exists.' },
        }
      }

      commit((previous) => ({
        ...previous,
        transactions: previous.transactions.map((transaction) =>
          transaction.id === id
            ? { ...transaction, ...validation.data, id }
            : transaction
        ),
      }))

      return { ok: true }
    },
    [commit, state.transactions]
  )

  const deleteTransaction = useCallback(
    (id) => {
      commit((previous) => ({
        ...previous,
        transactions: previous.transactions.filter((transaction) => transaction.id !== id),
      }))
      return { ok: true }
    },
    [commit]
  )

  const setBudget = useCallback(
    (category, amount) => {
      const validation = validateBudget(category, amount)
      if (!validation.isValid) return { ok: false, errors: validation.errors }

      commit((previous) => ({
        ...previous,
        budgets: { ...previous.budgets, [category]: validation.amount },
      }))
      return { ok: true }
    },
    [commit]
  )

  const deleteBudget = useCallback(
    (category) => {
      commit((previous) => {
        const budgets = { ...previous.budgets }
        delete budgets[category]
        return { ...previous, budgets }
      })
      return { ok: true }
    },
    [commit]
  )

  const addGoal = useCallback(
    ({ name, targetAmount, targetDate, initialAmount }) => {
      const errors = {}
      const trimmedName = String(name || '').trim()
      const target = Number(targetAmount)
      const initial = Number(initialAmount || 0)

      if (!trimmedName) errors.name = 'Give the goal a name.'
      if (!Number.isFinite(target) || target <= 0) errors.targetAmount = 'Target must be greater than zero.'
      if (!targetDate) errors.targetDate = 'Choose a target date.'
      else if (Number.isNaN(new Date(targetDate).getTime())) errors.targetDate = 'Choose a valid date.'
      else if (targetDate <= new Date().toISOString().slice(0, 10)) {
        errors.targetDate = 'Target date must be in the future.'
      }
      if (initialAmount !== '' && (!Number.isFinite(initial) || initial < 0)) {
        errors.initialAmount = 'Starting amount must be zero or more.'
      }
      if (Number.isFinite(initial) && Number.isFinite(target) && initial > target) {
        errors.initialAmount = 'Starting amount cannot exceed the target.'
      }
      if (Object.keys(errors).length > 0) return { ok: false, errors }

      const goal = makeGoal({
        name: trimmedName,
        targetAmount: target,
        targetDate,
        initialAmount: initial,
      })

      commit((previous) => ({ ...previous, goals: [...previous.goals, goal] }))
      return { ok: true, goal }
    },
    [commit]
  )

  const contributeToGoal = useCallback(
    (goalId, amount, date) => {
      const value = Number(amount)
      if (!Number.isFinite(value) || value <= 0) {
        return { ok: false, errors: { amount: 'Contribution must be greater than zero.' } }
      }

      commit((previous) => ({
        ...previous,
        goals: previous.goals.map((goal) =>
          goal.id === goalId
            ? {
                ...goal,
                contributions: [
                  ...goal.contributions,
                  { id: uid(), amount: Math.round(value * 100) / 100, date: date || '' },
                ],
              }
            : goal
        ),
      }))
      return { ok: true }
    },
    [commit]
  )

  const deleteGoal = useCallback(
    (goalId) => {
      commit((previous) => ({
        ...previous,
        goals: previous.goals.filter((goal) => goal.id !== goalId),
      }))
      return { ok: true }
    },
    [commit]
  )

  const goals = useMemo(() => state.goals.map(goalWithTotals), [state.goals])

  const months = useMemo(() => {
    const available = getAvailableMonths(state.transactions)
    const set = new Set([currentMonth(), month, ...available])
    return [...set].filter(Boolean).sort().reverse()
  }, [state.transactions, month])

  const value = useMemo(
    () => ({
      transactions: state.transactions,
      budgets: state.budgets,
      goals,
      preferences: state.preferences,
      month,
      months,
      setMonth,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      setBudget,
      deleteBudget,
      addGoal,
      contributeToGoal,
      deleteGoal,
      persistenceError,
    }),
    [
      state.transactions,
      state.budgets,
      state.preferences,
      goals,
      month,
      months,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      setBudget,
      deleteBudget,
      addGoal,
      contributeToGoal,
      deleteGoal,
      persistenceError,
    ]
  )

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export const useFinance = () => {
  const context = useContext(FinanceContext)
  if (!context) throw new Error('useFinance must be used inside a FinanceProvider')
  return context
}
