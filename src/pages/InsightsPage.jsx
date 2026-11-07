import React, { useMemo, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { Badge, Card, EmptyState, InlineAlert, ProgressBar } from '../components/ui.jsx'
import { useFinance } from '../store/FinanceProvider.jsx'
import { useInsightReport } from '../hooks/useInsightReport.js'
import {
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatPercent,
  monthLabel,
} from '../utils/format.js'

const TONE_DOT = {
  warning: 'bg-coral',
  caution: 'bg-cream/45',
  positive: 'bg-cream/70',
  neutral: 'bg-cream/25',
}

const PRIORITY_LABEL = { high: 'High priority', medium: 'Medium priority', low: 'Low priority' }

const formatGeneratedAt = (iso) => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const healthMeta = {
  excellent: { label: 'Excellent', tone: 'positive' },
  good: { label: 'Healthy', tone: 'positive' },
  fair: { label: 'Fair', tone: 'soft' },
  overextended: { label: 'Overextended', tone: 'warning' },
  'no-data': { label: 'No data', tone: 'muted' },
}

export const InsightsPage = ({ month }) => {
  const { transactions, budgets, goals, updateTransaction } = useFinance()
  const [notice, setNotice] = useState('')

  // A single snapshot: every figure, finding and the timestamp below come from
  // the same recalculation, triggered by record changes rather than by renders.
  const report = useInsightReport({ transactions, budgets, goals, month })
  const { summary: financial, recommendations, anomalies, audit, spending, counts, generatedAt } =
    report

  const mismatches = useMemo(() => audit.filter((row) => !row.matches), [audit])

  const handleApplyCategory = (row) => {
    const result = updateTransaction(row.transaction.id, {
      ...row.transaction,
      category: row.suggestion.category,
    })
    if (result.ok) {
      setNotice(`“${row.transaction.description}” recategorised as ${row.suggestion.category}.`)
    } else {
      setNotice('That change could not be saved.')
    }
  }

  if (counts.total === 0) {
    return (
      <Card>
        <EmptyState
          icon="insights"
          title="No data to analyse yet"
          description="Insights are generated from your own transactions. Add records for this month to see recommendations, unusual activity and categorisation checks."
        />
      </Card>
    )
  }

  const health = healthMeta[financial.financialHealth] || healthMeta['no-data']

  const evidence = [
    { label: 'Net saved', value: formatCurrency(financial.netSavings) },
    { label: 'Top category', value: financial.topSpendingCategory },
    {
      label: 'Budget used',
      value:
        financial.totalBudget > 0 ? formatPercent(financial.budgetUtilization, 0) : 'No budgets',
    },
    { label: 'Goal savings', value: formatCurrency(financial.goals.saved) },
  ]

  return (
    <div className="space-y-9 sm:space-y-10">
      {notice ? (
        <InlineAlert tone="positive" onDismiss={() => setNotice('')}>
          {notice}
        </InlineAlert>
      ) : null}

      {/* The assessment is the page: a written lead, not another panel. */}
      <section className="reveal grid gap-9 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="flex flex-wrap items-center gap-3">
            <p className="eyebrow">Analysis · {monthLabel(month)}</p>
            <Badge tone={health.tone}>{health.label}</Badge>
          </div>

          <p className="mt-4 max-w-[44rem] text-[20px] leading-[1.42] tracking-[-0.015em] text-white sm:text-[25px] sm:leading-[1.38]">
            {financial.narrative}
          </p>

          <p className="mt-5 text-[11px] text-muted">
            {recommendations.length} finding{recommendations.length === 1 ? '' : 's'} from{' '}
            {counts.total} transactions · generated {formatGeneratedAt(generatedAt)}
          </p>

          <dl className="mt-6 flex flex-wrap gap-x-9 gap-y-3 border-t border-rule pt-4">
            {evidence.map((item) => (
              <div key={item.label} className="flex items-baseline gap-2">
                <dt className="text-[10.5px] text-muted">{item.label}</dt>
                <dd className="num text-[12px] text-cream">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="lg:col-span-4 lg:border-l lg:border-rule lg:pl-9">
          <p className="ledger-head">This month at a glance</p>
          <dl className="mt-2">
            {[
              { label: 'Transactions', value: counts.total },
              { label: 'Credits', value: counts.income },
              { label: 'Debits', value: counts.expense },
              { label: 'Findings', value: recommendations.length },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-baseline justify-between gap-3 border-b border-rule/70 py-2.5 last:border-b-0"
              >
                <dt className="text-[11.5px] text-muted">{item.label}</dt>
                <dd className="num text-[13px] text-white">{item.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[10.5px] leading-relaxed text-muted">
            Recalculates whenever your records or the selected month change.
          </p>
        </div>
      </section>

      <section className="border-t border-rule pt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-medium tracking-[-0.025em] text-white">
              Recommended actions
            </h2>
            <p className="mt-1 text-[11.5px] text-muted">
              Ordered by likely impact; each one cites the numbers behind it
            </p>
          </div>
          <p className="num text-[11px] text-muted">{recommendations.length} total</p>
        </div>

        {recommendations.length === 0 ? (
          <p className="mt-4 max-w-2xl text-[12.5px] leading-relaxed text-muted">
            No findings for this month. That usually means spending is within every budget and the
            savings rate is on target.
          </p>
        ) : (
          <ol className="mt-3">
            {recommendations.map((recommendation, index) => (
              <li
                key={recommendation.id}
                className="grid gap-x-6 gap-y-1 border-b border-rule/70 py-4 sm:grid-cols-[2.5rem_minmax(0,1fr)]"
              >
                <p className="num pt-1 text-[11px] text-muted">
                  {String(index + 1).padStart(2, '0')}
                </p>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                        TONE_DOT[recommendation.tone] || TONE_DOT.neutral
                      }`}
                      aria-hidden="true"
                    />
                    <h3 className="text-[14px] font-medium leading-snug text-white">
                      {recommendation.title}
                    </h3>
                    {recommendation.priority === 'high' ? (
                      <span className="text-[10px] text-coral">{PRIORITY_LABEL.high}</span>
                    ) : null}
                  </div>

                  <p className="mt-1.5 max-w-[46rem] text-[12.5px] leading-[1.6] text-cream/75">
                    {recommendation.description}
                  </p>

                  <p className="mt-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[10.5px] text-muted">
                    {recommendation.metric ? (
                      <span>
                        {recommendation.metric.label}{' '}
                        <span className="num text-cream/80">{recommendation.metric.value}</span>
                      </span>
                    ) : null}
                    <span className="max-w-[44rem] leading-relaxed">
                      {recommendation.evidence}
                    </span>
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="grid gap-9 lg:grid-cols-12 lg:gap-10">
        <section className="lg:col-span-4">
          <div>
            <h2 className="text-[16px] font-medium tracking-[-0.025em] text-white">
              Spending pattern
            </h2>
            <p className="mt-1 text-[11.5px] text-muted">Concentration by category</p>
          </div>
          <ul className="mt-5 space-y-3.5">
            {Object.entries(spending)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 6)
              .map(([category, amount]) => {
                const share =
                  financial.totalExpenses > 0 ? (amount / financial.totalExpenses) * 100 : 0
                return (
                  <li key={category}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-2">
                      <span className="truncate text-[12px] text-cream/85">{category}</span>
                      <span className="num shrink-0 text-[10.5px] text-muted">
                        {formatCompactCurrency(amount)} · {share.toFixed(0)}%
                      </span>
                    </div>
                    <ProgressBar
                      value={share}
                      height={3}
                      tone="navy"
                      label={`${category} share`}
                    />
                  </li>
                )
              })}
          </ul>
          <p className="mt-5 border-t border-rule pt-3.5 text-[11px] leading-relaxed text-muted">
            {financial.topSpendingShare >= 35
              ? `${financial.topSpendingCategory} takes ${financial.topSpendingShare.toFixed(
                  0
                )}% of spending, so it is the highest-leverage place to cut costs.`
              : 'Spending is spread across categories without a single dominant one, which is generally healthier for budget stability.'}
          </p>
        </section>

        <section className="lg:col-span-8 lg:border-l lg:border-rule lg:pl-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-[16px] font-medium tracking-[-0.025em] text-white">
                Categorisation check
              </h2>
              <p className="mt-1 text-[11.5px] text-muted">
                Keyword rules applied to this month&apos;s descriptions
              </p>
            </div>
            <Badge tone={mismatches.length === 0 ? 'positive' : 'soft'}>
              {mismatches.length === 0
                ? 'All consistent'
                : `${mismatches.length} suggestion${mismatches.length === 1 ? '' : 's'}`}
            </Badge>
          </div>

          <ul className="mt-4">
            {audit.slice(0, 8).map((row) => (
              <li key={row.transaction.id} className="border-b border-rule/70 py-3 last:border-b-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium text-cream/90">
                      {row.transaction.description}
                    </p>
                    <p className="mt-0.5 text-[10.5px] text-muted">
                      Saved as {row.transaction.category} ·{' '}
                      <span className="num">{formatCurrency(row.transaction.amount)}</span>
                    </p>
                  </div>

                  {row.matches ? (
                    <span className="inline-flex items-center gap-1.5 text-[10.5px] text-muted">
                      <Icon name="check" className="h-2.5 w-2.5 text-cream/60" />
                      {row.suggestion.category}
                    </span>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Badge tone="soft">Suggested: {row.suggestion.category}</Badge>
                      <button
                        type="button"
                        onClick={() => handleApplyCategory(row)}
                        className="link-underline text-[11px] font-medium text-cream"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>
                {!row.matches ? (
                  <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
                    {row.suggestion.explanation}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
          {audit.length > 8 ? (
            <p className="mt-2 text-[10.5px] text-muted">
              Showing 8 of {audit.length} transactions this month.
            </p>
          ) : null}
        </section>
      </div>

      <section className="border-t border-rule pt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-medium tracking-[-0.025em] text-white">
              Anomaly detection
            </h2>
            <p className="mt-1 text-[11.5px] text-muted">
              IQR method over this month&apos;s expense amounts
            </p>
          </div>
          <Badge tone={anomalies.anomalies.length > 0 ? 'warning' : 'positive'}>
            {anomalies.anomalies.length > 0 ? `${anomalies.anomalies.length} flagged` : 'Clear'}
          </Badge>
        </div>

        <p className="mt-4 text-[12px] text-cream/80">{anomalies.message}</p>

        {anomalies.method !== 'none' ? (
          <p className="num mt-1.5 max-w-2xl text-[10.5px] leading-relaxed text-muted">
            {anomalies.method === 'iqr'
              ? `Q1 ${formatCurrency(anomalies.q1)} · Q3 ${formatCurrency(
                  anomalies.q3
                )} · IQR ${formatCurrency(anomalies.iqr)} · fences ${formatCurrency(
                  anomalies.lowerBound
                )} / ${formatCurrency(anomalies.upperBound)}.`
              : `All amounts were similar, so the fallback threshold is three times the median of ${formatCurrency(
                  anomalies.median
                )}.`}
          </p>
        ) : null}

        {anomalies.anomalies.length > 0 ? (
          <ul className="mt-4">
            {anomalies.anomalies.map((anomaly) => (
              <li
                key={anomaly.transaction.id}
                className="flex items-center justify-between gap-3 border-b border-rule/70 py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-medium text-cream/90">
                    {anomaly.transaction.description}
                  </p>
                  <p className="mt-0.5 text-[10.5px] text-muted">
                    {anomaly.transaction.category} · {formatDate(anomaly.transaction.date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="num text-[12.5px] font-medium text-coral">
                    {formatCurrency(anomaly.amount)}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted">
                    {anomalies.method === 'median'
                      ? `${anomaly.score.toFixed(1)}× median`
                      : `${anomaly.score.toFixed(1)} IQR above`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <p className="border-t border-rule pt-4 text-[10.5px] leading-relaxed text-muted">
        Every finding is produced locally from your stored records using keyword rules,
        month-over-month comparison and interquartile range analysis. Each entry cites the numbers
        and rule behind it.
      </p>
    </div>
  )
}

export default InsightsPage
