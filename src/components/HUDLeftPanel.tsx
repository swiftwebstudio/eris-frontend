import { useState, useEffect } from 'react'
import { Check, Mail, Calendar, Globe, TrendingUp, Brain } from 'lucide-react'
import { AppState } from '../types'

const TOOLS = [
  { label: 'Gmail',       Icon: Mail },
  { label: 'Calendar',    Icon: Calendar },
  { label: 'Web Search',  Icon: Globe },
  { label: 'Forex Data',  Icon: TrendingUp },
  { label: 'Memory',      Icon: Brain },
] as const

interface HUDLeftPanelProps {
  appState: AppState
  conversationId: string
  lastLatencyMs: number | null
}

function useClock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString('en-GB', {
          timeZone: 'Asia/Nicosia',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }),
      )
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

function Widget({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'rgba(0,8,20,0.6)',
        border: '1px solid rgba(0,212,255,0.10)',
        borderRadius: 8,
        padding: '12px 14px',
        backdropFilter: 'blur(24px)',
      }}
    >
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="font-mono tracking-[0.18em] uppercase mb-2.5"
      style={{ fontSize: 9, color: 'rgba(0,212,255,0.5)' }}
    >
      {children}
    </div>
  )
}

const STATE_COLOR: Record<AppState, string> = {
  idle:         'rgba(107,143,179,0.7)',
  recording:    'rgba(52,211,153,0.9)',
  transcribing: 'rgba(251,191,36,0.85)',
  processing:   'rgba(251,191,36,0.85)',
  speaking:     'rgba(0,212,255,0.9)',
}

export function HUDLeftPanel({ appState, conversationId, lastLatencyMs }: HUDLeftPanelProps) {
  const time = useClock()
  const sessionNum = ((parseInt(conversationId.slice(-4), 16) % 999) + 1)
    .toString()
    .padStart(3, '0')

  return (
    <div className="flex flex-col gap-3 p-4 pt-16 h-full overflow-y-auto">

      {/* Status */}
      <Widget>
        <Label>SYS STATUS</Label>
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-1.5 h-1.5 rounded-full bg-emerald-400"
            style={{
              boxShadow: '0 0 5px rgba(52,211,153,0.9)',
              animation: 'hud-blink 3s ease-in-out infinite',
            }}
          />
          <span className="font-mono text-[11px]" style={{ color: 'rgba(230,244,255,0.65)' }}>
            ONLINE
          </span>
        </div>
        <div className="font-mono text-[10px] mb-0.5" style={{ color: 'rgba(107,143,179,0.45)' }}>
          SESSION #{sessionNum}
        </div>
        <div className="font-mono tracking-wider" style={{ fontSize: 14, color: 'rgba(0,212,255,0.85)' }}>
          {time}
        </div>
        <div className="font-mono mt-1" style={{ fontSize: 9, color: 'rgba(107,143,179,0.3)' }}>
          CY · UTC+3
        </div>
        {lastLatencyMs !== null && (
          <div
            className="font-mono mt-2 px-1.5 py-0.5 rounded"
            style={{
              fontSize: 9,
              color: 'rgba(0,229,255,0.6)',
              background: 'rgba(0,229,255,0.06)',
              border: '1px solid rgba(0,229,255,0.12)',
              display: 'inline-block',
            }}
          >
            {lastLatencyMs}ms latency
          </div>
        )}
      </Widget>

      {/* Capabilities */}
      <Widget>
        <Label>CAPABILITIES</Label>
        <div className="flex flex-col gap-1">
          {TOOLS.map(({ label, Icon }) => (
            <div key={label} className="flex items-center gap-2 py-px">
              <Check size={9} style={{ color: 'rgba(0,229,255,0.6)', flexShrink: 0 }} />
              <Icon size={10} style={{ color: 'rgba(107,143,179,0.45)', flexShrink: 0 }} />
              <span className="font-mono text-[10px]" style={{ color: 'rgba(107,143,179,0.55)' }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </Widget>

      {/* ERIS state */}
      <Widget>
        <Label>ERIS STATE</Label>
        <div
          className="font-mono uppercase tracking-widest text-[11px]"
          style={{ color: STATE_COLOR[appState], transition: 'color 0.4s ease' }}
        >
          {appState}
        </div>
      </Widget>
    </div>
  )
}
