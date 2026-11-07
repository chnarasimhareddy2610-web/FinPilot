/**
 * FinPilot - Insight engine
 *
 * A local, fully explainable analysis layer. It uses keyword categorisation,
 * month-over-month comparison and the interquartile range (IQR) method. No
 * external model or network call is involved, and every insight carries the
 * evidence that produced it.
 */

import { formatCompactCurrency, monthsBetween, previousMonth } from '../utils/format.js'
import {
  calculateNetSavings,
  calculateSavingsRate,
  calculateTotalExpenses,
  calculateTotalIncome,
  getExpensesForMonth,
  getIncomeForMonth,
  getSpendingByCategory,
  getTransactionsForMonth,
  TRANSACTION_TYPES,
} from './transactionService.js'

const RULES = [
  {
    category: 'Food & Dining',
    keywords: ['swiggy', 'zomato', 'restaurant', 'dining', 'cafe', 'coffee', 'burger', 'pizza', 'kfc', 'dominos', 'truffles', 'bakery'],
  },
  {
    category: 'Groceries',
    keywords: ['bigbasket', 'dmart', 'grocery', 'groceries', 'supermarket', 'reliance fresh', 'instamart', 'blinkit', 'zepto'],
  },
  {
    category: 'Transportation',
    keywords: ['uber', 'ola', 'taxi', 'cab', 'metro', 'bus', 'train', 'fuel', 'petrol', 'diesel', 'shell', 'parking'],
  },
  {
    category: 'Shopping',
    keywords: ['amazon', 'flipkart', 'myntra', 'ajio', 'shopping', 'mall', 'decathlon', 'ikea'],
  },
  {
    category: 'Entertainment',
    keywords: ['netflix', 'prime video', 'hotstar', 'spotify', 'bookmyshow', 'movie', 'cinema', 'game'],
  },
  {
    category: 'Bills & Utilities',
    keywords: ['electricity', 'bescom', 'water bill', 'broadband', 'airtel', 'jio', 'internet', 'recharge', 'gas bill'],
  },
  {
    category: 'Education',
    keywords: ['college', 'university', 'tuition', 'fees', 'course', 'udemy', 'coursera', 'school'],
  },
  {
    category: 'Healthcare',
    keywords: ['apollo', 'pharmacy', 'hospital', 'clinic', 'doctor', 'dental', 'medicine', 'gym', 'health'],
  },
  {
    category: 'Housing',
    keywords: ['rent', 'apartment', 'maintenance', 'mortgage', 'society'],
  },
  {
    category: 'Salary',
    keywords: ['salary', 'payroll', 'wage', 'stipend'],
  },
  {
    category: 'Freelance Income',
    keywords: ['freelance', 'upwork', 'fiverr', 'consulting', 'invoice', 'client payment'],
  },
  {
    category: 'Investment Income',
    keywords: ['dividend', 'interest credit', 'mutual fund', 'stocks', 'fd interest'],
  },
]

/**
 * Suggests a category from the transaction description.
 * Returns the matched keyword so the suggestion is auditable.
 */
export const classifyTransaction = (description = '', type = TRANSACTION_TYPES.EXPENSE) => {
  const text = String(description).trim().toLowerCase()

  if (!text) {
    return {
      category: type === TRANSACTION_TYPES.INCOME ? 'Other' : 'Other',
      confidence: 0,
      keyword: '',
      explanation: 'No description to match against, so the category stays unassigned.',
    }
  }

  for (const rule of RULES) {
    const keyword = rule.keywords.find((word) => text.includes(word))
    if (!keyword) continue

    const isIncomeRule = ['Salary', 'Freelance Income', 'Investment Income'].includes(rule.category)
    if (type === TRANSACTION_TYPES.INCOME && !isIncomeRule) continue
    if (type === TRANSACTION_TYPES.EXPENSE && isIncomeRule) continue

    return {
      category: rule.category,
      confidence: 0.92,
      keyword,
      explanation: `"${keyword}" appears in the description, which maps to ${rule.category}.`,
    }
  }

  return {
    category: type === TRANSACTION_TYPES.INCOME ? 'Other' : 'Other',
    confidence: 0.2,
    keyword: '',
    explanation: 'No known merchant keyword matched, so this is left as Other for you to confirm.',
  }
}

