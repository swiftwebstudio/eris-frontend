import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Message } from '../types'

interface ChatHistoryProps {
  messages: Message[]
}

export function ChatHistory({ messages }: ChatHistoryProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bottomRef    = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (messages.length === 0) {
    return (
      <div className="h-full flex items-end justify-center pb-6 pointer-events-none">
        <p
          className="font-mono tracking-[0.18em] uppercase"
          style={{ fontSize: 9, color: 'rgba(107,143,179,0.3)' }}
        >
          NO TRANSMISSIONS
        </p>
      </div>
    )
  }

  const total = messages.length
  const opacity = (i: number) => {
    const fromEnd = total - 1 - i
    if (fromEnd === 0) return 1
    if (fromEnd === 1) return 0.8
    if (fromEnd === 2) return 0.6
    return 0.42
  }

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto px-3 pt-2 pb-3 space-y-2.5 scrollbar-hide"
    >
      <AnimatePresence initial={false}>
        {messages.map((msg, i) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: opacity(i), y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start items-start gap-2'}`}
          >
            {msg.role === 'eris' && (
              <div
                className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-semibold text-white"
                style={{
                  background: 'linear-gradient(135deg, #00D4FF, #0077FF)',
                  boxShadow: '0 0 10px rgba(0,212,255,0.4)',
                  fontFamily: 'Geist, sans-serif',
                }}
              >
                E
              </div>
            )}

            <div
              className="max-w-[85%] px-3 py-2 rounded-xl text-[12.5px] leading-relaxed backdrop-blur-sm"
              style={
                msg.role === 'user'
                  ? {
                      background: 'linear-gradient(135deg, rgba(0,119,255,0.18), rgba(0,90,200,0.10))',
                      border: '1px solid rgba(0,119,255,0.15)',
                      color: 'rgba(230,244,255,0.88)',
                      borderTopRightRadius: 3,
                      boxShadow: '0 2px 12px rgba(0,119,255,0.07)',
                    }
                  : {
                      background: 'rgba(255,255,255,0.035)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      color: 'rgba(230,244,255,0.88)',
                      borderTopLeftRadius: 3,
                    }
              }
            >
              {msg.text}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      <div ref={bottomRef} />
    </div>
  )
}
