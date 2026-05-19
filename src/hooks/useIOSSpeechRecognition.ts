import { useRef, useState, useCallback } from 'react'
import { elevenLabsTranscribe } from '../lib/elevenLabsTranscribe'

export const MIC_PERMISSION_KEY = 'eris_mic_permission_granted'

function getSupportedMimeType(): string {
  for (const t of ['audio/webm', 'audio/mp4', 'audio/mpeg']) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t
  }
  return 'audio/mp4'
}

export function useIOSSpeechRecognition() {
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const mimeTypeRef = useRef('audio/mp4')
  const [interimTranscript] = useState('')

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const startListening = useCallback(async (): Promise<void> => {
    chunksRef.current = []

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    streamRef.current = stream
    localStorage.setItem(MIC_PERMISSION_KEY, '1')

    const mimeType = getSupportedMimeType()
    mimeTypeRef.current = mimeType

    const recorder = new MediaRecorder(stream, { mimeType })
    recorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.start(100)
  }, [])

  const stopListening = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      const recorder = recorderRef.current

      if (!recorder || recorder.state === 'inactive') {
        stopStream()
        resolve('')
        return
      }

      recorder.onstop = async () => {
        stopStream()

        const mimeType = mimeTypeRef.current
        const blob = new Blob(chunksRef.current, { type: mimeType })
        chunksRef.current = []
        recorderRef.current = null

        if (blob.size < 500) {
          resolve('')
          return
        }

        try {
          const transcript = await elevenLabsTranscribe(blob, mimeType)
          resolve(transcript)
        } catch (err) {
          reject(err)
        }
      }

      recorder.stop()
    })
  }, [stopStream])

  const isSupported =
    typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

  return { isSupported, interimTranscript, startListening, stopListening }
}