const sum = (items) => items.reduce((total, item) => total + Number(item.amount || 0), 0)

/** Month-over-month spending comparison with per-category movement. */
export const analyzeSpendingPatterns = (transactions, monthYear) => {
  const before = previousMonth(monthYear)
  const currentExpenses = getExpensesForMonth(transactions, monthYear)
  const previousExpenses = getExpensesForMonth(transactions, before)
  const current = getSpendingByCategory(transactions, monthYear)
  const previous = getSpendingByCategory(transactions, before)
  const totalCurrent = sum(currentExpenses)
  const totalPrevious = sum(previousExpenses)

  const categories = new Set([...Object.keys(current), ...Object.keys(previous)])
  const trends = [...categories]
    .map((category) => {
      const currentAmount = current[category] || 0
      const previousAmount = previous[category] || 0
      const changePercent =
        previousAmount === 0
          ? currentAmount > 0
            ? 100
            : 0
          : ((currentAmount - previousAmount) / previousAmount) * 100

      return {
        category,
        current: currentAmount,
        previous: previousAmount,
        difference: currentAmount - previousAmount,
        changePercent,
      }
    })
    .sort((a, b) => b.current - a.current)

  const overallChangePercent =
    totalPrevious === 0 ? (totalCurrent > 0 ? 100 : 0) : ((totalCurrent - totalPrevious) / totalPrevious) * 100

  let pattern = 'stable'
  if (currentExpenses.length === 0 && previousExpenses.length === 0) pattern = 'no_data'
  else if (overallChangePercent > 10) pattern = 'increasing'
  else if (overallChangePercent < -10) pattern = 'decreasing'

  return {
    pattern,
    totalCurrent,
    totalPrevious,
    overallChangePercent,
    difference: totalCurrent - totalPrevious,
    trends,
    previousMonth: before,
    hasHistory: previousExpenses.length > 0,
    message:
      pattern === 'no_data'
        ? 'No spending recorded in either month.'
        : previousExpenses.length === 0
        ? 'No spending recorded last month, so a comparison is not available.'
        : pattern === 'increasing'
        ? `Spending is up ${overallChangePercent.toFixed(1)}% compared with last month.`
        : pattern === 'decreasing'
        ? `Spending is down ${Math.abs(overallChangePercent).toFixed(1)}% compared with last month.`
        : 'Spending is broadly unchanged from last month.',
  }
}

const percentile = (sorted, index) => {
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sorted[lower]
  const weight = index - lower
  return sorted[lower] * (1 - weight) + sorted[upper] * weight
}

/**
 * Flags unusual expenses with the IQR method (Tukey's fences). When all
 * amounts are identical the IQR collapses to zero, so the method falls back
 * to a median multiple instead of flagging everything.
 */
