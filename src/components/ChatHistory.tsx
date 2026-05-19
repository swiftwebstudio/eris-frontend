import { useRef, useEffect } from 'react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { Message } from '../types'

interface ChatHistoryProps {
  messages: Message[]
  containerRef: React.RefObject<HTMLDivElement>
}

export function ChatHistory({ messages, containerRef }: ChatHistoryProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  const { scrollY } = useScroll({ container: containerRef })
  // At rest (scrollY=0): messages are soft (0.35). Scrolled past 180px: fully readable.
  const wrapperOpacity = useTransform(scrollY, [0, 180], [0.35, 1])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (messages.length === 0) {
    return (
      <div className="h-full flex items-end justify-center pb-6 pointer-events-none">
        <p className="text-xs tracking-[0.2em] uppercase" style={{ color: 'rgba(107,143,179,0.35)' }}>
          Your conversation will appear here
        </p>
      </div>
    )
  }

  const total = messages.length
  const relativeOpacity = (index: number) => {
    const fromEnd = total - 1 - index
    if (fromEnd === 0) return 1
    if (fromEnd === 1) return 0.75
    if (fromEnd === 2) return 0.5
    return 0.3
  }

  return (
    <motion.div
      ref={containerRef as React.RefObject<HTMLDivElement>}
      style={{ opacity: wrapperOpacity }}
      className="h-full overflow-y-auto px-4 pt-2 pb-4 space-y-3 scrollbar-hide"
    >
      <AnimatePresence initial={false}>
        {messages.map((msg, i) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: relativeOpacity(i), y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start items-start gap-2.5'}`}
          >
            {msg.role === 'eris' && (
              <div
                className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold text-white"
                style={{
                  background: 'linear-gradient(135deg, #00D4FF, #0077FF)',
                  boxShadow: '0 0 12px rgba(0,212,255,0.4)',
                }}
              >
                E
              </div>
            )}

            <div
              className="max-w-[80%] px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed backdrop-blur-sm"
              style={
                msg.role === 'user'
                  ? {
                      background: 'linear-gradient(135deg, rgba(0,119,255,0.18) 0%, rgba(0,90,200,0.10) 100%)',
                      border: '1px solid rgba(0,119,255,0.18)',
                      color: 'rgba(230,244,255,0.88)',
                      borderTopRightRadius: 4,
                      boxShadow: '0 4px 16px rgba(0,119,255,0.08)',
                    }
                  : {
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      color: 'rgba(230,244,255,0.90)',
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
    </motion.div>
  )
}
