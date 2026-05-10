import { useState } from 'react'

/* ── Mock data ─────────────────────────────────────── */
const CLASSES = [
  { id: 'cs301', label: 'CS301 — Data Structures & Algorithms',  section: 'A', strength: 32 },
  { id: 'cs302', label: 'CS302 — Operating Systems',             section: 'A', strength: 30 },
  { id: 'cs303', label: 'CS303 — Database Management Systems',   section: 'B', strength: 28 },
  { id: 'cs304', label: 'CS304 — Computer Networks',             section: 'A', strength: 35 },
  { id: 'cs305', label: 'CS305 — Software Engineering',          section: 'C', strength: 29 },
  { id: 'ma101', label: 'MA101 — Engineering Mathematics',       section: 'B', strength: 60 },
]

const STUDENTS = [
  { roll: 'CS2101', name: 'Arjun Sharma'  },
  { roll: 'CS2102', name: 'Priya Nair'    },
  { roll: 'CS2103', name: 'Rohan Mehta'   },
  { roll: 'CS2104', name: 'Sneha Iyer'    },
  { roll: 'CS2105', name: 'Karan Patel'   },
  { roll: 'CS2106', name: 'Divya Reddy'   },
  { roll: 'CS2107', name: 'Aditya Kumar'  },
  { roll: 'CS2108', name: 'Meera Pillai'  },
]

/* seeded attendance for report rows */
function makeReport(classId, from, to) {
  const seed = classId.charCodeAt(2)
  return STUDENTS.map((s, i) => {
    const x = Math.sin(seed + i * 7.3) * 10000
    const r = x - Math.floor(x)
    const total   = 18 + Math.floor(r * 8)
    const present = Math.floor(total * (0.55 + r * 0.45))
    const pct     = Math.round((present / total) * 100)
    return { ...s, present, total, pct }
  })
}

/* ── Helpers ───────────────────────────────────────── */
const pctColor = (p) => (p >= 75 ? '#34d399' : p >= 60 ? '#fbbf24' : '#f87171')

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span
        className="font-mono text-[10px] font-semibold tracking-[0.22em] uppercase"
        style={{ color: 'var(--accent-cyan)' }}
      >
        {children}
      </span>
      <div className="flex-1 h-px" style={{ background: 'rgba(6,182,212,0.15)' }} />
    </div>
  )
}

/* ── Date input ────────────────────────────────────── */
function DateInput({ label, value, onChange, min, max }) {
  return (
    <div className="flex flex-col gap-1.5 flex-1">
      <label className="font-mono text-[9px] tracking-[0.22em] uppercase" style={{ color: 'var(--text-faint)' }}>
        {label}
      </label>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent font-mono text-xs py-2 px-3 rounded-md outline-none transition-all duration-200 w-full"
        style={{
          border: '1px solid rgba(6,182,212,0.25)',
          color: 'var(--text-primary)',
          colorScheme: 'dark',
          fontSize: '11px',
          letterSpacing: '0.08em',
        }}
        onFocus={(e)  => (e.target.style.borderColor = 'rgba(6,182,212,0.6)')}
        onBlur={(e)   => (e.target.style.borderColor = 'rgba(6,182,212,0.25)')}
      />
    </div>
  )
}

