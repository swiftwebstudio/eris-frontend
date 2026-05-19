import { useRef, useState, useCallback } from 'react'

interface UseSpeechRecognitionReturn {
  isSupported: boolean
  interimTranscript: string
  startListening: () => Promise<void>
  stopListening: () => Promise<string>
}

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

function getSpeechRecognitionAPI(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}

function createRecognition(): SpeechRecognition | null {
  const API = getSpeechRecognitionAPI()
  if (!API) return null
  const r = new API()
  r.continuous = true
  r.interimResults = true
  r.lang = 'en-US'
  return r
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const finalTranscriptRef = useRef('')
  const resolveRef = useRef<((value: string) => void) | null>(null)
  const warmedUpRef = useRef(false)
  const [interimTranscript, setInterimTranscript] = useState('')

  const isSupported = !!getSpeechRecognitionAPI()

  const warmUpMic = useCallback(async () => {
    if (warmedUpRef.current || !navigator.mediaDevices?.getUserMedia) return
    warmedUpRef.current = true
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((t) => t.stop())
    } catch {
      // permission denied or not available — handled upstream
    }
  }, [])

  const abortCurrent = useCallback(() => {
    const prev = recognitionRef.current
    if (!prev) return
    prev.onresult = null
    prev.onerror = null
    prev.onend = null
    try { prev.abort() } catch { /* already stopped */ }
    recognitionRef.current = null
  }, [])

  const startListening = useCallback(async (): Promise<void> => {
    abortCurrent()
    finalTranscriptRef.current = ''
    setInterimTranscript('')

    const doStart = () => {
      const recognition = createRecognition()
      if (!recognition) return
      recognitionRef.current = recognition

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = ''
        let final = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            final += result[0].transcript
          } else {
            interim += result[0].transcript
          }
        }
        if (final) finalTranscriptRef.current += final
        setInterimTranscript(interim)
      }

      recognition.onerror = (event) => {
        console.warn('[ERIS] SpeechRecognition error:', (event as SpeechRecognitionErrorEvent).error)
        if (resolveRef.current) {
          resolveRef.current(finalTranscriptRef.current.trim())
          resolveRef.current = null
        }
        setInterimTranscript('')
      }

      recognition.onend = () => {
        setInterimTranscript('')
      }

      try {
        recognition.start()
      } catch (e) {
        console.warn('[ERIS] recognition.start() threw:', e)
      }
    }

    if (isIOS) {
      warmUpMic().then(() => setTimeout(doStart, 50))
    } else {
      doStart()
    }
  }, [abortCurrent, warmUpMic])

  const stopListening = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      const recognition = recognitionRef.current
      if (!recognition) {
        resolve(finalTranscriptRef.current.trim())
        return
      }

      resolveRef.current = resolve

      recognition.onend = () => {
        setInterimTranscript('')
        const transcript = finalTranscriptRef.current.trim()
        if (resolveRef.current) {
          resolveRef.current(transcript)
          resolveRef.current = null
        }
        recognitionRef.current = null
      }

      try {
        recognition.stop()
      } catch {
        resolve(finalTranscriptRef.current.trim())
        recognitionRef.current = null
      }
    })
  }, [])

  return { isSupported, interimTranscript, startListening, stopListening }
}
