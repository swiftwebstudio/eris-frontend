import { useCallback, useRef } from 'react'

const ELEVENLABS_KEY = import.meta.env.VITE_ELEVENLABS_KEY as string
const VOICE_ID = import.meta.env.VITE_VOICE_ID as string

interface UseElevenLabsReturn {
  speak: (text: string) => Promise<void>
  stop: () => void
}

function teardownAudio(audio: HTMLAudioElement, objectUrl: string | null) {
  audio.pause()
  audio.currentTime = 0
  audio.src = ''
  audio.load()
  if (objectUrl) URL.revokeObjectURL(objectUrl)
}

export function useElevenLabs(onStart?: () => void, onEnd?: () => void): UseElevenLabsReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  const stop = useCallback(() => {
    if (audioRef.current) {
      teardownAudio(audioRef.current, objectUrlRef.current)
      audioRef.current = null
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

      const finish = (err?: Error) => {
        teardownAudio(audio, objectUrlRef.current)
        audioRef.current = null
        objectUrlRef.current = null
        onEnd?.()
        if (err) reject(err)
        else resolve()
      }

      audio.onended = () => finish()
      audio.onerror = () => finish(new Error('Audio playback failed'))
      audio.play().catch((e) => finish(e instanceof Error ? e : new Error(String(e))))
    })
  }, [stop, onStart, onEnd])

  return { speak, stop }
}
