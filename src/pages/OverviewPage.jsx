import React, { useMemo } from 'react'
import Icon from '../components/Icon.jsx'
import { Badge, Card, EmptyState, ProgressBar, SectionCard } from '../components/ui.jsx'
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

  const savingsTone = summary.savingsRate >= 20 ? 'positive' : summary.netSavings < 0 ? 'warning' : 'soft'
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

  return (
    <div className="space-y-6">
      {/* Editorial lead row: one dark balance plate beside a spare figure grid. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="reveal relative overflow-hidden plate-navy px-6 py-5 lg:col-span-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-cream/45">
                01 — Total balance
              </p>
              <p className="num mt-3 text-[30px] leading-none text-white sm:text-[36px]">
                {formatCurrency(balance)}
              </p>
            </div>
            <Icon name="wallet" className="h-4.5 w-4.5 text-coral" />
          </div>

          <div className="mt-5 grid grid-cols-2 divide-x divide-cream/18 border-t border-cream/18 pt-4">
            <div className="pr-4">
              <p className="text-[10px] uppercase tracking-[0.12em] text-cream/50">Entries recorded</p>
              <p className="num mt-1 text-[15px] text-cream">{transactions.length}</p>
            </div>
            <div className="pl-4">
              <p className="text-[10px] uppercase tracking-[0.12em] text-cream/50">This month&apos;s net</p>
              <p className="num mt-1 text-[15px] text-cream">{formatCurrency(summary.netSavings)}</p>
            </div>
          </div>

          <p className="mt-4 text-[10px] leading-relaxed text-cream/40">
            Income minus expenses across every recorded month. Nothing leaves this browser.
          </p>
        </div>

        <div className="grid grid-cols-2 border border-rule-strong bg-surface lg:col-span-7">
          {[
            {
              label: 'Income this month',
              value: formatCurrency(summary.totalIncome),
              hint: `${summary.transactionCount.income} credit${summary.transactionCount.income === 1 ? '' : 's'}`,
              icon: 'arrowDown',
            },
            {
              label: 'Expenses this month',
              value: formatCurrency(summary.totalExpenses),
              hint: `${summary.transactionCount.expense} outgo${summary.transactionCount.expense === 1 ? 'ing' : 'ings'}`,
              icon: 'arrowUp',
            },
            {
              label: 'Net savings',
              value: formatCurrency(summary.netSavings),
              hint: summary.netSavings >= 0 ? 'Surplus for the month' : 'Deficit for the month',
              icon: 'goals',
            },
            {
              label: 'Savings rate',
              value: formatPercent(summary.savingsRate),
              hint: `${formatPercent(summary.savingsRate)} of income kept`,
              icon: 'analysis',
            },
          ].map((item, index) => (
            <div
              key={item.label}
              className={`reveal px-5 py-4 ${index % 2 === 1 ? 'border-l border-rule-strong' : ''} ${
                index > 1 ? 'border-t border-rule-strong' : ''
              }`}
              style={{ '--i': index + 1 }}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="eyebrow text-[9px] leading-tight">{item.label}</p>
                <Icon name={item.icon} className="h-3.5 w-3.5 text-ink/30" />
              </div>
              <p className="num mt-2 text-[18px] leading-none text-ink">
                <span key={String(item.value)} className="metric-swap">
                  {item.value}
                </span>
              </p>
              <p className="mt-1 text-[10px] leading-tight text-muted">{item.hint}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <SectionCard
          className="lg:col-span-7"
          index="02"
          title="Spending distribution"
          description={`Where this month's ${formatCurrency(summary.totalExpenses)} went`}
          action={
            <button
              type="button"
              onClick={() => onNavigate('analysis')}
              className="link-underline text-[11px] font-medium text-navy"
            >
              Full analysis
            </button>
          }
        >
          {distribution.length === 0 ? (
            <EmptyState
              icon="analysis"
              title="No expenses this month"
              description="Expense categories will appear here as soon as you record spending."
            />
          ) : (
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-6">
              <DonutChart
                data={distribution}
                centerLabel="Spent"
                centerValue={formatCurrency(summary.totalExpenses)}
                total={`${summary.transactionCount.expense} entries`}
                size={168}
              />
              <div className="w-full flex-1 border-t border-rule sm:border-l sm:border-t-0 sm:pl-5 sm:pt-2">
                <Legend
                  items={distribution.map((item) => ({
                    label: item.label,
                    color: item.color,
                    valueLabel: formatCurrency(item.value),
                    percent: summary.totalExpenses > 0 ? (item.value / summary.totalExpenses) * 100 : 0,
                  }))}
                />
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard
          className="lg:col-span-5"
          index="03"
          title="Financial summary"
          description="Generated from this month's records"
          action={<Badge tone={healthTone[financial.financialHealth]}>{healthLabel[financial.financialHealth]}</Badge>}
        >
          <p className="text-[12px] leading-relaxed text-ink">{financial.narrative}</p>

          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-rule pt-3 text-[11.5px]">
            <div>
              <dt className="ledger-head">Top category</dt>
              <dd className="mt-0.5 font-medium text-ink">{financial.topSpendingCategory}</dd>
            </div>
            <div>
              <dt className="ledger-head">Its share</dt>
              <dd className="num mt-0.5 font-medium text-ink">{formatPercent(financial.topSpendingShare, 0)}</dd>
            </div>
            <div>
              <dt className="ledger-head">Budget used</dt>
              <dd className="num mt-0.5 font-medium text-ink">
                {financial.totalBudget > 0 ? formatPercent(financial.budgetUtilization, 0) : 'No limits set'}
              </dd>
            </div>
            <div>
              <dt className="ledger-head">Goals on track</dt>
              <dd className="num mt-0.5 font-medium text-ink">
                {financial.goals.onTrack} of {financial.goals.total}
              </dd>
            </div>
          </dl>

          {recommendations.length > 0 ? (
            <div className="mt-3 border-l-2 border-coral bg-cream-soft/90 px-3 py-2.5">
              <p className="ledger-head">Top recommendation</p>
              <p className="mt-0.5 text-[11.5px] font-medium text-ink">{recommendations[0].title}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{recommendations[0].description}</p>
              <button
                type="button"
                onClick={() => onNavigate('insights')}
                className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-navy link-underline"
              >
                See all insights
                <Icon name="arrowRight" className="h-3 w-3" />
              </button>
            </div>
          ) : null}
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <SectionCard
          className="lg:col-span-8"
          index="04"
          title="Recent transactions"
          description="Latest activity in the selected month"
          action={
            <button
              type="button"
              onClick={() => onNavigate('transactions')}
              className="link-underline text-[11px] font-medium text-navy"
            >
              View all
            </button>
          }
          bodyClassName="p-0"
        >
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
            <ul className="divide-y divide-rule">
              {recent.map((transaction) => {
                const isIncome = transaction.type === 'income'
                return (
                  <li key={transaction.id} className="ledger-row flex items-center gap-3 px-5 py-3">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center border ${
                        isIncome ? 'border-ink/18 text-navy' : 'border-coral/45 text-coral'
                      }`}
                    >
                      <Icon name={isIncome ? 'arrowDown' : 'arrowUp'} className="h-2.5 w-2.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-medium text-ink">{transaction.description}</p>
                      <p className="truncate text-[10.5px] text-muted">
                        {transaction.category} · {formatDate(transaction.date, { short: true })}
                      </p>
                    </div>
                    <p
                      className={`num shrink-0 text-[12px] font-medium ${
                        isIncome ? 'text-navy' : 'text-ink'
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
        </SectionCard>

        <SectionCard
          className="lg:col-span-4"
          index="05"
          title="Budget pulse"
          description="This month's category limits"
          action={
            <button
              type="button"
              onClick={() => onNavigate('budgets')}
              className="link-underline text-[11px] font-medium text-navy"
            >
              Manage
            </button>
          }
        >
          {budgetSummary.list.length === 0 ? (
            <p className="text-[11.5px] leading-relaxed text-muted">
              No budgets yet. Set a monthly limit to track how quickly each category is burning.
            </p>
          ) : (
            <>
              <div className="mb-1 flex items-baseline justify-between">
                <p className="ledger-head">Overall utilisation</p>
                <p className="num text-[11px] font-medium text-ink">
                  {formatPercent(budgetSummary.overallUtilization, 0)}
                </p>
              </div>
              <ProgressBar
                value={budgetSummary.overallUtilization}
                tone={budgetSummary.overallUtilization > 100 ? 'coral' : 'navy'}
                height={5}
                label="Overall budget utilisation"
              />
              <p className="mt-1.5 text-[10px] text-muted">
                {formatCurrency(budgetSummary.totalSpent)} of {formatCurrency(budgetSummary.totalBudget)} used
              </p>

              <ul className="mt-3 space-y-2.5 border-t border-rule pt-3">
                {budgetRows.length === 0 ? (
                  <li className="text-[11px] text-muted">No spending against budgets yet this month.</li>
                ) : (
                  budgetRows.map((row) => (
                    <li key={row.category}>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="truncate text-[11.5px] text-ink">{row.category}</span>
                        <span
                          className={`num text-[10px] font-medium ${
                            row.status === 'over' ? 'text-coral' : 'text-muted'
                          }`}
                        >
                          {formatPercent(row.utilization, 0)}
                        </span>
                      </div>
                      <ProgressBar
                        value={row.utilization}
                        tone={row.status === 'over' ? 'coral' : 'navy'}
                        height={4}
                        label={`${row.category} budget usage`}
                      />
                    </li>
                  ))
                )}
              </ul>
            </>
          )}
        </SectionCard>
      </div>

      {spending && Object.keys(spending).length > 0 ? (
        <p className="border-t border-rule pt-3 px-1 text-[10.5px] leading-relaxed text-muted">
          Savings overview: {formatCurrency(summary.netSavings)} kept this month. Across all recorded months your
          running balance is {formatCurrency(balance)}.
        </p>
      ) : null}
    </div>
  )
}

export default OverviewPage
