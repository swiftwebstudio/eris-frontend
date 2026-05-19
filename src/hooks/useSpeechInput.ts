import { useSpeechRecognition } from './useSpeechRecognition'
import { useIOSSpeechRecognition } from './useIOSSpeechRecognition'

// Covers both real iOS devices and Chrome on iPad (navigator.userAgent includes "Mac"
// on M-chip Macs in some cases, so we guard with the touchend check)
export const isIOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.userAgent.includes('Mac') && 'ontouchend' in document)

// Both hooks are always called (React rules prohibit conditional hook calls).
// Only one branch's return value is used at runtime.
export function useSpeechInput() {
  const webSpeech = useSpeechRecognition()
  const iosSpeech = useIOSSpeechRecognition()
  return isIOS ? iosSpeech : webSpeech
}
