import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Message } from '../types'

interface ChatThreadProps {
  messages: Message[]
}

export function ChatThread({ messages }: ChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-end justify-center pb-6">
        <p className="text-white/20 text-sm tracking-widest uppercase">
          Hold mic to speak
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
      <AnimatePresence initial={false}>
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'eris' && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center text-xs font-semibold text-white mr-2 mt-1 shrink-0 glow-purple">
                E
              </div>
            )}

            <div
              className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-purple-900/40 border border-purple-700/30 text-purple-50 rounded-tr-sm'
                  : 'glassmorphic text-slate-200 rounded-tl-sm'
              }`}
              style={
                msg.role === 'eris'
                  ? { boxShadow: '0 0 12px rgba(168, 85, 247, 0.1)' }
                  : undefined
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
