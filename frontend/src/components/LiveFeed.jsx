import { useState, useEffect, useRef } from 'react'
import Webcam from 'react-webcam'
import { api } from '../api'

const BACKEND        = 'http://localhost:8000'
const FRAME_INTERVAL = 300   // ms between frames sent to backend
const DWELL_MS       = 2000  // face must stay recognised this long before marking
const RESET_GAP_MS   = 1500  // face absent longer than this → timer resets

function InfoChip({ label, value, right = false }) {
  return (
    <div className={`flex items-center gap-2 ${right ? 'flex-row-reverse' : ''}`}>
      <span
        className="text-[9px] font-mono font-semibold tracking-[0.18em] uppercase px-1.5 py-0.5 rounded"
        style={{ background: 'rgba(6,182,212,0.12)', color: 'var(--accent-cyan)', border: '1px solid rgba(6,182,212,0.2)' }}
      >
        {label}
      </span>
      <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
        {value}
      </span>
    </div>
  )
}

function FaceBox({ face, webcamRef }) {
  const [x1, y1, x2, y2] = face.box
  const video      = webcamRef.current?.video
  const videoW     = video?.videoWidth  || 640
  const videoH     = video?.videoHeight || 480
  const containerW = video?.clientWidth  || videoW
  const containerH = video?.clientHeight || videoH
  const displayScale = Math.max(containerW / videoW, containerH / videoH)
  const scale      = displayScale * videoW / containerW
  const offsetX    = (containerW - videoW * displayScale) / 2
  const offsetY    = (containerH - videoH * displayScale) / 2

  const left   = x1 * scale + offsetX
  const top    = y1 * scale + offsetY
  const width  = (x2 - x1) * scale
  const height = (y2 - y1) * scale

  const { status, progress = 0, confidence, name } = face

  const borderColor =
    status === 'unknown'    ? '#ef4444' :
    status === 'validating' ? '#f59e0b' :
                              '#22c55e'

  const glowColor =
    status === 'unknown'    ? 'rgba(239,68,68,0.6)' :
    status === 'validating' ? 'rgba(245,158,11,0.6)' :
                              'rgba(34,197,94,0.6)'

  const labelBg =
    status === 'unknown'    ? 'rgba(239,68,68,0.92)' :
    status === 'validating' ? 'rgba(245,158,11,0.92)' :
                              'rgba(34,197,94,0.92)'

  const elapsed = Math.min(DWELL_MS, Math.round(progress / 100 * DWELL_MS))

  return (
    <div
      className="absolute"
      style={{
        left, top, width, height,
        border: `2px solid ${borderColor}`,
        boxShadow: `0 0 12px ${glowColor}`,
        borderRadius: '6px',
      }}
    >
      <div
        className="absolute -top-6 left-0 px-2 py-1 text-[10px] font-mono whitespace-nowrap flex items-center gap-1"
        style={{ background: labelBg, color: 'white', borderRadius: '4px' }}
      >
        <span>{name}</span>
        <span style={{ opacity: 0.85 }}>{Math.round(confidence * 100)}%</span>
        {status === 'validating' && (
          <span style={{ opacity: 0.7 }}>· {(elapsed / 1000).toFixed(1)}s</span>
        )}
        {status === 'marked' && <span>✓</span>}
      </div>

      {status === 'validating' && (
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{ height: '3px', background: 'rgba(245,158,11,0.2)' }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: '#f59e0b',
              boxShadow: '0 0 6px rgba(245,158,11,0.9)',
              transition: `width ${FRAME_INTERVAL}ms linear`,
            }}
          />
        </div>
      )}
    </div>
  )
}

