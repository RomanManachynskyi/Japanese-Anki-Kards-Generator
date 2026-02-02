"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { X, Maximize2, Minimize2, Crop } from "lucide-react"
import { Input } from "@/components/ui/input"
import Cropper, { Area } from "react-easy-crop"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ImageUploadProps {
  value: string // Base64 data URL
  onChange: (value: string) => void
  label?: string
  id?: string
}

export default function ImageUpload({ value, onChange, label, id }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [imageSize, setImageSize] = useState({ width: 300, height: 200 })
  const [cropDialogOpen, setCropDialogOpen] = useState(false)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [aspectRatio, setAspectRatio] = useState<number | undefined>(undefined) // undefined = free, 1 = square
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Compress image to reduce size
  const compressImage = useCallback((dataUrl: string, maxWidth: number = 800, maxHeight: number = 600, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        let width = img.width
        let height = img.height

        // Calculate new dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = width * ratio
          height = height * ratio
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          resolve(dataUrl)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality)
        resolve(compressedDataUrl)
      }
      img.onerror = () => resolve(dataUrl) // Fallback to original if compression fails
      img.src = dataUrl
    })
  }, [])

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        return
      }

      const reader = new FileReader()
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string
        // Compress image before storing
        const compressedDataUrl = await compressImage(dataUrl)
        onChange(compressedDataUrl)

        // Get image dimensions to set initial size
        const img = new Image()
        img.onload = () => {
          const maxWidth = 400
          const maxHeight = 300
          let width = img.width
          let height = img.height

          // Scale down if too large
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height)
            width = width * ratio
            height = height * ratio
          }

          setImageSize({ width, height })
        }
        img.src = compressedDataUrl
      }
      reader.readAsDataURL(file)
    },
    [onChange, compressImage],
  )

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          e.preventDefault()
          const file = items[i].getAsFile()
          if (file) {
            handleFile(file)
          }
          break
        }
      }
    },
    [handleFile],
  )

  useEffect(() => {
    // Add paste listener to window
    window.addEventListener("paste", handlePaste)
    return () => {
      window.removeEventListener("paste", handlePaste)
    }
  }, [handlePaste])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const file = e.dataTransfer.files[0]
      if (file) {
        handleFile(file)
      }
    },
    [handleFile],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFile(file)
      }
    },
    [handleFile],
  )

  const handleRemove = useCallback(() => {
    onChange("")
    setImageSize({ width: 300, height: 200 })
  }, [onChange])

  const handleResize = useCallback(
    (direction: "increase" | "decrease") => {
      setImageSize((prev) => {
        const factor = direction === "increase" ? 1.1 : 0.9
        const newWidth = Math.max(100, Math.min(800, prev.width * factor))
        const newHeight = Math.max(100, Math.min(600, prev.height * factor))
        return { width: newWidth, height: newHeight }
      })
    },
    [],
  )

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image()
      image.addEventListener("load", () => resolve(image))
      image.addEventListener("error", (error) => reject(error))
      image.src = url
    })

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area,
  ): Promise<string> => {
    const image = await createImage(imageSrc)
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      throw new Error("No 2d context")
    }

    // Set canvas size to match the cropped area
    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height

    // Draw the cropped image
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height,
    )

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Canvas is empty"))
            return
          }
          const reader = new FileReader()
          reader.addEventListener("load", () => resolve(reader.result as string))
          reader.addEventListener("error", reject)
          reader.readAsDataURL(blob)
        },
        "image/png",
        0.95,
      )
    })
  }

  const onCropComplete = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      // Store the cropped area pixels for when user applies the crop
      setCroppedAreaPixels(croppedAreaPixels)
    },
    [],
  )

  const handleCrop = useCallback(() => {
    if (!value) return
    setCropDialogOpen(true)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setAspectRatio(undefined)
    setCroppedAreaPixels(null)
  }, [value])

  const handleApplyCrop = useCallback(async () => {
    if (!value || !croppedAreaPixels) {
      setCropDialogOpen(false)
      return
    }

    try {
      const croppedImage = await getCroppedImg(value, croppedAreaPixels)
      // Compress the cropped image
      const compressedImage = await compressImage(croppedImage)
      onChange(compressedImage)

      // Update image size based on cropped dimensions
      const img = new Image()
      img.onload = () => {
        const maxWidth = 400
        const maxHeight = 300
        let width = img.width
        let height = img.height

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = width * ratio
          height = height * ratio
        }

        setImageSize({ width, height })
      }
      img.src = compressedImage
      setCropDialogOpen(false)
    } catch (error) {
      console.error("Failed to crop image:", error)
    }
  }, [value, croppedAreaPixels, onChange, compressImage])

  const handleSquareCrop = useCallback(() => {
    setAspectRatio(1)
  }, [])

  const handleFreeCrop = useCallback(() => {
    setAspectRatio(undefined)
  }, [])

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </Label>
      )}
      {!value ? (
        <div
          ref={containerRef}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
            isDragging
              ? "border-primary bg-primary/10"
              : "border-border bg-muted/50 hover:border-primary/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
            id={id}
          />
          <div className="flex flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm text-foreground">Drop an image here or click to upload</p>
            <p className="text-xs text-muted-foreground">Or press Ctrl+V to paste an image</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Select Image
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative border border-border rounded-lg p-4 bg-muted/50">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="flex-shrink-0 w-full sm:w-auto">
              <img
                ref={imageRef}
                src={value}
                alt="Uploaded"
                style={{
                  width: `${imageSize.width}px`,
                  height: `${imageSize.height}px`,
                  objectFit: "contain",
                }}
                className="rounded border border-border bg-background"
              />
            </div>
            <div className="flex-1 w-full flex flex-col gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleResize("decrease")}
                  title="Decrease size"
                  className="shrink-0 hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {Math.round(imageSize.width)} × {Math.round(imageSize.height)}px
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleResize("increase")}
                  title="Increase size"
                  className="shrink-0 hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCrop}
                  title="Crop image"
                  className="shrink-0 hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <Crop className="h-4 w-4 mr-1" />
                  Crop
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0 hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  Replace Image
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRemove}
                  className="shrink-0 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-colors"
                >
                  <X className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Press Ctrl+V to paste a new image</p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      )}

      {/* Crop Dialog */}
      <Dialog open={cropDialogOpen} onOpenChange={setCropDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Crop Image</DialogTitle>
            <DialogDescription>
              Adjust the crop area. Use the buttons below to switch between square and free crop.
            </DialogDescription>
          </DialogHeader>
          {value && (
            <div className="relative w-full" style={{ height: "400px" }}>
              <Cropper
                image={value}
                crop={crop}
                zoom={zoom}
                aspect={aspectRatio}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                style={{
                  containerStyle: {
                    width: "100%",
                    height: "100%",
                    position: "relative",
                  },
                }}
              />
            </div>
          )}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={aspectRatio === 1 ? "default" : "outline"}
                size="sm"
                onClick={handleSquareCrop}
                className="hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Square
              </Button>
              <Button
                type="button"
                variant={aspectRatio === undefined ? "default" : "outline"}
                size="sm"
                onClick={handleFreeCrop}
                className="hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Free
              </Button>
            </div>
            <div className="flex-1 flex items-center gap-2">
              <Label className="text-sm">Zoom:</Label>
              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={zoom}
                onChange={(e) => setZoom(Number.parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground w-12">{zoom.toFixed(1)}x</span>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setCropDialogOpen(false)}
              className="hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleApplyCrop}
              className="hover:scale-105 transition-all"
            >
              Apply Crop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

