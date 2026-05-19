export type AppState = 'idle' | 'recording' | 'transcribing' | 'processing' | 'speaking'

export interface Message {
  id: string
  role: 'user' | 'eris'
  text: string
  timestamp: number
}
