import { motion } from 'framer-motion'

export function HUDBackground() {
  const h = typeof window !== 'undefined' ? window.innerHeight : 900

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      <div className="absolute inset-0 bg-[#000814]" />

      {/* Grid */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.045 }}>
        <defs>
          <pattern id="hud-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,212,255,1)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hud-grid)" />
      </svg>

      {/* Center radial vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 75% 60% at 50% 50%, rgba(0,119,255,0.09) 0%, transparent 70%)',
        }}
      />

      {/* Edge fade (darker corners) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 55%, rgba(0,4,12,0.6) 100%)',
        }}
      />

      {/* Scan line */}
      <motion.div
        className="absolute left-0 right-0"
        style={{
          height: 1,
          background:
            'linear-gradient(to right, transparent 0%, rgba(0,212,255,0.22) 20%, rgba(0,229,255,0.45) 50%, rgba(0,212,255,0.22) 80%, transparent 100%)',
        }}
        animate={{ y: [-4, h + 4] }}
        transition={{ duration: 7, repeat: Infinity, repeatDelay: 14, ease: 'linear' }}
      />
    </div>
  )
}
