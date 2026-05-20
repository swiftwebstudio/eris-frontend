import { motion } from 'framer-motion'

type SphereState = 'idle' | 'listening' | 'thinking' | 'speaking'

interface LiquidSphereProps {
  state?: SphereState
}

export function LiquidSphere({ state = 'idle' }: LiquidSphereProps) {
  const intensity = {
    idle:      1,
    listening: 1.15,
    thinking:  1.1,
    speaking:  1.25,
  }[state]

  const animationSpeed = {
    idle:      1,
    listening: 0.7,
    thinking:  0.5,
    speaking:  0.4,
  }[state]

  return (
    <div className="relative w-[400px] h-[400px] flex items-center justify-center pointer-events-none select-none">
      {/* Outer ambient glow */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(0, 212, 255, 0.35) 0%, rgba(0, 119, 255, 0.15) 40%, transparent 70%)',
          filter: 'blur(50px)',
        }}
        animate={{
          scale:   [1, 1.08 * intensity, 1],
          opacity: [0.6, 0.9, 0.6],
        }}
        transition={{
          duration: 4 * animationSpeed,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Main sphere body */}
      <motion.div
        className="relative w-[280px] h-[280px] rounded-full overflow-hidden"
        style={{
          background: `
            radial-gradient(circle at 35% 30%, rgba(180, 230, 255, 0.85) 0%, rgba(80, 170, 255, 0.7) 25%, transparent 55%),
            radial-gradient(circle at 50% 50%, rgba(0, 180, 255, 0.9) 0%, rgba(0, 90, 200, 0.85) 50%, rgba(0, 40, 120, 0.95) 100%)
          `,
          boxShadow: `
            inset -25px -25px 70px rgba(0, 20, 80, 0.7),
            inset 25px 25px 70px rgba(140, 210, 255, 0.35),
            inset 0 0 40px rgba(0, 150, 255, 0.3),
            0 0 80px rgba(0, 150, 255, 0.5),
            0 0 140px rgba(0, 120, 255, 0.25)
          `,
        }}
        animate={{ scale: [1, 1.03, 1] }}
        transition={{
          duration: 5 * animationSpeed,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Internal liquid blob 1 */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: '180px',
            height: '180px',
            background: 'radial-gradient(circle, rgba(0, 230, 255, 0.7) 0%, transparent 60%)',
            filter: 'blur(25px)',
            mixBlendMode: 'screen',
          }}
          animate={{
            x: [20, 60, 30, 10, 20],
            y: [30, 10, 60, 40, 30],
            scale: [1, 1.2, 0.9, 1.1, 1],
          }}
          transition={{
            duration: 8 * animationSpeed,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Internal liquid blob 2 */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: '160px',
            height: '160px',
            background: 'radial-gradient(circle, rgba(120, 200, 255, 0.6) 0%, transparent 60%)',
            filter: 'blur(30px)',
            mixBlendMode: 'screen',
          }}
          animate={{
            x: [100, 60, 120, 90, 100],
            y: [120, 100, 80, 130, 120],
            scale: [1, 0.85, 1.15, 1, 1],
          }}
          transition={{
            duration: 10 * animationSpeed,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Internal liquid blob 3 — brighter highlight */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: '120px',
            height: '120px',
            background: 'radial-gradient(circle, rgba(180, 230, 255, 0.8) 0%, transparent 60%)',
            filter: 'blur(20px)',
            mixBlendMode: 'screen',
          }}
          animate={{
            x: [60, 100, 50, 80, 60],
            y: [60, 90, 50, 70, 60],
            scale: [1, 1.1, 0.95, 1.05, 1],
          }}
          transition={{
            duration: 6 * animationSpeed,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Glass surface highlight — top-left shine */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '12%',
            left: '15%',
            width: '90px',
            height: '60px',
            background: 'radial-gradient(ellipse, rgba(255, 255, 255, 0.5) 0%, transparent 60%)',
            filter: 'blur(8px)',
            transform: 'rotate(-20deg)',
          }}
        />

        {/* Small secondary highlight */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '25%',
            left: '30%',
            width: '30px',
            height: '20px',
            background: 'radial-gradient(ellipse, rgba(255, 255, 255, 0.3) 0%, transparent 60%)',
            filter: 'blur(4px)',
          }}
        />
      </motion.div>

      {/* Inner core pulse */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: '40px',
          height: '40px',
          background: 'radial-gradient(circle, rgba(200, 240, 255, 0.9) 0%, rgba(100, 200, 255, 0.4) 50%, transparent 100%)',
          filter: 'blur(6px)',
        }}
        animate={{
          scale:   [1, 1.3 * intensity, 1],
          opacity: [0.7, 1, 0.7],
        }}
        transition={{
          duration: 2 * animationSpeed,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  )
}
