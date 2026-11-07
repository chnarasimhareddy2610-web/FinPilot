/**
 * FinPilot - first-launch demo data
 *
 * Seeded only when LocalStorage has never held a FinPilot document, so a
 * returning user's own records are never overwritten. Dates are generated
 * relative to today and never fall in the future.
 */

import { addMonths, currentMonth, parseISODate, uid } from '../utils/format.js'
import { STORAGE_VERSION } from './storageService.js'

const daysInMonth = (monthYear) => {
  const date = parseISODate(`${monthYear}-01`)
  if (!date) return 30
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

const dateIn = (monthYear, day) => {
  const isCurrent = monthYear === currentMonth()
  const today = new Date().getDate()
  const total = daysInMonth(monthYear)

  // For the month in progress the entries are scaled into the days that have
  // actually elapsed, so the demo never contains future-dated records and the
  // activity is still spread across several days.
  const safeDay = isCurrent
    ? Math.max(1, Math.min(Math.ceil((day / total) * today), today))
    : Math.max(1, Math.min(day, total))

  return `${monthYear}-${String(safeDay).padStart(2, '0')}`
}

export const buildSeedState = () => {
  const today = currentMonth()
  const lastMonth = addMonths(today, -1)
  const twoMonthsAgo = addMonths(today, -2)

  const entries = []

  const add = (monthYear, day, description, amount, type, category, notes = '') => {
    entries.push({
      id: uid(),
      description,
      amount,
      type,
      category,
      date: dateIn(monthYear, day),
      notes,
      createdAt: new Date().toISOString(),
    })
  }

  // ---- Current month -------------------------------------------------------
  add(today, 1, 'Salary Credit', 85000, 'income', 'Salary', 'Monthly payroll')
  add(today, 2, 'House Rent', 15000, 'expense', 'Housing', 'Monthly rent')
  add(today, 3, 'Swiggy', 640, 'expense', 'Food & Dining', 'Dinner with friends')
  add(today, 5, 'Netflix', 649, 'expense', 'Entertainment', 'Monthly subscription')
  add(today, 6, 'BigBasket', 3240, 'expense', 'Groceries', 'Monthly groceries')
  add(today, 7, 'Airtel Broadband', 999, 'expense', 'Bills & Utilities', 'Home internet')
  add(today, 8, 'Uber', 320, 'expense', 'Transportation', 'Airport drop')
  add(today, 9, 'Zomato', 780, 'expense', 'Food & Dining', 'Team lunch')
  add(today, 10, 'Amazon', 2450, 'expense', 'Shopping', 'Desk accessories')
  add(today, 11, 'Electricity Bill', 2450, 'expense', 'Bills & Utilities', 'BESCOM')
  add(today, 12, 'Third Wave Coffee', 1250, 'expense', 'Food & Dining', 'Weekend brunch')
  add(today, 13, 'Apollo Pharmacy', 620, 'expense', 'Healthcare', 'Monthly medicines')
  add(today, 14, 'Truffles', 1850, 'expense', 'Food & Dining', 'Birthday dinner')
  add(today, 15, 'Myntra', 1899, 'expense', 'Shopping', 'Work shirts')
  add(today, 16, 'Fuel — Shell', 1800, 'expense', 'Transportation', 'Full tank')
  add(today, 17, 'Dental Treatment', 12000, 'expense', 'Healthcare', 'Root canal, second sitting')

  // ---- Previous month ------------------------------------------------------
  add(lastMonth, 1, 'Salary Credit', 85000, 'income', 'Salary', 'Monthly payroll')
  add(lastMonth, 18, 'Freelance Project', 12000, 'income', 'Freelance Income', 'Landing page build')
  add(lastMonth, 2, 'House Rent', 15000, 'expense', 'Housing', 'Monthly rent')
  add(lastMonth, 4, 'Swiggy', 720, 'expense', 'Food & Dining', 'Dinner')
  add(lastMonth, 6, 'BigBasket', 2980, 'expense', 'Groceries', 'Monthly groceries')
  add(lastMonth, 8, 'Netflix', 649, 'expense', 'Entertainment', 'Monthly subscription')
  add(lastMonth, 9, 'Uber', 480, 'expense', 'Transportation', 'Office commute')
  add(lastMonth, 10, 'Electricity Bill', 2180, 'expense', 'Bills & Utilities', 'BESCOM')
  add(lastMonth, 12, 'College Fees', 15000, 'expense', 'Education', 'Semester fee')
  add(lastMonth, 14, 'Flipkart', 1150, 'expense', 'Shopping', 'Kitchen storage')
  add(lastMonth, 16, 'Metro Card Recharge', 500, 'expense', 'Transportation', 'NCMC top-up')
  add(lastMonth, 20, 'Spotify', 119, 'expense', 'Entertainment', 'Family plan')
  add(lastMonth, 22, 'Airtel Broadband', 999, 'expense', 'Bills & Utilities', 'Home internet')
  add(lastMonth, 25, 'Zomato', 940, 'expense', 'Food & Dining', 'Late dinner')

  // ---- Two months ago ------------------------------------------------------
  add(twoMonthsAgo, 1, 'Salary Credit', 85000, 'income', 'Salary', 'Monthly payroll')
  add(twoMonthsAgo, 2, 'House Rent', 15000, 'expense', 'Housing', 'Monthly rent')
  add(twoMonthsAgo, 3, 'BigBasket', 3410, 'expense', 'Groceries', 'Monthly groceries')
  add(twoMonthsAgo, 5, 'Swiggy', 860, 'expense', 'Food & Dining', 'Dinner')
  add(twoMonthsAgo, 7, 'Netflix', 649, 'expense', 'Entertainment', 'Monthly subscription')
  add(twoMonthsAgo, 8, 'Airtel Broadband', 999, 'expense', 'Bills & Utilities', 'Home internet')
  add(twoMonthsAgo, 11, 'Electricity Bill', 2650, 'expense', 'Bills & Utilities', 'BESCOM')
  add(twoMonthsAgo, 13, 'Ola', 410, 'expense', 'Transportation', 'Local travel')
  add(twoMonthsAgo, 15, 'Amazon', 3170, 'expense', 'Shopping', 'Monitor arm')
  add(twoMonthsAgo, 17, 'Gym Membership', 2400, 'expense', 'Healthcare', 'Quarterly plan')
  add(twoMonthsAgo, 21, 'Zomato', 510, 'expense', 'Food & Dining', 'Lunch')

  const budgets = {
    'Food & Dining': 4000,
    Groceries: 3500,
    Transportation: 1500,
    Shopping: 3000,
    Entertainment: 1500,
    'Bills & Utilities': 4000,
    Education: 2000,
    Healthcare: 3000,
    Housing: 16000,
  }

  const goal = (name, targetAmount, targetDate, contributions) => {
    const id = uid()
    return {
      id,
      name,
      targetAmount,
      targetDate,
      contributions: contributions.map(([amount, date]) => ({ id: uid(), amount, date })),
      createdAt: new Date().toISOString(),
    }
  }

  const year = new Date().getFullYear()
  const goals = [
    goal('Emergency Fund', 300000, `${year + 1}-06-30`, [
      [25000, `${addMonths(today, -6)}-05`],
      [30000, `${addMonths(today, -3)}-12`],
      [27000, `${addMonths(today, -1)}-08`],
    ]),
    goal('Japan Trip', 180000, `${year + 1}-03-15`, [
      [20000, `${addMonths(today, -2)}-20`],
      [25000, `${addMonths(today, -1)}-18`],
    ]),
    goal('New Laptop', 95000, `${year}-12-20`, [
      [40000, `${addMonths(today, -4)}-02`],
      [30000, `${addMonths(today, -2)}-14`],
    ]),
  ]

  return {
    version: STORAGE_VERSION,
    transactions: entries,
    budgets,
    goals,
    preferences: {
      currency: 'INR',
      dateFormat: 'DD MMM YYYY',
      createdAt: new Date().toISOString(),
    },
  }
}

