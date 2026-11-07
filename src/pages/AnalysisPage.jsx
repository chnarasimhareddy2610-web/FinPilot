import React, { useMemo } from 'react'
import Icon from '../components/Icon.jsx'
import { Badge, Card, EmptyState, ProgressBar } from '../components/ui.jsx'
import { GroupedBars, LineTrend, categoryColor } from '../components/charts.jsx'
import { useFinance } from '../store/FinanceProvider.jsx'
import {
  getMonthlyTotals,
  getSpendingByCategory,
  getSummary,
  getTransactionsForMonth,
} from '../services/transactionService.js'
import { analyzeSpendingPatterns, detectAnomalies } from '../services/aiEngine.js'
import { getCategorySpendingTrend } from '../services/budgetService.js'
import {
  addMonths,
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatPercent,
  formatSignedPercent,
  monthLabel,
} from '../utils/format.js'

export const AnalysisPage = ({ month }) => {
  const { transactions } = useFinance()

  const summary = useMemo(() => getSummary(transactions, month), [transactions, month])
  const monthTransactions = useMemo(
    () => getTransactionsForMonth(transactions, month),
    [transactions, month]
  )
  const spending = useMemo(() => getSpendingByCategory(transactions, month), [transactions, month])
  const patterns = useMemo(() => analyzeSpendingPatterns(transactions, month), [transactions, month])
  const anomalies = useMemo(() => detectAnomalies(transactions, month), [transactions, month])
  const comparison = useMemo(() => getCategorySpendingTrend(transactions, month), [transactions, month])

  const series = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, index) => addMonths(month, index - 5))
    return getMonthlyTotals(transactions, months).map((row) => ({
      ...row,
      label: monthLabel(row.month),
      shortLabel: monthLabel(row.month, { short: true }).split(' ')[0],
    }))
  }, [transactions, month])

  const netSeries = useMemo(
    () =>
      series.map((row) => ({
        month: row.month,
        label: row.label,
        shortLabel: row.shortLabel,
        value: row.net,
      })),
    [series]
  )

  const categoryRows = useMemo(
    () =>
      Object.entries(spending)
        .sort(([, a], [, b]) => b - a)
        .map(([category, amount], index) => ({
          category,
          amount,
          color: categoryColor(index),
          share: summary.totalExpenses > 0 ? (amount / summary.totalExpenses) * 100 : 0,
        })),
    [spending, summary.totalExpenses]
  )

  const comparisonByCategory = useMemo(
    () =>
      comparison.reduce((map, row) => {
        map[row.category] = row
        return map
      }, {}),
    [comparison]
  )

  if (monthTransactions.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="analysis"
          title="Nothing to analyse for this month"
          description="Once transactions exist for the selected month, trends, category comparisons and anomaly detection appear here."
        />
      </Card>
    )
  }

  const figures = [
    {
      label: 'Income',
      value: formatCurrency(summary.totalIncome),
      hint: `${summary.transactionCount.income} credits`,
    },
    {
      label: 'Expenses',
      value: formatCurrency(summary.totalExpenses),
      hint: `${summary.transactionCount.expense} debits`,
    },
    {
      label: 'Net savings',
      value: formatCurrency(summary.netSavings),
      hint: summary.netSavings >= 0 ? 'Surplus' : 'Deficit',
    },
    {
      label: 'Savings rate',
      value: formatPercent(summary.savingsRate),
      hint: summary.savingsRate >= 20 ? 'Above the 20% guideline' : 'Below the 20% guideline',
    },
  ]

  return (
    <div className="space-y-9 sm:space-y-11">
      {/* A report header, not a card grid: one figure band across the page. */}
      <dl className="reveal grid grid-cols-2 border-y border-rule lg:grid-cols-4">
        {figures.map((figure, index) => (
          <div
            key={figure.label}
            className={`py-4 lg:px-6 ${index < 2 ? 'border-b border-rule lg:border-b-0' : ''} ${
              index % 2 === 1 ? 'border-l border-rule pl-5 lg:pl-6' : ''
            } ${index > 0 ? 'lg:border-l lg:border-rule' : ''} ${index === 0 ? 'lg:pl-0' : ''}`}
          >
            <dt className="ledger-head">{figure.label}</dt>
            <dd className="num mt-2 text-[22px] leading-none text-white">
              <span key={figure.value} className="metric-swap">
                {figure.value}
              </span>
            </dd>
            <p className="mt-1.5 text-[10.5px] text-muted">{figure.hint}</p>
          </div>
        ))}
      </dl>

      <div className="grid gap-10 lg:grid-cols-12">
        <section className="lg:col-span-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-[16px] font-medium tracking-[-0.025em] text-white">
                Income and expenses
              </h2>
              <p className="mt-1 text-[11.5px] text-muted">Six-month comparison</p>
            </div>
            <div className="flex items-center gap-4 text-[10.5px] text-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-cream" aria-hidden="true" /> Income
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-coral" aria-hidden="true" /> Expenses
              </span>
            </div>
          </div>
          <div className="mt-7">
            <GroupedBars data={series} formatValue={formatCompactCurrency} height={208} />
          </div>
        </section>

        <section className="lg:col-span-5 lg:border-l lg:border-rule lg:pl-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[16px] font-medium tracking-[-0.025em] text-white">
                Month over month
              </h2>
              <p className="mt-1 text-[11.5px] text-muted">{monthLabel(month)}</p>
            </div>
            <Badge tone={patterns.pattern === 'increasing' ? 'warning' : 'soft'}>
              {patterns.pattern === 'increasing'
                ? 'Rising'
                : patterns.pattern === 'decreasing'
                  ? 'Falling'
                  : 'Stable'}
            </Badge>
          </div>

          <p className="mt-4 text-[12.5px] leading-[1.7] text-cream/80">{patterns.message}</p>

          <dl className="mt-6 border-t border-rule">
            <div className="flex items-baseline justify-between gap-3 border-b border-rule/70 py-2.5">
              <dt className="text-[11.5px] text-muted">This month</dt>
              <dd className="num text-[13px] text-white">{formatCurrency(summary.totalExpenses)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-b border-rule/70 py-2.5">
              <dt className="text-[11.5px] text-muted">Last month</dt>
              <dd className="num text-[13px] text-cream/85">
                {formatCurrency(patterns.totalPrevious)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 py-2.5">
              <dt className="text-[11.5px] text-muted">Change</dt>
              <dd className="num text-[13px] font-medium">
                {patterns.hasHistory ? (
                  <span className={patterns.difference > 0 ? 'text-coral' : 'text-cream'}>
                    {patterns.difference >= 0 ? '+' : '−'}
                    {formatCurrency(Math.abs(patterns.difference))}
                    <span className="ml-1.5 text-[11px] text-muted">
                      ({formatSignedPercent(patterns.overallChangePercent)})
                    </span>
                  </span>
                ) : (
                  <span className="text-[11.5px] font-normal text-muted">No baseline</span>
                )}
              </dd>
            </div>
          </dl>

          {!patterns.hasHistory ? (
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              No spending recorded last month, so there is no baseline to compare against yet.
            </p>
          ) : null}
        </section>
      </div>

      <section className="border-t border-rule pt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-medium tracking-[-0.025em] text-white">
              Net savings trajectory
            </h2>
            <p className="mt-1 text-[11.5px] text-muted">
              Income minus expenses for each of the last six months
            </p>
          </div>
          <p className="num text-[11px] text-muted">
            Latest{' '}
            <span className="ml-1 text-[13px] font-medium text-white">
              {formatCurrency(summary.netSavings)}
            </span>
          </p>
        </div>
        <div className="mt-7">
          <LineTrend data={netSeries} height={196} formatValue={formatCompactCurrency} />
        </div>
      </section>

      <section className="border-t border-rule pt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-medium tracking-[-0.025em] text-white">
              Category breakdown
            </h2>
            <p className="mt-1 text-[11.5px] text-muted">
              This month against {monthLabel(patterns.previousMonth)}
            </p>
          </div>
          <p className="text-[11px] text-muted">
            <span className="num font-medium text-ink">{categoryRows.length}</span> categories
          </p>
        </div>

        <ul className="mt-4">
          {categoryRows.map((row) => {
            const trend = comparisonByCategory[row.category]
            const change = trend ? trend.changePercent : 0
            const isNew = trend && trend.previous === 0 && trend.current > 0
            const shifted = Math.abs(change) >= 0.5

            return (
              <li
                key={row.category}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1.5 border-b border-rule/70 py-3.5 last:border-b-0"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: row.color }}
                    aria-hidden="true"
                  />
                  <span className="truncate text-[13px] font-medium text-ink">{row.category}</span>
                  <span className="hidden shrink-0 text-[10.5px] text-muted sm:inline">
                    {isNew
                      ? 'New this month'
                      : shifted
                        ? `${formatSignedPercent(change, 0)} vs last month`
                        : null}
                  </span>
                </div>

                <div className="flex items-baseline justify-end gap-3">
                  {isNew ? <Badge tone="soft">New</Badge> : null}
                  <span className="num text-[13px] font-medium text-ink">
                    {formatCurrency(row.amount)}
                  </span>
                  <span className="num w-9 text-right text-[10.5px] text-muted">
                    {formatPercent(row.share, 0)}
                  </span>
                </div>

                <div className="col-span-2 mt-1 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <ProgressBar
                    value={row.share}
                    height={2}
                    tone="navy"
                    label={`${row.category} share of spending`}
                  />
                  <span className="num text-[10px] text-muted">
                    Last month {formatCurrency(trend ? trend.previous : 0)}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="border-t border-rule pt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-medium tracking-[-0.025em] text-white">
              Unusual activity
            </h2>
            <p className="mt-1 text-[11.5px] text-muted">
              Statistical outliers in this month&apos;s expenses
            </p>
          </div>
          <Badge tone={anomalies.anomalies.length > 0 ? 'warning' : 'positive'}>
            {anomalies.anomalies.length > 0
              ? `${anomalies.anomalies.length} flagged`
              : 'Nothing flagged'}
          </Badge>
        </div>

        <p className="mt-4 text-[12px] text-cream/80">{anomalies.message}</p>

        {anomalies.method !== 'none' ? (
          <p className="mt-1.5 max-w-2xl text-[10.5px] leading-relaxed text-muted">
            {anomalies.method === 'iqr'
              ? `Method: interquartile range. Typical spend sits between ${formatCurrency(
                  anomalies.lowerBound
                )} and ${formatCurrency(
                  anomalies.upperBound
                )}; anything outside is flagged.`
              : `Method: median multiple. All expenses were similar, so amounts above ${formatCurrency(
                  anomalies.upperBound
                )} (three times the median) are flagged.`}
          </p>
        ) : null}

        {anomalies.anomalies.length > 0 ? (
          <ul className="mt-4">
            {anomalies.anomalies.map((anomaly) => (
              <li
                key={anomaly.transaction.id}
                className="flex items-start gap-4 border-b border-rule/70 py-3.5 last:border-b-0"
              >
                <span className="mt-1 w-4 shrink-0 text-coral" aria-hidden="true">
                  <Icon name="alert" className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-[13px] font-medium text-ink">
                      {anomaly.transaction.description}
                    </p>
                    <p className="num text-[13px] font-medium text-coral">
                      {formatCurrency(anomaly.amount)}
                    </p>
                  </div>
                  <p className="mt-0.5 text-[10.5px] text-muted">
                    {anomaly.transaction.category} · {formatDate(anomaly.transaction.date)}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted">
                    {anomalies.method === 'median'
                      ? `${anomaly.score.toFixed(1)}× the median expense of ${formatCurrency(
                          anomaly.median
                        )}.`
                      : `${anomaly.score.toFixed(1)} IQRs above the upper fence of ${formatCurrency(
                          anomalies.upperBound
                        )}.`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  )
}

export default AnalysisPage
