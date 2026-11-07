import React, { useEffect, useMemo, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { EmptyState, FieldError, InlineAlert, Modal } from '../components/ui.jsx'
import { useFinance } from '../store/FinanceProvider.jsx'
import {
  CATEGORIES,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  filterTransactions,
  getTransactionsForMonth,
  sortTransactions,
} from '../services/transactionService.js'
import { classifyTransaction } from '../services/aiEngine.js'
import { currentMonth, formatCurrency, formatDate, todayISO } from '../utils/format.js'

const EMPTY_FORM = {
  description: '',
  amount: '',
  type: 'expense',
  category: '',
  date: '',
  notes: '',
}

const TYPE_LABEL = { income: 'Income', expense: 'Expense' }

const CLEAR_FILTERS = { search: '', type: '', category: '', from: '', to: '' }

export const TransactionsPage = ({ month, openFormSignal = 0 }) => {
  const { transactions, addTransaction, updateTransaction, deleteTransaction } = useFinance()

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [categoryTouched, setCategoryTouched] = useState(false)

  const [filters, setFilters] = useState({ search: '', type: '', category: '', from: '', to: '' })
  const [sort, setSort] = useState('date-desc')

  const monthTransactions = useMemo(
    () => getTransactionsForMonth(transactions, month),
    [transactions, month]
  )

  const visible = useMemo(() => {
    const filtered = filterTransactions(monthTransactions, filters)
    const [key, direction] = sort.split('-')
    return sortTransactions(filtered, key, direction)
  }, [monthTransactions, filters, sort])

  const totals = useMemo(
    () =>
      visible.reduce(
        (accumulator, transaction) => {
          if (transaction.type === 'income') accumulator.income += Number(transaction.amount)
          else accumulator.expense += Number(transaction.amount)
          return accumulator
        },
        { income: 0, expense: 0 }
      ),
    [visible]
  )

  const filtersActive =
    filters.search !== '' || filters.type !== '' || filters.category !== '' || filters.from !== '' || filters.to !== ''

  const openCreate = () => {
    setEditingId(null)
    setForm({
      ...EMPTY_FORM,
      date: month === currentMonth() ? todayISO() : `${month}-01`,
      category: '',
    })
    setCategoryTouched(false)
    setErrors({})
    setFormOpen(true)
  }

  useEffect(() => {
    if (openFormSignal > 0) openCreate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openFormSignal])

  const openEdit = (transaction) => {
    setEditingId(transaction.id)
    setForm({
      description: transaction.description,
      amount: String(transaction.amount),
      type: transaction.type,
      category: transaction.category,
      date: transaction.date,
      notes: transaction.notes || '',
    })
    setCategoryTouched(true)
    setErrors({})
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingId(null)
    setErrors({})
  }

  const updateField = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }))
    setErrors((previous) => {
      if (!previous[field] && !previous.form) return previous
      const next = { ...previous }
      delete next[field]
      delete next.form
      return next
    })
  }

  const suggestion = useMemo(() => {
    if (categoryTouched || !form.description.trim()) return null
    const result = classifyTransaction(form.description, form.type)
    if (result.confidence < 0.9) return null
    if (result.category === form.category) return null
    return result
  }, [form.description, form.type, form.category, categoryTouched])

  const handleTypeChange = (value) => {
    setForm((previous) => ({
      ...previous,
      type: value,
      category: categoryTouched ? previous.category : '',
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const payload = {
      ...form,
      amount: form.amount,
      category: form.category,
    }

    const result = editingId ? updateTransaction(editingId, payload) : addTransaction(payload)

    if (!result.ok) {
      setErrors(result.errors || {})
      return
    }

    setNotice(editingId ? 'Transaction updated.' : 'Transaction added.')
    closeForm()
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    deleteTransaction(deleteTarget.id)
    setNotice(`Deleted “${deleteTarget.description}”.`)
    setDeleteTarget(null)
  }

  const categoryOptions = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  return (
    <div className="space-y-5">
      {notice ? (
        <InlineAlert tone="positive" onDismiss={() => setNotice('')}>
          {notice}
        </InlineAlert>
      ) : null}

      {/* One toolbar: search, filters, sort and the primary action share a single strip. */}
      <section className="border-y border-rule py-2">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:gap-3">
          <div className="relative flex-1 xl:max-w-[240px]">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/40"
            />
            <input
              type="search"
              value={filters.search}
              onChange={(event) => setFilters({ ...filters, search: event.target.value })}
              placeholder="Search transactions"
              aria-label="Search transactions"
              className="field border-transparent bg-transparent pl-8 text-[12px] hover:border-rule"
            />
          </div>

          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:flex xl:flex-1 xl:items-center xl:gap-1.5">
            <select
              value={filters.type}
              onChange={(event) => setFilters({ ...filters, type: event.target.value })}
              aria-label="Filter by type"
              className="field border-transparent bg-transparent text-[11.5px] hover:border-rule xl:w-[104px]"
            >
              <option value="">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>

            <select
              value={filters.category}
              onChange={(event) => setFilters({ ...filters, category: event.target.value })}
              aria-label="Filter by category"
              className="field border-transparent bg-transparent text-[11.5px] hover:border-rule xl:w-[124px]"
            >
              <option value="">All categories</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1.5 xl:w-[152px]">
              <span className="shrink-0 text-[9.5px] uppercase tracking-[0.08em] text-muted">
                From
              </span>
              <input
                type="date"
                value={filters.from}
                onChange={(event) => setFilters({ ...filters, from: event.target.value })}
                aria-label="From date"
                className="field min-w-0 border-transparent bg-transparent text-[11.5px] hover:border-rule"
              />
            </div>
            <div className="flex items-center gap-1.5 xl:w-[152px]">
              <span className="shrink-0 text-[9.5px] uppercase tracking-[0.08em] text-muted">
                To
              </span>
              <input
                type="date"
                value={filters.to}
                onChange={(event) => setFilters({ ...filters, to: event.target.value })}
                aria-label="To date"
                className="field min-w-0 border-transparent bg-transparent text-[11.5px] hover:border-rule"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <label className="sr-only" htmlFor="sort-transactions">
              Sort transactions
            </label>
            <select
              id="sort-transactions"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="field border-transparent bg-transparent text-[11.5px] hover:border-rule xl:w-[132px]"
            >
              <option value="date-desc">Newest first</option>
              <option value="date-asc">Oldest first</option>
              <option value="amount-desc">Highest amount</option>
              <option value="amount-asc">Lowest amount</option>
              <option value="description-asc">Description A–Z</option>
            </select>
            {filtersActive ? (
              <button
                type="button"
                onClick={() => setFilters(CLEAR_FILTERS)}
                className="px-2 text-[11.5px] text-muted transition-colors hover:text-cream"
              >
                Clear
              </button>
            ) : null}
            <button type="button" onClick={openCreate} className="btn btn-primary whitespace-nowrap">
              <Icon name="plus" className="h-3.5 w-3.5" />
              Add
            </button>
          </div>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 border-b border-rule py-3">
          <p className="text-[11.5px] text-muted">
            <span className="num font-medium text-ink">{visible.length}</span> of{' '}
            {monthTransactions.length} transaction{monthTransactions.length === 1 ? '' : 's'}
            {filtersActive ? ' matching filters' : ' this month'}
          </p>
          <div className="flex items-center gap-5 text-[11px]">
            <span className="text-muted">
              In{' '}
              <span className="num ml-1 font-medium text-white">{formatCurrency(totals.income)}</span>
            </span>
            <span className="text-muted">
              Out{' '}
              <span className="num ml-1 font-medium text-coral">{formatCurrency(totals.expense)}</span>
            </span>
          </div>
        </div>

        {monthTransactions.length === 0 ? (
          <EmptyState
            icon="transactions"
            title="No transactions in this month"
            description="Add an income or expense to start tracking this month, or switch months from the header."
            action={
              <button type="button" onClick={openCreate} className="btn btn-primary">
                <Icon name="plus" className="h-4 w-4" />
                Add transaction
              </button>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon="search"
            title="No matches"
            description="No transaction fits the current search and filters."
            action={
              <button
                type="button"
                onClick={() => setFilters(CLEAR_FILTERS)}
                className="btn btn-ghost"
              >
                Clear filters
              </button>
            }
          />
        ) : (
          <>
            {/* Desktop ledger */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-left">
                    <th className="ledger-head w-[92px] py-3 pr-3 font-medium">Date</th>
                    <th className="ledger-head py-3 pr-3 font-medium">Description</th>
                    <th className="ledger-head w-[150px] py-3 pr-3 font-medium">Category</th>
                    <th className="ledger-head w-[92px] py-3 pr-3 font-medium">Type</th>
                    <th className="ledger-head w-[120px] py-3 pr-3 text-right font-medium">Amount</th>
                    <th className="w-[68px] py-3 text-right font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule/70">
                  {visible.map((transaction) => (
                    <tr key={transaction.id} className="ledger-row group">
                      <td className="num whitespace-nowrap py-3.5 pr-3 text-[11px] text-muted">
                        {formatDate(transaction.date, { short: true })}
                      </td>
                      <td className="py-3.5 pr-3">
                        <p className="text-[13px] font-medium text-ink">
                          {transaction.description}
                        </p>
                        {transaction.notes ? (
                          <p className="mt-0.5 line-clamp-1 text-[10.5px] text-muted">
                            {transaction.notes}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-3.5 pr-3 text-[11.5px] text-muted">{transaction.category}</td>
                      <td className="py-3.5 pr-3">
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
                          <span
                            className={`h-1 w-1 rounded-full ${
                              transaction.type === 'income' ? 'bg-cream/70' : 'bg-coral/80'
                            }`}
                            aria-hidden="true"
                          />
                          {TYPE_LABEL[transaction.type]}
                        </span>
                      </td>
                      <td
                        className={`num whitespace-nowrap py-3.5 pr-3 text-right text-[13px] font-medium ${
                          transaction.type === 'income' ? 'text-white' : 'text-cream/85'
                        }`}
                      >
                        {transaction.type === 'income' ? '+' : '−'}
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="py-3.5">
                        <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => openEdit(transaction)}
                            aria-label={`Edit ${transaction.description}`}
                            className="rounded-md p-1.5 text-muted transition-colors hover:bg-white/[0.06] hover:text-cream focus-visible:opacity-100"
                          >
                            <Icon name="edit" className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(transaction)}
                            aria-label={`Delete ${transaction.description}`}
                            className="rounded-md p-1.5 text-muted transition-colors hover:bg-coral/10 hover:text-coral"
                          >
                            <Icon name="trash" className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <ul className="divide-y divide-rule/70 md:hidden">
              {visible.map((transaction) => (
                <li key={transaction.id} className="py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-ink">
                        {transaction.description}
                      </p>
                      <p className="mt-0.5 text-[10.5px] text-muted">
                        {transaction.category} · {formatDate(transaction.date, { short: true })}
                      </p>
                      {transaction.notes ? (
                        <p className="mt-0.5 line-clamp-1 text-[10.5px] text-muted">
                          {transaction.notes}
                        </p>
                      ) : null}
                    </div>
                    <p
                      className={`num shrink-0 text-[13px] font-medium ${
                        transaction.type === 'income' ? 'text-white' : 'text-cream/85'
                      }`}
                    >
                      {transaction.type === 'income' ? '+' : '−'}
                      {formatCurrency(transaction.amount)}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-[10.5px] text-muted">
                      <span
                        className={`h-1 w-1 rounded-full ${
                          transaction.type === 'income' ? 'bg-cream/70' : 'bg-coral/80'
                        }`}
                        aria-hidden="true"
                      />
                      {TYPE_LABEL[transaction.type]}
                    </span>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => openEdit(transaction)}
                        className="text-[11px] text-cream/70 transition-colors hover:text-cream"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(transaction)}
                        className="text-[11px] text-coral/80 transition-colors hover:text-coral"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editingId ? 'Edit transaction' : 'New transaction'}
        description={editingId ? 'Update the details below.' : 'Record money coming in or going out.'}
        footer={
          <>
            <button type="button" onClick={closeForm} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" form="transaction-form" className="btn btn-primary">
              {editingId ? 'Save changes' : 'Add transaction'}
            </button>
          </>
        }
      >
        <form id="transaction-form" onSubmit={handleSubmit} className="space-y-3.5" noValidate>
          {errors.form ? <InlineAlert tone="warning">{errors.form}</InlineAlert> : null}

          <div>
            <label className="field-label" htmlFor="tx-description">
              Description
            </label>
            <input
              id="tx-description"
              type="text"
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              placeholder="e.g. Swiggy, Salary credit"
              className="field"
              maxLength={80}
              autoFocus
            />
            <FieldError>{errors.description}</FieldError>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label" htmlFor="tx-amount">
                Amount (₹)
              </label>
              <input
                id="tx-amount"
                type="number"
                min="1"
                step="0.01"
                inputMode="decimal"
                value={form.amount}
                onChange={(event) => updateField('amount', event.target.value)}
                placeholder="0"
                className="field num"
              />
              <FieldError>{errors.amount}</FieldError>
            </div>
            <div>
              <label className="field-label" htmlFor="tx-date">
                Date
              </label>
              <input
                id="tx-date"
                type="date"
                value={form.date}
                max={todayISO()}
                onChange={(event) => updateField('date', event.target.value)}
                className="field"
              />
              <FieldError>{errors.date}</FieldError>
            </div>
          </div>

          <div>
            <span className="field-label">Type</span>
            <div className="grid grid-cols-2 gap-2">
              {['expense', 'income'].map((type) => {
                const selected = form.type === type
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleTypeChange(type)}
                    aria-pressed={selected}
                    className={`rounded-full border px-3 py-2 text-[11.5px] font-medium transition-all ${
                      selected
                        ? 'border-coral/45 bg-coral/15 text-white shadow-[0_0_0_1px_rgba(255,107,91,0.15)]'
                        : 'border-rule-strong bg-white/[0.03] text-cream/55 hover:border-cream/30 hover:text-cream'
                    }`}
                  >
                    {TYPE_LABEL[type]}
                  </button>
                )
              })}
            </div>
            <FieldError>{errors.type}</FieldError>
          </div>

          <div>
            <label className="field-label" htmlFor="tx-category">
              Category
            </label>
            <select
              id="tx-category"
              value={form.category}
              onChange={(event) => {
                setCategoryTouched(true)
                updateField('category', event.target.value)
              }}
              className="field"
            >
              <option value="">Select a category</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <FieldError>{errors.category}</FieldError>

            {suggestion ? (
              <button
                type="button"
                onClick={() => {
                  setCategoryTouched(true)
                  updateField('category', suggestion.category)
                }}
                className="mt-2 flex w-full items-start gap-2 rounded-r-[12px] border-l-2 border-coral bg-coral/[0.09] px-3 py-2 text-left text-[10.5px] transition-colors hover:bg-coral/15"
              >
                <Icon name="spark" className="mt-0.5 h-3 w-3 shrink-0 text-coral" />
                <span>
                  <span className="font-medium text-ink">Suggested: {suggestion.category}</span>
                  <span className="mt-0.5 block text-muted">{suggestion.explanation}</span>
                </span>
              </button>
            ) : null}
          </div>

          <div>
            <label className="field-label" htmlFor="tx-notes">
              Notes <span className="font-normal normal-case tracking-normal">(optional)</span>
            </label>
            <input
              id="tx-notes"
              type="text"
              value={form.notes}
              onChange={(event) => updateField('notes', event.target.value)}
              placeholder="Anything worth remembering"
              className="field"
              maxLength={160}
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete transaction?"
        description="This removes the entry from your saved records. It cannot be undone."
        footer={
          <>
            <button type="button" onClick={() => setDeleteTarget(null)} className="btn btn-ghost">
              Cancel
            </button>
            <button type="button" onClick={handleDelete} className="btn btn-danger">
              Delete
            </button>
          </>
        }
      >
        {deleteTarget ? (
          <div className="border-l border-coral/50 pl-4">
            <p className="text-[13px] font-medium text-ink">{deleteTarget.description}</p>
            <p className="num mt-1 text-[11.5px] text-muted">
              {formatCurrency(deleteTarget.amount)} · {deleteTarget.category} ·{' '}
              {formatDate(deleteTarget.date)}
            </p>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

export default TransactionsPage
