import React, { useMemo, useState } from 'react'
import Icon from '../components/Icon.jsx'
import {
  Badge,
  Card,
  EmptyState,
  FieldError,
  InlineAlert,
  Modal,
  ProgressBar,
} from '../components/ui.jsx'
import { ProgressRing } from '../components/charts.jsx'
import { useFinance } from '../store/FinanceProvider.jsx'
import {
  addMonths,
  currentMonth,
  daysUntil,
  formatCurrency,
  formatDate,
  formatPercent,
  monthsBetween,
  todayISO,
} from '../utils/format.js'

const EMPTY_GOAL = { name: '', targetAmount: '', targetDate: '', initialAmount: '' }

const paceFor = (goal) => {
  const monthsLeft = monthsBetween(currentMonth(), goal.targetDate.slice(0, 7))
  const requiredMonthly = monthsLeft > 0 ? goal.remaining / monthsLeft : goal.remaining
  const windowStart = addMonths(currentMonth(), -3)
  const recent = (goal.contributions || [])
    .filter((contribution) => contribution.date && contribution.date.slice(0, 7) >= windowStart)
    .reduce((total, contribution) => total + Number(contribution.amount || 0), 0)

  return {
    monthsLeft,
    requiredMonthly,
    recentMonthly: recent / 3,
    behind: !goal.isComplete && (monthsLeft <= 0 || recent / 3 < requiredMonthly * 0.9),
  }
}