export default function LiveFeed({ session, onAttendanceMarked }) {
  const [blink, setBlink]         = useState(true)
  const [faces, setFaces]         = useState([])
  const [faceCount, setFaceCount] = useState(0)
  const [camReady, setCamReady]   = useState(false)
  const [error, setError]         = useState(null)

  const webcamRef        = useRef(null)
  const sendingRef       = useRef(false)
  const lastSentRef      = useRef(0)
  const sessionRef       = useRef(session)
  const onMarkedRef      = useRef(onAttendanceMarked)
  const faceTimersRef    = useRef({})   // { name: { startTime, lastSeenTime } }
  const markedNamesRef   = useRef(new Set())
  const captureAndSendRef = useRef(null)

  sessionRef.current  = session
  onMarkedRef.current = onAttendanceMarked

  // Reset tracking when session changes
  const prevSessionId = useRef(null)
  useEffect(() => {
    if (session?.id !== prevSessionId.current) {
      faceTimersRef.current  = {}
      markedNamesRef.current = new Set()
      prevSessionId.current  = session?.id ?? null
    }
  }, [session?.id])

  // Blink animation
  useEffect(() => {
    const id = setInterval(() => setBlink(v => !v), 900)
    return () => clearInterval(id)
  }, [])

  captureAndSendRef.current = async () => {
    if (!camReady || !webcamRef.current) return
    const video = webcamRef.current.video
    if (!video || video.readyState !== 4) return
    if (sendingRef.current) return

    const now = Date.now()
    if (now - lastSentRef.current < FRAME_INTERVAL) return
    lastSentRef.current = now

    const screenshot = webcamRef.current.getScreenshot()
    if (!screenshot || typeof screenshot !== 'string') return

    sendingRef.current = true
    try {
      const res = await fetch(`${BACKEND}/recognition/frame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: screenshot }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      const allFaces        = data.faces || []
      const recognizedFaces = allFaces.filter(f => f.name !== 'Unknown')
      const visibleNames    = new Set(recognizedFaces.map(f => f.name))

      // Update dwell timers for visible faces
      for (const face of recognizedFaces) {
        const t = faceTimersRef.current[face.name]
        if (!t) {
          faceTimersRef.current[face.name] = { startTime: now, lastSeenTime: now }
        } else {
          t.lastSeenTime = now
        }
      }

      // Reset timers for faces absent too long
      for (const name of Object.keys(faceTimersRef.current)) {
        if (!visibleNames.has(name)) {
          const gap = now - faceTimersRef.current[name].lastSeenTime
          if (gap > RESET_GAP_MS && !markedNamesRef.current.has(name)) {
            delete faceTimersRef.current[name]
          }
        }
      }

      // Mark attendance after DWELL_MS of continuous presence
      const currentSession = sessionRef.current
      for (const face of recognizedFaces) {
        if (markedNamesRef.current.has(face.name)) continue
        const t = faceTimersRef.current[face.name]
        if (!t) continue
        const elapsed = now - t.startTime
        if (elapsed >= DWELL_MS) {
          markedNamesRef.current.add(face.name)   // optimistic green
          if (currentSession?.id) {
            api.markAttendance(currentSession.id, face.name)
              .then(result => {
                if (result.success && !result.already_marked) {
                  onMarkedRef.current?.()
                } else if (!result.success) {
                  // Semester mismatch or not in DB — revert and reset timer for retry
                  markedNamesRef.current.delete(face.name)
                  if (faceTimersRef.current[face.name]) {
                    faceTimersRef.current[face.name].startTime = Date.now()
                  }
                }
              })
              .catch(console.error)
          }
        }
      }

      // Enrich faces with validation state for rendering
      const enriched = allFaces.map(face => {
        if (face.name === 'Unknown') {
          return { ...face, status: 'unknown', progress: 0 }
        }
        if (markedNamesRef.current.has(face.name)) {
          return { ...face, status: 'marked', progress: 100 }
        }
        const t       = faceTimersRef.current[face.name]
        const elapsed = t ? now - t.startTime : 0
        return {
          ...face,
          status:   'validating',
          progress: Math.min(100, Math.round((elapsed / DWELL_MS) * 100)),
        }
      })

      setFaces(enriched)
      setFaceCount(enriched.length)
      setError(null)
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      sendingRef.current = false
    }
  }

  // Single stable interval
  useEffect(() => {
    if (!camReady) return
    const id = setInterval(() => captureAndSendRef.current?.(), FRAME_INTERVAL)
    return () => clearInterval(id)
  }, [camReady])

  const camLabel = session?.camera_name
    ? `${session.camera_name} | ${session.camera_location}`
    : 'CAM — 01 | MAIN HALL'

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
            style={{
              opacity:   blink ? 1 : 0.2,
              boxShadow: blink ? '0 0 6px 2px rgba(239,68,68,0.6)' : 'none',
            }}
          />
          <span className="text-[10px] font-mono font-bold tracking-[0.25em] uppercase" style={{ color: '#f87171' }}>
            Live
          </span>
        </div>
        <span className="text-[10px] font-mono tracking-[0.15em]" style={{ color: 'var(--text-faint)' }}>
          {camLabel}
        </span>
        <span className="text-[10px] font-mono tracking-[0.1em]" style={{ color: 'var(--text-faint)' }}>
          {error ? <span style={{ color: '#f87171' }}>ERR: {error}</span> : '320×240 · AI STREAM'}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none z-10"
          style={{
            backgroundImage: 'linear-gradient(rgba(6,182,212,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.8) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <Webcam
          ref={webcamRef}
          audio={false}
          mirrored={true}
          screenshotFormat="image/jpeg"
          screenshotQuality={0.4}
          videoConstraints={{ width: 320, height: 240, facingMode: 'user' }}
          onUserMedia={() => setCamReady(true)}
          onUserMediaError={(e) => setError(e.message ?? 'Camera denied')}
          className="absolute inset-0 w-full h-full object-cover z-0"
        />

        {/* Face overlays */}
        <div className="absolute inset-0 z-20 pointer-events-none">
          {faces.map((face, i) => (
            <FaceBox key={i} face={face} webcamRef={webcamRef} />
          ))}
        </div>

        {/* Camera loading state */}
        {!camReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-20">
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
              {error ?? 'Connect video source to begin'}
            </span>
          </div>
        )}

        {/* Bottom-left chips */}
        <div className="absolute bottom-3 left-4 flex flex-col gap-1 z-20">
          <InfoChip label="SESSION"  value={session ? `${session.class_code} — ${session.class_name}` : 'No Session'} />
          <InfoChip label="FACULTY"  value={session?.faculty ?? '—'} />
          {session?.semester && (
            <InfoChip label="SEM" value={`Semester ${session.semester}`} />
          )}
        </div>

        {/* Bottom-right chips */}
        <div className="absolute bottom-3 right-4 flex flex-col items-end gap-1 z-20">
          <InfoChip label="DETECTED" value={`${faceCount} face${faceCount !== 1 ? 's' : ''}`} right />
          <InfoChip label="DWELL"    value={`${DWELL_MS / 1000}s required`} right />
        </div>
      </div>
    </div>
  )
}
