import { useMemo } from 'react'
import { buildInsightReport } from '../services/aiEngine.js'

/**
 * Produces the insight snapshot for a month.
 *
 * Recalculation is driven by the *content* of the records, not by render
 * count or array identity: creating, editing, deleting or recategorising a
 * transaction (or changing budgets, goals or the selected month) changes the
 * fingerprint and rebuilds the report. A plain re-render reuses the previous
 * snapshot, so `generatedAt` only moves when the analysis was genuinely rerun.
 */
const buildFingerprint = (transactions, budgets, goals, month) => {
  const ledger = transactions.map((transaction) =>
    [
      transaction.id,
      transaction.date,
      transaction.type,
      transaction.category,
      Number(transaction.amount),
      transaction.description,
      transaction.notes || '',
    ].join('~')
  )

  const goalsSignature = goals.map((goal) => {
    const contributions = (goal.contributions || [])
      .map((contribution) => `${contribution.id}:${contribution.date}:${contribution.amount}`)
      .join(',')
    return `${goal.id}~${goal.name}~${goal.targetAmount}~${goal.targetDate}~${contributions}`
  })

  return JSON.stringify({ month, ledger, budgets, goals: goalsSignature })
}

export const useInsightReport = ({ transactions, budgets, goals, month }) => {
  const fingerprint = useMemo(
    () => buildFingerprint(transactions, budgets, goals, month),
    [transactions, budgets, goals, month]
  )

  return useMemo(
    () =>
      buildInsightReport({
        transactions,
        budgets,
        goals,
        monthYear: month,
        generatedAt: new Date().toISOString(),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fingerprint]
  )
}

export default useInsightReport
