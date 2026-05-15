import { useState, useEffect, useRef } from 'react'
import Webcam from 'react-webcam'

const BACKEND = 'http://localhost:8000'

// BETTER FPS
const FRAME_INTERVAL_MS = 300

function InfoChip({
  label,
  value,
  right = false
}) {

  return (

    <div
      className={`flex items-center gap-2 ${
        right
          ? 'flex-row-reverse'
          : ''
      }`}
    >

      <span
        className="text-[9px] font-mono font-semibold tracking-[0.18em] uppercase px-1.5 py-0.5 rounded"
        style={{
          background:
            'rgba(6,182,212,0.12)',

          color:
            'var(--accent-cyan)',

          border:
            '1px solid rgba(6,182,212,0.2)'
        }}
      >
        {label}
      </span>

      <span
        className="text-[10px] font-mono"
        style={{
          color:
            'var(--text-muted)'
        }}
      >
        {value}
      </span>

    </div>
  )
}

export default function LiveFeed() {

  const [blink, setBlink] =
    useState(true)

  const [faces, setFaces] =
    useState([])

  const [
    faceCount,
    setFaceCount
  ] = useState(0)

  const [
    camReady,
    setCamReady
  ] = useState(false)

  const [
    error,
    setError
  ] = useState(null)

  const webcamRef = useRef(null)

  const sendingRef =
    useRef(false)

  const lastSentRef =
    useRef(0)

  // BLINK EFFECT
  useEffect(() => {

    const id = setInterval(() => {

      setBlink(v => !v)

    }, 900)

    return () =>
      clearInterval(id)

  }, [])


  // SEND FRAME
  const captureAndSend = async () => {

    if (!camReady) {
      return
    }

    if (!webcamRef.current) {
      return
    }

    const video =
      webcamRef.current.video

    if (!video) {
      return
    }

    if (video.readyState !== 4) {
      return
    }

    // PREVENT MULTIPLE REQUESTS

    if (sendingRef.current) {
      return
    }

    // RATE LIMIT

    const now = Date.now()

    if (
      now - lastSentRef.current
      < FRAME_INTERVAL_MS
    ) {
      return
    }

    lastSentRef.current = now

    // CAPTURE FRAME

    const screenshot =
      webcamRef.current.getScreenshot()

    if (
      !screenshot ||
      typeof screenshot !== 'string'
    ) {
      return
    }

    sendingRef.current = true

    try {

      const res = await fetch(

        `${BACKEND}/recognition/frame`,

        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body: JSON.stringify({
            image: screenshot
          }),
        }
      )

      if (!res.ok) {

        throw new Error(
          `HTTP ${res.status}`
        )
      }

      const data =
        await res.json()

      // UPDATE FACES

      setFaces(
        data.faces || []
      )

      // UPDATE FACE COUNT

      setFaceCount(

        data.faces
          ? data.faces.length
          : 0
      )

      setError(null)

    } catch (err) {

      console.error(err)

      setError(
        err.message
      )

    } finally {

      sendingRef.current = false
    }
  }


  // FRAME LOOP
  useEffect(() => {

    if (!camReady) {
      return
    }

    const interval = setInterval(

      captureAndSend,

      FRAME_INTERVAL_MS
    )

    return () =>
      clearInterval(interval)

  }, [camReady])


  return (

    <div
      className="panel scan-overlay relative flex flex-col overflow-hidden h-full"
      style={{
        boxShadow:
          '0 0 0 1px rgba(6,182,212,0.12), 0 8px 32px rgba(0,0,0,0.7)'
      }}
    >

      {/* CORNERS */}

      <span className="corner-bracket corner-tl" />

      <span className="corner-bracket corner-tr" />

      <span className="corner-bracket corner-bl" />

      <span className="corner-bracket corner-br" />

      <div className="scan-beam" />


      {/* TOP BAR */}

      <div
        className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] z-10 relative"
      >

        <div
          className="flex items-center gap-2"
        >

          <span
            className="w-2 h-2 rounded-full bg-red-500 transition-opacity duration-500"
            style={{
              opacity:
                blink ? 1 : 0.2,

              boxShadow:
                blink
                  ? '0 0 6px 2px rgba(239,68,68,0.6)'
                  : 'none'
            }}
          />

          <span
            className="text-[10px] font-mono font-bold tracking-[0.25em] uppercase"
            style={{
              color:
                '#f87171'
            }}
          >
            Live
          </span>

        </div>

        <span
          className="text-[10px] font-mono tracking-[0.15em]"
          style={{
            color:
              'var(--text-faint)'
          }}
        >
          CAM — 01 | MAIN HALL
        </span>

        <span
          className="text-[10px] font-mono tracking-[0.1em]"
          style={{
            color:
              'var(--text-faint)'
          }}
        >

          {error
            ? (
              <span
                style={{
                  color:
                    '#f87171'
                }}
              >
                ERR: {error}
              </span>
            )
            : '320×240 · AI STREAM'
          }

        </span>

      </div>


      {/* BODY */}

      <div
        className="flex-1 relative overflow-hidden"
      >

        {/* GRID */}

        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none z-10"
          style={{

            backgroundImage:

              'linear-gradient(rgba(6,182,212,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.8) 1px, transparent 1px)',

            backgroundSize:
              '60px 60px',
          }}
        />


        {/* WEBCAM */}

        <Webcam

          ref={webcamRef}

          audio={false}

          mirrored={true}

          screenshotFormat="image/jpeg"

          screenshotQuality={0.4}

          videoConstraints={{

            width: 320,

            height: 240,

            facingMode: 'user'
          }}

          onUserMedia={() => {

            console.log(
              'CAM READY'
            )

            setCamReady(true)
          }}

          onUserMediaError={(e) => {

            console.error(e)

            setError(

              e.message ??
              'Camera denied'
            )
          }}

          className="absolute inset-0 w-full h-full object-cover z-0"
        />


        {/* FACE OVERLAY */}

        <div className="absolute inset-0 z-20 pointer-events-none">

          {faces.map((face, index) => {

            const [x1, y1, x2, y2] =
              face.box

            const video =
              webcamRef.current?.video

            const videoW =
              video?.videoWidth || 640

            const videoH =
              video?.videoHeight || 480

            const containerW =
              video?.clientWidth || videoW

            const containerH =
              video?.clientHeight || videoH

            // react-webcam screenshots at clientWidth resolution,
            // not videoWidth, so screenshotW === containerW.
            // object-cover scales by max(containerW/videoW, containerH/videoH),
            // but we must convert from screenshot-space first.
            const displayScale = Math.max(
              containerW / videoW,
              containerH / videoH
            )

            // combined: screenshot-space → display-space
            // = (videoW / containerW) * displayScale
            // simplifies to 1 when container aspect ≥ video aspect
            const scale =
              displayScale * videoW / containerW

            // object-cover centering offset (negative = cropped)
            const offsetX =
              (containerW - videoW * displayScale) / 2

            const offsetY =
              (containerH - videoH * displayScale) / 2

            // mirrored screenshot + CSS scaleX(-1) cancel → no x-flip needed

            // BOX SIZE

            const width =
              (x2 - x1) * scale

            const height =
              (y2 - y1) * scale

            // POSITION

            const left =
              x1 * scale + offsetX

            const top =
              y1 * scale + offsetY

            const isUnknown =
              face.name === 'Unknown'

            return (

              <div
                key={index}
                className="absolute"
                style={{

                  left,

                  top,

                  width,

                  height,

                  border:
                    `2px solid ${
                      isUnknown
                        ? '#ef4444'
                        : '#22c55e'
                    }`,

                  boxShadow:
                    isUnknown
                      ? '0 0 12px rgba(239,68,68,0.7)'
                      : '0 0 12px rgba(34,197,94,0.7)',

                  borderRadius: '6px'
                }}
              >

                {/* LABEL */}

                <div
                  className="absolute -top-6 left-0 px-2 py-1 text-[10px] font-mono whitespace-nowrap"
                  style={{
                    background:
                      isUnknown
                        ? 'rgba(239,68,68,0.9)'
                        : 'rgba(34,197,94,0.9)',

                    color: 'white',

                    borderRadius: '4px'
                  }}
                >

                  {face.name}

                  {' '}

                  {Math.round(
                    face.confidence * 100
                  )}%

                </div>

              </div>
            )
          })}
        </div>


        {/* WAITING */}

        {!camReady && (

          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-20"
          >

            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{

                border:
                  '1px solid rgba(6,182,212,0.3)',

                boxShadow:
                  '0 0 24px rgba(6,182,212,0.1)'
              }}
            >

              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  border:
                    '1px solid rgba(6,182,212,0.5)'
                }}
              >

                <div
                  className="w-2 h-2 rounded-full"
                  style={{

                    background:
                      'var(--accent-cyan)',

                    boxShadow:
                      'var(--glow-cyan)',

                    animation:
                      'pulse2 1.4s ease-in-out infinite'
                  }}
                />

              </div>

            </div>

            <span
              className="text-xs font-mono tracking-[0.35em] uppercase"
              style={{
                color:
                  'var(--text-muted)'
              }}
            >
              Awaiting Feed
            </span>

            <span
              className="text-[10px] font-mono tracking-[0.2em]"
              style={{
                color:
                  'var(--text-faint)'
              }}
            >
              {
                error ??
                'Connect video source to begin'
              }
            </span>

          </div>
        )}


        {/* LEFT CHIPS */}

        <div
          className="absolute bottom-3 left-4 flex flex-col gap-1 z-20"
        >

          <InfoChip
            label="SESSION"
            value="CS301 — DSA"
          />

          <InfoChip
            label="FACULTY"
            value="Prof. R. Verma"
          />

        </div>


        {/* RIGHT CHIPS */}

        <div
          className="absolute bottom-3 right-4 flex flex-col items-end gap-1 z-20"
        >

          <InfoChip
            label="DETECTED"
            value={`${faceCount} face${faceCount !== 1 ? 's' : ''}`}
            right
          />

          <InfoChip
            label="THRESHOLD"
            value="90%"
            right
          />

        </div>

      </div>

    </div>
  )
}