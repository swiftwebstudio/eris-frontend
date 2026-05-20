import { useState, useEffect } from 'react'
import { Check, Mail, Calendar, Globe, TrendingUp, Brain } from 'lucide-react'
import { AppState } from '../types'

const TOOLS = [
  { label: 'Gmail',      Icon: Mail },
  { label: 'Calendar',   Icon: Calendar },
  { label: 'Web Search', Icon: Globe },
  { label: 'Forex Data', Icon: TrendingUp },
  { label: 'Memory',     Icon: Brain },
] as const

interface HUDLeftPanelProps {
  appState: AppState
  conversationId: string
  lastLatencyMs: number | null
}

function useClock() {
  const [state, setState] = useState({ time: '', date: '' })
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setState({
        time: now.toLocaleTimeString('en-GB', {
          timeZone: 'Asia/Nicosia',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
          hour12: false,
        }),
        date: now.toLocaleDateString('en-GB', {
          timeZone: 'Asia/Nicosia',
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        }),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return state
}

const widgetStyle: React.CSSProperties = {
  background: 'rgba(0,8,20,0.65)',
  border: '1px solid rgba(0,212,255,0.12)',
  borderRadius: 12,
  padding: '14px 16px',
  backdropFilter: 'blur(32px)',
  WebkitBackdropFilter: 'blur(32px)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
}

function WidgetLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="font-mono tracking-[0.2em] uppercase font-medium mb-2.5"
      style={{ fontSize: 10, color: 'rgba(0,212,255,0.65)' }}
    >
      {children}
    </div>
  )
}

export function HUDLeftPanel({ conversationId, lastLatencyMs }: HUDLeftPanelProps) {
  const { time, date } = useClock()
  const sessionNum = ((parseInt(conversationId.slice(-4), 16) % 999) + 1)
    .toString()
    .padStart(3, '0')

  return (
    <div className="flex flex-col gap-4">

      {/* Widget 1 — STATUS */}
      <div style={widgetStyle}>
        <div className="flex items-start justify-between mb-2">
          <WidgetLabel>STATUS</WidgetLabel>
          <div className="flex items-center gap-1.5 mt-px">
            <div
              className="w-1.5 h-1.5 rounded-full bg-emerald-400"
              style={{
                boxShadow: '0 0 5px rgba(52,211,153,0.9)',
                animation: 'hud-blink 3s ease-in-out infinite',
              }}
            />
            <span className="font-mono" style={{ fontSize: 10, color: 'rgba(52,211,153,0.9)' }}>
              ONLINE
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-mono" style={{ fontSize: 11, color: 'rgba(107,143,179,0.6)' }}>
              Session
            </span>
            <span className="font-mono" style={{ fontSize: 11, color: 'rgba(230,244,255,0.55)' }}>
              #{sessionNum}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono" style={{ fontSize: 11, color: 'rgba(107,143,179,0.6)' }}>
              Latency
            </span>
            <span className="font-mono" style={{ fontSize: 11, color: 'rgba(0,212,255,0.7)' }}>
              {lastLatencyMs !== null ? `~${lastLatencyMs}ms` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Widget 2 — CLOCK */}
      <div style={widgetStyle}>
        <WidgetLabel>CLOCK</WidgetLabel>
        <div className="font-mono mb-0.5" style={{ fontSize: 10, color: 'rgba(107,143,179,0.5)' }}>
          LIMASSOL · UTC+3
        </div>
        <div
          className="font-mono tracking-wider my-1.5"
          style={{ fontSize: 22, color: 'rgba(0,212,255,0.9)', letterSpacing: '0.08em' }}
        >
          {time}
        </div>
        <div className="font-mono" style={{ fontSize: 10, color: 'rgba(107,143,179,0.45)' }}>
          {date}
        </div>
      </div>

      {/* Widget 3 — TOOLS */}
      <div style={widgetStyle}>
        <WidgetLabel>TOOLS</WidgetLabel>
        <div className="flex flex-col gap-1.5">
          {TOOLS.map(({ label, Icon }) => (
            <div
              key={label}
              className="flex items-center gap-2 py-0.5 rounded px-1 -mx-1 transition-colors"
              style={{ cursor: 'default' }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.background = 'rgba(0,212,255,0.05)')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background = 'transparent')
              }
            >
              <Check size={10} style={{ color: 'rgba(52,211,153,0.75)', flexShrink: 0 }} />
              <Icon size={11} style={{ color: 'rgba(107,143,179,0.5)', flexShrink: 0 }} />
              <span className="font-mono" style={{ fontSize: 11, color: 'rgba(230,244,255,0.6)' }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
