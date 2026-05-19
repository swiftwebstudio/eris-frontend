export type AppState = 'idle' | 'recording' | 'processing' | 'speaking'

export interface Message {
  id: string
  role: 'user' | 'eris'
  text: string
  timestamp: number
}
