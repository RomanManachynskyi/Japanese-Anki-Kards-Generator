"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { getConfig, updateConfig, healthCheck } from "@/lib/api"
import { toast } from "sonner"

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState("")
  const [voiceId, setVoiceId] = useState("")
  const [modelId, setModelId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking")

  // Load config from backend on mount
  useEffect(() => {
    if (open) {
      loadConfig()
      checkBackendStatus()
    }
  }, [open])

  const checkBackendStatus = async () => {
    setBackendStatus("checking")
    try {
      await healthCheck()
      setBackendStatus("online")
    } catch {
      setBackendStatus("offline")
    }
  }

  const loadConfig = async () => {
    setIsLoading(true)
    try {
      const config = await getConfig()
      setVoiceId(config.voice_id || "")
      setModelId(config.model_id || "")
      // API key is not returned for security, only whether it's set
      if (config.api_key_set) {
        setApiKey("••••••••••••••••") // Show placeholder
      }
    } catch (error) {
      console.error("Failed to load config:", error)
      // Load from localStorage as fallback
      const saved = localStorage.getItem("audioConfig")
      if (saved) {
        const config = JSON.parse(saved)
        setApiKey(config.apiKey || "")
        setVoiceId(config.voiceId || "")
        setModelId(config.modelId || "")
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Save config to backend
  const saveConfig = async () => {
    setIsSaving(true)
    try {
      // Only send API key if it's been changed (not the placeholder)
      const apiKeyToSend = apiKey.startsWith("••••") ? "" : apiKey
      
      await updateConfig({
        api_key: apiKeyToSend,
        voice_id: voiceId,
        model_id: modelId,
      })
      
      // Also save to localStorage as backup
      localStorage.setItem("audioConfig", JSON.stringify({
        apiKey: apiKeyToSend,
        voiceId,
        modelId,
      }))
      
      toast.success("Settings saved", {
        description: "Your audio configuration has been updated",
      })
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to save config:", error)
      toast.error("Failed to save settings", {
        description: "Please check if the backend is running",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Audio Generation Settings</DialogTitle>
          <DialogDescription>Configure your ElevenLabs API credentials for audio generation</DialogDescription>
        </DialogHeader>

        {/* Backend Status */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
          {backendStatus === "checking" && (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Checking backend status...</span>
            </>
          )}
          {backendStatus === "online" && (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-600">Backend is online</span>
            </>
          )}
          {backendStatus === "offline" && (
            <>
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-600">Backend is offline - start with: python api.py</span>
            </>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* API Key */}
            <div className="space-y-2">
              <Label htmlFor="apiKey" className="text-sm font-medium">
                ElevenLabs API Key
              </Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Enter your ElevenLabs API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="border-input bg-muted hover:border-primary/50 focus:border-primary transition-colors"
              />
              <p className="text-xs text-muted-foreground">
                Get your API key from{" "}
                <a
                  href="https://elevenlabs.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  elevenlabs.io
                </a>
              </p>
            </div>

            {/* Voice ID */}
            <div className="space-y-2">
              <Label htmlFor="voiceId" className="text-sm font-medium">
                Voice ID
              </Label>
              <Input
                id="voiceId"
                placeholder="e.g., fUjY9K2nAIwlALOwSiwc"
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                className="border-input bg-muted hover:border-primary/50 focus:border-primary transition-colors"
              />
              <p className="text-xs text-muted-foreground">
                Find voice IDs in your ElevenLabs dashboard under Voices
              </p>
            </div>

            {/* Model ID */}
            <div className="space-y-2">
              <Label htmlFor="modelId" className="text-sm font-medium">
                Model ID
              </Label>
              <Input
                id="modelId"
                placeholder="e.g., eleven_multilingual_v2"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="border-input bg-muted hover:border-primary/50 focus:border-primary transition-colors"
              />
              <p className="text-xs text-muted-foreground">
                Recommended: eleven_multilingual_v2 for Japanese
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end pt-4">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Cancel
              </Button>
              <Button 
                onClick={saveConfig} 
                disabled={isSaving || backendStatus === "offline"}
                className="hover:scale-105 transition-all disabled:hover:scale-100"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Settings"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
