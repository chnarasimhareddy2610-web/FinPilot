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
      <div className="px-5 pb-6 pt-7">
        <button
          type="button"
          onClick={() => navigate('overview')}
          className="group flex items-center gap-2.5 text-left"
          aria-label="FinPilot overview"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cream/15 bg-cream/[0.04] text-cream/85 transition-colors group-hover:border-coral/40 group-hover:text-coral">
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M3 14.5c2.4-3.6 4.4-3.6 6.8 0s4.4 3.6 6.8 0 2.6-2.8 4.4-2.2" />
            </svg>
          </span>
          <span>
            <span className="block text-[16.5px] font-medium leading-none tracking-[-0.03em] text-white">
              FinPilot
            </span>
            <span className="mt-1.5 block text-[10px] leading-none text-cream/40">
              Personal finance
            </span>
          </span>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 pb-3" aria-label="Primary">
        <div className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = page === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`nav-item group flex w-full items-center gap-3 px-3 py-2.5 text-left text-[13px] ${
                  isActive ? 'text-white' : 'text-cream/55 hover:text-cream'
                }`}
              >
                <Icon
                  name={item.icon}
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    isActive ? 'text-coral' : 'text-cream/35 group-hover:text-cream/70'
                  }`}
                />
                <span className="flex-1">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      <div className="border-t border-rule px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="h-1 w-1 rounded-full bg-coral/80" aria-hidden="true" />
          <p className="text-[10.5px] text-cream/60">Stored in this browser</p>
        </div>
        <p className="mt-1.5 text-[10px] leading-[1.6] text-cream/35">
          No account, no bank link. Nothing leaves your device.
        </p>
      </div>
    </>
  )

  return (
    <div className="relative min-h-screen">
      <div className="app-atmosphere pointer-events-none fixed inset-0 -z-10" aria-hidden="true" />

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[70] focus:rounded-full focus:bg-cream focus:px-4 focus:py-2 focus:text-sm focus:text-navy"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[15.5rem] flex-col border-r border-rule bg-[rgba(8,14,28,0.55)] backdrop-blur-2xl lg:flex">
        {navContent}
      </aside>

      {/* Mobile drawer */}
      {navOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="scrim absolute inset-0 bg-navy-deep/80 backdrop-blur-sm"
            onClick={() => setNavOpen(false)}
          />
          <aside className="dialog-panel relative flex h-full w-[16.5rem] max-w-[85vw] flex-col border-r border-rule bg-[rgba(8,14,28,0.94)] backdrop-blur-2xl">
            {navContent}
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-[16rem]">
        <header className="sticky top-0 z-30 border-b border-rule bg-[rgba(9,16,32,0.62)] backdrop-blur-2xl">
          <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-3 px-4 sm:px-6 lg:px-10">
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              className="rounded-full border border-rule bg-white/5 p-2 text-cream transition-colors hover:border-cream/30 lg:hidden"
              aria-label="Open navigation"
              aria-expanded={navOpen}
            >
              <Icon name="menu" className="h-4 w-4" />
            </button>

            <div className="min-w-0 flex-1" />

            <label className="sr-only" htmlFor="month-select">
              Select month
            </label>
            <div className="relative">
              <select
                id="month-select"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="field appearance-none py-1.5 pl-3 pr-8 text-[11px] text-cream"
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

        <main id="main-content" className="mx-auto max-w-[1280px] px-4 pb-16 pt-8 sm:px-6 lg:px-10 lg:pt-10">
          <div className="pb-9">
            <p className="eyebrow">{activeItem.label}</p>
            <h1 className="mt-3 text-[38px] leading-[0.94] text-white sm:text-[52px]">
              {monthLabel(month)}
            </h1>
            <p className="mt-3.5 max-w-lg text-[12.5px] leading-relaxed text-cream/55">
              {activeItem.blurb}
            </p>
          </div>

          {persistenceError ? (
            <div className="mt-5">
              <InlineAlert tone="warning">
                Changes could not be saved to this browser. Storage may be full or disabled — your edits will be lost
                on refresh.
              </InlineAlert>
            </div>
          ) : null}

          <div key={page} className="page-enter mt-2">
            {renderPage()}
          </div>

          <footer className="mt-14 flex flex-col gap-2 border-t border-rule pt-5 text-[10.5px] leading-relaxed text-muted sm:flex-row sm:items-end sm:justify-between">
            <p className="max-w-2xl">FinPilot stores your records in this browser&apos;s LocalStorage. Insights are generated locally with
explainable rules and statistics — no external AI service is called.</p>
            <p>{monthLabel(month, { short: true })} · Ledger</p>
          </footer>
        </main>
      </div>
    </div>
  )
}

export default App
