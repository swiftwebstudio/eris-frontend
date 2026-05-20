import { useRef, useEffect, useState } from 'react'
import Spline from '@splinetool/react-spline'
import type { Application } from '@splinetool/runtime'
import { AppState } from '../types'

const SCENE_URL = 'https://prod.spline.design/mhZi4foXOwcvfsAu/scene.splinecode'

interface SphereCanvasProps {
  state: AppState
  analyser: AnalyserNode | null
  sizePx: number
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export function SphereCanvas({ state, analyser, sizePx }: SphereCanvasProps) {
  const wrapperRef  = useRef<HTMLDivElement>(null)
  const appRef      = useRef<Application | null>(null)
  const dataArr     = useRef<Uint8Array | null>(null)
  const smoothScale = useRef(1)
  const rafRef      = useRef(0)
  const [loaded, setLoaded] = useState(false)

  function onLoad(app: Application) {
    appRef.current = app
    console.log('Spline loaded:', app)
    setLoaded(true)
    // Force Spline's internal canvas to recalculate dimensions
    setTimeout(() => window.dispatchEvent(new Event('resize')), 100)
  }

  useEffect(() => {
    dataArr.current = analyser ? new Uint8Array(analyser.frequencyBinCount) : null
  }, [analyser])

  // Audio-reactive wrapper scale via direct DOM (no React re-render)
  useEffect(() => {
    const tick = () => {
      let bass = 0
      if (analyser && dataArr.current && state === 'speaking') {
        analyser.getByteFrequencyData(dataArr.current as Uint8Array<ArrayBuffer>)
        let b = 0
        for (let i = 0; i < 6; i++) b += dataArr.current[i]
        bass = b / (6 * 255)
      }
      const targetScale = state === 'recording' ? 1.04
        : state === 'speaking' ? 1 + bass * 0.1
        : 1
      smoothScale.current = lerp(smoothScale.current, targetScale, 0.12)
      if (wrapperRef.current) {
        wrapperRef.current.style.transform = `scale(${smoothScale.current.toFixed(4)})`
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [analyser, state])

  return (
    <div
      ref={wrapperRef}
      className="spline-orb"
      style={{ width: sizePx, height: sizePx, transformOrigin: 'center' }}
    >
      <div
        className="spline-container"
        style={{
          position: 'relative',
          width: sizePx,
          height: sizePx,
          display: 'block',
        }}
      >
        {/* Gradient fallback sphere — visible until Spline canvas renders */}
        {!loaded && (
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: sizePx * 0.55,
              height: sizePx * 0.55,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'radial-gradient(circle at 30% 30%, rgba(120,200,255,0.85), rgba(0,119,255,0.4) 50%, rgba(0,80,200,0.1) 100%)',
              boxShadow: '0 0 80px rgba(0,212,255,0.5), inset 0 0 60px rgba(0,119,255,0.3)',
              filter: 'blur(0.5px)',
              animation: 'hud-breathe 4s ease-in-out infinite',
            }}
          />
        )}

        <Spline
          scene={SCENE_URL}
          onLoad={onLoad}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  )
}
