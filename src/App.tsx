import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { AppState, Message } from './types'
import { MicButton } from './components/MicButton'
import { ChatThread } from './components/ChatThread'
import { InstallToast } from './components/InstallToast'
import { useSpeechRecognition } from './hooks/useSpeechRecognition'
import { useElevenLabs } from './hooks/useElevenLabs'
import { useEris } from './hooks/useEris'

const STORAGE_KEY_MESSAGES = 'eris_messages'
const STORAGE_KEY_CONVO_ID = 'eris_conversation_id'

function getOrCreateConversationId(): string {
  const existing = localStorage.getItem(STORAGE_KEY_CONVO_ID)
  if (existing) return existing
  const id = uuidv4()
  localStorage.setItem(STORAGE_KEY_CONVO_ID, id)
  return id
}

function loadMessages(): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MESSAGES)
    return raw ? (JSON.parse(raw) as Message[]) : []
  } catch {
    return []
  }
}

function saveMessages(messages: Message[]) {
  localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages))
}

type Toast = { id: string; text: string }

export default function App() {
  const [appState, setAppState] = useState<AppState>('idle')
  const [messages, setMessages] = useState<Message[]>(loadMessages)
  const [conversationId, setConversationId] = useState(getOrCreateConversationId)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [interimDisplay, setInterimDisplay] = useState('')
  const [fallbackInput, setFallbackInput] = useState('')
  const isRecordingRef = useRef(false)

  const addToast = useCallback((text: string) => {
    const id = uuidv4()
    setToasts((prev) => [...prev, { id, text }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  const addMessage = useCallback((role: 'user' | 'eris', text: string) => {
    const msg: Message = { id: uuidv4(), role, text, timestamp: Date.now() }
    setMessages((prev) => {
      const next = [...prev, msg]
      saveMessages(next)
      return next
    })
    return msg
  }, [])

  const { isSupported, interimTranscript, startListening, stopListening } = useSpeechRecognition()

  const handleSpeakStart = useCallback(() => setAppState('speaking'), [])
  const handleSpeakEnd = useCallback(() => setAppState('idle'), [])

  const { speak } = useElevenLabs(handleSpeakStart, handleSpeakEnd)
  const { sendMessage } = useEris()

  useEffect(() => {
    setInterimDisplay(interimTranscript)
  }, [interimTranscript])

  const handleTranscript = useCallback(
    async (transcript: string) => {
      if (!transcript.trim()) {
        setAppState('idle')
        return
      }

      addMessage('user', transcript)
      setAppState('processing')

      let reply: string
      try {
        reply = await sendMessage(transcript, conversationId)
      } catch (err) {
        addToast(err instanceof Error ? err.message : 'Webhook request failed')
        setAppState('idle')
        return
      }

      addMessage('eris', reply)

      try {
        await speak(reply)
      } catch {
        addToast('Voice synthesis failed — text reply shown above')
        setAppState('idle')
      }
    },
    [addMessage, addToast, conversationId, sendMessage, speak],
  )

  const startRecording = useCallback(() => {
    if (appState !== 'idle') return
    stop()
    isRecordingRef.current = true
    setAppState('recording')
    startListening()
  }, [appState, stop, startListening])

  const stopRecording = useCallback(async () => {
    if (!isRecordingRef.current) return
    isRecordingRef.current = false
    setInterimDisplay('')
    const transcript = await stopListening()
    await handleTranscript(transcript)
  }, [stopListening, handleTranscript])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault()
        startRecording()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault()
        stopRecording()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [startRecording, stopRecording])

  const clearConversation = useCallback(() => {
    const newId = uuidv4()
    localStorage.setItem(STORAGE_KEY_CONVO_ID, newId)
    localStorage.removeItem(STORAGE_KEY_MESSAGES)
    setConversationId(newId)
    setMessages([])
  }, [])

  const handleFallbackSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const text = fallbackInput.trim()
      if (!text) return
      setFallbackInput('')
      await handleTranscript(text)
    },
    [fallbackInput, handleTranscript],
  )

  const statusText: Record<AppState, string> = {
    idle: 'Hold to speak · Space to push-to-talk',
    recording: 'Listening...',
    processing: 'Thinking...',
    speaking: 'ERIS is speaking...',
  }

  return (
    <div
      className="h-screen w-screen flex flex-col overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at 50% 40%, #12082a 0%, #0A0A0F 70%)',
      }}
    >
      <div className="flex items-center justify-between px-5 py-4 shrink-0">
        <h1
          className="text-lg font-semibold tracking-[0.25em] uppercase"
          style={{
            background: 'linear-gradient(135deg, #A855F7, #7C3AED)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          ERIS
        </h1>

        <button
          onClick={clearConversation}
          className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors px-2 py-1 rounded"
          title="Clear conversation"
        >
          <Trash2 size={13} />
          Clear
        </button>
      </div>

      <ChatThread messages={messages} />

      <div className="shrink-0 flex flex-col items-center gap-5 pb-10 pt-4">
        {!isSupported && (
          <form onSubmit={handleFallbackSubmit} className="w-full max-w-sm px-4">
            <input
              type="text"
              value={fallbackInput}
              onChange={(e) => setFallbackInput(e.target.value)}
              placeholder="Speech not supported — type here and press Enter"
              className="w-full bg-white/5 border border-purple-700/30 rounded-full px-5 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/60"
              disabled={appState === 'processing' || appState === 'speaking'}
            />
          </form>
        )}

        <MicButton
          state={appState}
          onPointerDown={startRecording}
          onPointerUp={stopRecording}
        />

        <div className="flex flex-col items-center gap-1 min-h-[44px]">
          <motion.p
            key={appState}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-white/40 tracking-wide"
          >
            {statusText[appState]}
          </motion.p>

          <AnimatePresence>
            {interimDisplay && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm text-white/25 italic max-w-xs text-center truncate px-4"
              >
                {interimDisplay}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      <InstallToast />

      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-50 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              className="bg-red-900/80 border border-red-700/50 text-red-200 text-xs px-4 py-2.5 rounded-full backdrop-blur-sm shadow-lg"
            >
              {toast.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
