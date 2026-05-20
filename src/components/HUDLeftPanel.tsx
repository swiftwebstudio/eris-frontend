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

type ConnStatus = 'checking' | 'online' | 'offline'

function useConnectionStatus(): ConnStatus {
  const [status, setStatus] = useState<ConnStatus>('checking')
  useEffect(() => {
    const check = async () => {
      try {
        await fetch('https://n8n.swiftweb.studio', { method: 'HEAD', mode: 'no-cors' })
        setStatus('online')
      } catch {
        setStatus('offline')
      }
    }
    check()
    const id = setInterval(check, 30_000)
    return () => clearInterval(id)
  }, [])
  return status
}

function useSessionNumber(): number {
  const [num, setNum] = useState(1)
  useEffect(() => {
    const current = parseInt(localStorage.getItem('eris_session_count') || '0', 10)
    const next = current + 1
    localStorage.setItem('eris_session_count', String(next))
    setNum(next)
  }, [])
  return num
}

function latencyColor(ms: number): string {
  if (ms < 500)  return 'rgba(52,211,153,0.9)'
  if (ms < 1500) return 'rgba(251,191,36,0.9)'
  return 'rgba(239,68,68,0.9)'
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

const CONN_CONFIG: Record<ConnStatus, { dot: string; glow: string; pulse: boolean; label: string; color: string }> = {
  checking: {
    dot:   'rgba(251,191,36,0.9)',
    glow:  '0 0 5px rgba(251,191,36,0.7)',
    pulse: false,
    label: 'CHECKING',
    color: 'rgba(251,191,36,0.9)',
  },
  online: {
    dot:   'rgba(52,211,153,0.95)',
    glow:  '0 0 5px rgba(52,211,153,0.9)',
    pulse: true,
    label: 'ONLINE',
    color: 'rgba(52,211,153,0.9)',
  },
  offline: {
    dot:   'rgba(239,68,68,0.95)',
    glow:  '0 0 5px rgba(239,68,68,0.8)',
    pulse: false,
    label: 'OFFLINE',
    color: 'rgba(239,68,68,0.9)',
  },
}

export function HUDLeftPanel({ lastLatencyMs }: HUDLeftPanelProps) {
  const { time, date } = useClock()
  const connStatus     = useConnectionStatus()
  const sessionNum     = useSessionNumber()
  const conn           = CONN_CONFIG[connStatus]

  return (
    <div className="flex flex-col gap-4">

      {/* Widget 1 — STATUS */}
      <div style={widgetStyle}>
        <div className="flex items-start justify-between mb-2">
          <WidgetLabel>STATUS</WidgetLabel>
          <div className="flex items-center gap-1.5 mt-px">
            <div
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{
                background: conn.dot,
                boxShadow: conn.glow,
                animation: conn.pulse ? 'hud-blink 3s ease-in-out infinite' : 'none',
              }}
            />
            <span className="font-mono" style={{ fontSize: 10, color: conn.color }}>
              {conn.label}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-mono" style={{ fontSize: 11, color: 'rgba(107,143,179,0.6)' }}>
              Session
            </span>
            <span className="font-mono" style={{ fontSize: 11, color: 'rgba(230,244,255,0.55)' }}>
              #{String(sessionNum).padStart(3, '0')}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono" style={{ fontSize: 11, color: 'rgba(107,143,179,0.6)' }}>
              Latency
            </span>
            <span
              className="font-mono"
              style={{
                fontSize: 11,
                color: lastLatencyMs !== null ? latencyColor(lastLatencyMs) : 'rgba(107,143,179,0.45)',
              }}
            >
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
