import { useCallback } from 'react'

const WEBHOOK_URL = import.meta.env.VITE_WEBHOOK_URL as string
const WEBHOOK_KEY = import.meta.env.VITE_WEBHOOK_KEY as string

interface ErisResponse {
  reply: string
}

interface UseErisReturn {
  sendMessage: (message: string, conversationId: string) => Promise<string>
}

export function useEris(): UseErisReturn {
  const sendMessage = useCallback(async (message: string, conversationId: string): Promise<string> => {
    if (!WEBHOOK_URL) {
      throw new Error('VITE_WEBHOOK_URL is not configured')
    }

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(WEBHOOK_KEY ? { 'x-api-key': WEBHOOK_KEY } : {}),
      },
      body: JSON.stringify({ message, conversationId }),
    })

    if (!response.ok) {
      throw new Error(`Webhook error: ${response.status} ${response.statusText}`)
    }

    const data: ErisResponse = await response.json()

    if (!data.reply) {
      throw new Error('Unexpected response format: missing "reply" field')
    }

    return data.reply
  }, [])

  return { sendMessage }
}
