import React from 'react'

/**
 * Chart palette. Every series sits on the dark canvas using only the four
 * approved colours: cream and white for series that must read strongly, coral
 * for the accent, and cream/coral at reduced alpha for the quieter slices.
 */
export const CATEGORY_COLORS = [
  '#F4EDE0',
  '#FF6B5B',
  'rgba(244, 237, 224, 0.62)',
  'rgba(255, 107, 91, 0.58)',
  'rgba(244, 237, 224, 0.32)',
]

export const categoryColor = (index) => CATEGORY_COLORS[index % CATEGORY_COLORS.length]

const TRACK = 'rgba(244, 237, 224, 0.10)'
const GRID = 'rgba(244,237,224,0.09)',
  GRID_STRONG = 'rgba(244,237,224,0.17)'

/** Donut built from stroked circles with pathLength=100, so segments are exact. */
export const DonutChart = ({ data = [], total, centerLabel, centerValue, size = 176, thickness = 12 }) => {
  const sumOfData = data.reduce((acc, item) => acc + Number(item.value || 0), 0)
  if (sumOfData <= 0) {
    return (
      <div
        className="flex flex-col items-center justify-center border border-dashed border-ink/20 text-center"
        style={{ width: size, height: size, borderRadius: '50%' }}
      >
        <p className="text-[11px] text-muted">No spending</p>
        <p className="text-[11px] text-muted">this month</p>
      </div>
    )
  }

  let offset = 0
  const segments = data.map((item, index) => {
    const percent = (Number(item.value) / sumOfData) * 100
    const segment = {
      ...item,
      percent,
      offset,
      color: item.color || categoryColor(index),
    }
    offset += percent
    return segment
  })

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label="Spending distribution">
        <circle cx="50" cy="50" r="42" fill="none" stroke={TRACK} strokeWidth={thickness} />
        {segments.map((segment, index) => {
          const length = Math.max(segment.percent - 0.7, 0)
          return (
            <circle
              key={segment.label}
              className="donut-segment"
              style={{ '--i': index }}
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke={segment.color}
              strokeWidth={thickness}
              pathLength="100"
              strokeDasharray={`${length} ${100 - length}`}
              strokeDashoffset={-segment.offset}
              strokeLinecap="butt"
            >
              <title>{`${segment.label}: ${segment.percent.toFixed(1)}%`}</title>
            </circle>
          )
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="eyebrow text-[10px]">{centerLabel}</p>
        <p className="num mt-1 text-[19px] leading-none text-ink">{centerValue}</p>
        {total ? <p className="mt-1 text-[10.5px] text-muted">{total}</p> : null}
      </div>
    </div>
  )
}

/** Monthly income vs expense columns. Heights are relative to the series max. */
export const GroupedBars = ({ data = [], height = 172, formatValue = (v) => v }) => {
  const max = Math.max(1, ...data.flatMap((item) => [item.income, item.expenses]))
  if (data.length === 0) {
    return <p className="py-9 text-center text-[12px] text-muted">No monthly data to plot yet.</p>
  }

  return (
    <div>
      <div className="relative flex items-end gap-2 border-b border-grid-strong sm:gap-4" style={{ height }}>
        <span className="absolute inset-x-0 top-0 border-t border-grid" aria-hidden="true" />
        <span className="absolute inset-x-0 top-1/2 border-t border-grid" aria-hidden="true" />
        {data.map((item, index) => {
          const incomeHeight = Math.max((item.income / max) * 100, item.income > 0 ? 3 : 0)
          const expenseHeight = Math.max((item.expenses / max) * 100, item.expenses > 0 ? 3 : 0)
          const isCurrent = index === data.length - 1
          return (
            <div key={item.month} className="flex h-full flex-1 items-end justify-center gap-1.5 sm:gap-2">
              <div
                className="bar-column w-3 rounded-t-[3px] bg-cream sm:w-4"
                style={{ height: `${incomeHeight}%`, '--i': index, opacity: isCurrent ? 1 : 0.8 }}
                title={`${item.label} income: ${formatValue(item.income)}`}
              />
              <div
                className="bar-column w-3 rounded-t-[3px] bg-coral sm:w-4"
                style={{ height: `${expenseHeight}%`, '--i': index, opacity: isCurrent ? 1 : 0.72 }}
                title={`${item.label} expenses: ${formatValue(item.expenses)}`}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex gap-2 sm:gap-4">
        {data.map((item, index) => (
          <div
            key={item.month}
            className={`flex-1 text-center font-mono text-[9.5px] uppercase tracking-[0.08em] ${
              index === data.length - 1 ? 'text-ink' : 'text-muted'
            }`}
          >
            {item.shortLabel || item.label}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Single-series trend line with a drawn entrance. Values may be negative
 * (net savings), so the zero baseline is plotted instead of the chart floor.
 */
export const LineTrend = ({ data = [], formatValue = (v) => v, height = 180, fill = true }) => {
  if (data.length === 0) {
    return <p className="py-9 text-center text-[12px] text-muted">No monthly data to plot yet.</p>
  }

  const values = data.map((item) => Number(item.value) || 0)
  const max = Math.max(...values, 0)
  const min = Math.min(...values, 0)
  const span = max - min || 1
  const pad = 8
  const inner = 100 - pad * 2
  const pointX = (index) => (data.length === 1 ? 50 : pad + (index * inner) / (data.length - 1))
  const pointY = (value) => pad + (1 - (value - min) / span) * inner
  const zeroY = pointY(0)

  const points = data.map((item, index) => ({
    x: pointX(index),
    y: pointY(Number(item.value) || 0),
    ...item,
  }))

  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ')
  const area = `${line} L${points[points.length - 1].x.toFixed(2)} ${zeroY.toFixed(2)} L${points[0].x.toFixed(2)} ${zeroY.toFixed(2)} Z`

  return (
    <div>
      <div className="flex gap-3" style={{ height }}>
        <div className="relative h-full flex-1">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full" role="img" aria-label="Monthly net savings trend">
          {[0.25, 0.5, 0.75].map((fraction) => (
            <line key={fraction} x1="0" x2="100" y1={pad + inner * fraction} y2={pad + inner * fraction} stroke={GRID} strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
          ))}

          <line x1="0" x2="100" y1={zeroY} y2={zeroY} stroke={GRID_STRONG} strokeWidth="0.6" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />

          {fill ? <path d={area} fill="rgba(244,237,224,0.055)" /> : null}

          <path
            d={line}
            fill="none"
            stroke="#F4EDE0"
            strokeWidth="1.6"
            strokeLinejoin="round"
            strokeLinecap="round"
            pathLength="1000"
            vectorEffect="non-scaling-stroke"
            className="draw-line"
            style={{ '--len': 1000, '--offset': 0 }}
          />
        </svg>

        {/* Markers live outside the stretched SVG so they stay perfectly round. */}
        {points.map((point) => (
          <span
            key={point.label}
            className="absolute h-[5px] w-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-coral"
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
            title={`${point.label}: ${formatValue(point.value)}`}
          />
        ))}
        </div>

        <div className="pointer-events-none flex w-10 flex-col justify-between py-1 text-right">
          <span className="num text-[10px] text-muted">{formatValue(max)}</span>
          {min < 0 ? <span className="num text-[10px] text-muted">{formatValue(min)}</span> : null}
        </div>
      </div>

      <div className="mt-2 flex border-t border-rule pr-[3.25rem]">
        {data.map((item, index) => (
          <div
            key={item.month}
            className={`flex-1 font-mono text-[9.5px] uppercase tracking-[0.08em] ${
              index === data.length - 1 ? 'text-ink' : 'text-muted'
            } ${index === 0 ? 'text-left' : index === data.length - 1 ? 'text-right' : 'text-center'}`}
          >
            {item.shortLabel || item.label}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Circular progress used for goal funding. Animates once on mount. */
export const ProgressRing = ({ progress = 0, size = 108, stroke = 5, children }) => {
  const safe = Math.min(Math.max(Number(progress) || 0, 0), 100)
  const radius = 44

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label="Goal progress">
        <circle cx="50" cy="50" r={radius} fill="none" stroke={TRACK} strokeWidth={stroke} />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#FF6B5B"
          strokeWidth={stroke}
          pathLength="100"
          strokeDasharray="100"
          strokeDashoffset={100 - safe}
          strokeLinecap="butt"
          className="ring-progress"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  )
}

export const Legend = ({ items = [] }) => (
  <ul className="space-y-2">
    {items.map((item) => (
      <li key={item.label} className="flex items-center justify-between gap-3 text-[11.5px]">
        <span className="flex min-w-0 items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="truncate text-ink">{item.label}</span>
        </span>
        <span className="num shrink-0 text-muted">
          {item.valueLabel ?? item.value}
          {typeof item.percent === 'number' ? (
            <span className="ml-1.5 text-[10px] text-muted/80">{item.percent.toFixed(0)}%</span>
          ) : null}
        </span>
      </li>
    ))}
  </ul>
)
