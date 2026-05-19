import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { v4 as uuidv4 } from 'uuid'
import { AppState, Message } from './types'
import { ChatHistory } from './components/ChatHistory'
import { InputBar } from './components/InputBar'
import { InstallToast } from './components/InstallToast'
import { useSpeechInput, isIOS } from './hooks/useSpeechInput'
import { useElevenLabs } from './hooks/useElevenLabs'
import { useEris } from './hooks/useEris'
import { MIC_PERMISSION_KEY } from './hooks/useIOSSpeechRecognition'

const SphereCanvas = lazy(() =>
  import('./components/Sphere').then((m) => ({ default: m.SphereCanvas })),
)

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

function useSphereSize() {
  const get = () => {
    const w = window.innerWidth
    if (w < 480) return 260
    if (w < 768) return 340
    return 440
  }
  const [size, setSize] = useState(get)
  useEffect(() => {
    const handler = () => setSize(get())
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return size
}

const statusText: Record<AppState, string> = {
  idle:         'Tap to speak',
  recording:    'Listening...',
  transcribing: 'Transcribing...',
  processing:   'Thinking...',
  speaking:     'Speaking...',
}

export default function App() {
  const [appState, setAppState]             = useState<AppState>('idle')
  const [messages, setMessages]             = useState<Message[]>(loadMessages)
  const [conversationId, setConversationId] = useState(getOrCreateConversationId)
  const [toasts, setToasts]                 = useState<Toast[]>([])
  const isRecordingRef = useRef(false)
  const chatRef        = useRef<HTMLDivElement>(null)
  const sphereSize     = useSphereSize()

  // Scroll-driven sphere opacity (smooth, no state toggle)
  const { scrollY } = useScroll({ container: chatRef })
  const sphereOpacity = useTransform(scrollY, [0, 220], [1, 0.07])

  const addToast = useCallback((text: string) => {
    const id = uuidv4()
    setToasts((prev) => [...prev, { id, text }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500)
  }, [])

  const addMessage = useCallback((role: 'user' | 'eris', text: string): Message => {
    const msg: Message = { id: uuidv4(), role, text, timestamp: Date.now() }
    setMessages((prev) => {
      const next = [...prev, msg]
      saveMessages(next)
      return next
    })
    return msg
  }, [])

  const handleSpeakStart = useCallback(() => setAppState('speaking'), [])
  const handleSpeakEnd   = useCallback(() => setAppState('idle'), [])

  const { speak, stop, unlockAudio, analyserRef } = useElevenLabs(handleSpeakStart, handleSpeakEnd)
  const { isSupported, interimTranscript, startListening, stopListening } = useSpeechInput()
  const { sendMessage } = useEris()

  const handleTranscript = useCallback(
    async (transcript: string) => {
      if (!transcript.trim()) { setAppState('idle'); return }

      addMessage('user', transcript)
      setAppState('processing')

      let reply: string
      try {
        reply = await sendMessage(transcript, conversationId)
      } catch (err) {
        addToast(err instanceof Error ? err.message : 'Request failed')
        setAppState('idle')
        return
      }

      addMessage('eris', reply)

      try {
        await speak(reply)
      } catch (err) {
        const blocked =
          err instanceof DOMException &&
          (err.name === 'NotAllowedError' || err.name === 'AbortError')
        addToast(blocked ? 'Tap the mic to enable voice' : 'Voice output failed')
        setAppState('idle')
      }
    },
    [addMessage, addToast, conversationId, sendMessage, speak],
  )

  const startRecording = useCallback(async () => {
    if (appState !== 'idle') return
    stop()
    isRecordingRef.current = true
    setAppState('recording')
    try {
      await startListening()
    } catch (err) {
      isRecordingRef.current = false
      setAppState('idle')
      const granted = !!localStorage.getItem(MIC_PERMISSION_KEY)
      const denied  = err instanceof DOMException && err.name === 'NotAllowedError'
      addToast(
        denied && granted
          ? 'Mic denied — check iOS Settings'
          : denied
            ? 'Allow microphone access when prompted'
            : 'Microphone error — try again',
      )
    }
  }, [appState, stop, startListening, addToast])

  const stopRecording = useCallback(async () => {
    if (!isRecordingRef.current) return
    isRecordingRef.current = false
    if (isIOS) setAppState('transcribing')
    let transcript: string
    try {
      transcript = await stopListening()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Transcription failed')
      setAppState('idle')
      return
    }
    await handleTranscript(transcript)
  }, [stopListening, handleTranscript, addToast])

  // Spacebar push-to-talk (desktop)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault(); startRecording()
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault(); stopRecording()
      }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [startRecording, stopRecording])

  const clearConversation = useCallback(() => {
    const newId = uuidv4()
    localStorage.setItem(STORAGE_KEY_CONVO_ID, newId)
    localStorage.removeItem(STORAGE_KEY_MESSAGES)
    setConversationId(newId)
    setMessages([])
  }, [])

  return (
    <div className="h-screen w-screen overflow-hidden relative" style={{ background: '#000814' }}>

      {/* ── Layered animated background ─────────────────────── */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 100% 70% at 50% 55%, #001229 0%, #000814 50%, #000510 100%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 55% 40% at 20% 25%, rgba(0,40,100,0.32) 0%, transparent 65%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 40% 35% at 78% 78%, rgba(0,30,80,0.22) 0%, transparent 60%)',
          }}
        />
        {/* Pulsing center glow behind sphere */}
        <div
          className="absolute rounded-full animate-pulse"
          style={{
            width: 600,
            height: 600,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(0,119,255,0.08) 0%, transparent 70%)',
            animationDuration: '8s',
          }}
        />
      </div>

      {/* ── Sphere — fixed at viewport center ──────────────── */}
      <motion.div
        className="pointer-events-none fixed inset-0 flex flex-col items-center justify-center"
        style={{ zIndex: 1, opacity: sphereOpacity }}
      >
        <Suspense fallback={
          <div
            style={{ width: sphereSize, height: sphereSize }}
            className="flex items-center justify-center"
          >
            <div
              className="rounded-full animate-pulse"
              style={{
                width: sphereSize * 0.5,
                height: sphereSize * 0.5,
                background: 'radial-gradient(circle, rgba(0,119,255,0.15) 0%, transparent 70%)',
              }}
            />
          </div>
        }>
          <SphereCanvas
            state={appState}
            analyser={analyserRef.current}
            sizePx={sphereSize}
          />
        </Suspense>

        {/* Status text */}
        <div aria-live="polite" aria-atomic="true" className="mt-2 h-5">
          <AnimatePresence mode="wait">
            <motion.p
              key={appState}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="text-xs tracking-widest uppercase text-center"
              style={{ color: 'rgba(107,143,179,0.65)' }}
            >
              {statusText[appState]}
            </motion.p>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── Header ─────────────────────────────────────────── */}
      <header
        className="fixed top-0 left-0 right-0 flex items-center justify-between px-5 pt-4 pb-2"
        style={{ zIndex: 20 }}
      >
        <h1
          className="text-base font-bold tracking-[0.3em] uppercase"
          style={{ color: 'rgba(230,244,255,0.22)' }}
        >
          ERIS
        </h1>
        <button
          onClick={clearConversation}
          className="text-[11px] tracking-widest uppercase transition-colors"
          style={{ color: 'rgba(107,143,179,0.38)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(107,143,179,0.75)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(107,143,179,0.38)')}
        >
          Clear
        </button>
      </header>

      {/* ── Chat history — scrollable overlay ──────────────── */}
      <div
        className="fixed left-0 right-0 overflow-hidden"
        style={{ top: 52, bottom: 80, zIndex: 10 }}
      >
        <ChatHistory messages={messages} containerRef={chatRef} />
      </div>

      {/* ── Input bar ───────────────────────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0"
        style={{ zIndex: 30, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <InputBar
          appState={appState}
          interimTranscript={interimTranscript}
          onSubmitText={handleTranscript}
          onMicStart={startRecording}
          onMicStop={stopRecording}
          unlockAudio={unlockAudio}
          isSupported={isSupported}
        />
      </div>

      {/* ── Error toasts ─────────────────────────────────────── */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-50 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.95 }}
              className="text-xs px-4 py-2.5 rounded-full backdrop-blur-sm"
              style={{
                background: 'rgba(10,20,40,0.88)',
                border: '1px solid rgba(0,119,255,0.28)',
                color: '#E6F4FF',
                boxShadow: '0 4px 20px rgba(0,0,0,0.45)',
              }}
            >
              {toast.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <InstallToast />
    </div>
  )
}
