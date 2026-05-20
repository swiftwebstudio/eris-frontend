import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Message } from '../types'

interface ChatHistoryProps {
  messages: Message[]
}

export function ChatHistory({ messages }: ChatHistoryProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bottomRef    = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (messages.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-end pb-6 pointer-events-none">
        <p
          className="font-mono tracking-[0.2em] uppercase"
          style={{ fontSize: 9, color: 'rgba(107,143,179,0.28)' }}
        >
          NO TRANSMISSIONS
        </p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto px-4 pt-3 pb-4 flex flex-col gap-2.5"
      style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,212,255,0.15) transparent' }}
    >
      <AnimatePresence initial={false}>
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start items-start gap-2'}`}
          >
            {msg.role === 'eris' && (
              <div
                className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[9px] font-semibold text-white"
                style={{
                  background: 'linear-gradient(135deg, #00D4FF, #0077FF)',
                  boxShadow: '0 0 8px rgba(0,212,255,0.35)',
                }}
              >
                E
              </div>
            )}

            <div
              className="max-w-[85%] px-3 py-2 rounded-xl text-[13px] leading-relaxed"
              style={
                msg.role === 'user'
                  ? {
                      background: 'linear-gradient(135deg, rgba(0,119,255,0.2), rgba(0,80,190,0.12))',
                      border: '1px solid rgba(0,119,255,0.18)',
                      color: 'rgba(230,244,255,0.9)',
                      borderTopRightRadius: 3,
                    }
                  : {
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.07)',
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