export const GoalsPage = () => {
  const { goals, addGoal, contributeToGoal, deleteGoal } = useFinance()

  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [goalForm, setGoalForm] = useState(EMPTY_GOAL)
  const [goalErrors, setGoalErrors] = useState({})

  const [contributionGoal, setContributionGoal] = useState(null)
  const [contribution, setContribution] = useState({ amount: '', date: todayISO() })
  const [contributionErrors, setContributionErrors] = useState({})

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [notice, setNotice] = useState('')

  const totals = useMemo(
    () =>
      goals.reduce(
        (accumulator, goal) => {
          accumulator.saved += goal.currentAmount
          accumulator.target += goal.targetAmount
          if (goal.isComplete) accumulator.completed += 1
          else accumulator.active += 1
          return accumulator
        },
        { saved: 0, target: 0, active: 0, completed: 0 }
      ),
    [goals]
  )

  const overallProgress = totals.target > 0 ? (totals.saved / totals.target) * 100 : 0

  const orderedGoals = useMemo(
    () => [...goals].sort((a, b) => Number(a.isComplete) - Number(b.isComplete) || b.progress - a.progress),
    [goals]
  )

  const handleCreate = (event) => {
    event.preventDefault()
    const result = addGoal(goalForm)
    if (!result.ok) {
      setGoalErrors(result.errors)
      return
    }
    setNotice(`Goal “${result.goal.name}” created.`)
    setGoalForm(EMPTY_GOAL)
    setGoalErrors({})
    setGoalModalOpen(false)
  }

  const openContribution = (goal) => {
    setContributionGoal(goal)
    setContribution({ amount: '', date: todayISO() })
    setContributionErrors({})
  }

  const handleContribution = (event) => {
    event.preventDefault()
    if (!contributionGoal) return
    const result = contributeToGoal(contributionGoal.id, contribution.amount, contribution.date)
    if (!result.ok) {
      setContributionErrors(result.errors)
      return
    }
    setNotice(`${formatCurrency(Number(contribution.amount))} added to ${contributionGoal.name}.`)
    setContributionGoal(null)
    setContributionErrors({})
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    deleteGoal(deleteTarget.id)
    setNotice(`Removed “${deleteTarget.name}”. Contributions were deleted with it.`)
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-6">
      {notice ? (
        <InlineAlert tone="positive" onDismiss={() => setNotice('')}>
          {notice}
        </InlineAlert>
      ) : null}

      {/* Summary plate: figures on cream, ring as the single visual anchor. */}
      <div className="panel reveal grid grid-cols-1 items-center gap-5 px-6 py-5 sm:grid-cols-12">
        <div className="sm:col-span-8">
          <p className="eyebrow text-[9px]">Total saved toward goals</p>
          <p className="num mt-3 text-[28px] leading-none text-ink sm:text-[34px]">
            <span key={String(totals.saved)} className="metric-swap">
              {formatCurrency(totals.saved)}
            </span>
          </p>
          <div className="mt-4 grid grid-cols-3 divide-x divide-rule-strong border-t border-rule-strong pt-3">
            <div className="pr-3">
              <p className="ledger-head">Combined target</p>
              <p className="num mt-0.5 text-[12px] text-ink">{formatCurrency(totals.target)}</p>
            </div>
            <div className="px-3">
              <p className="ledger-head">Active</p>
              <p className="num mt-0.5 text-[12px] text-ink">{totals.active}</p>
            </div>
            <div className="pl-3">
              <p className="ledger-head">Completed</p>
              <p className="num mt-0.5 text-[12px] text-ink">{totals.completed}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-start gap-4 sm:col-span-4 sm:justify-end">
          <ProgressRing progress={overallProgress} size={118} stroke={5}>
            <p className="num text-[17px] leading-none text-ink">{formatPercent(overallProgress, 0)}</p>
            <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.14em] text-muted">funded</p>
          </ProgressRing>
          <div className="text-left">
            <p className="ledger-head">To go</p>
            <p className="num mt-0.5 text-[12px] text-ink">
              {formatCurrency(Math.max(0, totals.target - totals.saved))}
            </p>
            <p className="mt-2 max-w-[7rem] text-[10px] leading-snug text-muted">
              Across every goal you have recorded.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-rule-strong pb-3">
        <div>
          <p className="eyebrow text-[9px]">Savings goals</p>
          <p className="mt-1 text-[10.5px] text-muted">
            Contributions are saved immediately and count toward the goal balance.
          </p>
        </div>
        <button type="button" onClick={() => setGoalModalOpen(true)} className="btn btn-primary">
          <Icon name="plus" className="h-3.5 w-3.5" />
          New goal
        </button>
      </div>

      {orderedGoals.length === 0 ? (
        <Card>
          <EmptyState
            icon="goals"
            title="No savings goals yet"
            description="Give a goal a name, a target amount and a date, then add contributions as you save."
            action={
              <button type="button" onClick={() => setGoalModalOpen(true)} className="btn btn-primary">
                <Icon name="plus" className="h-3.5 w-3.5" />
                Create your first goal
              </button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {orderedGoals.map((goal, index) => {
            const pace = paceFor(goal)
            const daysLeft = goal.targetDate ? daysUntil(goal.targetDate) : 0

            return (
              <article
                key={goal.id}
                className="reveal flex flex-col border border-rule-strong bg-surface p-4"
                style={{ '--i': index }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="ledger-head">Goal {String(index + 1).padStart(2, '0')}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <h3 className="display truncate text-[17px] text-ink">{goal.name}</h3>
                      {goal.isComplete ? (
                        <Badge tone="positive">Completed</Badge>
                      ) : pace.behind ? (
                        <Badge tone="warning">Behind pace</Badge>
                      ) : (
                        <Badge tone="soft">On track</Badge>
                      )}
                    </div>
                    <p className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.06em] text-muted">
                      Target {formatDate(goal.targetDate)}
                      {!goal.isComplete && goal.targetDate ? (
                        <> · {daysLeft >= 0 ? `${daysLeft} days left` : `${Math.abs(daysLeft)} days overdue`}</>
                      ) : null}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(goal)}
                    aria-label={`Delete ${goal.name}`}
                    className="p-1 text-muted transition-colors hover:text-coral"
                  >
                    <Icon name="trash" className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-4 flex items-center gap-4">
                  <ProgressRing progress={goal.progress} size={86} stroke={5}>
                    <p className="num text-[12.5px] leading-none text-ink">{formatPercent(goal.progress, 0)}</p>
                    <p className="mt-1 font-mono text-[7.5px] uppercase tracking-[0.12em] text-muted">funded</p>
                  </ProgressRing>

                  <div className="min-w-0 flex-1">
                    <p className="num text-[19px] leading-none text-ink">{formatCurrency(goal.currentAmount)}</p>
                    <p className="mt-1 text-[10.5px] text-muted">of {formatCurrency(goal.targetAmount)}</p>
                    <div className="mt-2.5">
                      <ProgressBar
                        value={goal.progress}
                        tone={goal.isComplete ? 'navy' : pace.behind ? 'coral' : 'soft'}
                        height={4}
                        label={`${goal.name} progress`}
                      />
                    </div>
                    <p className="num mt-1.5 text-[10px] text-muted">
                      {formatCurrency(goal.remaining)} remaining
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 divide-x divide-rule border-t border-rule pt-2.5">
                  <div className="pr-3">
                    <p className="ledger-head">Needed monthly</p>
                    <p className="num mt-0.5 text-[11px] font-medium text-ink">
                      {goal.isComplete ? '—' : formatCurrency(pace.requiredMonthly)}
                    </p>
                  </div>
                  <div className="pl-3">
                    <p className="ledger-head">Recent pace</p>
                    <p className={`num mt-0.5 text-[11px] font-medium ${pace.behind ? 'text-coral' : 'text-ink'}`}>
                      {formatCurrency(pace.recentMonthly)}
                      <span className="ml-1 font-sans text-[9.5px] font-normal text-muted">/mo</span>
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                    {(goal.contributions || []).length} contribution
                    {(goal.contributions || []).length === 1 ? '' : 's'}
                  </p>
                  <button
                    type="button"
                    onClick={() => openContribution(goal)}
                    disabled={goal.isComplete}
                    className="btn btn-ink px-3 py-1.5 text-[10.5px]"
                  >
                    <Icon name="plus" className="h-3 w-3" />
                    Add contribution
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <Modal
        open={goalModalOpen}
        onClose={() => {
          setGoalModalOpen(false)
          setGoalErrors({})
        }}
        title="Create a savings goal"
        description="Set the amount you need and when you need it. Contributions can be added any time."
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setGoalModalOpen(false)
                setGoalErrors({})
              }}
              className="btn btn-ghost"
            >
              Cancel
            </button>
            <button type="submit" form="goal-form" className="btn btn-primary">
              Create goal
            </button>
          </>
        }
      >
        <form id="goal-form" onSubmit={handleCreate} className="space-y-3.5" noValidate>
          <div>
            <label className="field-label" htmlFor="goal-name">
              Goal name
            </label>
            <input
              id="goal-name"
              type="text"
              value={goalForm.name}
              onChange={(event) => setGoalForm({ ...goalForm, name: event.target.value })}
              placeholder="Emergency fund, Japan trip…"
              className="field"
              maxLength={60}
              autoFocus
            />
            <FieldError>{goalErrors.name}</FieldError>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label" htmlFor="goal-target">
                Target amount (₹)
              </label>
              <input
                id="goal-target"
                type="number"
                min="1"
                step="100"
                value={goalForm.targetAmount}
                onChange={(event) => setGoalForm({ ...goalForm, targetAmount: event.target.value })}
                className="field num"
                placeholder="0"
              />
              <FieldError>{goalErrors.targetAmount}</FieldError>
            </div>
            <div>
              <label className="field-label" htmlFor="goal-date">
                Target date
              </label>
              <input
                id="goal-date"
                type="date"
                min={todayISO()}
                value={goalForm.targetDate}
                onChange={(event) => setGoalForm({ ...goalForm, targetDate: event.target.value })}
                className="field"
              />
              <FieldError>{goalErrors.targetDate}</FieldError>
            </div>
          </div>

          <div>
            <label className="field-label" htmlFor="goal-initial">
              Starting amount (₹) <span className="font-normal normal-case tracking-normal">optional</span>
            </label>
            <input
              id="goal-initial"
              type="number"
              min="0"
              step="100"
              value={goalForm.initialAmount}
              onChange={(event) => setGoalForm({ ...goalForm, initialAmount: event.target.value })}
              className="field num"
              placeholder="0"
            />
            <FieldError>{goalErrors.initialAmount}</FieldError>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(contributionGoal)}
        onClose={() => setContributionGoal(null)}
        title={contributionGoal ? `Add to ${contributionGoal.name}` : 'Add contribution'}
        description={
          contributionGoal
            ? `${formatCurrency(contributionGoal.remaining)} still needed to reach the target.`
            : ''
        }
        footer={
          <>
            <button type="button" onClick={() => setContributionGoal(null)} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" form="contribution-form" className="btn btn-primary">
              Add contribution
            </button>
          </>
        }
      >
        <form id="contribution-form" onSubmit={handleContribution} className="space-y-3.5" noValidate>
          <div>
            <label className="field-label" htmlFor="contribution-amount">
              Amount (₹)
            </label>
            <input
              id="contribution-amount"
              type="number"
              min="1"
              step="100"
              value={contribution.amount}
              onChange={(event) => {
                setContribution({ ...contribution, amount: event.target.value })
                setContributionErrors({})
              }}
              className="field num"
              placeholder="0"
              autoFocus
            />
            <FieldError>{contributionErrors.amount}</FieldError>
          </div>
          <div>
            <label className="field-label" htmlFor="contribution-date">
              Date
            </label>
            <input
              id="contribution-date"
              type="date"
              value={contribution.date}
              max={todayISO()}
              onChange={(event) => setContribution({ ...contribution, date: event.target.value })}
              className="field"
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete this goal?"
        description="The goal and its contribution history will be removed. This cannot be undone."
        footer={
          <>
            <button type="button" onClick={() => setDeleteTarget(null)} className="btn btn-ghost">
              Cancel
            </button>
            <button type="button" onClick={handleDelete} className="btn btn-danger">
              Delete goal
            </button>
          </>
        }
      >
        {deleteTarget ? (
          <div className="border border-ink/18 bg-cream/60 px-3 py-2">
            <p className="text-[12px] font-medium text-ink">{deleteTarget.name}</p>
            <p className="num mt-0.5 text-[10.5px] text-muted">
              {formatCurrency(deleteTarget.currentAmount)} saved of {formatCurrency(deleteTarget.targetAmount)}
            </p>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

export default GoalsPage
