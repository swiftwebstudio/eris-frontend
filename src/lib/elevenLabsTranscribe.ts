const ELEVENLABS_KEY = import.meta.env.VITE_ELEVENLABS_KEY as string

export async function elevenLabsTranscribe(blob: Blob, mimeType: string): Promise<string> {
  if (!ELEVENLABS_KEY) throw new Error('VITE_ELEVENLABS_KEY is not configured')

  const ext = mimeType.includes('mp4') ? 'm4a' : 'webm'
  const file = new File([blob], `audio.${ext}`, { type: mimeType })

  const body = new FormData()
  body.append('file', file)
  body.append('model_id', 'scribe_v1')

  const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': ELEVENLABS_KEY },
    body,
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`STT ${response.status}${detail ? ': ' + detail : ''}`)
  }

  const data = (await response.json()) as { text?: string }
  return (data.text ?? '').trim()
}
