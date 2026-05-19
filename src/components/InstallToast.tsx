import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

const SESSION_KEY = 'eris_install_toast_dismissed'

function isMobile(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

function isAlreadyInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
}

export function InstallToast() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (
      isMobile() &&
      !isAlreadyInstalled() &&
      !sessionStorage.getItem(SESSION_KEY)
    ) {
      const timer = setTimeout(() => setVisible(true), 2000)
      return () => clearTimeout(timer)
    }
  }, [])

  function dismiss() {
    sessionStorage.setItem(SESSION_KEY, '1')
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-6 left-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{
            background: 'rgba(18, 8, 42, 0.92)',
            border: '1px solid rgba(168, 85, 247, 0.25)',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          <div
            className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}
          >
            E
          </div>

          <p className="flex-1 text-xs text-white/70 leading-snug">
            Install <span className="text-white font-medium">ERIS</span> to your home screen for the best experience
          </p>

          <button
            onClick={dismiss}
            className="shrink-0 p-1 rounded-full text-white/40 hover:text-white/70 transition-colors"
            aria-label="Dismiss"
          >
            <X size={15} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
