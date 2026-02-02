/**
 * API client for communicating with the Python backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export interface KanjiData {
  kanji: string
  furigana: string
}

export type CardGenerationMode = "both" | "jp_en" | "en_jp"

export interface CardInput {
  reading: string
  kanji: KanjiData | null
  translation: string
  sentence_kana: string
  sentence_english: string
  sentence_image: string // Base64 data URL
  audio_count: number | null
  generation_mode: CardGenerationMode
}

export interface GenerateRequest {
  cards: CardInput[]
}

export interface GenerateResponse {
  success: boolean
  message: string
  apkg_path: string | null
  total_cards: number
  total_audio_files: number
}

export interface AudioConfig {
  api_key: string
  voice_id: string
  model_id: string
}

export interface ConfigResponse {
  api_key_set: boolean
  voice_id: string
  model_id: string
  note_type_id: number
}

/**
 * Get current backend configuration
 */
export async function getConfig(): Promise<ConfigResponse> {
  const response = await fetch(`${API_BASE_URL}/api/config`)
  if (!response.ok) {
    throw new Error("Failed to fetch config")
  }
  return response.json()
}

/**
 * Update backend configuration
 */
export async function updateConfig(config: AudioConfig): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/config`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(config),
  })
  if (!response.ok) {
    throw new Error("Failed to update config")
  }
  return response.json()
}

/**
 * Generate Anki cards
 */
export async function generateCards(request: GenerateRequest): Promise<GenerateResponse> {
  const response = await fetch(`${API_BASE_URL}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || "Failed to generate cards")
  }
  
  return response.json()
}

/**
 * Download the generated .apkg file
 */
export async function downloadApkg(apkgPath: string): Promise<Blob> {
  const filename = apkgPath.split(/[/\\]/).pop() || "vocabulary.apkg"
  const response = await fetch(`${API_BASE_URL}/api/download/${filename}`)
  
  if (!response.ok) {
    throw new Error("Failed to download file")
  }
  
  return response.blob()
}

/**
 * Health check
 */
export async function healthCheck(): Promise<{ status: string; service: string }> {
  const response = await fetch(`${API_BASE_URL}/api/health`)
  if (!response.ok) {
    throw new Error("Backend is not available")
  }
  return response.json()
}