/* ── Report table ──────────────────────────────────── */
function ReportTable({ rows, cls, from, to }) {
  const above75 = rows.filter((r) => r.pct >= 75).length
  const below60 = rows.filter((r) => r.pct < 60).length

  return (
    <div
      className="panel flex flex-col overflow-hidden"
      style={{ boxShadow: '0 0 0 1px rgba(6,182,212,0.15), 0 8px 32px rgba(0,0,0,0.6)' }}
    >
      {/* Report header */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] shrink-0"
        style={{ background: 'rgba(6,182,212,0.03)' }}
      >
        <div>
          <p className="font-mono text-[11px] font-semibold tracking-[0.18em] uppercase" style={{ color: 'var(--accent-cyan)' }}>
            {cls.label}
          </p>
          <p className="font-mono text-[9px] mt-0.5" style={{ color: 'var(--text-faint)' }}>
            {from} → {to} &nbsp;·&nbsp; Section {cls.section} &nbsp;·&nbsp; {rows.length} students
          </p>
        </div>
        <div className="flex items-center gap-4">
          <StatPill label="≥75%" value={above75} color="#34d399" />
          <StatPill label="<60%" value={below60} color="#f87171" />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-y-auto custom-scroll">
        {/* Head */}
        <div
          className="grid font-mono text-[9px] tracking-[0.18em] uppercase px-5 py-2 border-b border-white/[0.04]"
          style={{ gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr 1.4fr', color: 'var(--text-faint)' }}
        >
          <span>Roll No.</span>
          <span>Name</span>
          <span className="text-right">Present</span>
          <span className="text-right">Total</span>
          <span className="text-right">%</span>
          <span className="text-right">Status</span>
        </div>

        {/* Rows */}
        {rows.map((r, i) => (
          <div
            key={r.roll}
            className="attendance-row grid items-center px-5 py-2.5 border-b transition-colors duration-100 hover:bg-white/[0.025]"
            style={{
              gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr 1.4fr',
              borderColor: 'rgba(255,255,255,0.04)',
              animationDelay: `${i * 60}ms`,
            }}
          >
            <span className="font-mono text-[10px]" style={{ color: 'var(--text-faint)' }}>{r.roll}</span>
            <span className="font-mono text-[11px]" style={{ color: 'var(--text-primary)' }}>{r.name}</span>
            <span className="font-mono text-[11px] text-right" style={{ color: 'var(--accent-cyan)' }}>{r.present}</span>
            <span className="font-mono text-[11px] text-right" style={{ color: 'var(--text-muted)' }}>{r.total}</span>
            <span className="font-mono text-[11px] font-bold text-right" style={{ color: pctColor(r.pct) }}>{r.pct}%</span>
            <div className="flex justify-end">
              <span
                className="font-mono text-[9px] font-bold tracking-[0.12em] uppercase px-2 py-0.5 rounded-full"
                style={
                  r.pct >= 75
                    ? { background: 'rgba(52,211,153,0.12)',  color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }
                    : r.pct >= 60
                    ? { background: 'rgba(251,191,36,0.12)',  color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }
                    : { background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }
                }
              >
                {r.pct >= 75 ? 'Good' : r.pct >= 60 ? 'At Risk' : 'Critical'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatPill({ label, value, color }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-sm font-bold" style={{ color }}>{value}</span>
      <span className="font-mono text-[9px] tracking-[0.12em] uppercase" style={{ color: 'var(--text-faint)' }}>{label}</span>
    </div>
  )
}

/* ── Page ──────────────────────────────────────────── */
export default function Report() {
  const today = new Date().toISOString().slice(0, 10)
  const threeMonthsAgo = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10)

  const [from, setFrom]         = useState(threeMonthsAgo)
  const [to, setTo]             = useState(today)
  const [selectedClass, setSelectedClass] = useState(null)
  const [reportData, setReportData]       = useState(null)
  const [generating, setGenerating]       = useState(false)

  const canGenerate = from && to && selectedClass && from <= to

  function handleGenerate() {
    if (!canGenerate) return
    setGenerating(true)
    setReportData(null)
    setTimeout(() => {
      setReportData(makeReport(selectedClass.id, from, to))
      setGenerating(false)
    }, 600)
  }

  return (
    <div className="h-full flex flex-col p-5 gap-4 overflow-y-auto custom-scroll">
      {/* ── Top strip ── */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, rgba(6,182,212,0.4), transparent)' }} />
        <span className="font-mono text-[10px] tracking-[0.3em] uppercase" style={{ color: 'var(--text-faint)' }}>
          Report Generator
        </span>
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-cyan)', opacity: 0.6 }} />
      </div>

      {/* ── Calendar / Date Range Panel ── */}
      <div
        className="panel px-6 py-5 shrink-0"
        style={{ boxShadow: '0 0 0 1px rgba(6,182,212,0.12), 0 4px 20px rgba(0,0,0,0.5)' }}
      >
        <SectionLabel>Calendar — Select Date Range</SectionLabel>
        <p className="font-mono text-[10px] tracking-[0.15em] uppercase mb-4" style={{ color: 'var(--text-faint)' }}>
          Select the date from / to to generate the report
        </p>
        <div className="flex items-end gap-4">
          <DateInput label="From" value={from} onChange={setFrom} max={to || today} />
          {/* Arrow */}
          <div className="pb-2.5 shrink-0">
            <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
              <path d="M1 6h18M13 1l6 5-6 5" stroke="rgba(6,182,212,0.5)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <DateInput label="To" value={to} onChange={setTo} min={from} max={today} />

          {/* Duration badge */}
          {from && to && from <= to && (
            <div
              className="pb-1 shrink-0 px-3 py-2 rounded-md flex flex-col gap-0.5"
              style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}
            >
              <span className="font-mono text-[9px] tracking-[0.18em] uppercase" style={{ color: 'var(--text-faint)' }}>Duration</span>
              <span className="font-mono text-xs font-bold" style={{ color: 'var(--accent-cyan)' }}>
                {Math.round((new Date(to) - new Date(from)) / 864e5) + 1} days
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom row: class selector + generate button ── */}
      <div className="flex items-start gap-5 min-h-0">
        {/* Class selector panel */}
        <div
          className="panel flex flex-col overflow-hidden shrink-0"
          style={{
            width: '380px',
            boxShadow: '0 0 0 1px rgba(6,182,212,0.12), 0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          <div className="px-5 pt-4 pb-3 border-b border-white/[0.06] shrink-0">
            <SectionLabel>Select Class</SectionLabel>
          </div>
          <div className="overflow-y-auto custom-scroll py-2 px-2 flex flex-col gap-1">
            {CLASSES.map((cls) => {
              const isSelected = selectedClass?.id === cls.id
              return (
                <button
                  key={cls.id}
                  onClick={() => { setSelectedClass(cls); setReportData(null) }}
                  className="w-full text-left px-4 py-3 rounded-lg transition-all duration-150"
                  style={{
                    background: isSelected ? 'rgba(6,182,212,0.1)' : 'transparent',
                    border: isSelected ? '1px solid rgba(6,182,212,0.35)' : '1px solid transparent',
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono text-[11px] font-semibold" style={{ color: isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                        {cls.id.toUpperCase()}
                      </p>
                      <p className="font-mono text-[10px] mt-0.5 leading-snug" style={{ color: 'var(--text-faint)' }}>
                        {cls.label.split('—')[1]?.trim()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 ml-3">
                      <span
                        className="font-mono text-[9px] tracking-[0.12em] uppercase px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(6,182,212,0.1)', color: 'var(--accent-cyan)', border: '1px solid rgba(6,182,212,0.2)' }}
                      >
                        Sec {cls.section}
                      </span>
                      <span className="font-mono text-[9px]" style={{ color: 'var(--text-faint)' }}>
                        {cls.strength} students
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right side: report output or placeholder */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {/* Generate button — top-right of this column */}
          <div className="flex justify-end shrink-0">
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || generating}
              className="flex items-center gap-2.5 px-6 py-2.5 rounded-lg font-mono text-xs font-bold tracking-[0.18em] uppercase transition-all duration-200"
              style={
                canGenerate && !generating
                  ? {
                      background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(20,184,166,0.12))',
                      border: '1px solid rgba(6,182,212,0.5)',
                      color: 'var(--accent-cyan)',
                      boxShadow: '0 0 16px rgba(6,182,212,0.2)',
                      cursor: 'pointer',
                    }
                  : {
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: 'rgba(255,255,255,0.2)',
                      cursor: 'not-allowed',
                    }
              }
              onMouseEnter={(e) => {
                if (canGenerate && !generating) e.currentTarget.style.boxShadow = '0 0 24px rgba(6,182,212,0.4)'
              }}
              onMouseLeave={(e) => {
                if (canGenerate && !generating) e.currentTarget.style.boxShadow = '0 0 16px rgba(6,182,212,0.2)'
              }}
            >
              {generating ? (
                <>
                  <svg className="animate-spin" width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="14 8" strokeLinecap="round"/>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 9.5h8M6 1.5v6M3.5 5L6 7.5 8.5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Generate Report
                </>
              )}
            </button>
          </div>

          {/* Report output */}
          {reportData ? (
            <ReportTable rows={reportData} cls={selectedClass} from={from} to={to} />
          ) : (
            <div
              className="panel flex flex-col items-center justify-center gap-3 flex-1"
              style={{
                minHeight: '200px',
                boxShadow: '0 0 0 1px rgba(6,182,212,0.08)',
                borderStyle: 'dashed',
              }}
            >
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect x="6" y="4" width="20" height="24" rx="3" stroke="rgba(6,182,212,0.25)" strokeWidth="1.5"/>
                <path d="M11 11h10M11 15h10M11 19h6" stroke="rgba(6,182,212,0.25)" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <p className="font-mono text-[10px] tracking-[0.2em] uppercase" style={{ color: 'var(--text-faint)' }}>
                {!selectedClass
                  ? 'Select a class to continue'
                  : !canGenerate
                  ? 'Fix date range to continue'
                  : 'Click Generate Report'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
