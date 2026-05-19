import { useRef, useEffect, lazy, Suspense } from 'react'
import type { Application } from '@splinetool/runtime'
import { AppState } from '../types'

const SplineScene = lazy(() => import('@splinetool/react-spline'))

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
  const wrapperRef   = useRef<HTMLDivElement>(null)
  const appRef       = useRef<Application | null>(null)
  const dataArr      = useRef<Uint8Array | null>(null)
  const smoothScale  = useRef(1)
  const rafRef       = useRef(0)

  function onLoad(app: Application) {
    appRef.current = app
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
      <Suspense fallback={
        <div className="w-full h-full flex items-center justify-center">
          <div
            className="rounded-full animate-pulse"
            style={{
              width: sizePx * 0.55,
              height: sizePx * 0.55,
              background: 'radial-gradient(circle, rgba(0,119,255,0.18) 0%, transparent 70%)',
            }}
          />
        </div>
      }>
        <SplineScene
          scene={SCENE_URL}
          onLoad={onLoad}
          style={{ width: '100%', height: '100%', background: 'transparent' }}
        />
      </Suspense>
    </div>
  )
}
