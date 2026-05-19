import { useCallback, useRef } from 'react'

const ELEVENLABS_KEY = import.meta.env.VITE_ELEVENLABS_KEY as string
const VOICE_ID = import.meta.env.VITE_VOICE_ID as string

interface UseElevenLabsReturn {
  speak: (text: string) => Promise<void>
  stop: () => void
}

export function useElevenLabs(onStart?: () => void, onEnd?: () => void): UseElevenLabsReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }, [])

  const speak = useCallback(async (text: string): Promise<void> => {
    if (!ELEVENLABS_KEY || !VOICE_ID) {
      throw new Error('ElevenLabs credentials not configured')
    }

    stop()

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_KEY,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      },
    )

    if (!response.ok) {
      throw new Error(`ElevenLabs error: ${response.status}`)
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    objectUrlRef.current = url

    const audio = new Audio(url)
    audioRef.current = audio

    return new Promise((resolve, reject) => {
      audio.onplay = () => onStart?.()
      audio.onended = () => {
        URL.revokeObjectURL(url)
        objectUrlRef.current = null
        onEnd?.()
        resolve()
      }
      audio.onerror = () => {
        URL.revokeObjectURL(url)
        objectUrlRef.current = null
        onEnd?.()
        reject(new Error('Audio playback failed'))
      }
      audio.play().catch(reject)
    })
  }, [stop, onStart, onEnd])

  return { speak, stop }
}
