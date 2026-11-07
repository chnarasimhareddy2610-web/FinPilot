import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Icon from './components/Icon.jsx'
import { InlineAlert } from './components/ui.jsx'
import { useFinance } from './store/FinanceProvider.jsx'
import { OverviewPage } from './pages/OverviewPage.jsx'
import { TransactionsPage } from './pages/TransactionsPage.jsx'
import { AnalysisPage } from './pages/AnalysisPage.jsx'
import { BudgetsPage } from './pages/BudgetsPage.jsx'
import { GoalsPage } from './pages/GoalsPage.jsx'
import { InsightsPage } from './pages/InsightsPage.jsx'
import { monthLabel } from './utils/format.js'

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: 'overview', blurb: 'A calm, complete picture of where your money stands this month.' },
  { id: 'transactions', label: 'Transactions', icon: 'transactions', blurb: 'Record income and expenses, then find any entry in seconds.' },
  { id: 'analysis', label: 'Analysis', icon: 'analysis', blurb: 'Compare months, break spending down by category and surface outliers.' },
  { id: 'budgets', label: 'Budgets', icon: 'budgets', blurb: 'Set monthly limits per category and watch utilisation in real time.' },
  { id: 'goals', label: 'Goals', icon: 'goals', blurb: 'Fund the things you are saving for and track the pace to each target.' },
  { id: 'insights', label: 'AI Insights', icon: 'insights', blurb: 'Explainable findings and recommendations derived from your own records.' },
]

