import { useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Plus, Mic, MicOff, Square } from 'lucide-react'
import { AppState } from '../types'

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

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-4 pb-6 pt-2">
      <motion.form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 w-full"
        animate={{
          boxShadow: focused
            ? '0 0 0 1.5px rgba(0,119,255,0.5), 0 8px 32px rgba(0,119,255,0.15)'
            : '0 8px 32px rgba(0,0,0,0.4)',
          borderColor: focused ? 'rgba(0,119,255,0.4)' : 'rgba(255,255,255,0.12)',
        }}
        transition={{ duration: 0.2 }}
        style={{
          background: 'rgba(255,255,255,0.07)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: focused ? '1px solid rgba(0,119,255,0.4)' : '1px solid rgba(255,255,255,0.12)',
          borderRadius: 9999,
          padding: '10px 12px 10px 16px',
          boxShadow: focused
            ? '0 0 0 1.5px rgba(0,119,255,0.3), 0 8px 32px rgba(0,119,255,0.1)'
            : '0 8px 32px rgba(0,0,0,0.35)',
          maxWidth: 600,
          width: '100%',
        }}
      >
        {/* Plus placeholder */}
        <button
          type="button"
          className="shrink-0 text-[#6B8FB3] hover:text-[#E6F4FF] transition-colors p-1"
          aria-label="Attachments (coming soon)"
          tabIndex={-1}
        >
          <Plus size={18} strokeWidth={1.8} />
        </button>

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
          className="flex-1 bg-transparent text-sm outline-none min-w-0"
          style={{
            color: isRecording ? 'rgba(230,244,255,0.5)' : '#E6F4FF',
            caretColor: '#0077FF',
          }}
        />

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
              width: 36,
              height: 36,
              background: isRecording
                ? 'linear-gradient(135deg,#0077FF,#00D4FF)'
                : 'rgba(0,119,255,0.18)',
              boxShadow: isRecording ? '0 0 12px rgba(0,212,255,0.6)' : 'none',
            }}
            animate={isRecording ? { scale: [1, 1.08, 1] } : { scale: 1 }}
            transition={isRecording ? { duration: 0.7, repeat: Infinity } : { duration: 0.15 }}
          >
            {isRecording ? (
              <Square size={14} className="text-white" fill="white" />
            ) : isBusy ? (
              <MicOff size={16} style={{ color: '#6B8FB3' }} />
            ) : (
              <Mic size={16} className="text-[#E6F4FF]" strokeWidth={1.8} />
            )}
          </motion.button>
        )}

        {/* Text submit (shown only when text is typed) */}
        {!isSupported && text.trim() && (
          <button
            type="submit"
            className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-all"
            style={{ background: 'rgba(0,119,255,0.25)', color: '#00D4FF' }}
          >
            Send
          </button>
        )}
      </motion.form>
    </div>
  )
}
