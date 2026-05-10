import { useEffect, useState } from 'react'

/* ── mock per-student data ─────────────────────────── */
const MONTHLY = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan']
const SUBJECTS = ['DSA', 'OS', 'DBMS', 'CN', 'SE', 'Math']

function seedData(studentId) {
  const rng = (min, max, seed) => {
    const x = Math.sin(studentId * 13 + seed) * 10000
    return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min
  }
  return {
    monthly: MONTHLY.map((m, i) => ({ month: m, present: rng(4, 10, i), total: 10 })),
    subjects: SUBJECTS.map((s, i) => ({ subject: s, present: rng(6, 20, i + 50), total: 20 })),
  }
}

/* ── Donut chart (SVG) ─────────────────────────────── */
function DonutChart({ pct }) {
  const r = 44
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  const color = pct >= 75 ? '#34d399' : pct >= 60 ? '#fbbf24' : '#f87171'

  return (
    <div className="relative flex items-center justify-center" style={{ width: 110, height: 110 }}>
      <svg width="110" height="110" viewBox="0 0 110 110">
        {/* Track */}
        <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" />
        {/* Progress */}
        <circle
          cx="55" cy="55" r={r} fill="none"
          stroke={color} strokeWidth="9"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          strokeDashoffset={circ * 0.25}
          style={{ filter: `drop-shadow(0 0 6px ${color}88)`, transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-mono text-xl font-bold" style={{ color, lineHeight: 1 }}>{pct}%</span>
        <span className="font-mono text-[8px] tracking-[0.2em] uppercase mt-0.5" style={{ color: 'var(--text-faint)' }}>Overall</span>
      </div>
    </div>
  )
}

/* ── Bar chart (SVG) ───────────────────────────────── */
function BarChart({ data }) {
  const max = Math.max(...data.map((d) => d.total))
  const W = 540, H = 120, barW = 40, gap = (W - data.length * barW) / (data.length + 1)

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H + 24}`} preserveAspectRatio="xMidYMid meet">
      {data.map((d, i) => {
        const x = gap + i * (barW + gap)
        const pct = d.present / d.total
        const barH = pct * H
        const color = pct >= 0.75 ? '#34d399' : pct >= 0.6 ? '#fbbf24' : '#f87171'
        return (
          <g key={d.month ?? d.subject}>
            {/* Track */}
            <rect x={x} y={0} width={barW} height={H} rx="4" fill="rgba(255,255,255,0.04)" />
            {/* Bar */}
            <rect
              x={x} y={H - barH} width={barW} height={barH} rx="4"
              fill={color} opacity="0.85"
              style={{ filter: `drop-shadow(0 0 4px ${color}66)` }}
            />
            {/* Label */}
            <text
              x={x + barW / 2} y={H + 16}
              textAnchor="middle" fontSize="9"
              fill="rgba(226,244,248,0.3)"
              fontFamily="'IBM Plex Mono', monospace"
              letterSpacing="1"
            >
              {d.month ?? d.subject}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/* ── Subject progress bars ─────────────────────────── */
function SubjectRow({ subject, present, total }) {
  const pct = Math.round((present / total) * 100)
  const color = pct >= 75 ? '#34d399' : pct >= 60 ? '#fbbf24' : '#f87171'
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[10px] w-12 shrink-0" style={{ color: 'var(--text-muted)' }}>{subject}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 5px ${color}88` }}
        />
      </div>
      <span className="font-mono text-[10px] w-8 text-right shrink-0" style={{ color }}>{pct}%</span>
    </div>
  )
}

/* ── Stat card ─────────────────────────────────────── */
function StatCard({ label, value, sub, color }) {
  return (
    <div
      className="flex flex-col gap-1 px-4 py-3 rounded-lg"
      style={{ background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.1)' }}
    >
      <span className="font-mono text-xl font-bold" style={{ color }}>{value}</span>
      <span className="font-mono text-[10px] font-semibold tracking-[0.1em] uppercase" style={{ color: 'var(--text-primary)' }}>{label}</span>
      {sub && <span className="font-mono text-[9px]" style={{ color: 'var(--text-faint)' }}>{sub}</span>}
    </div>
  )
}

/* ── Empty state ───────────────────────────────────── */
function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4">
      <div
        className="w-16 h-16 rounded-xl flex items-center justify-center"
        style={{ border: '1px solid rgba(6,182,212,0.2)', background: 'rgba(6,182,212,0.04)' }}
      >
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="10" r="5" stroke="rgba(6,182,212,0.5)" strokeWidth="1.4"/>
          <path d="M5 24c0-4.418 4.03-8 9-8s9 3.582 9 8" stroke="rgba(6,182,212,0.5)" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      </div>
      <div className="text-center">
        <p className="font-mono text-[11px] tracking-[0.25em] uppercase mb-1" style={{ color: 'var(--text-muted)' }}>
          No student selected
        </p>
        <p className="font-mono text-[10px] tracking-[0.15em] uppercase" style={{ color: 'var(--text-faint)' }}>
          Choose a student from the list
        </p>
      </div>
    </div>
  )
}

