import { useEffect, useRef, useState, useCallback } from 'react'

interface UseSpeechRecognitionReturn {
  isSupported: boolean
  interimTranscript: string
  startListening: () => void
  stopListening: () => Promise<string>
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const finalTranscriptRef = useRef('')
  const resolveRef = useRef<((value: string) => void) | null>(null)
  const [interimTranscript, setInterimTranscript] = useState('')

  const SpeechRecognitionAPI =
    typeof window !== 'undefined'
      ? (window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null)
      : null

  const isSupported = !!SpeechRecognitionAPI

  useEffect(() => {
    if (!SpeechRecognitionAPI) return

    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

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

      if (final) {
        finalTranscriptRef.current += final
      }
      setInterimTranscript(interim)
    }

    recognition.onerror = () => {
      if (resolveRef.current) {
        resolveRef.current(finalTranscriptRef.current.trim())
        resolveRef.current = null
      }
    }

    recognitionRef.current = recognition

    return () => {
      recognition.abort()
    }
  }, [SpeechRecognitionAPI])

  const startListening = useCallback(() => {
    finalTranscriptRef.current = ''
    setInterimTranscript('')
    recognitionRef.current?.start()
  }, [])

  const stopListening = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve

      const recognition = recognitionRef.current
      if (!recognition) {
        resolve('')
        return
      }

      recognition.onend = () => {
        setInterimTranscript('')
        resolve(finalTranscriptRef.current.trim())
        resolveRef.current = null
      }

      recognition.stop()
    })
  }, [])

  return { isSupported, interimTranscript, startListening, stopListening }
}
