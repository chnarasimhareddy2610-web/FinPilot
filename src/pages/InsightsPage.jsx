import React, { useMemo, useState } from 'react'
import Icon from '../components/Icon.jsx'
import {
  Badge,
  Card,
  EmptyState,
  InlineAlert,
  ProgressBar,
  SectionCard,
} from '../components/ui.jsx'
import { useFinance } from '../store/FinanceProvider.jsx'
import { useInsightReport } from '../hooks/useInsightReport.js'
import {
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatPercent,
  monthLabel,
} from '../utils/format.js'

const TONE_STYLES = {
  warning: {
    rule: 'border-l-coral',
    icon: 'text-coral',
    iconName: 'alert',
    label: 'Needs attention',
  },
  caution: {
    rule: 'border-l-navy-soft',
    icon: 'text-navy-soft',
    iconName: 'info',
    label: 'Watch',
  },
  positive: {
    rule: 'border-l-navy',
    icon: 'text-navy',
    iconName: 'check',
    label: 'Working well',
  },
  neutral: {
    rule: 'border-l-ink/20',
    icon: 'text-muted',
    iconName: 'spark',
    label: 'Observation',
  },
}

const PRIORITY_LABEL = { high: 'High priority', medium: 'Medium', low: 'Low' }

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
  const { summary: financial, recommendations, anomalies, audit, spending, counts, generatedAt } = report

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

  return (
    <div className="space-y-6">
      {notice ? (
        <InlineAlert tone="positive" onDismiss={() => setNotice('')}>
          {notice}
        </InlineAlert>
      ) : null}

      {/* Lead: the written assessment, set like a report abstract. */}
      <section className="reveal border border-navy bg-navy px-6 py-6 text-cream">
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-cream/45">
                Analysis — {monthLabel(month)}
              </p>
              <Badge tone="inverse">
                {health.label}
              </Badge>
            </div>
            <p className="display mt-3 max-w-2xl text-[21px] leading-[1.25] text-white sm:text-[24px]">
              {financial.narrative}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-cream/15 pt-4 sm:grid-cols-4">
              {[
                { label: 'Net saved', value: formatCurrency(financial.netSavings) },
                { label: 'Top category', value: financial.topSpendingCategory, mono: false },
                {
                  label: 'Budget utilisation',
                  value: financial.totalBudget > 0 ? formatPercent(financial.budgetUtilization, 0) : 'No budgets',
                },
                { label: 'Goal savings', value: formatCurrency(financial.goals.saved) },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-[10px] uppercase tracking-[0.1em] text-cream/40">{item.label}</p>
                  <p className={`mt-1 text-[12.5px] text-white ${item.mono === false ? 'font-medium' : 'num'}`}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-between border-t border-cream/15 pt-4 lg:col-span-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <div>
              <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-cream/40">This month</p>
              <div className="mt-3 space-y-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[11.5px] text-cream/60">Transactions</span>
                  <span className="num text-[12.5px] text-white">{counts.total}</span>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[11.5px] text-cream/60">Credits</span>
                  <span className="num text-[12.5px] text-white">{counts.income}</span>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[11.5px] text-cream/60">Debits</span>
                  <span className="num text-[12.5px] text-white">{counts.expense}</span>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-t border-cream/15 pt-2.5">
                  <span className="text-[11.5px] text-cream/60">Findings</span>
                  <span className="num text-[12.5px] text-white">{recommendations.length}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-cream/15 pt-3">
              <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-cream/45">
                <span className="h-1.5 w-1.5 bg-coral" aria-hidden="true" />
                Generated {formatGeneratedAt(generatedAt)}
              </p>
              <p className="mt-1.5 text-[10.5px] leading-relaxed text-cream/35">
                {counts.total} transactions analysed. Recalculates whenever your records or the selected month change.
              </p>
            </div>
          </div>
        </div>
      </section>

      <InlineAlert tone="info">
        Every finding is produced locally from your stored records using keyword rules, month-over-month comparison and
        interquartile range analysis. Each entry cites the numbers and rule behind it.
      </InlineAlert>

      <div className="grid gap-4 lg:grid-cols-12">
        <SectionCard
          className="lg:col-span-8"
          index="01"
          title="Recommendations"
          description="Ordered by likely impact; each one cites its trigger"
          bodyClassName="p-0"
        >
          {recommendations.length === 0 ? (
            <p className="px-5 py-6 text-[12.5px] text-muted">
              No findings for this month. That usually means spending is within every budget and the savings rate is on
              target.
            </p>
          ) : (
            <ul className="divide-y divide-ink/10">
              {recommendations.map((recommendation, index) => {
                const tone = TONE_STYLES[recommendation.tone] || TONE_STYLES.neutral
                return (
                  <li
                    key={recommendation.id}
                    className={`ledger-row grid grid-cols-1 gap-3 border-l-2 px-5 py-4 sm:grid-cols-12 ${tone.rule}`}
                  >
                    <div className="sm:col-span-3">
                      <p className="section-index">{String(index + 1).padStart(2, '0')}</p>
                      <p className={`mt-1.5 flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em] ${tone.icon}`}>
                        <Icon name={tone.iconName} className="h-3 w-3" />
                        {tone.label}
                      </p>
                      <p className="mt-2 text-[10px] uppercase tracking-[0.08em] text-muted">
                        {PRIORITY_LABEL[recommendation.priority]}
                      </p>
                    </div>

                    <div className="min-w-0 sm:col-span-9">
                      <h3 className="text-[13.5px] font-medium leading-snug text-ink">{recommendation.title}</h3>
                      <p className="mt-1 text-[12px] leading-relaxed text-muted">{recommendation.description}</p>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-ink/10 pt-2 font-mono text-[10px] text-muted">
                        {recommendation.metric ? (
                          <span>
                            {recommendation.metric.label}:{' '}
                            <span className="font-medium text-ink">{recommendation.metric.value}</span>
                          </span>
                        ) : null}
                        <span className="normal-case tracking-normal">{recommendation.evidence}</span>
                      </div>

                      <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted/80">{recommendation.why}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          className="lg:col-span-4"
          index="02"
          title="Spending pattern"
          description="Concentration by category"
        >
          <ul className="space-y-3">
            {Object.entries(spending)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 6)
              .map(([category, amount]) => {
                const share = financial.totalExpenses > 0 ? (amount / financial.totalExpenses) * 100 : 0
                return (
                  <li key={category}>
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      <span className="truncate text-[12px] text-ink">{category}</span>
                      <span className="num shrink-0 text-[10.5px] text-muted">
                        {formatCompactCurrency(amount)} · {share.toFixed(0)}%
                      </span>
                    </div>
                    <ProgressBar value={share} height={4} tone="navy" label={`${category} share`} />
                  </li>
                )
              })}
          </ul>
          <p className="mt-4 border-t border-ink/10 pt-3 text-[11.5px] leading-relaxed text-muted">
            {financial.topSpendingShare >= 35
              ? `${financial.topSpendingCategory} takes ${financial.topSpendingShare.toFixed(
                  0
                )}% of spending, so it is the highest-leverage place to cut costs.`
              : 'Spending is spread across categories without a single dominant one, which is generally healthier for budget stability.'}
          </p>
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <SectionCard
          className="lg:col-span-7"
          index="03"
          title="Categorisation check"
          description="Keyword rules applied to this month's descriptions"
          action={
            <Badge tone={mismatches.length === 0 ? 'positive' : 'soft'}>
              {mismatches.length === 0 ? 'All consistent' : `${mismatches.length} suggestion${mismatches.length === 1 ? '' : 's'}`}
            </Badge>
          }
          bodyClassName="pt-1 pb-4"
        >
          <ul className="divide-y divide-ink/10">
            {audit.slice(0, 8).map((row) => (
              <li key={row.transaction.id} className="py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium text-ink">{row.transaction.description}</p>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.06em] text-muted">
                      Saved as {row.transaction.category} · {formatCurrency(row.transaction.amount)}
                    </p>
                  </div>

                  {row.matches ? (
                    <Badge tone="positive">
                      <Icon name="check" className="h-2.5 w-2.5" />
                      {row.suggestion.category}
                    </Badge>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge tone="soft">Suggested: {row.suggestion.category}</Badge>
                      <button
                        type="button"
                        onClick={() => handleApplyCategory(row)}
                        className="link-underline text-[11px] font-medium text-navy"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>
                {!row.matches ? (
                  <p className="mt-1 text-[10.5px] leading-relaxed text-muted">{row.suggestion.explanation}</p>
                ) : null}
              </li>
            ))}
          </ul>
          {audit.length > 8 ? (
            <p className="mt-2 text-[10.5px] text-muted">Showing 8 of {audit.length} transactions this month.</p>
          ) : null}
        </SectionCard>

        <SectionCard
          className="lg:col-span-5"
          index="04"
          title="Anomaly detection"
          description="IQR method over this month's expense amounts"
          action={
            <Badge tone={anomalies.anomalies.length > 0 ? 'warning' : 'positive'}>
              {anomalies.anomalies.length > 0 ? `${anomalies.anomalies.length} flagged` : 'Clear'}
            </Badge>
          }
        >
          <p className="text-[12px] text-muted">{anomalies.message}</p>

          {anomalies.method !== 'none' ? (
            <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-muted">
              {anomalies.method === 'iqr'
                ? `Q1 ${formatCurrency(anomalies.q1)} · Q3 ${formatCurrency(anomalies.q3)} · IQR ${formatCurrency(
                    anomalies.iqr
                  )} · fences ${formatCurrency(anomalies.lowerBound)} / ${formatCurrency(anomalies.upperBound)}.`
                : `All amounts were similar, so the fallback threshold is three times the median of ${formatCurrency(
                    anomalies.median
                  )}.`}
            </p>
          ) : null}

          {anomalies.anomalies.length > 0 ? (
            <ul className="mt-3 divide-y divide-ink/10 border-t border-ink/10">
              {anomalies.anomalies.map((anomaly) => (
                <li key={anomaly.transaction.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-ink">{anomaly.transaction.description}</p>
                    <p className="font-mono text-[9.5px] uppercase tracking-[0.06em] text-muted">
                      {anomaly.transaction.category} · {formatDate(anomaly.transaction.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="num text-[12px] font-medium text-coral">{formatCurrency(anomaly.amount)}</p>
                    <p className="font-mono text-[9px] uppercase tracking-[0.06em] text-muted">
                      {anomalies.method === 'median'
                        ? `${anomaly.score.toFixed(1)}× median`
                        : `${anomaly.score.toFixed(1)} IQR above`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </SectionCard>
      </div>
    </div>
  )
}

export default InsightsPage