/* ── Main component ────────────────────────────────── */
export default function StudentAnalysis({ student }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!student) return
    setData(null)
    const t = setTimeout(() => setData(seedData(student.id)), 300)
    return () => clearTimeout(t)
  }, [student])

  if (!student) {
    return (
      <div className="panel h-full" style={{ boxShadow: '0 0 0 1px rgba(6,182,212,0.12), 0 8px 32px rgba(0,0,0,0.7)' }}>
        <EmptyState />
      </div>
    )
  }

  const overallPct = Math.round((student.present / student.total) * 100)
  const statusColor = overallPct >= 75 ? '#34d399' : overallPct >= 60 ? '#fbbf24' : '#f87171'

  return (
    <div
      className="panel flex flex-col h-full overflow-hidden"
      style={{ boxShadow: '0 0 0 1px rgba(6,182,212,0.15), 0 8px 32px rgba(0,0,0,0.7)' }}
    >
      {/* ── Student header ── */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0"
        style={{ background: 'rgba(6,182,212,0.025)' }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-mono font-bold text-sm"
            style={{
              background: 'linear-gradient(135deg, rgba(6,182,212,0.25), rgba(20,184,166,0.15))',
              border: '1.5px solid rgba(6,182,212,0.4)',
              color: 'var(--accent-cyan)',
              boxShadow: '0 0 12px rgba(6,182,212,0.2)',
            }}
          >
            {student.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <h2 className="font-semibold text-base" style={{ fontFamily: '"Syne", sans-serif', color: 'var(--text-primary)' }}>
              {student.name}
            </h2>
            <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--text-faint)' }}>
              {student.roll} &nbsp;·&nbsp; CSE &nbsp;·&nbsp; Semester 4
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: `${statusColor}15`, border: `1px solid ${statusColor}40` }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }}/>
          <span className="font-mono text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: statusColor }}>
            {overallPct >= 75 ? 'On Track' : overallPct >= 60 ? 'At Risk' : 'Critical'}
          </span>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto custom-scroll px-6 py-5 flex flex-col gap-6">

        {!data ? (
          <div className="flex items-center justify-center h-32">
            <span className="font-mono text-[10px] tracking-[0.25em] uppercase" style={{ color: 'var(--text-faint)' }}>
              Loading analysis...
            </span>
          </div>
        ) : (
          <>
            {/* ── Stat cards + donut ── */}
            <div className="flex items-center gap-4">
              <DonutChart pct={overallPct} />
              <div className="flex-1 grid grid-cols-3 gap-3">
                <StatCard label="Classes Attended" value={student.present} sub={`of ${student.total} total`} color="var(--accent-cyan)" />
                <StatCard label="Absences"          value={student.total - student.present} sub="classes missed" color="#f87171" />
                <StatCard label="Streak"            value="6"  sub="consecutive days" color="#fbbf24" />
              </div>
            </div>

            {/* ── Monthly attendance bar chart ── */}
            <div>
              <SectionLabel>Monthly Attendance</SectionLabel>
              <div className="mt-3 px-2">
                <BarChart data={data.monthly} />
              </div>
            </div>

            {/* ── Subject-wise ── */}
            <div>
              <SectionLabel>Subject-wise Breakdown</SectionLabel>
              <div className="mt-3 flex flex-col gap-2.5">
                {data.subjects.map((s) => (
                  <SubjectRow key={s.subject} {...s} />
                ))}
              </div>
            </div>

            {/* ── Last 5 sessions ── */}
            <div>
              <SectionLabel>Recent Sessions</SectionLabel>
              <div className="mt-3 flex flex-col gap-1.5">
                {[
                  { date: '10 May 2026', subject: 'DSA',  status: 'present' },
                  { date: '09 May 2026', subject: 'OS',   status: 'present' },
                  { date: '08 May 2026', subject: 'DBMS', status: 'absent'  },
                  { date: '07 May 2026', subject: 'CN',   status: 'present' },
                  { date: '06 May 2026', subject: 'SE',   status: 'present' },
                ].map((session, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-4 py-2 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <span className="font-mono text-[10px]" style={{ color: 'var(--text-faint)' }}>{session.date}</span>
                    <span className="font-mono text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>{session.subject}</span>
                    <span
                      className="font-mono text-[9px] font-bold tracking-[0.15em] uppercase px-2 py-0.5 rounded-full"
                      style={
                        session.status === 'present'
                          ? { background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }
                          : { background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }
                      }
                    >
                      {session.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[10px] font-semibold tracking-[0.22em] uppercase" style={{ color: 'var(--accent-cyan)' }}>
        {children}
      </span>
      <div className="flex-1 h-px" style={{ background: 'rgba(6,182,212,0.15)' }} />
    </div>
  )
}
