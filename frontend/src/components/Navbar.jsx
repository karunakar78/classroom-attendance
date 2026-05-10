import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'

const TABS = [
  { label: 'HOME',     to: '/home' },
  { label: 'ANALYSIS', to: '/analysis' },
  { label: 'REPORT',   to: '/report' },
]

function Clock() {
  const [time, setTime] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const pad = (n) => String(n).padStart(2, '0')
  return (
    <div className="flex flex-col items-end min-w-[110px]">
      <span className="font-mono text-sm font-semibold" style={{ color: 'var(--accent-cyan)', letterSpacing: '0.12em' }}>
        {pad(time.getHours())}:{pad(time.getMinutes())}:{pad(time.getSeconds())}
      </span>
      <span className="font-mono text-[10px]" style={{ color: 'var(--text-faint)', letterSpacing: '0.08em' }}>
        {time.toDateString().toUpperCase()}
      </span>
    </div>
  )
}

export default function Navbar() {
  return (
    <header className="flex items-center justify-between px-8 py-4 border-b border-white/[0.06]">
      {/* Brand */}
      <div className="flex items-center gap-3 min-w-[220px]">
        <div
          className="w-7 h-5 rounded-sm flex items-center justify-center relative shrink-0"
          style={{ border: '1.5px solid var(--accent-cyan)', boxShadow: 'var(--glow-cyan)' }}
        >
          <div className="w-2.5 h-2.5 rounded-full" style={{ border: '1.5px solid var(--accent-cyan)', background: 'rgba(6,182,212,0.15)' }} />
          <div className="absolute -right-[5px] top-1/2 -translate-y-1/2 w-[5px] h-2 rounded-sm" style={{ background: 'var(--accent-cyan)' }} />
        </div>
        <span className="text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: 'var(--accent-cyan)', fontFamily: '"Syne", sans-serif' }}>
          Classroom Attendance
        </span>
      </div>

      {/* Tabs */}
      <nav className="flex items-center gap-1">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              [
                'px-6 py-2 text-xs font-mono font-semibold tracking-[0.18em] uppercase transition-all duration-200 rounded-md',
                isActive
                  ? 'text-cyan-300 bg-cyan-500/10 border border-cyan-500/30'
                  : 'text-white/35 border border-transparent hover:text-white/60 hover:bg-white/[0.04]',
              ].join(' ')
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Clock />
    </header>
  )
}
