import React, { useMemo } from 'react'
import Icon from '../components/Icon.jsx'
import { Badge, Card, EmptyState, ProgressBar, SectionCard } from '../components/ui.jsx'
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
    { label: 'Income', value: formatCurrency(summary.totalIncome), hint: `${summary.transactionCount.income} credits` },
    { label: 'Expenses', value: formatCurrency(summary.totalExpenses), hint: `${summary.transactionCount.expense} debits` },
    { label: 'Net savings', value: formatCurrency(summary.netSavings), hint: summary.netSavings >= 0 ? 'Surplus' : 'Deficit' },
    { label: 'Savings rate', value: formatPercent(summary.savingsRate), hint: summary.savingsRate >= 20 ? 'Above 20% guideline' : 'Below 20% guideline' },
  ]

  return (
    <div className="space-y-5">
      {/* Figures strip — hairline grid, not cards, so the page reads as a report. */}
      <div className="reveal grid grid-cols-2 border-y border-rule-strong lg:grid-cols-4">
        {figures.map((figure, index) => (
          <div
            key={figure.label}
            className={`px-1 py-4 lg:px-5 ${index % 2 === 1 ? 'border-l border-rule-strong pl-4' : ''} ${
              index > 1 ? 'border-t border-rule-strong lg:border-t-0' : ''
            } ${index > 0 ? 'lg:border-l lg:border-rule-strong' : ''}`}
          >
            <p className="ledger-head">
              <span className="mr-1.5 text-coral">{String(index + 1).padStart(2, '0')}</span>
              {figure.label}
            </p>
            <p className="num mt-2 text-[20px] leading-none text-ink">
              <span key={figure.value} className="metric-swap">
                {figure.value}
              </span>
            </p>
            <p className="mt-1.5 text-[10px] text-muted">{figure.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <SectionCard
          className="lg:col-span-7"
          index="01"
          title="Income and expenses"
          description="Six-month comparison"
          action={
            <div className="flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 bg-navy" /> Income
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 bg-coral" /> Expenses
              </span>
            </div>
          }
        >
          <GroupedBars data={series} formatValue={formatCompactCurrency} height={172} />
        </SectionCard>

        <section className="reveal flex flex-col justify-between border border-navy bg-navy px-5 py-5 text-cream lg:col-span-5">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-cream/45">02 — Month over month</p>
                <p className="display mt-2 text-[18px] text-white">{monthLabel(month)}</p>
              </div>
              <Badge tone="inverse">
                {patterns.pattern === 'increasing' ? 'Rising' : patterns.pattern === 'decreasing' ? 'Falling' : 'Stable'}
              </Badge>
            </div>

            <p className="mt-3 text-[12px] leading-relaxed text-cream/80">{patterns.message}</p>
          </div>

          <div>
            <div className="mt-4 grid grid-cols-2 divide-x divide-cream/18 border-t border-cream/18 pt-3">
              <div className="pr-4">
                <p className="text-[9.5px] uppercase tracking-[0.12em] text-cream/40">This month</p>
                <p className="num mt-1 text-[15px] text-white">{formatCurrency(summary.totalExpenses)}</p>
              </div>
              <div className="pl-4">
                <p className="text-[9.5px] uppercase tracking-[0.12em] text-cream/40">Last month</p>
                <p className="num mt-1 text-[15px] text-white">{formatCurrency(patterns.totalPrevious)}</p>
              </div>
            </div>

            <p className="mt-2.5 text-[11px] leading-relaxed text-cream/55">
              {patterns.hasHistory ? (
                <>
                  Change of{' '}
                  <span className={`num font-medium ${patterns.difference > 0 ? 'text-coral' : 'text-cream'}`}>
                    {patterns.difference >= 0 ? '+' : '−'}
                    {formatCurrency(Math.abs(patterns.difference))} ({formatSignedPercent(patterns.overallChangePercent)})
                  </span>{' '}
                  versus last month.
                </>
              ) : (
                <>No spending recorded last month, so there is no baseline to compare against yet.</>
              )}
            </p>
          </div>
        </section>
      </div>

      <SectionCard
        index="03"
        title="Net savings trajectory"
        description="Income minus expenses for each of the last six months"
        action={
          <p className="num text-[11px] text-muted">
            Latest <span className="ml-1 font-medium text-ink">{formatCurrency(summary.netSavings)}</span>
          </p>
        }
      >
        <LineTrend data={netSeries} height={168} formatValue={formatCompactCurrency} />
      </SectionCard>

      <SectionCard
        index="04"
        title="Category breakdown"
        description={`This month against ${monthLabel(patterns.previousMonth)}`}
        bodyClassName="p-0"
      >
        <div className="divide-y divide-rule">
          {categoryRows.map((row) => {
            const trend = comparisonByCategory[row.category]
            const change = trend ? trend.changePercent : 0
            const isNew = trend && trend.previous === 0 && trend.current > 0

            return (
              <div key={row.category} className="ledger-row px-5 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5" style={{ backgroundColor: row.color }} />
                    <span className="text-[12.5px] font-medium text-ink">{row.category}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {isNew ? (
                      <Badge tone="soft">New</Badge>
                    ) : change === 0 ? (
                      <span className="text-[10px] text-muted">No change</span>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-0.5 font-mono text-[10px] font-medium ${
                          change > 0 ? 'text-coral' : 'text-navy'
                        }`}
                      >
                        <Icon name={change > 0 ? 'arrowUp' : 'arrowDown'} className="h-2.5 w-2.5" />
                        {formatSignedPercent(change, 0)}
                      </span>
                    )}
                    <span className="num text-[12px] font-medium text-ink">{formatCurrency(row.amount)}</span>
                    <span className="num w-9 text-right text-[10px] text-muted">{formatPercent(row.share, 0)}</span>
                  </div>
                </div>
                <div className="mt-2">
                  <ProgressBar value={row.share} height={4} tone="navy" label={`${row.category} share of spending`} />
                </div>
                <p className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.06em] text-muted">
                  Last month {formatCurrency(trend ? trend.previous : 0)}
                </p>
              </div>
            )
          })}
        </div>
      </SectionCard>

      <SectionCard
        index="05"
        title="Unusual activity"
        description="Statistical outliers in this month's expenses"
        action={
          <Badge tone={anomalies.anomalies.length > 0 ? 'warning' : 'positive'}>
            {anomalies.anomalies.length > 0 ? `${anomalies.anomalies.length} flagged` : 'Nothing flagged'}
          </Badge>
        }
      >
        <p className="text-[12px] text-muted">{anomalies.message}</p>

        {anomalies.method !== 'none' ? (
          <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted">
            {anomalies.method === 'iqr'
              ? `Method: interquartile range. Typical spend sits between ${formatCurrency(anomalies.lowerBound)} and ${formatCurrency(anomalies.upperBound)}; anything outside is flagged.`
              : `Method: median multiple. All expenses were similar, so amounts above ${formatCurrency(
                  anomalies.upperBound
                )} (three times the median) are flagged.`}
          </p>
        ) : null}

        {anomalies.anomalies.length > 0 ? (
          <ul className="mt-3 divide-y divide-rule border-t border-rule">
            {anomalies.anomalies.map((anomaly) => (
              <li key={anomaly.transaction.id} className="flex items-start gap-3 py-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border border-coral/45 text-coral">
                  <Icon name="alert" className="h-2.5 w-2.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-[12.5px] font-medium text-ink">{anomaly.transaction.description}</p>
                    <p className="num text-[12.5px] font-medium text-coral">{formatCurrency(anomaly.amount)}</p>
                  </div>
                  <p className="mt-0.5 font-mono text-[9.5px] uppercase tracking-[0.06em] text-muted">
                    {anomaly.transaction.category} · {formatDate(anomaly.transaction.date)}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                    {anomalies.method === 'median'
                      ? `${anomaly.score.toFixed(1)}× the median expense of ${formatCurrency(anomaly.median)}.`
                      : `${anomaly.score.toFixed(1)} IQRs above the upper fence of ${formatCurrency(
                          anomalies.upperBound
                        )}.`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </SectionCard>
    </div>
  )
}

export default AnalysisPage
