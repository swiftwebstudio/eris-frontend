import { motion, AnimatePresence } from 'framer-motion'
import { Mic } from 'lucide-react'
import { AppState } from '../types'

interface MicButtonProps {
  state: AppState
  onPointerDown: () => void
  onPointerUp: () => void
}

export function MicButton({ state, onPointerDown, onPointerUp }: MicButtonProps) {
  const isRecording = state === 'recording'
  const isProcessing = state === 'processing'
  const isSpeaking = state === 'speaking'

  return (
    <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
      <AnimatePresence>
        {isSpeaking && (
          <>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border border-purple-500/30"
                style={{ width: 120, height: 120 }}
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 1.8 + i * 0.4, opacity: 0 }}
                transition={{
                  duration: 1.5,
                  delay: i * 0.4,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {isProcessing && (
        <motion.div
          className="absolute rounded-full border-2 border-transparent"
          style={{
            width: 136,
            height: 136,
            borderTopColor: '#A855F7',
            borderRightColor: '#7C3AED',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        />
      )}

      <motion.button
        className="relative z-10 flex items-center justify-center rounded-full select-none cursor-pointer focus:outline-none"
        style={{
          width: 120,
          height: 120,
          background: isRecording
            ? 'linear-gradient(135deg, #991b1b, #7C3AED)'
            : 'linear-gradient(135deg, #7C3AED, #A855F7)',
          boxShadow: isRecording
            ? '0 0 30px rgba(239, 68, 68, 0.5), 0 0 60px rgba(124, 58, 237, 0.3)'
            : isSpeaking
              ? '0 0 30px rgba(168, 85, 247, 0.6), 0 0 80px rgba(124, 58, 237, 0.4)'
              : '0 0 20px rgba(124, 58, 237, 0.4)',
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
        animate={
          isRecording
            ? {
                scale: [1, 1.04, 1],
                boxShadow: [
                  '0 0 20px rgba(239, 68, 68, 0.5)',
                  '0 0 40px rgba(239, 68, 68, 0.7)',
                  '0 0 20px rgba(239, 68, 68, 0.5)',
                ],
              }
            : {}
        }
        transition={isRecording ? { duration: 0.8, repeat: Infinity } : { duration: 0.15 }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <Mic
          size={44}
          className="text-white"
          strokeWidth={isRecording ? 2.5 : 1.8}
        />
      </motion.button>
    </div>
  )
}