export const detectAnomalies = (transactions, monthYear, threshold = 1.5) => {
  const expenses = getExpensesForMonth(transactions, monthYear)

  if (expenses.length < 4) {
    return {
      anomalies: [],
      method: 'none',
      totalExamined: expenses.length,
      message:
        expenses.length === 0
          ? 'No expenses recorded for this month.'
          : 'At least four expenses are needed before unusual activity can be detected.',
    }
  }

  const sorted = expenses.map((t) => Number(t.amount)).sort((a, b) => a - b)
  const q1 = percentile(sorted, (sorted.length - 1) * 0.25)
  const q3 = percentile(sorted, (sorted.length - 1) * 0.75)
  const iqr = q3 - q1
  const median = percentile(sorted, (sorted.length - 1) * 0.5)

  const useMedianFallback = iqr === 0
  const lowerBound = useMedianFallback ? 0 : q1 - threshold * iqr
  const upperBound = useMedianFallback ? median * 3 : q3 + threshold * iqr

  const anomalies = expenses
    .filter((transaction) => {
      const amount = Number(transaction.amount)
      return amount > upperBound || amount < lowerBound
    })
    .map((transaction) => {
      const amount = Number(transaction.amount)
      const reference = useMedianFallback ? median : q3
      return {
        transaction,
        amount,
        deviation: amount - reference,
        median,
        q1,
        q3,
        iqr,
        lowerBound,
        upperBound,
        score: useMedianFallback ? (median > 0 ? amount / median : 0) : iqr > 0 ? (amount - reference) / iqr : 0,
      }
    })
    .sort((a, b) => b.amount - a.amount)

  return {
    anomalies,
    method: useMedianFallback ? 'median' : 'iqr',
    totalExamined: expenses.length,
    q1,
    q3,
    median,
    iqr,
    lowerBound,
    upperBound,
    message:
      anomalies.length === 0
        ? 'No expense falls outside the expected range this month.'
        : `${anomalies.length} expense${anomalies.length > 1 ? 's are' : ' is'} well above your usual range.`,
  }
}

const goalProgress = (goal) => {
  const saved = (goal.contributions || []).reduce((total, c) => total + Number(c.amount || 0), 0)
  const target = Number(goal.targetAmount) || 0
  return {
    saved,
    target,
    remaining: Math.max(0, target - saved),
    progress: target > 0 ? (saved / target) * 100 : 0,
  }
}

/**
 * Builds recommendations from stored records. Each entry exposes the numbers
 * and the rule that triggered it so the UI can explain "why".
 */
