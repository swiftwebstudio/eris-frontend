# ERIS — Voice Assistant Frontend

A dark-themed, voice-first React PWA powered by browser speech recognition, a custom webhook backend, and ElevenLabs TTS. Installable on iOS and Android home screens.

## Stack

- React 18 + TypeScript
- Vite + vite-plugin-pwa (Workbox)
- Tailwind CSS
- Framer Motion
- lucide-react

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `VITE_WEBHOOK_URL` | URL your backend listens on for chat messages |
| `VITE_WEBHOOK_KEY` | API key sent as `x-api-key` header to the webhook |
| `VITE_ELEVENLABS_KEY` | ElevenLabs API key from https://elevenlabs.io |
| `VITE_VOICE_ID` | ElevenLabs voice ID to use for TTS |

### 3. Run in development

```bash
npm run dev
```

### 4. Build for production

```bash
npm run build
```

## Webhook contract

ERIS sends a `POST` to `VITE_WEBHOOK_URL` with:

```json
{
  "message": "user transcript",
  "conversationId": "uuid-stored-in-localstorage"
}
```

Your backend must respond with:

```json
{
  "reply": "ERIS response text"
}
```

## Usage

| Action | How |
|---|---|
| Push-to-talk | Hold the microphone button |
| Keyboard push-to-talk | Hold `Space` |
| Clear history | Click "Clear" (top-right) |

## Installing to your home screen

### iOS (Safari)

1. Open the deployed URL in **Safari** on iPhone or iPad.
2. Tap the **Share** button (the box with an arrow at the bottom of the screen).
3. Scroll down and tap **Add to Home Screen**.
4. Confirm the name ("ERIS") and tap **Add**.
5. ERIS will appear as a full-screen app with no browser chrome.

> Note: iOS requires Safari specifically — Chrome and Firefox on iOS cannot install PWAs.

### Android (Chrome)

1. Open the deployed URL in **Chrome**.
2. Tap the **three-dot menu** (⋮) in the top-right corner.
3. Tap **Add to Home screen** (or an install banner may appear automatically).
4. Tap **Add** to confirm.
5. ERIS launches as a standalone app.

> Tip: Chrome may also show an automatic install prompt at the bottom of the screen on first visit.

## Service worker caching

The Workbox service worker caches the full app shell (HTML, JS, CSS, fonts, icons) for offline access. API calls to ElevenLabs and the webhook backend always hit the network — they are never cached.

## Browser support

Speech recognition requires Chrome, Edge, or Safari. Firefox is not supported — a text input fallback is shown automatically when the Web Speech API is unavailable.
