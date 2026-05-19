import { useCallback, useRef } from 'react'

const ELEVENLABS_KEY = import.meta.env.VITE_ELEVENLABS_KEY as string
const VOICE_ID = import.meta.env.VITE_VOICE_ID as string

const SILENT_MP3 =
  'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA' +
  '//tQxAADB8AhSmxhIIEVCSiJrDCQBTcu3UrAIwUdkRgQbFAZC1CQEwTJ9mjRvBA4UOLD8nKVOWfh+Ul' +
  'K3z/177OXrfOdKl7pyn3Xf//WreyTRUoAWgBgkOAGbZHBgG1OF6zM82DWbZaUmMBptgQhGjsyYqc9a' +
  'e9XFz84FfHLaYiYUtIQBA2KK6JuRrfb//tSxBQBzVwLPmwxA8AnAamMzDxw'

interface UseElevenLabsReturn {
  speak: (text: string) => Promise<void>
  stop: () => void
  unlockAudio: () => void
  analyserRef: React.RefObject<AnalyserNode | null>
}

function teardown(audio: HTMLAudioElement, url: string | null) {
  audio.pause()
  audio.currentTime = 0
  audio.src = ''
  audio.load()
  if (url) URL.revokeObjectURL(url)
}

export function useElevenLabs(onStart?: () => void, onEnd?: () => void): UseElevenLabsReturn {
  const audioRef      = useRef<HTMLAudioElement>(new Audio())
  const isUnlockedRef = useRef(false)
  const blobUrlRef    = useRef<string | null>(null)

  // Web Audio chain — set up once, persisted for the session
  const audioCtxRef    = useRef<AudioContext | null>(null)
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const analyserRef    = useRef<AnalyserNode | null>(null)

  const ensureAnalyser = useCallback(() => {
    if (analyserRef.current) return
    try {
      const ctx = audioCtxRef.current ?? new AudioContext()
      audioCtxRef.current = ctx

      if (!mediaSourceRef.current) {
        mediaSourceRef.current = ctx.createMediaElementSource(audioRef.current)
      }

      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      mediaSourceRef.current.connect(analyser)
      analyser.connect(ctx.destination)
      analyserRef.current = analyser
    } catch (e) {
      console.warn('[ERIS] analyser setup failed:', e)
    }
  }, [])

  const stop = useCallback(() => {
    const audio = audioRef.current
    audio.onplay = null
    audio.onended = null
    audio.onerror = null
    teardown(audio, blobUrlRef.current)
    blobUrlRef.current = null
  }, [])

  const unlockAudio = useCallback(() => {
    if (isUnlockedRef.current) return
    isUnlockedRef.current = true

    const audio = audioRef.current
    audio.src = SILENT_MP3
    const p = audio.play()
    if (p) p.then(() => audio.pause()).catch(() => {})

    // Prime AudioContext in same gesture tick
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {})
      }
    } catch {}
  }, [])

  const speak = useCallback(
    async (text: string): Promise<void> => {
      if (!ELEVENLABS_KEY || !VOICE_ID) throw new Error('ElevenLabs credentials not configured')

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

      if (!response.ok) throw new Error(`ElevenLabs error: ${response.status}`)

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      blobUrlRef.current = url

      // Set up analyser now (AudioContext is already primed from unlockAudio)
      if (audioCtxRef.current?.state === 'suspended') {
        await audioCtxRef.current.resume().catch(() => {})
      }
      ensureAnalyser()

      const audio = audioRef.current
      audio.src = url
      audio.load()

      return new Promise((resolve, reject) => {
        const cleanup = () => {
          audio.onplay = null
          audio.onended = null
          audio.onerror = null
          if (blobUrlRef.current === url) {
            URL.revokeObjectURL(url)
            blobUrlRef.current = null
          }
          onEnd?.()
        }

        audio.onplay  = () => onStart?.()
        audio.onended = () => { cleanup(); resolve() }
        audio.onerror = () => { cleanup(); reject(new Error('Audio playback failed')) }

        try {
          const p = audio.play()
          if (p) p.catch((e: unknown) => { cleanup(); reject(e) })
        } catch (e) {
          cleanup(); reject(e)
        }
      })
    },
    [stop, ensureAnalyser, onStart, onEnd],
  )

  return { speak, stop, unlockAudio, analyserRef }
}