export const generateRecommendations = ({ transactions = [], budgets = {}, goals = [], monthYear }) => {
  const recommendations = []
  const expenses = getExpensesForMonth(transactions, monthYear)
  const income = calculateTotalIncome(transactions, monthYear)
  const spending = getSpendingByCategory(transactions, monthYear)
  const savingsRate = calculateSavingsRate(transactions, monthYear)
  const netSavings = calculateNetSavings(transactions, monthYear)
  const totalExpenses = calculateTotalExpenses(transactions, monthYear)
  const budgetEntries = Object.entries(budgets)

  const push = (recommendation) => recommendations.push(recommendation)

  // 1. Categories over their limit
  budgetEntries.forEach(([category, limit]) => {
    const actual = spending[category] || 0
    if (!limit || actual <= limit) return
    const overage = actual - limit

    push({
      id: `over-budget-${category}`,
      tone: 'warning',
      priority: overage / limit >= 0.25 ? 'high' : 'medium',
      title: `${category} is over budget`,
      description: `You have spent ${formatCompactCurrency(actual)} of your ${formatCompactCurrency(
        limit
      )} ${category} limit — ${formatCompactCurrency(overage)} over. Trimming this category next month is the fastest route back to your savings target.`,
      evidence: `Actual ${formatCompactCurrency(actual)} vs limit ${formatCompactCurrency(limit)} (${(
        (actual / limit) *
        100
      ).toFixed(0)}% used).`,
      why: `Triggered because ${category} spending exceeded its monthly limit.`,
      metric: { label: 'Over limit by', value: formatCompactCurrency(overage) },
    })
  })

  // 2. Categories close to their limit
  budgetEntries.forEach(([category, limit]) => {
    const actual = spending[category] || 0
    if (!limit || actual > limit || actual / limit < 0.8) return

    push({
      id: `near-budget-${category}`,
      tone: 'caution',
      priority: 'medium',
      title: `${category} is close to its limit`,
      description: `Only ${formatCompactCurrency(limit - actual)} of the ${category} budget remains. Slowing spending here avoids an overspend before the month closes.`,
      evidence: `${((actual / limit) * 100).toFixed(0)}% of the ${formatCompactCurrency(limit)} limit is used.`,
      why: `Triggered because utilisation crossed 80% of the budget.`,
      metric: { label: 'Remaining', value: formatCompactCurrency(limit - actual) },
    })
  })

  // 3. Savings rate below the 20% guideline
  if (income > 0 && savingsRate < 20) {
    const gap = income * 0.2 - netSavings
    push({
      id: 'raise-savings-rate',
      tone: 'warning',
      priority: 'high',
      title: 'Savings rate is below the 20% guideline',
      description:
        netSavings < 0
          ? `Expenses exceeded income by ${formatCompactCurrency(Math.abs(netSavings))} this month. Recovering ${formatCompactCurrency(
              gap
            )} would bring you back to a 20% savings rate.`
          : `You saved ${savingsRate.toFixed(1)}% of income. Setting aside another ${formatCompactCurrency(
              Math.max(gap, 0)
            )} would reach the 20% guideline.`,
      evidence: `Income ${formatCompactCurrency(income)} minus expenses ${formatCompactCurrency(
        totalExpenses
      )} leaves ${formatCompactCurrency(netSavings)} saved.`,
      why: 'Triggered because the savings rate is under 20% of monthly income.',
      metric: { label: 'Savings rate', value: `${savingsRate.toFixed(1)}%` },
    })
  }

  // 4. Positive reinforcement
  if (income > 0 && savingsRate >= 20) {
    push({
      id: 'healthy-savings',
      tone: 'positive',
      priority: 'low',
      title: 'Savings rate is on target',
      description: `You kept ${formatCompactCurrency(netSavings)} of your ${formatCompactCurrency(
        income
      )} income — ${savingsRate.toFixed(1)}% saved. Consider moving the surplus toward a goal so it is not absorbed next month.`,
      evidence: `${formatCompactCurrency(income)} income − ${formatCompactCurrency(
        totalExpenses
      )} expenses = ${formatCompactCurrency(netSavings)} saved.`,
      why: 'Triggered because the savings rate met or exceeded 20%.',
      metric: { label: 'Saved', value: formatCompactCurrency(netSavings) },
    })
  }

  // 5. Spend concentration
  if (totalExpenses > 0) {
    const [topCategory, topAmount] = Object.entries(spending).sort(([, a], [, b]) => b - a)[0] || []
    const share = topAmount ? (topAmount / totalExpenses) * 100 : 0
    if (topCategory && share >= 35) {
      push({
        id: `concentration-${topCategory}`,
        tone: 'neutral',
        priority: 'medium',
        title: `${topCategory} dominates your spending`,
        description: `${topCategory} accounts for ${share.toFixed(
          0
        )}% of everything you spent this month. That concentration makes the budget sensitive to a single category.`,
        evidence: `${formatCompactCurrency(topAmount)} of ${formatCompactCurrency(
          totalExpenses
        )} total expenses.`,
        why: 'Triggered because one category exceeded 35% of total expenses.',
        metric: { label: 'Share of spend', value: `${share.toFixed(0)}%` },
      })
    }
  }

  // 6. Unusual transactions
  const anomalyResult = detectAnomalies(transactions, monthYear)
  anomalyResult.anomalies.slice(0, 2).forEach((anomaly) => {
    push({
      id: `anomaly-${anomaly.transaction.id}`,
      tone: 'caution',
      priority: 'medium',
      title: `Unusual expense: ${anomaly.transaction.description}`,
      description: `${formatCompactCurrency(anomaly.amount)} on ${anomaly.transaction.category} sits outside your usual range of ${formatCompactCurrency(
        anomaly.lowerBound
      )}–${formatCompactCurrency(anomaly.upperBound)}. Check whether it was a one-off.`,
      evidence:
        anomalyResult.method === 'median'
          ? `This is ${anomaly.score.toFixed(1)}× your median expense of ${formatCompactCurrency(anomaly.median)}.`
          : `Amount is ${anomaly.score.toFixed(1)} IQRs above the upper fence (${formatCompactCurrency(
              anomaly.upperBound
            )}).`,
      why: 'Triggered by the interquartile range anomaly test on this month’s expenses.',
      metric: { label: 'Amount', value: formatCompactCurrency(anomaly.amount) },
    })
  })

  // 7. Goal pacing
  goals.forEach((goal) => {
    const { saved, target, remaining, progress } = goalProgress(goal)
    if (!target || progress >= 100 || !goal.targetDate) return

    const monthsLeft = monthsBetween(monthYear, goal.targetDate.slice(0, 7))
    if (monthsLeft <= 0) {
      push({
        id: `goal-late-${goal.id}`,
        tone: 'warning',
        priority: 'high',
        title: `${goal.name} target date has passed`,
        description: `${formatCompactCurrency(remaining)} is still needed to reach ${goal.name}. Move the target date or increase monthly contributions.`,
        evidence: `${formatCompactCurrency(saved)} saved of ${formatCompactCurrency(target)} (${progress.toFixed(0)}%).`,
        why: 'Triggered because the goal target date is in the past and the goal is incomplete.',
        metric: { label: 'Still needed', value: formatCompactCurrency(remaining) },
      })
      return
    }

    const requiredMonthly = remaining / monthsLeft
    const recentMonths = Math.min(3, Math.max(1, monthsBetween(goal.createdAt?.slice(0, 7) || monthYear, monthYear)))
    const contributionRate = (goal.contributions || [])
      .filter((c) => c.date && c.date >= previousMonth(monthYear))
      .reduce((total, c) => total + Number(c.amount || 0), 0)

    if (contributionRate < requiredMonthly) {
      push({
        id: `goal-pace-${goal.id}`,
        tone: 'neutral',
        priority: 'low',
        title: `${goal.name} needs ${formatCompactCurrency(requiredMonthly)} a month`,
        description: `At the current pace ${goal.name} may miss its target date. Contributing ${formatCompactCurrency(
          requiredMonthly
        )} monthly for the next ${monthsLeft} month${monthsLeft === 1 ? '' : 's'} closes the gap.`,
        evidence: `${formatCompactCurrency(remaining)} remaining over ${monthsLeft} month${
          monthsLeft === 1 ? '' : 's'
        }; recent contributions ${formatCompactCurrency(contributionRate)}.`,
        why: 'Triggered because recent contributions are below the pace required by the target date.',
        metric: { label: 'Needed / month', value: formatCompactCurrency(requiredMonthly) },
      })
    }
  })

  // 8. Small recurring charges
  const subscriptions = expenses.filter((t) =>
    ['Netflix', 'Spotify', 'Prime Video', 'Hotstar'].some((name) =>
      t.description.toLowerCase().includes(name.toLowerCase())
    )
  )
  if (subscriptions.length >= 2) {
    const total = sum(subscriptions)
    push({
      id: 'subscriptions',
      tone: 'neutral',
      priority: 'low',
      title: 'Review recurring subscriptions',
      description: `You paid for ${subscriptions.length} subscriptions this month totalling ${formatCompactCurrency(
        total
      )}. Cancelling an unused one frees that amount every month.`,
      evidence: subscriptions.map((t) => `${t.description} ${formatCompactCurrency(t.amount)}`).join(', '),
      why: 'Triggered because more than one entertainment subscription was charged.',
      metric: { label: 'Monthly total', value: formatCompactCurrency(total) },
    })
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 }
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  return recommendations
}

