import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'

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
          <span
            className="font-mono text-[9px] font-semibold tracking-[0.12em] uppercase px-1.5 py-0.5 rounded mt-0.5 inline-block"
            style={{ background: 'rgba(6,182,212,0.1)', color: 'var(--accent-cyan)', border: '1px solid rgba(6,182,212,0.25)' }}
          >
            {record.roll_no}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>{record.marked_at}</span>
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

const SELECT_STYLE = {
  background: '#0d1f2d',
  border: '1px solid rgba(6,182,212,0.3)',
  color: '#e2e8f0',
  borderRadius: '8px',
  outline: 'none',
}

/* ── Session starter ──────────────────────────────────────────────────────── */
function SessionStarter({ onSessionStarted }) {
  const [cameras,          setCameras]          = useState([])
  const [selectedCamera,   setSelectedCamera]   = useState(null)
  const [selectedSemester, setSelectedSemester] = useState('')
  const [starting,         setStarting]         = useState(false)

  useEffect(() => {
    api.getCameras().then(setCameras).catch(() => {})
  }, [])

  async function handleStart() {
    if (!selectedCamera || !selectedSemester || starting) return
    setStarting(true)
    try {
      await api.startSession(Number(selectedSemester), selectedCamera.id)
      onSessionStarted()
    } catch {
      setStarting(false)
    }
  }

  const canStart = !!selectedCamera && !!selectedSemester && !starting

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ border: '1px solid rgba(6,182,212,0.2)', background: 'rgba(6,182,212,0.04)' }}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect x="2" y="2" width="18" height="18" rx="3" stroke="rgba(6,182,212,0.5)" strokeWidth="1.4"/>
          <path d="M11 7v8M7 11h8" stroke="rgba(6,182,212,0.5)" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      </div>

      <div className="text-center">
        <p className="font-mono text-[11px] tracking-[0.22em] uppercase mb-1" style={{ color: 'var(--text-muted)' }}>
          No Active Session
        </p>
        <p className="font-mono text-[9px] tracking-[0.15em] uppercase" style={{ color: 'var(--text-faint)' }}>
          Select classroom &amp; semester to begin
        </p>
      </div>

      {/* Classroom */}
      <div className="w-full flex flex-col gap-1">
        <label className="font-mono text-[9px] tracking-[0.18em] uppercase" style={{ color: 'var(--text-faint)' }}>
          Classroom
        </label>
        <select
          value={selectedCamera?.id ?? ''}
          onChange={e => setSelectedCamera(cameras.find(c => c.id === Number(e.target.value)) ?? null)}
          className="w-full px-3 py-2 text-[11px] font-mono"
          style={SELECT_STYLE}
        >
          <option value="">— select classroom —</option>
          {cameras.map(c => (
            <option key={c.id} value={c.id}>{c.name} — {c.location}</option>
          ))}
        </select>
      </div>

      {/* Semester */}
      <div className="w-full flex flex-col gap-1">
        <label className="font-mono text-[9px] tracking-[0.18em] uppercase" style={{ color: 'var(--text-faint)' }}>
          Semester
        </label>
        <select
          value={selectedSemester}
          onChange={e => setSelectedSemester(e.target.value)}
          className="w-full px-3 py-2 text-[11px] font-mono"
          style={SELECT_STYLE}
        >
          <option value="">— select semester —</option>
          {[1,2,3,4,5,6,7,8].map(s => (
            <option key={s} value={s}>Semester {s}</option>
          ))}
        </select>
      </div>

      <button
        onClick={handleStart}
        disabled={!canStart}
        className="w-full py-2.5 rounded-lg font-mono text-xs font-bold tracking-[0.18em] uppercase transition-all duration-200"
        style={
          canStart
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
      >
        {starting ? 'Starting...' : 'Start Session'}
      </button>
    </div>
  )
}

/* ── Main panel ───────────────────────────────────────────────────────────── */
export default function AttendancePanel({ onSessionChange, refreshKey }) {
  const [session, setSession] = useState(undefined)
  const [ending, setEnding]   = useState(false)

  const fetchSession = useCallback(async () => {
    try {
      const data = await api.getCurrentSession()
      setSession(data)
    } catch {
      setSession(null)
    }
  }, [])

  useEffect(() => {
    fetchSession()
    const id = setInterval(fetchSession, 3000)
    return () => clearInterval(id)
  }, [fetchSession])

  // Immediate refresh when LiveFeed marks a new attendance
  useEffect(() => {
    if (refreshKey) fetchSession()
  }, [refreshKey, fetchSession])

  function handleSessionStarted() {
    fetchSession()
    onSessionChange?.()
  }

  async function handleEnd() {
    if (ending) return
    setEnding(true)
    try {
      await api.endSession()
      fetchSession()
      onSessionChange?.()
    } catch {
      /* ignore */
    } finally {
      setEnding(false)
    }
  }

  const records  = session?.attendance ?? []
  const strength = session?.strength ?? 0

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
        {session && (
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {records.length} / {strength}
            </span>
            <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${strength > 0 ? (records.length / strength) * 100 : 0}%`,
                  background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-teal))',
                  boxShadow: '0 0 6px rgba(6,182,212,0.5)',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Stats strip */}
      {session && (
        <div className="flex items-center gap-5 px-5 py-2.5 border-b border-white/[0.04] shrink-0" style={{ background: 'rgba(6,182,212,0.025)' }}>
          <Stat label="Present"  value={records.length}                        color="#34d399" />
          <Stat label="Absent"   value={Math.max(0, strength - records.length)} color="#f87171" />
          {session.semester && (
            <Stat label="Semester" value={`Sem ${session.semester}`} color="var(--accent-cyan)" />
          )}
          {session.camera_name && (
            <Stat label="Room" value={session.camera_location} color="var(--text-muted)" />
          )}
          <div className="ml-auto">
            <button
              onClick={handleEnd}
              disabled={ending}
              className="font-mono text-[9px] tracking-[0.15em] uppercase px-3 py-1 rounded-md transition-all duration-150"
              style={{
                background: 'rgba(248,113,113,0.08)',
                border: '1px solid rgba(248,113,113,0.25)',
                color: '#f87171',
                cursor: ending ? 'not-allowed' : 'pointer',
              }}
            >
              {ending ? '...' : 'End'}
            </button>
          </div>
        </div>
      )}

      {/* Body */}
      {session === undefined ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="font-mono text-[10px] tracking-[0.25em] uppercase" style={{ color: 'var(--text-faint)' }}>
            Loading...
          </span>
        </div>
      ) : !session ? (
        <SessionStarter onSessionStarted={handleSessionStarted} />
      ) : records.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <span className="font-mono text-[10px] tracking-[0.22em] uppercase" style={{ color: 'var(--text-faint)' }}>
            Awaiting recognition...
          </span>
          <span className="font-mono text-[9px]" style={{ color: 'var(--text-faint)', opacity: 0.5 }}>
            {session.camera_name ?? 'CAM-01'} · Sem {session.semester ?? '—'}
          </span>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scroll px-4 py-3 flex flex-col gap-2">
          {records.map((rec, i) => (
            <AttendanceRow key={rec.id} record={rec} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
