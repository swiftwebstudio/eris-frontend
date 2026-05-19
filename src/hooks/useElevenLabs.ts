import { useCallback, useRef } from 'react'

const ELEVENLABS_KEY = import.meta.env.VITE_ELEVENLABS_KEY as string
const VOICE_ID = import.meta.env.VITE_VOICE_ID as string

// Shortest valid silent MP3 — used to unlock the Audio element inside a user gesture
const SILENT_MP3 =
  'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA' +
  '//tQxAADB8AhSmxhIIEVCSiJrDCQBTcu3UrAIwUdkRgQbFAZC1CQEwTJ9mjRvBA4UOLD8nKVOWfh+Ul' +
  'K3z/177OXrfOdKl7pyn3Xf//WreyTRUoAWgBgkOAGbZHBgG1OF6zM82DWbZaUmMBptgQhGjsyYqc9a' +
  'e9XFz84FfHLaYiYUtIQBA2KK6JuRrfb//tSxBQBzVwLPmwxA8AnAamMzDxw'

interface UseElevenLabsReturn {
  speak: (text: string) => Promise<void>
  stop: () => void
  unlockAudio: () => void
}

export function useElevenLabs(onStart?: () => void, onEnd?: () => void): UseElevenLabsReturn {
  // Single persistent element — never replaced, only its src changes
  const audioRef = useRef<HTMLAudioElement>(new Audio())
  const isUnlockedRef = useRef(false)
  const currentBlobUrlRef = useRef<string | null>(null)

  const revokeCurrent = useCallback(() => {
    if (currentBlobUrlRef.current) {
      URL.revokeObjectURL(currentBlobUrlRef.current)
      currentBlobUrlRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    const audio = audioRef.current
    audio.onplay = null
    audio.onended = null
    audio.onerror = null
    audio.pause()
    audio.currentTime = 0
    revokeCurrent()
    audio.src = ''
    audio.load()
  }, [revokeCurrent])

  // Must be called synchronously inside a user-gesture event handler.
  // Sets a silent src and calls play()+pause() so iOS marks this element
  // as user-activated for all future play() calls.
  const unlockAudio = useCallback(() => {
    if (isUnlockedRef.current) return
    isUnlockedRef.current = true
    const audio = audioRef.current
    audio.src = SILENT_MP3
    const p = audio.play()
    if (p !== undefined) {
      p.then(() => audio.pause()).catch(() => {})
    }
  }, [])

  const speak = useCallback(
    async (text: string): Promise<void> => {
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
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
        },
      )

      if (!response.ok) {
        throw new Error(`ElevenLabs error: ${response.status}`)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      currentBlobUrlRef.current = url

      const audio = audioRef.current
      audio.src = url
      audio.load()

      return new Promise((resolve, reject) => {
        const cleanup = () => {
          audio.onplay = null
          audio.onended = null
          audio.onerror = null
          if (currentBlobUrlRef.current === url) revokeCurrent()
          onEnd?.()
        }

        audio.onplay = () => onStart?.()
        audio.onended = () => { cleanup(); resolve() }
        audio.onerror = () => { cleanup(); reject(new Error('Audio playback failed')) }

        try {
          const p = audio.play()
          if (p !== undefined) {
            p.catch((err: unknown) => {
              cleanup()
              reject(err instanceof Error ? err : new Error(String(err)))
            })
          }
        } catch (err) {
          cleanup()
          reject(err instanceof Error ? err : new Error(String(err)))
        }
      })
    },
    [stop, revokeCurrent, onStart, onEnd],
  )

  return { speak, stop, unlockAudio }
}