export const generateFinancialSummary = ({ transactions = [], budgets = {}, goals = [], monthYear }) => {
  const incomeEntries = getIncomeForMonth(transactions, monthYear)
  const expenses = getExpensesForMonth(transactions, monthYear)
  const totalIncome = sum(incomeEntries)
  const totalExpenses = sum(expenses)
  const netSavings = totalIncome - totalExpenses
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0
  const spending = getSpendingByCategory(transactions, monthYear)
  const [topCategory, topAmount] = Object.entries(spending).sort(([, a], [, b]) => b - a)[0] || ['None', 0]
  const totalBudget = Object.values(budgets).reduce((total, limit) => total + (Number(limit) || 0), 0)
  const budgetedSpend = Object.keys(budgets).reduce(
    (total, category) => total + (spending[category] || 0),
    0
  )

  let health = 'no-data'
  if (expenses.length > 0 || incomeEntries.length > 0) {
    if (savingsRate >= 30) health = 'excellent'
    else if (savingsRate >= 20) health = 'good'
    else if (savingsRate >= 0) health = 'fair'
    else health = 'overextended'
  }

  const healthCopy = {
    excellent: 'Saving a third or more of your income is a strong position. Keep the surplus working toward your goals.',
    good: 'You are meeting the 20% savings guideline. The next lever is directing the surplus into goals rather than leaving it idle.',
    fair: 'You are saving, but below the 20% guideline. Trimming one discretionary category would meaningfully lift this.',
    overextended: 'Expenses exceeded income this month. The priority is covering the shortfall and pausing discretionary spending.',
    'no-data': 'No transactions are recorded for this month yet. Add income and expenses to generate a summary.',
  }

  const goalTotals = goals.map((goal) => ({ name: goal.name, ...goalProgress(goal) }))
  const goalsOnTrack = goalTotals.filter((g) => g.progress >= 60).length

  return {
    monthYear,
    totalIncome,
    totalExpenses,
    netSavings,
    savingsRate,
    transactionCount: {
      income: incomeEntries.length,
      expense: expenses.length,
      total: incomeEntries.length + expenses.length,
    },
    topSpendingCategory: topCategory,
    topSpendingAmount: topAmount,
    topSpendingShare: totalExpenses > 0 ? (topAmount / totalExpenses) * 100 : 0,
    budgetUtilization: totalBudget > 0 ? (budgetedSpend / totalBudget) * 100 : 0,
    budgetedSpend,
    totalBudget,
    categoryBreakdown: Object.entries(spending)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount),
    goals: { total: goalTotals.length, onTrack: goalsOnTrack, saved: goalTotals.reduce((t, g) => t + g.saved, 0) },
    financialHealth: health,
    narrative: healthCopy[health],
  }
}

