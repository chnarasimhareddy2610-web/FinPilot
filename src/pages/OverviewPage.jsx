import React, { useMemo } from 'react'
import Icon from '../components/Icon.jsx'
import { Badge, Card, EmptyState, ProgressBar } from '../components/ui.jsx'
import { DonutChart, Legend, categoryColor } from '../components/charts.jsx'
import { useFinance } from '../store/FinanceProvider.jsx'
import {
  calculateTotalBalance,
  getRecentTransactions,
  getSpendingByCategory,
  getSummary,
  getTransactionsForMonth,
} from '../services/transactionService.js'
import { generateFinancialSummary, generateRecommendations } from '../services/aiEngine.js'
import { getBudgetSummary } from '../services/budgetService.js'
import { formatCurrency, formatDate, formatPercent } from '../utils/format.js'

const healthTone = {
  excellent: 'positive',
  good: 'positive',
  fair: 'soft',
  overextended: 'warning',
  'no-data': 'muted',
}

const healthLabel = {
  excellent: 'Excellent',
  good: 'Healthy',
  fair: 'Fair',
  overextended: 'Overextended',
  'no-data': 'No data',
}

export const OverviewPage = ({ month, onNavigate, onAddTransaction }) => {
  const { transactions, budgets, goals } = useFinance()

  const summary = useMemo(() => getSummary(transactions, month), [transactions, month])
  const balance = useMemo(() => calculateTotalBalance(transactions), [transactions])
  const monthTransactions = useMemo(
    () => getTransactionsForMonth(transactions, month),
    [transactions, month]
  )
  const spending = useMemo(() => getSpendingByCategory(transactions, month), [transactions, month])
  const recent = useMemo(
    () => getRecentTransactions(monthTransactions, 6),
    [monthTransactions]
  )
  const financial = useMemo(
    () => generateFinancialSummary({ transactions, budgets, goals, monthYear: month }),
    [transactions, budgets, goals, month]
  )
  const recommendations = useMemo(
    () => generateRecommendations({ transactions, budgets, goals, monthYear: month }),
    [transactions, budgets, goals, month]
  )
  const budgetSummary = useMemo(
    () => getBudgetSummary(budgets, transactions, month),
    [budgets, transactions, month]
  )

  const distribution = useMemo(() => {
    const sorted = Object.entries(spending).sort(([, a], [, b]) => b - a)
    const top = sorted.slice(0, 5)
    const rest = sorted.slice(5).reduce((total, [, amount]) => total + amount, 0)

    const entries = top.map(([category, amount], index) => ({
      label: category,
      value: amount,
      color: categoryColor(index),
    }))

    if (rest > 0) {
      entries.push({
        label: 'Everything else',
        value: rest,
        color: categoryColor(entries.length + 2),
      })
    }

    return entries
  }, [spending])

  const budgetRows = budgetSummary.list.filter((row) => row.actual > 0).slice(0, 4)

  if (transactions.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="wallet"
          title="Your ledger is empty"
          description="Add your first income or expense and FinPilot will start building your overview, budgets and insights automatically."
          action={
            <button type="button" onClick={onAddTransaction} className="btn btn-primary">
              <Icon name="plus" className="h-4 w-4" />
              Add your first transaction
            </button>
          }
        />
      </Card>
    )
  }

  const summaryFigures = [
    {
      label: 'Income',
      value: formatCurrency(summary.totalIncome),
      hint: `${summary.transactionCount.income} credit${summary.transactionCount.income === 1 ? '' : 's'} this month`,
      tone: 'text-white',
    },
    {
      label: 'Expenses',
      value: formatCurrency(summary.totalExpenses),
      hint: `${summary.transactionCount.expense} outgo${summary.transactionCount.expense === 1 ? 'ing' : 'ings'} this month`,
      tone: 'text-cream/90',
    },
    {
      label: 'Net savings',
      value: formatCurrency(summary.netSavings),
      hint: summary.netSavings >= 0 ? 'Surplus for the month' : 'Deficit for the month',
      tone: summary.netSavings >= 0 ? 'text-white' : 'text-coral',
    },
    {
      label: 'Savings rate',
      value: formatPercent(summary.savingsRate),
      hint: 'Share of income kept',
      tone: 'text-cream/90',
    },
  ]

  return (
    <div className="space-y-9 sm:space-y-11">
      {/* The balance is the page: no container, generous space, one accent mark. */}
      <section className="reveal">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
          <div>
            <p className="eyebrow">Total balance</p>
            <p className="num mt-3 text-[44px] leading-[0.86] text-white sm:text-[62px]">
              <span key={String(balance)} className="metric-swap">
                {formatCurrency(balance)}
              </span>
            </p>
          </div>
          <dl className="flex items-center gap-6 pb-1">
            <div>
              <dt className="ledger-head">Entries</dt>
              <dd className="num mt-1.5 text-[13px] text-cream">{transactions.length}</dd>
            </div>
            <div className="h-9 w-px bg-rule" aria-hidden="true" />
            <div>
              <dt className="ledger-head">This month</dt>
              <dd
                className={`num mt-1.5 text-[13px] ${
                  summary.netSavings >= 0 ? 'text-cream' : 'text-coral'
                }`}
              >
                {formatCurrency(summary.netSavings)}
              </dd>
            </div>
          </dl>
        </div>
        <p className="mt-4 max-w-md text-[11.5px] leading-relaxed text-muted">
          Income minus expenses across every recorded month. Nothing leaves this browser.
        </p>
      </section>

      {/* Horizontal financial summary: one band, four figures, no panel. */}
      <section className="border-y border-rule">
        <dl className="grid grid-cols-2 divide-rule sm:grid-cols-4 sm:divide-x">
          {summaryFigures.map((item, index) => (
            <div
              key={item.label}
              className={`py-4 sm:px-6 ${
                index === 0 ? 'sm:pl-0' : ''
              } ${index < 2 ? 'border-b border-rule sm:border-b-0' : ''} ${
                index % 2 === 1 ? 'pl-5 sm:pl-6' : ''
              }`}
            >
              <dt className="ledger-head">{item.label}</dt>
              <dd className={`num mt-2 text-[21px] leading-none ${item.tone}`}>
                <span key={String(item.value)} className="metric-swap">
                  {item.value}
                </span>
              </dd>
              <p className="mt-1.5 text-[10.5px] leading-tight text-muted">{item.hint}</p>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-9 lg:grid-cols-12 lg:gap-10">
        <section className="lg:col-span-7">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-[16px] font-medium tracking-[-0.025em] text-white">
                Spending distribution
              </h2>
              <p className="mt-1 text-[11.5px] text-muted">
                Where this month&apos;s {formatCurrency(summary.totalExpenses)} went
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('analysis')}
              className="link-underline text-[11px] font-medium text-cream"
            >
              Full analysis
            </button>
          </div>

          <div className="mt-6">
            {distribution.length === 0 ? (
              <EmptyState
                icon="analysis"
                title="No expenses this month"
                description="Expense categories will appear here as soon as you record spending."
              />
            ) : (
              <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
                <DonutChart
                  data={distribution}
                  centerLabel="Spent"
                  centerValue={formatCurrency(summary.totalExpenses)}
                  total={`${summary.transactionCount.expense} entries`}
                  size={176}
                />
                <div className="w-full flex-1 sm:border-l sm:border-rule sm:pl-7">
                  <Legend
                    items={distribution.map((item) => ({
                      label: item.label,
                      color: item.color,
                      valueLabel: formatCurrency(item.value),
                      percent:
                        summary.totalExpenses > 0 ? (item.value / summary.totalExpenses) * 100 : 0,
                    }))}
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="lg:col-span-5 lg:border-l lg:border-rule lg:pl-10">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-[16px] font-medium tracking-[-0.025em] text-white">
                Financial summary
              </h2>
              <p className="mt-1 text-[11.5px] text-muted">Generated from this month&apos;s records</p>
            </div>
            <Badge tone={healthTone[financial.financialHealth]}>
              {healthLabel[financial.financialHealth]}
            </Badge>
          </div>

          <p className="mt-4 text-[12.5px] leading-[1.75] text-cream/85">{financial.narrative}</p>

          <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3.5 border-t border-rule pt-4 text-[11.5px]">
            <div>
              <dt className="ledger-head">Top category</dt>
              <dd className="mt-1 font-medium text-ink">{financial.topSpendingCategory}</dd>
            </div>
            <div>
              <dt className="ledger-head">Its share</dt>
              <dd className="num mt-1 font-medium text-ink">
                {formatPercent(financial.topSpendingShare, 0)}
              </dd>
            </div>
            <div>
              <dt className="ledger-head">Budget used</dt>
              <dd className="num mt-1 font-medium text-ink">
                {financial.totalBudget > 0
                  ? formatPercent(financial.budgetUtilization, 0)
                  : 'No limits set'}
              </dd>
            </div>
            <div>
              <dt className="ledger-head">Goals on track</dt>
              <dd className="num mt-1 font-medium text-ink">
                {financial.goals.onTrack} of {financial.goals.total}
              </dd>
            </div>
          </dl>

          {recommendations.length > 0 ? (
            <div className="mt-6 border-l border-coral/60 pl-4">
              <p className="eyebrow text-coral/80">Recommended next</p>
              <p className="mt-1.5 text-[12.5px] font-medium text-white">
                {recommendations[0].title}
              </p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
                {recommendations[0].description}
              </p>
              <button
                type="button"
                onClick={() => onNavigate('insights')}
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-cream link-underline"
              >
                See all insights
                <Icon name="arrowRight" className="h-3 w-3" />
              </button>
            </div>
          ) : null}
        </section>
      </div>

      <div className="grid gap-9 border-t border-rule pt-8 lg:grid-cols-12 lg:gap-10">
        <section className="lg:col-span-7">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-[16px] font-medium tracking-[-0.025em] text-white">
                Recent transactions
              </h2>
              <p className="mt-1 text-[11.5px] text-muted">Latest activity in the selected month</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('transactions')}
              className="link-underline text-[11px] font-medium text-cream"
            >
              View all
            </button>
          </div>

          {recent.length === 0 ? (
            <EmptyState
              icon="transactions"
              title="Nothing recorded this month"
              description="Switch to another month or add a transaction to see it here."
              action={
                <button type="button" onClick={onAddTransaction} className="btn btn-primary">
                  <Icon name="plus" className="h-3.5 w-3.5" />
                  Add transaction
                </button>
              }
            />
          ) : (
            <ul className="mt-3">
              {recent.map((transaction) => {
                const isIncome = transaction.type === 'income'
                return (
                  <li
                    key={transaction.id}
                    className="ledger-row flex items-center gap-4 border-b border-rule/70 py-3.5 last:border-b-0"
                  >
                    <span
                      className={`w-4 shrink-0 ${
                        isIncome ? 'text-cream/45' : 'text-coral/75'
                      }`}
                      aria-hidden="true"
                    >
                      <Icon name={isIncome ? 'arrowDown' : 'arrowUp'} className="h-3 w-3" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink">
                        {transaction.description}
                      </p>
                      <p className="mt-0.5 truncate text-[10.5px] text-muted">
                        {transaction.category} · {formatDate(transaction.date, { short: true })}
                      </p>
                    </div>
                    <p
                      className={`num shrink-0 text-[13px] font-medium tabular-nums ${
                        isIncome ? 'text-white' : 'text-cream/85'
                      }`}
                    >
                      {isIncome ? '+' : '−'}
                      {formatCurrency(transaction.amount)}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="lg:col-span-5 lg:border-l lg:border-rule lg:pl-10">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-[16px] font-medium tracking-[-0.025em] text-white">Budget pulse</h2>
              <p className="mt-1 text-[11.5px] text-muted">This month&apos;s category limits</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('budgets')}
              className="link-underline text-[11px] font-medium text-cream"
            >
              Manage
            </button>
          </div>

          {budgetSummary.list.length === 0 ? (
            <p className="mt-4 text-[11.5px] leading-relaxed text-muted">
              No budgets yet. Set a monthly limit to track how quickly each category is burning.
            </p>
          ) : (
            <>
              <div className="mt-5 flex items-baseline justify-between gap-2">
                <p className="ledger-head">Overall utilisation</p>
                <p className="num text-[12px] font-medium text-ink">
                  {formatPercent(budgetSummary.overallUtilization, 0)}
                </p>
              </div>
              <div className="mt-2">
                <ProgressBar
                  value={budgetSummary.overallUtilization}
                  tone={budgetSummary.overallUtilization > 100 ? 'coral' : 'navy'}
                  height={4}
                  label="Overall budget utilisation"
                />
              </div>
              <p className="mt-2 text-[10.5px] text-muted">
                {formatCurrency(budgetSummary.totalSpent)} of{' '}
                {formatCurrency(budgetSummary.totalBudget)} used
              </p>

              <ul className="mt-5 space-y-3.5 border-t border-rule pt-4">
                {budgetRows.length === 0 ? (
                  <li className="text-[11px] text-muted">
                    No spending against budgets yet this month.
                  </li>
                ) : (
                  budgetRows.map((row) => (
                    <li key={row.category}>
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="truncate text-[12px] text-ink">{row.category}</span>
                        <span
                          className={`num text-[10.5px] font-medium ${
                            row.status === 'over' ? 'text-coral' : 'text-muted'
                          }`}
                        >
                          {formatPercent(row.utilization, 0)}
                        </span>
                      </div>
                      <ProgressBar
                        value={row.utilization}
                        tone={row.status === 'over' ? 'coral' : 'navy'}
                        height={3}
                        label={`${row.category} budget usage`}
                      />
                    </li>
                  ))
                )}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

export default OverviewPage
