import { useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Mic, MicOff, Square } from 'lucide-react'
import { AppState } from '../types'

const STATE_DOT: Record<AppState, { color: string; glow: string; pulse: boolean }> = {
  idle:         { color: 'rgba(0,229,255,0.75)',   glow: 'rgba(0,229,255,0.5)',   pulse: false },
  recording:    { color: 'rgba(52,211,153,0.95)',  glow: 'rgba(52,211,153,0.7)',  pulse: true  },
  transcribing: { color: 'rgba(251,191,36,0.85)',  glow: 'rgba(251,191,36,0.6)',  pulse: true  },
  processing:   { color: 'rgba(251,191,36,0.85)',  glow: 'rgba(251,191,36,0.6)',  pulse: true  },
  speaking:     { color: 'rgba(0,119,255,0.95)',   glow: 'rgba(0,119,255,0.7)',   pulse: false },
}

interface InputBarProps {
  appState: AppState
  interimTranscript: string
  onSubmitText: (text: string) => void
  onMicStart: () => void
  onMicStop: () => void
  unlockAudio: () => void
  isSupported: boolean
}

export function InputBar({
  appState,
  interimTranscript,
  onSubmitText,
  onMicStart,
  onMicStop,
  unlockAudio,
  isSupported,
}: InputBarProps) {
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const unlockedRef = useRef(false)
  const isRecording = appState === 'recording'
  const isBusy = appState === 'processing' || appState === 'speaking' || appState === 'transcribing'

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault()
      const trimmed = text.trim()
      if (!trimmed || isBusy) return
      setText('')
      onSubmitText(trimmed)
    },
    [text, isBusy, onSubmitText],
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleMicPointerDown = () => {
    if (isBusy) return
    if (!unlockedRef.current) {
      unlockedRef.current = true
      unlockAudio()
    }
    onMicStart()
  }

  const handleMicPointerUp = () => {
    if (isRecording) onMicStop()
  }

  const active = focused || hovered

  return (
    <div className="flex justify-center px-4 pb-6 pt-2">
      <div
        className="relative w-full"
        style={{ maxWidth: 600 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Animated gradient border glow */}
        <motion.div
          className="absolute -inset-px rounded-full pointer-events-none"
          animate={{
            opacity: active ? 1 : 0,
          }}
          transition={{ duration: 0.3 }}
          style={{
            background: 'linear-gradient(135deg, rgba(0,229,255,0.5), rgba(0,119,255,0.5), rgba(123,97,255,0.4))',
            filter: 'blur(6px)',
            borderRadius: 9999,
          }}
        />

        {/* Glass pill */}
        <form
          onSubmit={handleSubmit}
          className="relative flex items-center gap-3 px-5 py-3.5 rounded-full"
          style={{
            background: focused
              ? 'linear-gradient(180deg, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.05) 100%)'
              : 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
            backdropFilter: 'blur(32px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(32px) saturate(1.6)',
            border: focused
              ? '1px solid rgba(0,229,255,0.28)'
              : '1px solid rgba(255,255,255,0.09)',
            boxShadow: focused
              ? '0 0 0 1px rgba(0,229,255,0.15), 0 8px 40px rgba(0,119,255,0.18), inset 0 1px 0 rgba(255,255,255,0.12)'
              : '0 8px 40px rgba(0,0,0,0.5), 0 2px 12px rgba(0,50,120,0.25), inset 0 1px 0 rgba(255,255,255,0.07)',
            transition: 'background 0.25s, border 0.25s, box-shadow 0.25s',
          }}
        >
          {/* State indicator dot */}
          <div className="shrink-0 flex items-center justify-center w-8">
            <div
              style={{
                width: 7, height: 7,
                borderRadius: '50%',
                background: STATE_DOT[appState].color,
                boxShadow: `0 0 6px ${STATE_DOT[appState].glow}`,
                animation: STATE_DOT[appState].pulse ? 'hud-blink 1.2s ease-in-out infinite' : 'none',
                transition: 'background 0.4s ease, box-shadow 0.4s ease',
              }}
            />
          </div>

          {/* Text input */}
          <input
            type="text"
            value={isRecording ? (interimTranscript || '') : text}
            onChange={(e) => !isRecording && setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={isBusy ? '' : 'Ask anything...'}
            disabled={isBusy}
            aria-label="Message input"
            className="flex-1 bg-transparent outline-none text-base min-w-0"
            style={{
              color: isRecording ? 'rgba(230,244,255,0.45)' : 'rgba(230,244,255,0.9)',
              caretColor: '#00E5FF',
            }}
          />

          {/* Placeholder colour via global CSS trick — applied inline to keep perf */}

          {/* Mic button */}
          {isSupported && (
            <motion.button
              type="button"
              aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
              disabled={isBusy && !isRecording}
              onPointerDown={handleMicPointerDown}
              onPointerUp={handleMicPointerUp}
              onPointerLeave={handleMicPointerUp}
              className="shrink-0 rounded-full flex items-center justify-center transition-all"
              style={{
                width: 38,
                height: 38,
                background: isRecording
                  ? 'linear-gradient(135deg, #0077FF, #00D4FF)'
                  : 'rgba(0,229,255,0.12)',
                boxShadow: isRecording ? '0 0 16px rgba(0,212,255,0.55)' : 'none',
              }}
              animate={isRecording ? { scale: [1, 1.08, 1] } : { scale: 1 }}
              transition={isRecording ? { duration: 0.7, repeat: Infinity } : { duration: 0.15 }}
            >
              {isRecording ? (
                <Square size={13} className="text-white" fill="white" />
              ) : isBusy ? (
                <MicOff size={16} style={{ color: 'rgba(107,143,179,0.5)' }} />
              ) : (
                <Mic size={16} style={{ color: 'rgba(0,229,255,0.85)' }} strokeWidth={1.8} />
              )}
            </motion.button>
          )}

          {/* Send button (text-only fallback) */}
          {!isSupported && text.trim() && (
            <button
              type="submit"
              className="shrink-0 text-xs font-medium px-3.5 py-1.5 rounded-full transition-all"
              style={{
                background: 'rgba(0,119,255,0.22)',
                color: '#00D4FF',
                border: '1px solid rgba(0,119,255,0.2)',
              }}
            >
              Send
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