/**
 * One consistent insight snapshot for a month.
 *
 * Everything the Insights page shows is produced here in a single pass, so the
 * numbers, the audit trail and the transaction count can never disagree. The
 * snapshot is deliberately pure: the generation timestamp is supplied by the
 * caller (see buildInsightReport) rather than read from the clock in here, which
 * keeps recalculation explicit and testable.
 */
export const buildInsightReport = ({ transactions = [], budgets = {}, goals = [], monthYear, generatedAt }) => {
  const summary = generateFinancialSummary({ transactions, budgets, goals, monthYear })
  const monthTransactions = getTransactionsForMonth(transactions, monthYear)
  const expenses = getExpensesForMonth(transactions, monthYear)
  const income = getIncomeForMonth(transactions, monthYear)

  return {
    monthYear,
    generatedAt: generatedAt || new Date().toISOString(),
    summary,
    recommendations: generateRecommendations({ transactions, budgets, goals, monthYear }),
    anomalies: detectAnomalies(transactions, monthYear),
    audit: auditCategorization(transactions, monthYear),
    spending: getSpendingByCategory(transactions, monthYear),
    counts: {
      total: monthTransactions.length,
      income: income.length,
      expense: expenses.length,
    },
  }
}

/** Per-transaction categorisation audit used by the Insights page. */
export const auditCategorization = (transactions = [], monthYear) => {
  const monthTransactions = getTransactionsForMonth(transactions, monthYear)
  return monthTransactions.map((transaction) => {
    const suggestion = classifyTransaction(transaction.description, transaction.type)
    return {
      transaction,
      suggestion,
      matches: suggestion.category === transaction.category,
    }
  })
}

export default {
  classifyTransaction,
  analyzeSpendingPatterns,
  detectAnomalies,
  generateRecommendations,
  generateFinancialSummary,
  auditCategorization,
  buildInsightReport,
}