const readPageFromHash = () => {
  const hash = window.location.hash.replace('#', '').replace(/^\//, '')
  return NAV_ITEMS.some((item) => item.id === hash)
    ? hash
    : 'overview'
}

function App() {
  const { month, months, setMonth, persistenceError } = useFinance()
  const [page, setPage] = useState(readPageFromHash)
  const [navOpen, setNavOpen] = useState(false)
  const [quickAddSignal, setQuickAddSignal] = useState(0)

  useEffect(() => {
    const onHashChange = () => setPage(readPageFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    if (!navOpen) return undefined
    const onKey = (event) => event.key === 'Escape' && setNavOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [navOpen])

  const navigate = useCallback((nextPage) => {
    if (window.location.hash !== `#${nextPage}`) {
      window.location.hash = nextPage
    }
    setPage(nextPage)
    setNavOpen(false)
  }, [])

  const addTransaction = useCallback(() => {
    navigate('transactions')
    setQuickAddSignal((signal) => signal + 1)
  }, [navigate])

  const activeItem = useMemo(
    () => NAV_ITEMS.find((item) => item.id === page) || NAV_ITEMS[0],
    [page]
  )

  const activeIndex = useMemo(
    () => String(NAV_ITEMS.findIndex((item) => item.id === activeItem.id) + 1).padStart(2, '0'),
    [activeItem]
  )

  const renderPage = () => {
    switch (page) {
      case 'transactions':
        return <TransactionsPage month={month} openFormSignal={quickAddSignal} />
      case 'analysis':
        return <AnalysisPage month={month} />
      case 'budgets':
        return <BudgetsPage month={month} />
      case 'goals':
        return <GoalsPage month={month} />
      case 'insights':
        return <InsightsPage month={month} />
      case 'overview':
      default:
        return <OverviewPage month={month} onNavigate={navigate} onAddTransaction={addTransaction} />
    }
  }

  const navContent = (
    <>
      <div className="border-b border-rule-strong px-5 pb-4 pt-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 block h-7 w-px bg-navy-soft" aria-hidden="true" />
          <div>
            <p className="flex items-baseline font-display text-[23px] leading-none text-cream">
              Fin<span className="mx-[1px] text-coral">/</span>Pilot
            </p>
            <p className="font-mono text-[8.5px] uppercase tracking-[0.24em] text-cream/40">
              Personal ledger
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Primary">
        <p className="mb-2.5 ml-3 font-mono text-[8.5px] uppercase tracking-[0.2em] text-cream/35">
          Sections
        </p>
        {NAV_ITEMS.map((item, index) => {
          const isActive = page === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`nav-item group flex w-full items-center gap-3 px-3 py-2.5 text-left text-[12.5px] ${
                isActive
                  ? 'bg-navy-soft text-cream'
                  : 'text-cream/55 hover:bg-white/[0.04] hover:text-cream'
              }`}
            >
              <span
                className={`font-mono text-[8.5px] tracking-[0.12em] ${
                  isActive ? 'text-coral' : 'text-cream/30'
                }`}
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              <Icon
                name={item.icon}
                className={`h-3.5 w-3.5 ${isActive ? 'text-cream' : 'text-cream/40 group-hover:text-cream/80'}`}
              />
              <span className={`flex-1 ${isActive ? 'font-medium' : ''}`}>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="border-t border-rule-strong px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="mt-0.5 h-1.5 w-1.5 bg-coral" aria-hidden="true" />
          <p className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-cream/65">
            Local only
          </p>
        </div>
        <p className="mt-1.5 text-[10.5px] leading-relaxed text-cream/40">
          Records stay in this browser. No account, no bank link, no data leaves your device.
        </p>
        <p className="mt-2.5 font-mono text-[8.5px] uppercase tracking-[0.18em] text-cream/22">
          FinPilot — Vol. 2
        </p>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-navy" data-scroll-dark>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[70] focus:bg-cream focus:px-3 focus:py-2 focus:text-sm focus:text-navy"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[15.5rem] flex-col border-r border-cream/12 bg-navy lg:flex">
        {navContent}
      </aside>

      {/* Mobile drawer */}
      {navOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="scrim absolute inset-0 bg-navy-deep/70"
            onClick={() => setNavOpen(false)}
          />
          <aside className="dialog-panel relative flex h-full w-[16.5rem] max-w-[85vw] flex-col border-r border-cream/12 bg-navy">
            {navContent}
          </aside>
        </div>
      ) : null}

      <div className="bg-paper lg:pl-[16rem]">
        <header className="sticky top-0 z-30 border-b border-rule-strong bg-paper/92 backdrop-blur-sm">
          <div className="mx-auto flex h-12 max-w-[1280px] items-center gap-3 px-4 sm:px-6 lg:px-10">
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              className="border border-rule-strong bg-surface p-1.5 text-ink lg:hidden"
              aria-label="Open navigation"
              aria-expanded={navOpen}
            >
              <Icon name="menu" className="h-4 w-4" />
            </button>

            <div className="min-w-0 flex-1">
              <p className="font-mono text-[8.5px] uppercase tracking-[0.22em] text-muted">
                Section {activeIndex} / 06
              </p>
              <p className="mt-0.5 truncate font-display text-[16px] leading-none text-ink">
                {activeItem.label}
              </p>
            </div>

            <label className="sr-only" htmlFor="month-select">
              Select month
            </label>
            <div className="relative">
              <select
                id="month-select"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="field appearance-none py-1.5 pl-3 pr-8 font-mono text-[11px] text-ink"
              >
                {months.map((value) => (
                  <option key={value} value={value}>
                    {monthLabel(value)}
                  </option>
                ))}
              </select>
              <Icon
                name="chevronDown"
                className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted"
              />
            </div>

            <button type="button" onClick={addTransaction} className="btn btn-primary">
              <Icon name="plus" className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New entry</span>
              <span className="sr-only sm:hidden">New entry</span>
            </button>
          </div>
        </header>

        <main id="main-content" className="mx-auto max-w-[1280px] px-4 pb-14 pt-7 sm:px-6 lg:px-10 lg:pt-8">
          <div className="border-b border-rule-strong pb-5 lg:grid lg:grid-cols-12 lg:items-end lg:gap-6">
            <div className="lg:col-span-8">
              <p className="eyebrow flex items-center gap-2">
                <span className="text-coral eyebrow-accent">§{activeIndex}</span>
                <span className="h-px w-5 bg-rule-strong" aria-hidden="true" />
                {activeItem.label}
              </p>
              <h1 className="mt-1.5 text-[32px] leading-[0.98] text-ink sm:text-[40px]">
                {monthLabel(month)}
              </h1>
              <p className="mt-2 max-w-xl text-[12.5px] leading-relaxed text-muted">
                {activeItem.blurb}
              </p>
            </div>
            <div className="hidden lg:flex lg:col-span-4 lg:justify-end lg:border-l lg:border-rule-strong lg:pl-6">
              <div className="flex gap-6">
                <div>
                  <p className="ledger-head">Reporting period</p>
                  <p className="num mt-0.5 text-[12px] text-ink">{month}</p>
                </div>
                <div className="text-right">
                  <p className="ledger-head">Currency</p>
                  <p className="num mt-0.5 text-[12px] text-ink">INR ₹</p>
                </div>
              </div>
            </div>
          </div>

          {persistenceError ? (
            <div className="mt-5">
              <InlineAlert tone="warning">
                Changes could not be saved to this browser. Storage may be full or disabled — your edits will be lost
                on refresh.
              </InlineAlert>
            </div>
          ) : null}

          <div key={page} className="page-enter mt-6">
            {renderPage()}
          </div>

          <footer className="mt-12 flex flex-col gap-2 border-t border-rule-strong pt-4 text-[10px] text-muted leading-relaxed sm:flex-row sm:items-end sm:justify-between">
            <p>FinPilot stores your records in this browser&apos;s LocalStorage. Insights are generated locally with
explainable rules and statistics — no external AI service is called.</p>
            <p className="font-mono uppercase tracking-[0.18em]">{monthLabel(month, { short: true })} — Ledger</p>
          </footer>
        </main>
      </div>
    </div>
  )
}

export default App
