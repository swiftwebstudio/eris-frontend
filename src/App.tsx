import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { v4 as uuidv4 } from 'uuid'
import { MessageSquare, X } from 'lucide-react'
import { AppState, Message } from './types'
import { ChatHistory } from './components/ChatHistory'
import { InputBar } from './components/InputBar'
import { InstallToast } from './components/InstallToast'
import { HUDBackground } from './components/HUDBackground'
import { HUDRings } from './components/HUDRings'
import { HUDLeftPanel } from './components/HUDLeftPanel'
import { ParticleField } from './components/ParticleField'
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
  } catch { return [] }
}

function saveMessages(messages: Message[]) {
  localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages))
}

type Toast = { id: string; text: string }

const statusText: Record<AppState, string> = {
  idle:         'STANDBY',
  recording:    'LISTENING',
  transcribing: 'PROCESSING',
  processing:   'COMPUTING',
  speaking:     'TRANSMITTING',
}

const reducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function App() {
  const [appState, setAppState]           = useState<AppState>('idle')
  const [messages, setMessages]           = useState<Message[]>(loadMessages)
  const [conversationId, setConversationId] = useState(getOrCreateConversationId)
  const [toasts, setToasts]               = useState<Toast[]>([])
  const [chatOpen, setChatOpen]           = useState(false)
  const [screenWidth, setScreenWidth]     = useState(
    () => typeof window !== 'undefined' ? window.innerWidth : 1280,
  )
  const isRecordingRef = useRef(false)

  useEffect(() => {
    const onResize = () => setScreenWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const isDesktop = screenWidth >= 1024
  const chatWidth = screenWidth >= 1280 ? 400 : 340

  const SPHERE_PX = isDesktop ? 520 : 280
  const STAGE     = isDesktop ? 1100 : 620
  const ringProps = isDesktop
    ? { outerR: 520, middleR: 416, innerR: 320 }
    : { outerR: 280, middleR: 220, innerR: 160 }

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
        denied && granted ? 'Mic denied — check iOS Settings'
          : denied ? 'Allow microphone access when prompted'
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
    <div className="h-screen w-screen overflow-hidden relative bg-[#000814]">

      {/* ── Background ─────────────────────────────────────────────── */}
      <HUDBackground />

      {/* ── Sphere + Rings — fixed, centered in viewport ───────────── */}
      <div
        className="fixed inset-0 flex items-center justify-center pointer-events-none"
        style={{ zIndex: 1 }}
      >
        <div
          className="relative flex items-center justify-center"
          style={{ width: STAGE, height: STAGE, flexShrink: 0 }}
        >
          {/* Breathing halo */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: SPHERE_PX * 0.5,
              height: SPHERE_PX * 0.5,
              background: 'radial-gradient(circle, rgba(0,119,255,0.14) 0%, rgba(0,119,255,0.03) 45%, transparent 70%)',
              animation: 'hud-breathe 4s ease-in-out infinite',
            }}
          />

          {/* Particles */}
          <ParticleField size={STAGE} disabled={!isDesktop || reducedMotion} />

          {/* Rings */}
          <HUDRings
            state={appState}
            analyser={analyserRef.current}
            reducedMotion={reducedMotion}
            {...ringProps}
          />

          {/* Sphere */}
          <div className="relative" style={{ zIndex: 10, pointerEvents: 'auto' }}>
            <Suspense fallback={
              <div
                style={{ width: SPHERE_PX, height: SPHERE_PX }}
                className="flex items-center justify-center"
              >
                <div
                  className="rounded-full"
                  style={{
                    width: SPHERE_PX * 0.55,
                    height: SPHERE_PX * 0.55,
                    background: 'radial-gradient(circle, rgba(0,119,255,0.18) 0%, transparent 70%)',
                    animation: 'hud-breathe 2s ease-in-out infinite',
                  }}
                />
              </div>
            }>
              <SphereCanvas
                state={appState}
                analyser={analyserRef.current}
                sizePx={SPHERE_PX}
              />
            </Suspense>
          </div>
        </div>
      </div>

      {/* ── Status text — below sphere center ──────────────────────── */}
      <div
        className="fixed left-0 right-0 flex justify-center pointer-events-none"
        style={{ top: `calc(50% + ${SPHERE_PX / 2 + 32}px)`, zIndex: 2 }}
        aria-live="polite"
        aria-atomic="true"
      >
        <AnimatePresence mode="wait">
          <motion.p
            key={appState}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="font-mono tracking-[0.25em] uppercase"
            style={{ fontSize: 10, color: 'rgba(0,212,255,0.55)' }}
          >
            {statusText[appState]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* ── Left panel — floating fixed overlay, desktop only ──────── */}
      {isDesktop && (
        <div
          className="fixed flex flex-col"
          style={{ top: 20, left: 20, width: 280, zIndex: 20 }}
        >
          <HUDLeftPanel
            appState={appState}
            messageCount={messages.length}
          />
        </div>
      )}

      {/* ── Right chat — floating fixed overlay, desktop only ──────── */}
      {isDesktop && (
        <div
          className="fixed flex flex-col rounded-2xl overflow-hidden"
          style={{
            top: 20,
            right: 20,
            bottom: 76,
            width: chatWidth,
            background: 'rgba(0,8,20,0.75)',
            border: '1px solid rgba(0,212,255,0.1)',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
            zIndex: 20,
          }}
        >
          <div
            className="shrink-0 flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid rgba(0,212,255,0.07)' }}
          >
            <span
              className="font-mono tracking-[0.18em] uppercase"
              style={{ fontSize: 9, color: 'rgba(0,212,255,0.45)' }}
            >
              CONVERSATION
            </span>
            <button
              onClick={clearConversation}
              className="font-mono uppercase tracking-widest transition-colors"
              style={{ fontSize: 8, color: 'rgba(107,143,179,0.35)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(107,143,179,0.7)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(107,143,179,0.35)')}
            >
              CLEAR
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <ChatHistory messages={messages} />
          </div>
        </div>
      )}

      {/* ── Mobile top bar ─────────────────────────────────────────── */}
      {!isDesktop && (
        <div
          className="fixed top-0 left-0 right-0 flex items-center justify-between px-5 pt-4 pb-2"
          style={{ zIndex: 20 }}
        >
          <h1
            className="text-sm font-bold tracking-[0.3em] uppercase"
            style={{ color: 'rgba(230,244,255,0.22)' }}
          >
            ERIS
          </h1>
          <button
            onClick={clearConversation}
            className="font-mono uppercase tracking-widest transition-colors"
            style={{ fontSize: 10, color: 'rgba(107,143,179,0.4)' }}
          >
            CLEAR
          </button>
        </div>
      )}

      {/* ── Mobile chat toggle ─────────────────────────────────────── */}
      {!isDesktop && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed rounded-full flex items-center justify-center"
          style={{
            bottom: 92, right: 16,
            width: 40, height: 40,
            background: 'rgba(0,8,20,0.8)',
            border: '1px solid rgba(0,212,255,0.2)',
            backdropFilter: 'blur(16px)',
            zIndex: 25,
            boxShadow: messages.length > 0 ? '0 0 12px rgba(0,212,255,0.35)' : 'none',
          }}
          aria-label="Open chat"
        >
          <MessageSquare size={16} style={{ color: 'rgba(0,212,255,0.75)' }} />
          {messages.length > 0 && (
            <div
              className="absolute top-0.5 right-0.5 rounded-full font-mono"
              style={{
                width: 14, height: 14,
                background: 'rgba(0,212,255,0.9)',
                fontSize: 8,
                color: '#000814',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {messages.length > 9 ? '9+' : messages.length}
            </div>
          )}
        </button>
      )}

      {/* ── Mobile chat drawer ─────────────────────────────────────── */}
      {!isDesktop && (
        <AnimatePresence>
          {chatOpen && (
            <>
              <motion.div
                className="fixed inset-0 z-30"
                style={{ background: 'rgba(0,4,12,0.7)', backdropFilter: 'blur(4px)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setChatOpen(false)}
              />
              <motion.div
                className="fixed inset-y-0 right-0 flex flex-col z-40"
                style={{
                  width: '85vw',
                  background: 'rgba(0,8,20,0.97)',
                  borderLeft: '1px solid rgba(0,212,255,0.12)',
                  backdropFilter: 'blur(32px)',
                  paddingBottom: 76,
                }}
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              >
                <div
                  className="shrink-0 flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: '1px solid rgba(0,212,255,0.07)' }}
                >
                  <span
                    className="font-mono tracking-[0.18em] uppercase"
                    style={{ fontSize: 9, color: 'rgba(0,212,255,0.45)' }}
                  >
                    CONVERSATION
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={clearConversation}
                      className="font-mono uppercase tracking-widest"
                      style={{ fontSize: 8, color: 'rgba(107,143,179,0.45)' }}
                    >
                      CLEAR
                    </button>
                    <button onClick={() => setChatOpen(false)}>
                      <X size={14} style={{ color: 'rgba(107,143,179,0.55)' }} />
                    </button>
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <ChatHistory messages={messages} />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}

      {/* ── Input bar (fixed bottom, full width) ───────────────────── */}
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

      {/* ── Error toasts ───────────────────────────────────────────── */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-50 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.95 }}
              className="font-mono text-xs px-4 py-2.5 rounded-full backdrop-blur-sm whitespace-nowrap"
              style={{
                background: 'rgba(10,20,40,0.9)',
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
