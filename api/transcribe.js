/**
 * Transcribe API – receives audio file, returns text (Whisper).
 * Deploy to Vercel and set OPENAI_API_KEY.
 * Expects: POST FormData with 'audio' file (webm, mp3, etc.)
 * Returns: { text }
 */

import formidable from 'formidable'
import { createReadStream } from 'fs'
import OpenAI from 'openai'

export const config = {
  api: {
    bodyParser: false
  }
}

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({ maxFileSize: 25 * 1024 * 1024 })
    form.parse(req, (err, fields, files) => {
      if (err) reject(err)
      else resolve({ fields, files })
    })
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY not configured' })
  }

  let filepath
  let originalName = 'audio.webm'
  try {
    const { files } = await parseForm(req)
    const file = Array.isArray(files.audio) ? files.audio[0] : files.audio
    if (!file?.filepath) {
      return res.status(400).json({ error: 'Missing audio file. Send as FormData field "audio".' })
    }
    filepath = file.filepath
    originalName = file.originalFilename || originalName
  } catch (e) {
    return res.status(400).json({ error: e.message || 'Invalid multipart body' })
  }

  const openai = new OpenAI({ apiKey })
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: createReadStream(filepath),
      model: 'whisper-1',
      language: 'he'
    })
    const text = (transcription.text || '').trim()
    return res.status(200).json({ text })
  } catch (err) {
    console.error('Transcribe error:', err)
    return res.status(500).json({ error: err.message || 'Transcription failed' })
  }
}
