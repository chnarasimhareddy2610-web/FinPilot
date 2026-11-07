import React, { useMemo, useState } from 'react'
import Icon from '../components/Icon.jsx'
import {
  Badge,
  EmptyState,
  FieldError,
  InlineAlert,
  Modal,
  ProgressBar,
} from '../components/ui.jsx'
import { useFinance } from '../store/FinanceProvider.jsx'
import {
  BUDGET_STATUS,
  getBudgetSummary,
  getUnbudgetedCategories,
  suggestBudgetLimit,
} from '../services/budgetService.js'
import { CATEGORIES } from '../services/transactionService.js'
import { addMonths, formatCurrency, formatPercent, monthLabel } from '../utils/format.js'

const statusBadge = (status) => {
  switch (status) {
    case BUDGET_STATUS.OVER:
      return { tone: 'warning', label: 'Over budget' }
    case BUDGET_STATUS.AT_RISK:
      return { tone: 'soft', label: 'Close to limit' }
    case BUDGET_STATUS.ON_TRACK:
      return { tone: 'positive', label: 'On track' }
    default:
      return { tone: 'muted', label: 'Untouched' }
  }
}

export const BudgetsPage = ({ month }) => {
  const { transactions, budgets, setBudget, deleteBudget } = useFinance()

  const [editorOpen, setEditorOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [form, setForm] = useState({ category: '', amount: '' })
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const summary = useMemo(
    () => getBudgetSummary(budgets, transactions, month),
    [budgets, transactions, month]
  )

  const unbudgeted = useMemo(
    () => getUnbudgetedCategories(budgets, transactions, month),
    [budgets, transactions, month]
  )

  const recentMonths = useMemo(
    () => Array.from({ length: 3 }, (_, index) => addMonths(month, -index)),
    [month]
  )

  const rows = useMemo(
    () =>
      [...summary.list].sort((a, b) => {
        const order = { over: 0, at_risk: 1, on_track: 2, unused: 3 }
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status]
        return b.actual - a.actual
      }),
    [summary.list]
  )

  const suggestedAmount = useMemo(() => {
    if (!form.category) return 0
    return suggestBudgetLimit(form.category, transactions, recentMonths)
  }, [form.category, transactions, recentMonths])

  const openCreate = (category = '') => {
    setEditingCategory(null)
    setForm({ category, amount: category ? String(suggestedAmountFor(category)) : '' })
    setErrors({})
    setEditorOpen(true)
  }

  const suggestedAmountFor = (category) =>
    suggestBudgetLimit(category, transactions, recentMonths)

  const openEdit = (row) => {
    setEditingCategory(row.category)
    setForm({ category: row.category, amount: String(row.limit) })
    setErrors({})
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setEditingCategory(null)
    setErrors({})
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const result = setBudget(form.category || editingCategory, form.amount)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setNotice(
      editingCategory
        ? `${editingCategory} limit updated to ${formatCurrency(Number(form.amount))}.`
        : `${form.category} limit set to ${formatCurrency(Number(form.amount))}.`
    )
    closeEditor()
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    deleteBudget(deleteTarget.category)
    setNotice(`${deleteTarget.category} budget removed.`)
    setDeleteTarget(null)
  }

  const availableCategories = CATEGORIES.filter(
    (category) => editingCategory || !Object.prototype.hasOwnProperty.call(budgets, category)
  )

  const summaryFigures = [
    {
      label: 'Monthly limits',
      value: formatCurrency(summary.totalBudget),
      hint: `${Object.keys(budgets).length} categories funded`,
    },
    {
      label: 'Spent against limits',
      value: formatCurrency(summary.totalSpent),
      hint: `${formatCurrency(summary.unbudgetedSpending)} outside budgets`,
    },
    {
      label: 'Remaining',
      value: formatCurrency(summary.totalRemaining),
      hint: summary.totalRemaining < 0 ? 'Limits exceeded' : 'Left for the month',
      warn: summary.totalRemaining < 0,
    },
    {
      label: 'Utilisation',
      value: formatPercent(summary.overallUtilization, 0),
      hint: `${summary.overspendingCategories.length} over · ${summary.atRiskCategories.length} close`,
    },
  ]

  const overspendTotal = summary.overspendingCategories.reduce(
    (total, row) => total + row.overspend,
    0
  )

  return (
    <div className="space-y-8">
      {notice ? (
        <InlineAlert tone="positive" onDismiss={() => setNotice('')}>
          {notice}
        </InlineAlert>
      ) : null}

      {/* Position band: same report grammar as Overview and Analysis. */}
      <dl className="reveal grid grid-cols-2 border-y border-rule lg:grid-cols-4">
        {summaryFigures.map((figure, index) => (
          <div
            key={figure.label}
            className={`py-4 lg:px-6 ${index < 2 ? 'border-b border-rule lg:border-b-0' : ''} ${
              index % 2 === 1 ? 'border-l border-rule pl-5 lg:pl-6' : ''
            } ${index > 0 ? 'lg:border-l lg:border-rule' : ''} ${index === 0 ? 'lg:pl-0' : ''}`}
          >
            <dt className="ledger-head">{figure.label}</dt>
            <dd
              className={`num mt-2 text-[22px] leading-none ${
                figure.warn ? 'text-coral' : 'text-white'
              }`}
            >
              <span key={figure.value} className="metric-swap">
                {figure.value}
              </span>
            </dd>
            <p className="mt-1.5 text-[10.5px] leading-tight text-muted">{figure.hint}</p>
          </div>
        ))}
      </dl>

      <div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-medium tracking-[-0.025em] text-white">
              Category limits
            </h2>
            <p className="mt-1 text-[11.5px] text-muted">
              Limits apply to every month. Spending shown is for {monthLabel(month)}.
            </p>
          </div>
          <button type="button" onClick={() => openCreate()} className="btn btn-primary">
            <Icon name="plus" className="h-3.5 w-3.5" />
            Set budget
          </button>
        </div>

        {summary.overspendingCategories.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-l border-coral/60 pl-3.5">
            <p className="text-[11.5px]">
              <span className="font-medium text-coral">
                {summary.overspendingCategories.length} categor
                {summary.overspendingCategories.length === 1 ? 'y' : 'ies'} over limit
              </span>{' '}
              <span className="num text-cream/80">by {formatCurrency(overspendTotal)}</span>
            </p>
            <p className="text-[11px] text-muted">
              {summary.overspendingCategories.map((row) => row.category).join(' · ')}
            </p>
          </div>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className="border-y border-rule">
          <EmptyState
            icon="budgets"
            title="No budgets yet"
            description="Create a monthly limit for the categories that matter most — food, housing and transport are a good start."
            action={
              <button type="button" onClick={() => openCreate()} className="btn btn-primary">
                <Icon name="plus" className="h-3.5 w-3.5" />
                Set your first budget
              </button>
            }
          />
        </div>
      ) : (
        <section>
          <div className="hidden grid-cols-12 gap-4 border-b border-rule py-2.5 lg:grid">
            <p className="ledger-head col-span-4 font-medium">Category</p>
            <p className="ledger-head col-span-5 font-medium">Utilisation</p>
            <p className="ledger-head col-span-2 text-right font-medium">Remaining</p>
            <span className="col-span-1" />
          </div>

          <ul>
            {rows.map((row) => {
              const badge = statusBadge(row.status)
              const over = row.remaining < 0
              return (
                <li
                  key={row.category}
                  className="ledger-row group border-b border-rule/70 py-4"
                >
                  <div className="grid grid-cols-1 gap-x-4 gap-y-3 lg:grid-cols-12 lg:items-center">
                    <div className="min-w-0 lg:col-span-4">
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <p className="text-[13px] font-medium text-ink">{row.category}</p>
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                      </div>
                      <p className="num mt-1 text-[10.5px] text-muted">
                        {formatCurrency(row.actual)} of {formatCurrency(row.limit)}
                      </p>
                    </div>

                    <div className="lg:col-span-5">
                      <ProgressBar
                        value={row.utilization}
                        tone={
                          row.status === BUDGET_STATUS.OVER
                            ? 'coral'
                            : row.status === BUDGET_STATUS.AT_RISK
                              ? 'soft'
                              : 'navy'
                        }
                        height={4}
                        label={`${row.category} budget utilisation`}
                      />
                      <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted">
                        <span className="num">{formatPercent(row.utilization, 0)} used</span>
                        <span className="num">
                          {over ? 'Limit exceeded' : `${formatPercent(100 - row.utilization, 0)} available`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 lg:col-span-2 lg:justify-end">
                      <div className="text-left lg:text-right">
                        <p
                          className={`num text-[14px] font-medium ${
                            over ? 'text-coral' : 'text-cream'
                          }`}
                        >
                          {over ? '−' : ''}
                          {formatCurrency(Math.abs(row.remaining))}
                        </p>
                        <p className="text-[10px] text-muted">{over ? 'over limit' : 'remaining'}</p>
                      </div>

                      <div className="flex items-center gap-0.5 opacity-100 transition-opacity duration-150 focus-within:opacity-100 lg:opacity-0 lg:group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          aria-label={`Edit ${row.category} budget`}
                          className="rounded-md p-1.5 text-muted transition-colors hover:bg-white/[0.06] hover:text-cream"
                        >
                          <Icon name="edit" className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(row)}
                          aria-label={`Delete ${row.category} budget`}
                          className="rounded-md p-1.5 text-muted transition-colors hover:bg-coral/10 hover:text-coral"
                        >
                          <Icon name="trash" className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {unbudgeted.length > 0 ? (
        <section className="border-t border-rule pt-8">
          <div>
            <h2 className="text-[16px] font-medium tracking-[-0.025em] text-white">
              Spending without a limit
            </h2>
            <p className="mt-1 text-[11.5px] text-muted">
              These categories have expenses this month but no budget
            </p>
          </div>
          <ul className="mt-4">
            {unbudgeted.map((item) => (
              <li
                key={item.category}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-rule/70 py-3 last:border-b-0"
              >
                <div>
                  <p className="text-[13px] font-medium text-ink">{item.category}</p>
                  <p className="mt-0.5 text-[10.5px] text-muted">
                    Suggested{' '}
                    <span className="num">
                      {formatCurrency(suggestBudgetLimit(item.category, transactions, recentMonths))}
                    </span>{' '}
                    · last three months
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openCreate(item.category)}
                  className="btn btn-ghost whitespace-nowrap px-2.5 py-1.5 text-[10.5px]"
                >
                  Set limit
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Modal
        open={editorOpen}
        onClose={closeEditor}
        title={editingCategory ? `Edit ${editingCategory} budget` : 'Set a category budget'}
        description="Monthly limits reset every month and are measured against recorded expenses."
        footer={
          <>
            <button type="button" onClick={closeEditor} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" form="budget-form" className="btn btn-primary">
              {editingCategory ? 'Save limit' : 'Set budget'}
            </button>
          </>
        }
      >
        <form id="budget-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="field-label" htmlFor="budget-category">
              Category
            </label>
            <select
              id="budget-category"
              value={form.category}
              disabled={Boolean(editingCategory)}
              onChange={(event) => {
                const category = event.target.value
                setForm({ category, amount: category ? String(suggestedAmountFor(category)) : '' })
                setErrors({})
              }}
              className="field disabled:bg-white/5 disabled:text-muted"
            >
              <option value="">Select a category</option>
              {availableCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <FieldError>{errors.category}</FieldError>
          </div>

          <div>
            <label className="field-label" htmlFor="budget-amount">
              Monthly limit (₹)
            </label>
            <input
              id="budget-amount"
              type="number"
              min="1"
              step="50"
              inputMode="decimal"
              value={form.amount}
              onChange={(event) => setForm({ ...form, amount: event.target.value })}
              className="field num"
              placeholder="0"
            />
            <FieldError>{errors.amount}</FieldError>
            {suggestedAmount > 0 ? (
              <button
                type="button"
                onClick={() => setForm({ ...form, amount: String(suggestedAmount) })}
                className="link-underline mt-2 text-[11.5px] font-medium text-cream"
              >
                Use suggested limit of {formatCurrency(suggestedAmount)}
              </button>
            ) : null}
            <p className="mt-2 text-[10px] text-muted">
              Suggestion is the average of the last three months plus a 10% buffer.
            </p>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Remove this budget?"
        description="Spending records are not affected. Only the monthly limit is deleted."
        footer={
          <>
            <button type="button" onClick={() => setDeleteTarget(null)} className="btn btn-ghost">
              Cancel
            </button>
            <button type="button" onClick={handleDelete} className="btn btn-danger">
              Remove budget
            </button>
          </>
        }
      >
        {deleteTarget ? (
          <div className="border-l border-coral/50 pl-4">
            <p className="text-[12.5px] font-medium text-ink">{deleteTarget.category}</p>
            <p className="num mt-1 text-[11px] text-muted">
              Limit {formatCurrency(deleteTarget.limit)} · spent{' '}
              {formatCurrency(deleteTarget.actual)}
            </p>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

export default BudgetsPage
