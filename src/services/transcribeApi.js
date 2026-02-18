/**
 * Transcribe API – sends recorded audio to backend for speech-to-text.
 * Set VITE_ADVISOR_API_URL to your backend base URL (e.g. https://xxx.vercel.app).
 * Backend must expose POST /api/transcribe accepting audio file.
 */

export async function transcribeAudio(audioBlob) {
  const baseUrl = import.meta.env.VITE_ADVISOR_API_URL
  if (!baseUrl) {
    throw new Error('VITE_ADVISOR_API_URL not configured. Set it to your backend URL for voice transcription.')
  }
  const url = baseUrl.replace(/\/$/, '') + '/api/transcribe'
  const formData = new FormData()
  formData.append('audio', audioBlob, 'recording.webm')

  const res = await fetch(url, {
    method: 'POST',
    body: formData
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Transcription failed: ${res.status} ${errText}`)
  }
  const data = await res.json()
  return data.text || data.transcript || ''
}
