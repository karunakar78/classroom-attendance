import { useState, useEffect, useCallback } from 'react'
import LiveFeed from '../components/LiveFeed'
import AttendancePanel from '../components/AttendancePanel'
import { api } from '../api'

export default function Home() {
  const [session,    setSession]    = useState(undefined) // undefined=loading, null=none, obj=active
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchSession = useCallback(async () => {
    try {
      const data = await api.getCurrentSession()
      setSession(data)
    } catch {
      setSession(null)
    }
  }, [])

  const handleAttendanceMarked = useCallback(() => {
    fetchSession()
    setRefreshKey(k => k + 1)
  }, [fetchSession])

  useEffect(() => {
    fetchSession()
    const id = setInterval(fetchSession, 5000)
    return () => clearInterval(id)
  }, [fetchSession])

  const isActive = !!session

  return (
    <div className="h-full flex flex-col p-5 gap-4">
      {/* Session indicator strip */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, rgba(6,182,212,0.4), transparent)' }} />
        <span className="font-mono text-[10px] tracking-[0.3em] uppercase" style={{ color: 'var(--text-faint)' }}>
          {session === undefined
            ? 'Loading...'
            : isActive
            ? `Session Active — ${session.class_code}${session.semester ? ` · Sem ${session.semester}` : ''}`
            : 'No Active Session'}
        </span>
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: isActive ? '#34d399' : 'rgba(255,255,255,0.2)',
            boxShadow: isActive ? '0 0 6px rgba(52,211,153,0.7)' : 'none',
            animation: isActive ? 'pulse2 1.4s ease-in-out infinite' : 'none',
          }}
        />
      </div>

      {/* Two-column layout */}
      <div className="flex-1 flex gap-5 min-h-0">
        <div className="flex-[3] min-h-0">
          <LiveFeed session={session} onAttendanceMarked={handleAttendanceMarked} />
        </div>
        <div className="flex-[2] min-h-0">
          <AttendancePanel onSessionChange={fetchSession} refreshKey={refreshKey} />
        </div>
      </div>
    </div>
  )
}
