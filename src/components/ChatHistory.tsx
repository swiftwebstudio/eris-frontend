import { useRef, useEffect, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Message } from '../types'

interface ChatHistoryProps {
  messages: Message[]
  onScrolledUp: (isUp: boolean) => void
}

export function ChatHistory({ messages, onScrolledUp }: ChatHistoryProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [scrolledUp, setScrolledUp] = useState(false)

  // Auto-scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    const isUp = distFromBottom > 80
    setScrolledUp(isUp)
    onScrolledUp(isUp)
  }, [onScrolledUp])

  if (messages.length === 0) {
    return (
      <div className="flex items-end justify-center pb-4 pointer-events-none">
        <p
          className="text-xs tracking-[0.2em] uppercase"
          style={{ color: 'rgba(107,143,179,0.4)' }}
        >
          Your conversation will appear here
        </p>
      </div>
    )
  }

  // When scrolled up: full opacity (reading mode). At rest: soft fade so sphere shows through.
  const total = messages.length
  const getOpacity = (index: number) => {
    if (scrolledUp) return 1.0
    const fromEnd = total - 1 - index
    if (fromEnd === 0) return 0.4
    if (fromEnd === 1) return 0.4
    return 0.15
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="overflow-y-auto px-4 space-y-2 pb-3"
      style={{ maxHeight: '100%', scrollbarWidth: 'none' }}
    >
      <AnimatePresence initial={false}>
        {messages.map((msg, i) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: getOpacity(i), y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'eris' && (
              <div
                className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white mr-1.5 mt-0.5 self-start"
                style={{
                  background: 'linear-gradient(135deg,#0077FF,#00D4FF)',
                  boxShadow: '0 0 8px rgba(0,212,255,0.5)',
                }}
              >
                E
              </div>
            )}

            <div
              className="max-w-[78%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed"
              style={
                msg.role === 'user'
                  ? {
                      background: 'rgba(0,119,255,0.15)',
                      border: '1px solid rgba(0,119,255,0.2)',
                      color: '#E6F4FF',
                      borderTopRightRadius: 4,
                    }
                  : {
                      background: 'rgba(0,212,255,0.08)',
                      border: '1px solid rgba(0,212,255,0.15)',
                      color: '#E6F4FF',
                      borderTopLeftRadius: 4,
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
