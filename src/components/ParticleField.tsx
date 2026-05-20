import { useRef, useEffect, memo } from 'react'

interface Particle {
  angle: number
  speed: number
  distance: number
  maxDist: number
  radius: number
  baseOpacity: number
}

interface ParticleFieldProps {
  size: number
  count?: number
  disabled?: boolean
}

export const ParticleField = memo(function ParticleField({
  size,
  count = 28,
  disabled = false,
}: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)

  useEffect(() => {
    if (disabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    const cx = size / 2
    const cy = size / 2
    const maxDist = size * 0.46

    const particles: Particle[] = Array.from({ length: count }, () => ({
      angle:       Math.random() * Math.PI * 2,
      speed:       0.06 + Math.random() * 0.16,
      distance:    Math.random() * maxDist * 0.7,
      maxDist,
      radius:      0.4 + Math.random() * 1.0,
      baseOpacity: 0.12 + Math.random() * 0.32,
    }))

    const tick = () => {
      ctx.clearRect(0, 0, size, size)

      for (const p of particles) {
        p.distance += p.speed
        if (p.distance > p.maxDist) {
          p.distance = 0
          p.angle = Math.random() * Math.PI * 2
        }

        const fadeIn  = Math.min(p.distance / 20, 1)
        const fadeOut = 1 - (p.distance / p.maxDist) ** 1.8
        const alpha   = p.baseOpacity * fadeIn * fadeOut
        if (alpha <= 0) continue

        const x = cx + p.distance * Math.cos(p.angle)
        const y = cy + p.distance * Math.sin(p.angle)

        ctx.beginPath()
        ctx.arc(x, y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0,212,255,${alpha.toFixed(3)})`
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [size, count, disabled])

  if (disabled) return null

  return (
    <canvas
      ref={canvasRef}
      className="absolute pointer-events-none"
      style={{ width: size, height: size }}
    />
  )
})
