import { useState } from 'react'

const ALL_STUDENTS = [
  { id: 1,  name: 'Arjun Sharma',   roll: 'CS2101', present: 42, total: 50 },
  { id: 2,  name: 'Priya Nair',     roll: 'CS2102', present: 47, total: 50 },
  { id: 3,  name: 'Rohan Mehta',    roll: 'CS2103', present: 31, total: 50 },
  { id: 4,  name: 'Sneha Iyer',     roll: 'CS2104', present: 49, total: 50 },
  { id: 5,  name: 'Karan Patel',    roll: 'CS2105', present: 28, total: 50 },
  { id: 6,  name: 'Divya Reddy',    roll: 'CS2106', present: 45, total: 50 },
  { id: 7,  name: 'Aditya Kumar',   roll: 'CS2107', present: 38, total: 50 },
  { id: 8,  name: 'Meera Pillai',   roll: 'CS2108', present: 50, total: 50 },
  { id: 9,  name: 'Vikram Singh',   roll: 'CS2109', present: 22, total: 50 },
  { id: 10, name: 'Ananya Bose',    roll: 'CS2110', present: 44, total: 50 },
  { id: 11, name: 'Rahul Gupta',    roll: 'CS2111', present: 36, total: 50 },
  { id: 12, name: 'Kavya Menon',    roll: 'CS2112', present: 48, total: 50 },
]

const initials = (name) => name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

const pct = (p, t) => Math.round((p / t) * 100)

const statusColor = (p) =>
  p >= 75 ? '#34d399' : p >= 60 ? '#fbbf24' : '#f87171'

export default function StudentList({ selected, onSelect }) {
  const [query, setQuery] = useState('')

  const filtered = ALL_STUDENTS.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.roll.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="panel flex flex-col h-full overflow-hidden"
      style={{ boxShadow: '0 0 0 1px rgba(6,182,212,0.12), 0 8px 32px rgba(0,0,0,0.6)' }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <circle cx="5.5" cy="5.5" r="4" stroke="var(--accent-cyan)" strokeWidth="1.2"/>
            <path d="M8.5 8.5L11 11" stroke="var(--accent-cyan)" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <span className="text-[11px] font-mono font-semibold tracking-[0.22em] uppercase"
            style={{ color: 'var(--accent-cyan)' }}>
            All Student List
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for student..."
            className="w-full bg-transparent font-mono text-xs tracking-wide py-2 pl-3 pr-8 rounded-md outline-none transition-all duration-200 placeholder:uppercase placeholder:tracking-[0.15em]"
            style={{
              border: '1px solid rgba(6,182,212,0.25)',
              color: 'var(--text-primary)',
              fontSize: '10px',
              letterSpacing: '0.1em',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(6,182,212,0.6)')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(6,182,212,0.25)')}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Count */}
        <div className="mt-2 flex items-center justify-between">
          <span className="font-mono text-[9px] tracking-[0.18em] uppercase" style={{ color: 'var(--text-faint)' }}>
            {filtered.length} student{filtered.length !== 1 ? 's' : ''}
          </span>
          <span className="font-mono text-[9px] tracking-[0.12em]" style={{ color: 'var(--text-faint)' }}>
            {ALL_STUDENTS.filter(s => pct(s.present, s.total) < 75).length} below 75%
          </span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scroll py-2 px-2 flex flex-col gap-1">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-24">
            <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: 'var(--text-faint)' }}>
              No results
            </span>
          </div>
        ) : (
          filtered.map((student) => {
            const p = pct(student.present, student.total)
            const isSelected = selected?.id === student.id
            return (
              <button
                key={student.id}
                onClick={() => onSelect(student)}
                className="w-full text-left px-3 py-2.5 rounded-lg transition-all duration-150 group"
                style={{
                  background: isSelected
                    ? 'rgba(6,182,212,0.1)'
                    : 'transparent',
                  border: isSelected
                    ? '1px solid rgba(6,182,212,0.35)'
                    : '1px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'transparent'
                }}
              >
                <div className="flex items-center gap-2.5">
                  {/* Avatar */}
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-mono font-bold"
                    style={{
                      background: isSelected
                        ? 'rgba(6,182,212,0.2)'
                        : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${isSelected ? 'rgba(6,182,212,0.5)' : 'rgba(255,255,255,0.1)'}`,
                      color: isSelected ? 'var(--accent-cyan)' : 'var(--text-muted)',
                    }}
                  >
                    {initials(student.name)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[12px] font-medium leading-tight truncate"
                      style={{ color: isSelected ? 'var(--text-primary)' : 'rgba(226,244,248,0.7)' }}
                    >
                      {student.name}
                    </p>
                    <p className="font-mono text-[9px] mt-0.5" style={{ color: 'var(--text-faint)' }}>
                      {student.roll}
                    </p>
                  </div>

                  {/* Percentage badge */}
                  <span
                    className="font-mono text-[10px] font-bold shrink-0"
                    style={{ color: statusColor(p) }}
                  >
                    {p}%
                  </span>
                </div>

                {/* Mini progress bar */}
                <div className="mt-2 h-[2px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${p}%`,
                      background: statusColor(p),
                      boxShadow: `0 0 4px ${statusColor(p)}88`,
                    }}
                  />
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
