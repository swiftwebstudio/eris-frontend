import { useRef, useEffect, memo } from 'react'
import { AppState } from '../types'

interface HUDRingsProps {
  state: AppState
  analyser: AnalyserNode | null
  reducedMotion: boolean
  outerR?: number
  middleR?: number
  innerR?: number
}

const SPEEDS: Record<AppState, [string, string, string]> = {
  idle:         ['60s', '40s', '25s'],
  recording:    ['18s', '13s',  '8s'],
  transcribing: ['28s', '18s', '11s'],
  processing:   ['22s', '14s',  '7s'],
  speaking:     ['42s', '28s', '17s'],
}

const OPC: Record<AppState, [number, number, number]> = {
  idle:         [0.28, 0.38, 0.52],
  recording:    [0.65, 0.75, 0.88],
  transcribing: [0.42, 0.55, 0.78],
  processing:   [0.42, 0.58, 0.84],
  speaking:     [0.48, 0.60, 0.74],
}

export const HUDRings = memo(function HUDRings({
  state,
  analyser,
  reducedMotion,
  outerR: RO = 220,
  middleR: RM = 170,
  innerR: RI = 120,
}: HUDRingsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const dataArr      = useRef<Uint8Array | null>(null)
  const smooth       = useRef(1)
  const rafRef       = useRef(0)

  useEffect(() => {
    dataArr.current = analyser ? new Uint8Array(analyser.frequencyBinCount) : null
  }, [analyser])

  useEffect(() => {
    if (reducedMotion) return
    smooth.current = 1
    const tick = () => {
      let bass = 0
      if (analyser && dataArr.current && state === 'speaking') {
        analyser.getByteFrequencyData(dataArr.current as Uint8Array<ArrayBuffer>)
        let b = 0
        for (let i = 0; i < 6; i++) b += dataArr.current[i]
        bass = b / (6 * 255)
      }
      const target = state === 'speaking' ? 1 + bass * 0.08 : 1
      smooth.current += (target - smooth.current) * 0.11
      if (containerRef.current) {
        containerRef.current.style.transform = `scale(${smooth.current.toFixed(4)})`
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [analyser, state, reducedMotion])

  if (reducedMotion) return null

  const [outerSpd, midSpd, innerSpd] = SPEEDS[state]
  const [outerOp, midOp, innerOp]    = OPC[state]

  // Circumferences
  const CO = 2 * Math.PI * RO
  const CM = 2 * Math.PI * RM

  // Outer: 60 tick marks
  const TICK  = 3
  const GAP_O = ((CO / 60) - TICK).toFixed(1)
  const DASH_O = `${TICK} ${GAP_O}`

  // Middle: ~10 arc segments
  const ARC   = (CM * 0.082).toFixed(1)
  const GAP_M = (CM * 0.033).toFixed(1)
  const DASH_M = `${ARC} ${GAP_M}`

  // Inner: fine dashes
  const DASH_I = '6 5'

  // Compass data points (N/S/E/W), static around outer ring
  const compass = [0, 90, 180, 270].map((deg, idx) => {
    const rad = (deg - 90) * (Math.PI / 180)
    const d   = RO + 16
    return { x: d * Math.cos(rad), y: d * Math.sin(rad), delay: idx * 0.5, dur: 1.8 + idx * 0.4 }
  })

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      style={{ transformOrigin: 'center center', willChange: 'transform' }}
    >
      {/* Outer ring — tick marks, CW */}
      <svg
        className="absolute"
        width={RO * 2 + 4}
        height={RO * 2 + 4}
        style={{
          opacity: outerOp,
          animation: `hud-spin-cw ${outerSpd} linear infinite`,
          filter: 'drop-shadow(0 0 2px rgba(0,119,255,0.7))',
          transition: 'opacity 0.9s ease',
          willChange: 'transform',
        }}
      >
        <circle
          cx={RO + 2} cy={RO + 2} r={RO}
          fill="none" stroke="rgba(0,140,255,0.9)"
          strokeWidth="1" strokeDasharray={DASH_O}
        />
      </svg>

      {/* Middle ring — arc segments, CCW */}
      <svg
        className="absolute"
        width={RM * 2 + 4}
        height={RM * 2 + 4}
        style={{
          opacity: midOp,
          animation: `hud-spin-ccw ${midSpd} linear infinite`,
          filter: 'drop-shadow(0 0 3px rgba(0,175,255,0.5))',
          transition: 'opacity 0.9s ease',
          willChange: 'transform',
        }}
      >
        <circle
          cx={RM + 2} cy={RM + 2} r={RM}
          fill="none" stroke="rgba(0,190,255,0.9)"
          strokeWidth="1.5" strokeDasharray={DASH_M}
        />
      </svg>

      {/* Inner ring — fine dashes, CW, brightest */}
      <svg
        className="absolute"
        width={RI * 2 + 4}
        height={RI * 2 + 4}
        style={{
          opacity: innerOp,
          animation: `hud-spin-cw ${innerSpd} linear infinite`,
          filter: 'drop-shadow(0 0 5px rgba(0,229,255,0.75))',
          transition: 'opacity 0.9s ease',
          willChange: 'transform',
        }}
      >
        <circle
          cx={RI + 2} cy={RI + 2} r={RI}
          fill="none" stroke="rgba(0,229,255,1)"
          strokeWidth="1.5" strokeDasharray={DASH_I}
        />
      </svg>

      {/* Compass data points — static N/S/E/W */}
      {compass.map(({ x, y, delay, dur }, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 4, height: 4,
            left: '50%', top: '50%',
            transform: `translate(calc(${x.toFixed(1)}px - 2px), calc(${y.toFixed(1)}px - 2px))`,
            background: 'rgba(0,229,255,0.85)',
            boxShadow: '0 0 5px rgba(0,229,255,0.8)',
            opacity: outerOp,
            animation: `hud-blink ${dur}s ease-in-out ${delay}s infinite`,
          }}
        />
      ))}
    </div>
  )
})
