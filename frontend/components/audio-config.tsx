"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Trash2, Plus } from "lucide-react"

interface Voice {
  id: string
  name: string
}

interface AudioConfigProps {
  onConfigChange: (config: {
    apiKey: string
    selectedVoice: string
    modelId: string
    voices: Voice[]
  }) => void
}

export default function AudioConfig({ onConfigChange }: AudioConfigProps) {
  const [apiKey, setApiKey] = useState("")
  const [modelId, setModelId] = useState("")
  const [voiceName, setVoiceName] = useState("")
  const [voices, setVoices] = useState<Voice[]>([])
  const [selectedVoice, setSelectedVoice] = useState("")

  // Load config from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("audioConfig")
    if (saved) {
      const config = JSON.parse(saved)
      setApiKey(config.apiKey || "")
      setModelId(config.modelId || "")
      setVoices(config.voices || [])
      setSelectedVoice(config.selectedVoice || "")
    }
  }, [])

  // Save config to localStorage whenever it changes
  useEffect(() => {
    const config = { apiKey, modelId, voices, selectedVoice }
    localStorage.setItem("audioConfig", JSON.stringify(config))
    onConfigChange(config)
  }, [apiKey, modelId, voices, selectedVoice, onConfigChange])

  const addVoice = () => {
    if (voiceName.trim()) {
      const newVoice: Voice = {
        id: Date.now().toString(),
        name: voiceName,
      }
      setVoices([...voices, newVoice])
      setSelectedVoice(newVoice.id)
      setVoiceName("")
    }
  }

  const removeVoice = (id: string) => {
    const updatedVoices = voices.filter((v) => v.id !== id)
    setVoices(updatedVoices)
    if (selectedVoice === id) {
      setSelectedVoice(updatedVoices[0]?.id || "")
    }
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-foreground">Audio Generation Settings</CardTitle>
        <CardDescription>Configure API credentials and voice preferences</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* API Key */}
        <div className="space-y-2">
          <Label htmlFor="apiKey" className="text-sm font-medium text-foreground">
            API Key
          </Label>
          <Input
            id="apiKey"
            type="password"
            placeholder="Enter your API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="border-input bg-muted text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Model ID */}
        <div className="space-y-2">
          <Label htmlFor="modelId" className="text-sm font-medium text-foreground">
            Model ID
          </Label>
          <Input
            id="modelId"
            placeholder="e.g., tts-1, tts-1-hd"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            className="border-input bg-muted text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Voice Management */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-foreground">Voice Settings</Label>
          <div className="space-y-2">
            {/* Add New Voice */}
            <div className="flex gap-2">
              <Input
                placeholder="Enter voice name"
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addVoice()}
                className="border-input bg-muted text-foreground placeholder:text-muted-foreground"
              />
              <Button onClick={addVoice} size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Voice List */}
            {voices.length > 0 && (
              <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-2">
                {voices.map((voice) => (
                  <div key={voice.id} className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 flex-1 cursor-pointer">
                      <input
                        type="radio"
                        name="voice"
                        value={voice.id}
                        checked={selectedVoice === voice.id}
                        onChange={() => setSelectedVoice(voice.id)}
                        className="h-4 w-4 cursor-pointer"
                      />
                      <span className="text-sm text-foreground">{voice.name}</span>
                    </label>
                    <Button
                      onClick={() => removeVoice(voice.id)}
                      variant="ghost"
                      size="sm"
                      className="hover:bg-destructive/20 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
