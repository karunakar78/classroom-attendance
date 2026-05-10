import { useState } from 'react'

const MOCK_RECORDS = [
  { id: 1, name: 'Arjun Sharma', roll: 'CS2101', time: '09:02 AM', dept: 'CSE' },
  { id: 2, name: 'Priya Nair',   roll: 'CS2102', time: '09:04 AM', dept: 'CSE' },
  { id: 3, name: 'Rohan Mehta',  roll: 'CS2103', time: '09:07 AM', dept: 'CSE' },
  { id: 4, name: 'Sneha Iyer',   roll: 'CS2104', time: '09:11 AM', dept: 'CSE' },
  { id: 5, name: 'Karan Patel',  roll: 'CS2105', time: '09:15 AM', dept: 'CSE' },
  { id: 6, name: 'Divya Reddy',  roll: 'CS2106', time: '09:18 AM', dept: 'CSE' },
]

const initials = (name) => name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

function Stat({ label, value, color }) {
  return (
    <div className="flex flex-col">
      <span className="font-mono text-xs font-semibold" style={{ color }}>{value}</span>
      <span className="font-mono text-[9px] tracking-[0.15em] uppercase" style={{ color: 'var(--text-faint)' }}>{label}</span>
    </div>
  )
}

function AttendanceRow({ record, index }) {
  return (
    <div
      className="attendance-row flex items-center justify-between px-4 py-3 rounded-lg transition-colors duration-150 hover:bg-white/[0.04] cursor-default"
      style={{
        background: 'rgba(6,182,212,0.025)',
        border: '1px solid rgba(6,182,212,0.1)',
        animationDelay: `${index * 120}ms`,
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-mono font-bold"
          style={{
            background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(20,184,166,0.15))',
            border: '1px solid rgba(6,182,212,0.35)',
            color: 'var(--accent-cyan)',
          }}
        >
          {initials(record.name)}
        </div>
        <div>
          <p className="text-white text-[13px] font-medium leading-tight">{record.name}</p>
          <p className="font-mono text-[10px]" style={{ color: 'var(--text-faint)' }}>
            {record.roll} &nbsp;·&nbsp; {record.dept}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>{record.time}</span>
        <span
          className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold tracking-widest uppercase"
          style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}
        >
          ✓ Present
        </span>
      </div>
    </div>
  )
}

export default function AttendancePanel() {
  const [records] = useState(MOCK_RECORDS)
  const total = 32

  return (
    <div className="panel flex flex-col h-full overflow-hidden" style={{ boxShadow: '0 0 0 1px rgba(6,182,212,0.12), 0 8px 32px rgba(0,0,0,0.6)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="12" height="12" rx="2" stroke="var(--accent-cyan)" strokeWidth="1.2" />
            <path d="M4 7h6M4 4.5h6M4 9.5h4" stroke="var(--accent-cyan)" strokeWidth="1.1" strokeLinecap="round" />
          </svg>
          <span className="text-[11px] font-mono font-semibold tracking-[0.22em] uppercase" style={{ color: 'var(--accent-cyan)' }}>
            Attendance Marked
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>{records.length} / {total}</span>
          <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${(records.length / total) * 100}%`,
                background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-teal))',
                boxShadow: '0 0 6px rgba(6,182,212,0.5)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="flex items-center gap-6 px-5 py-2.5 border-b border-white/[0.04] shrink-0" style={{ background: 'rgba(6,182,212,0.025)' }}>
        <Stat label="Present"  value={records.length}          color="#34d399" />
        <Stat label="Absent"   value={total - records.length}  color="#f87171" />
        <Stat label="Session"  value="CS301"                   color="var(--accent-cyan)" />
        <Stat label="Duration" value="50 min"                  color="var(--text-muted)" />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scroll px-4 py-3 flex flex-col gap-2">
        {records.map((rec, i) => (
          <AttendanceRow key={rec.id} record={rec} index={i} />
        ))}
      </div>
    </div>
  )
}
