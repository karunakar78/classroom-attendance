import LiveFeed from '../components/LiveFeed'
import AttendancePanel from '../components/AttendancePanel'

export default function Home() {
  return (
    <div className="h-full flex flex-col p-5 gap-4">
      {/* Session indicator strip */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, rgba(6,182,212,0.4), transparent)' }} />
        <span className="font-mono text-[10px] tracking-[0.3em] uppercase" style={{ color: 'var(--text-faint)' }}>
          Session Active
        </span>
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: '#34d399', boxShadow: '0 0 6px rgba(52,211,153,0.7)', animation: 'pulse2 1.4s ease-in-out infinite' }}
        />
      </div>

      {/* Two-column layout */}
      <div className="flex-1 flex gap-5 min-h-0">
        <div className="flex-[3] min-h-0">
          <LiveFeed />
        </div>
        <div className="flex-[2] min-h-0">
          <AttendancePanel />
        </div>
      </div>
    </div>
  )
}
