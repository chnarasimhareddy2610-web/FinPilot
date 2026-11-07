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
    <div className="space-y-9 sm:space-y-11">
      {notice ? (
        <InlineAlert tone="positive" onDismiss={() => setNotice('')}>
          {notice}
        </InlineAlert>
      ) : null}

      {/* One ring for the whole portfolio; the goals below are read as milestones. */}
      <section className="reveal grid items-center gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <p className="eyebrow">Total saved toward goals</p>
          <p className="num mt-3 text-[42px] leading-[0.88] text-white sm:text-[54px]">
            <span key={String(totals.saved)} className="metric-swap">
              {formatCurrency(totals.saved)}
            </span>
          </p>
          <dl className="mt-5 flex flex-wrap items-baseline gap-x-8 gap-y-3 border-t border-rule pt-4">
            <div>
              <dt className="ledger-head">Combined target</dt>
              <dd className="num mt-1 text-[13px] text-cream">{formatCurrency(totals.target)}</dd>
            </div>
            <div>
              <dt className="ledger-head">To go</dt>
              <dd className="num mt-1 text-[13px] text-cream">
                {formatCurrency(Math.max(0, totals.target - totals.saved))}
              </dd>
            </div>
            <div>
              <dt className="ledger-head">Active</dt>
              <dd className="num mt-1 text-[13px] text-cream">{totals.active}</dd>
            </div>
            <div>
              <dt className="ledger-head">Completed</dt>
              <dd className="num mt-1 text-[13px] text-cream">{totals.completed}</dd>
            </div>
          </dl>
        </div>

        <div className="flex items-center gap-5 lg:col-span-4 lg:justify-end">
          <ProgressRing progress={overallProgress} size={124} stroke={4}>
            <p className="num text-[19px] leading-none text-white">
              {formatPercent(overallProgress, 0)}
            </p>
            <p className="mt-1.5 text-[9px] text-muted">funded</p>
          </ProgressRing>
          <p className="max-w-[9rem] text-[10.5px] leading-relaxed text-muted">
            Share of every recorded goal target you have already funded.
          </p>
        </div>
      </section>

      <div className="border-t border-rule pt-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-medium tracking-[-0.025em] text-white">Savings goals</h2>
            <p className="mt-1 text-[11.5px] text-muted">
              Contributions are saved immediately and count toward the goal balance.
            </p>
          </div>
          <button type="button" onClick={() => setGoalModalOpen(true)} className="btn btn-primary">
            <Icon name="plus" className="h-3.5 w-3.5" />
            New goal
          </button>
        </div>

        {orderedGoals.length === 0 ? (
          <div className="mt-4 border-y border-rule">
            <EmptyState
              icon="goals"
              title="No savings goals yet"
              description="Give a goal a name, a target amount and a date, then add contributions as you save."
              action={
                <button
                  type="button"
                  onClick={() => setGoalModalOpen(true)}
                  className="btn btn-primary"
                >
                  <Icon name="plus" className="h-3.5 w-3.5" />
                  Create your first goal
                </button>
              }
            />
          </div>
        ) : (
          <div className="mt-2">
            {orderedGoals.map((goal, index) => {
              const pace = paceFor(goal)
              const daysLeft = goal.targetDate ? daysUntil(goal.targetDate) : 0

              return (
                <article
                  key={goal.id}
                  className="reveal group grid gap-x-8 gap-y-4 border-b border-rule/70 py-6 lg:grid-cols-12"
                  style={{ '--i': index }}
                >
                  {/* Identity and deadline */}
                  <div className="min-w-0 lg:col-span-4">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="display truncate text-[19px] leading-tight text-white">
                        {goal.name}
                      </h3>
                      {goal.isComplete ? (
                        <Badge tone="positive">Completed</Badge>
                      ) : pace.behind ? (
                        <Badge tone="warning">Behind pace</Badge>
                      ) : (
                        <Badge tone="soft">On track</Badge>
                      )}
                    </div>
                    <p className="mt-1.5 text-[10.5px] text-muted">
                      Target {formatDate(goal.targetDate)}
                      {!goal.isComplete && goal.targetDate ? (
                        <>
                          {' '}
                          · {daysLeft >= 0 ? `${daysLeft} days left` : `${Math.abs(daysLeft)} days overdue`}
                        </>
                      ) : null}
                    </p>
                    <p className="mt-3 text-[10.5px] text-muted">
                      {(goal.contributions || []).length} contribution
                      {(goal.contributions || []).length === 1 ? '' : 's'} recorded
                    </p>
                  </div>

                  {/* Money hierarchy: saved dominates, target and remaining sit under it */}
                  <div className="min-w-0 lg:col-span-5">
                    <div className="flex flex-wrap items-baseline gap-x-2.5">
                      <p className="num text-[24px] leading-none text-white">
                        {formatCurrency(goal.currentAmount)}
                      </p>
                      <p className="num text-[11.5px] text-muted">
                        of {formatCurrency(goal.targetAmount)}
                      </p>
                    </div>

                    <div className="mt-3">
                      <ProgressBar
                        value={goal.progress}
                        tone={goal.isComplete ? 'navy' : pace.behind ? 'coral' : 'soft'}
                        height={3}
                        label={`${goal.name} progress`}
                      />
                    </div>

                    <div className="mt-2 flex items-baseline justify-between gap-3 text-[10.5px]">
                      <span className="num text-muted">{formatPercent(goal.progress, 0)} funded</span>
                      <span
                        className={`num ${goal.isComplete ? 'text-cream/60' : 'text-cream/85'}`}
                      >
                        {goal.isComplete
                          ? 'Target reached'
                          : `${formatCurrency(goal.remaining)} remaining`}
                      </span>
                    </div>
                  </div>

                  {/* Pace and the single action */}
                  <div className="flex flex-col justify-between gap-3 lg:col-span-3 lg:items-end">
                    <dl className="flex gap-6 lg:gap-8">
                      <div>
                        <dt className="ledger-head">Needed monthly</dt>
                        <dd className="num mt-1 text-[12px] font-medium text-cream/90">
                          {goal.isComplete ? '—' : formatCurrency(pace.requiredMonthly)}
                        </dd>
                      </div>
                      <div className="lg:text-right">
                        <dt className="ledger-head">Recent pace</dt>
                        <dd
                          className={`num mt-1 text-[12px] font-medium ${
                            pace.behind ? 'text-coral' : 'text-cream/90'
                          }`}
                        >
                          {formatCurrency(pace.recentMonthly)}
                          <span className="ml-0.5 text-[9.5px] font-normal text-muted">/mo</span>
                        </dd>
                      </div>
                    </dl>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => openContribution(goal)}
                        disabled={goal.isComplete}
                        className="btn btn-ink px-3 py-1.5 text-[10.5px]"
                      >
                        <Icon name="plus" className="h-3 w-3" />
                        Add contribution
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(goal)}
                        aria-label={`Delete ${goal.name}`}
                        className="rounded-md p-1.5 text-muted transition-colors hover:bg-coral/10 hover:text-coral"
                      >
                        <Icon name="trash" className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

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
              Starting amount (₹){' '}
              <span className="font-normal normal-case tracking-normal">optional</span>
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
            <button
              type="button"
              onClick={() => setContributionGoal(null)}
              className="btn btn-ghost"
            >
              Cancel
            </button>
            <button type="submit" form="contribution-form" className="btn btn-primary">
              Add contribution
            </button>
          </>
        }
      >
        <form
          id="contribution-form"
          onSubmit={handleContribution}
          className="space-y-3.5"
          noValidate
        >
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
          <div className="border-l border-coral/50 pl-4">
            <p className="text-[13px] font-medium text-ink">{deleteTarget.name}</p>
            <p className="num mt-1 text-[11px] text-muted">
              {formatCurrency(deleteTarget.currentAmount)} saved of{' '}
              {formatCurrency(deleteTarget.targetAmount)}
            </p>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

export default GoalsPage
