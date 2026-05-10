import { useState, useEffect } from 'react'

function InfoChip({ label, value, right = false }) {
  return (
    <div className={`flex items-center gap-2 ${right ? 'flex-row-reverse' : ''}`}>
      <span
        className="text-[9px] font-mono font-semibold tracking-[0.18em] uppercase px-1.5 py-0.5 rounded"
        style={{ background: 'rgba(6,182,212,0.12)', color: 'var(--accent-cyan)', border: '1px solid rgba(6,182,212,0.2)' }}
      >
        {label}
      </span>
      <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{value}</span>
    </div>
  )
}

export default function LiveFeed() {
  const [blink, setBlink] = useState(true)
  useEffect(() => {
    const id = setInterval(() => setBlink((v) => !v), 900)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      className="panel scan-overlay relative flex flex-col overflow-hidden h-full"
      style={{ boxShadow: '0 0 0 1px rgba(6,182,212,0.12), 0 8px 32px rgba(0,0,0,0.7)' }}
    >
      <span className="corner-bracket corner-tl" />
      <span className="corner-bracket corner-tr" />
      <span className="corner-bracket corner-bl" />
      <span className="corner-bracket corner-br" />
      <div className="scan-beam" />

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] z-10 relative">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full bg-red-500 transition-opacity duration-500"
            style={{ opacity: blink ? 1 : 0.2, boxShadow: blink ? '0 0 6px 2px rgba(239,68,68,0.6)' : 'none' }}
          />
          <span className="text-[10px] font-mono font-bold tracking-[0.25em] uppercase" style={{ color: '#f87171' }}>Live</span>
        </div>
        <span className="text-[10px] font-mono tracking-[0.15em]" style={{ color: 'var(--text-faint)' }}>
          CAM — 01 &nbsp;|&nbsp; MAIN HALL
        </span>
        <span className="text-[10px] font-mono tracking-[0.1em]" style={{ color: 'var(--text-faint)' }}>
          1920×1080 &nbsp;·&nbsp; 30fps
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 flex items-center justify-center relative">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(6,182,212,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.8) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Reticle */}
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ border: '1px solid rgba(6,182,212,0.3)', boxShadow: '0 0 24px rgba(6,182,212,0.1)' }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ border: '1px solid rgba(6,182,212,0.5)' }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: 'var(--accent-cyan)', boxShadow: 'var(--glow-cyan)', animation: 'pulse2 1.4s ease-in-out infinite' }}
              />
            </div>
          </div>
          <span className="text-xs font-mono tracking-[0.35em] uppercase" style={{ color: 'var(--text-muted)' }}>
            Awaiting Feed
          </span>
          <span className="text-[10px] font-mono tracking-[0.2em]" style={{ color: 'var(--text-faint)' }}>
            Connect video source to begin
          </span>
        </div>

        {/* Overlay chips */}
        <div className="absolute bottom-3 left-4 flex flex-col gap-1">
          <InfoChip label="SESSION" value="CS301 — DSA" />
          <InfoChip label="FACULTY" value="Prof. R. Verma" />
        </div>
        <div className="absolute bottom-3 right-4 flex flex-col items-end gap-1">
          <InfoChip label="DETECTED" value="0 faces" right />
          <InfoChip label="THRESHOLD" value="82% conf." right />
        </div>
      </div>
    </div>
  )
}
