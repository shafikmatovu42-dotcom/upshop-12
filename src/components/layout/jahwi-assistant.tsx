"use client"

import { useState, useEffect, useRef } from "react"
import {
  Sparkles, X, Send, Bot, MessageSquare, Maximize2, Minimize2,
  Paperclip, ImageIcon, Trash2, Download, Eye, CheckCircle2,
  AlertTriangle, Mic, MicOff, Volume2, VolumeX, Globe,
  Settings, ArrowLeft, RefreshCw, Sliders, Volume1, Repeat,
  FileText, StickyNote, Plus, Edit, Share2, Search, Notebook
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { printThermalReceipt } from "@/lib/print-receipt"

interface Message {
  sender: "user" | "jahwi"
  text: string
  timestamp: string
  image?: string
  actionExecuted?: string
}

interface NoteItem {
  id: string
  title: string
  content: string
  category?: string
  tags?: string
  timestamp: string
}

export function JahwiAssistant() {
  const { token } = useAuth()
  const { toast } = useToast()

  const [isOpen, setIsOpen] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [activeTab, setActiveTab] = useState<"chat" | "settings" | "notes">("chat")

  const [inputMessage, setInputMessage] = useState("")
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [imageMimeType, setImageMimeType] = useState<string>("image/jpeg")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)

  // Live Speech & Advanced Real-Time Voice Settings State
  const [isLiveMode, setIsLiveMode] = useState<boolean>(false)
  const [isListening, setIsListening] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [speechRate, setSpeechRate] = useState<number>(1.0)
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string>("")
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedLanguage, setSelectedLanguage] = useState<"lg-UG" | "sw-KE" | "en-US">("en-US")
  const [audioLevels, setAudioLevels] = useState<number[]>([15, 30, 45, 60, 40, 25, 10])
  const [silenceThresholdMs, setSilenceThresholdMs] = useState<number>(750)
  const [activeGeminiModel, setActiveGeminiModel] = useState<string>("")

  // Business Notes State
  const [userNotes, setUserNotes] = useState<NoteItem[]>([])
  const [notesLoading, setNotesLoading] = useState<boolean>(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteTitleInput, setNoteTitleInput] = useState<string>("")
  const [noteCategoryInput, setNoteCategoryInput] = useState<string>("general")
  const [noteTagsInput, setNoteTagsInput] = useState<string>("")
  const [noteContentInput, setNoteContentInput] = useState<string>("")
  const [noteSearchQuery, setNoteSearchQuery] = useState<string>("")
  const [isCreatingNote, setIsCreatingNote] = useState<boolean>(false)

  // Advanced Real-Time Conversational Flags
  const [enableBargeIn, setEnableBargeIn] = useState<boolean>(true)
  const [isContinuousVoice, setIsContinuousVoice] = useState<boolean>(false)

  // Acoustic Echo Cancellation & Self-Speech Suppression Refs
  const isSpeakingRef = useRef<boolean>(false)
  const lastSpokenTimeRef = useRef<number>(0)
  const lastSpokenTextRef = useRef<string>("")
  const isMutedRef = useRef<boolean>(isMuted)
  const isLiveModeRef = useRef<boolean>(isLiveMode)

  useEffect(() => { isMutedRef.current = isMuted }, [isMuted])
  useEffect(() => { isLiveModeRef.current = isLiveMode }, [isLiveMode])

  const recognitionRef = useRef<any>(null)
  const silenceTimerRef = useRef<any>(null)
  const animFrameRef = useRef<number | null>(null)

  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "jahwi",
      text: "Hello! I am JAHWI AI, your live conversational co-pilot. Tap the mic to speak in Luganda, Swahili, or English for instant hands-free actions!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ])
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load saved speech & model preferences on mount
  useEffect(() => {
    try {
      const savedMute = localStorage.getItem("upshop_jahwi_muted")
      if (savedMute !== null) setIsMuted(savedMute === "true")

      const savedRate = localStorage.getItem("upshop_speech_rate")
      if (savedRate) setSpeechRate(parseFloat(savedRate))

      const savedVoice = localStorage.getItem("upshop_speech_voice_uri")
      if (savedVoice) setSelectedVoiceUri(savedVoice)

      const savedSilence = localStorage.getItem("upshop_silence_delay")
      if (savedSilence) setSilenceThresholdMs(parseInt(savedSilence, 10))

      const savedBargeIn = localStorage.getItem("upshop_enable_barge_in")
      if (savedBargeIn !== null) setEnableBargeIn(savedBargeIn === "true")

      const savedContinuous = localStorage.getItem("upshop_continuous_voice")
      if (savedContinuous !== null) setIsContinuousVoice(savedContinuous === "true")

      const cachedModel = localStorage.getItem("upshop_gemini_active_model")
      if (cachedModel) setActiveGeminiModel(cachedModel)
    } catch (e) {}
  }, [])

  // Load browser TTS speech voices dynamically
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      if (voices.length > 0) {
        setAvailableVoices(voices)
      }
    }

    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
  }, [])

  // Web Speech Recognition Setup with Echo & Self-Voice Suppression
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        if (recognitionRef.current) {
          try { recognitionRef.current.stop() } catch (e) {}
        }

        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        // Map unsupported BCP-47 tags like 'lg-UG' to a supported speech recognition model ('en-UG' / 'sw-KE')
        recognition.lang = selectedLanguage === "lg-UG" ? "en-UG" : (selectedLanguage || "en-US")

        recognition.onresult = (event: any) => {
          // 0. Complete Mute Filter: Ignore mic input completely when muted
          if (isMutedRef.current) return

          // 1. Acoustic Echo Suppression: Ignore mic input while AI TTS is speaking out loud or within 600ms of finishing
          if (isSpeakingRef.current || (Date.now() - lastSpokenTimeRef.current < 600)) {
            return
          }

          let currentText = ""
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentText += event.results[i][0].transcript
          }

          const normalizedCurrent = currentText.toLowerCase().trim()
          if (!normalizedCurrent) return

          // 2. Text Echo Filter: Ignore if recognized text matches recent AI output
          if (lastSpokenTextRef.current && (
            lastSpokenTextRef.current.includes(normalizedCurrent) ||
            normalizedCurrent.includes(lastSpokenTextRef.current.slice(0, 15))
          )) {
            return
          }

          setInputMessage(currentText)

          // Voice Activity Detection (VAD) Silence Auto-Submit
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
          silenceTimerRef.current = setTimeout(() => {
            handleAutoSendVoice(currentText)
          }, silenceThresholdMs)
        }

        recognition.onerror = (err: any) => {
          console.warn("Speech recognition error:", err?.error || err)
          setIsListening(false)
          if (err?.error === 'not-allowed') {
            toast({
              variant: "destructive",
              title: "Microphone Blocked",
              description: "Please allow microphone access in your browser settings to speak."
            })
          }
        }

        recognition.onend = () => {
          setIsListening(false)
          // If live mode is active and not muted or speaking, automatically re-start recognition
          if (isLiveModeRef.current && !isMutedRef.current && !isSpeakingRef.current) {
            try {
              setTimeout(() => {
                if (isLiveModeRef.current && !isMutedRef.current && !isSpeakingRef.current) {
                  recognitionRef.current?.start()
                  setIsListening(true)
                }
              }, 300)
            } catch (e) {}
          }
        }

        recognitionRef.current = recognition
      }
    }
  }, [selectedLanguage, silenceThresholdMs])

  // Text-to-Speech (TTS) Engine with controlled lifecycle & echo protection
  const speakSentence = (text: string, lang: string = "en-US") => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || isMutedRef.current) return
    const cleanText = text.replace(/[*_#`~]/g, "").replace(/Shs\s*([\d,]+)/gi, "$1 shillings").trim()
    if (!cleanText) return

    try {
      stopListening() // Pause mic listening while AI speaks out loud
      window.speechSynthesis.cancel()

      isSpeakingRef.current = true
      lastSpokenTextRef.current = cleanText.toLowerCase()

      const utterance = new SpeechSynthesisUtterance(cleanText)
      utterance.rate = speechRate
      utterance.pitch = 1.0

      if (selectedVoiceUri && availableVoices.length > 0) {
        const matchedVoice = availableVoices.find(v => v.voiceURI === selectedVoiceUri)
        if (matchedVoice) utterance.voice = matchedVoice
      } else {
        utterance.lang = lang === "lg-UG" || lang === "sw-KE" ? "sw-KE" : "en-US"
      }

      utterance.onstart = () => {
        isSpeakingRef.current = true
      }

      utterance.onend = () => {
        isSpeakingRef.current = false
        lastSpokenTimeRef.current = Date.now()

        // Re-arm Live Listening if Live Mode is ON and audio is unmuted
        if (isLiveModeRef.current && !isMutedRef.current) {
          setTimeout(() => {
            if (!isSpeakingRef.current && isLiveModeRef.current && !isMutedRef.current) {
              startListening()
            }
          }, 500)
        } else {
          stopListening()
        }
      }

      utterance.onerror = () => {
        isSpeakingRef.current = false
        lastSpokenTimeRef.current = Date.now()
        if (isLiveModeRef.current && !isMutedRef.current) {
          setTimeout(() => {
            if (!isSpeakingRef.current && isLiveModeRef.current && !isMutedRef.current) {
              startListening()
            }
          }, 500)
        } else {
          stopListening()
        }
      }

      window.speechSynthesis.speak(utterance)
    } catch (e) {
      console.warn("Speech synthesis error:", e)
      isSpeakingRef.current = false
      if (isLiveModeRef.current && !isMutedRef.current) {
        startListening()
      }
    }
  }

  // Soundwave visual pulse when microphone is active
  useEffect(() => {
    if (isListening) {
      const updateWave = () => {
        setAudioLevels([
          Math.floor(15 + Math.random() * 70),
          Math.floor(25 + Math.random() * 75),
          Math.floor(35 + Math.random() * 60),
          Math.floor(50 + Math.random() * 50),
          Math.floor(30 + Math.random() * 65),
          Math.floor(20 + Math.random() * 70),
          Math.floor(10 + Math.random() * 55)
        ])
        animFrameRef.current = requestAnimationFrame(updateWave)
      }
      animFrameRef.current = requestAnimationFrame(updateWave)
    } else {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      setAudioLevels([15, 25, 35, 45, 30, 20, 10])
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [isListening])

  const toggleListening = () => {
    if (isLiveModeRef.current || isListening) {
      setIsLiveMode(false)
      isLiveModeRef.current = false
      stopListening()
      toast({
        title: "Live Mode Deactivated",
        description: "Live Co-pilot voice mode is turned OFF."
      })
      return
    }

    if (!recognitionRef.current) {
      toast({
        variant: "destructive",
        title: "Voice Not Supported",
        description: "Your browser does not support Web Speech API. You can still type in English, Luganda, or Swahili."
      })
      return
    }

    if (isMutedRef.current) {
      setIsMuted(false)
      isMutedRef.current = false
      try { localStorage.setItem("upshop_jahwi_muted", "false") } catch (e) {}
    }

    setIsLiveMode(true)
    isLiveModeRef.current = true
    startListening()
    toast({
      title: "Live Co-Pilot Mode Active",
      description: "Hands-free continuous listening active (English / Luganda / Swahili)."
    })
  }

  const startListening = () => {
    if (!recognitionRef.current || isMutedRef.current || !isLiveModeRef.current) return
    if (isSpeakingRef.current || (Date.now() - lastSpokenTimeRef.current < 600)) {
      setTimeout(() => {
        if (isLiveModeRef.current && !isMutedRef.current && !isSpeakingRef.current) {
          startListening()
        }
      }, 500)
      return
    }

    setIsOpen(true)
    setInputMessage("")
    try {
      recognitionRef.current.start()
      setIsListening(true)
    } catch (e: any) {
      if (e?.name === 'InvalidStateError' || e?.message?.includes('already started')) {
        setIsListening(true)
      } else {
        try { recognitionRef.current.stop() } catch (err) {}
        setTimeout(() => {
          try {
            if (isLiveModeRef.current && !isMutedRef.current && !isSpeakingRef.current) {
              recognitionRef.current?.start()
              setIsListening(true)
            }
          } catch (err2) {}
        }, 300)
      }
    }
  }

  const stopListening = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (e) {}
      try {
        recognitionRef.current.abort()
      } catch (e) {}
    }
    setIsListening(false)
  }

  const handleAutoSendVoice = (speechText: string) => {
    if (!isLiveModeRef.current) {
      stopListening()
    }
    if (speechText.trim()) {
      handleSendMessage(undefined, speechText)
    }
  }

  const handleToggleMute = () => {
    const nextMute = !isMuted
    setIsMuted(nextMute)
    try {
      localStorage.setItem("upshop_jahwi_muted", String(nextMute))
    } catch (e) {}

    if (nextMute) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel()
        isSpeakingRef.current = false
      }
      stopListening() // Stop listening immediately when muted!
      toast({
        title: "Audio & Microphone Muted",
        description: "Device speech output and voice microphone listening silenced."
      })
    } else {
      toast({
        title: "Audio & Microphone Unmuted",
        description: "Device speech output and voice microphone enabled."
      })
      if (isLiveMode) {
        startListening()
      }
    }
  }

  // Business Notes API Operations
  const fetchNotes = async () => {
    if (!token) return
    setNotesLoading(true)
    try {
      const res = await fetch('/api/notes', { headers: { 'Authorization': `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setUserNotes(data)
      }
    } catch (e) {
      console.error("Failed to load notes", e)
    } finally {
      setNotesLoading(false)
    }
  }

  useEffect(() => {
    fetchNotes()
    const handleDataUpdate = () => fetchNotes()
    window.addEventListener("upshop_data_updated", handleDataUpdate)
    return () => window.removeEventListener("upshop_data_updated", handleDataUpdate)
  }, [token])

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteTitleInput.trim() || !noteContentInput.trim()) {
      toast({ variant: "destructive", title: "Missing Information", description: "Please enter both a note title and note content." })
      return
    }

    try {
      if (editingNoteId) {
        const res = await fetch(`/api/notes/${editingNoteId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            title: noteTitleInput.trim(),
            content: noteContentInput.trim(),
            category: noteCategoryInput,
            tags: noteTagsInput.trim()
          })
        })
        if (res.ok) {
          toast({ title: "Note Updated", description: `Updated note "${noteTitleInput.trim()}"` })
        }
      } else {
        const res = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            title: noteTitleInput.trim(),
            content: noteContentInput.trim(),
            category: noteCategoryInput,
            tags: noteTagsInput.trim()
          })
        })
        if (res.ok) {
          toast({ title: "Note Saved", description: `Saved new note "${noteTitleInput.trim()}"` })
        }
      }

      setEditingNoteId(null)
      setNoteTitleInput("")
      setNoteContentInput("")
      setNoteCategoryInput("general")
      setNoteTagsInput("")
      setIsCreatingNote(false)
      fetchNotes()
      window.dispatchEvent(new Event("upshop_data_updated"))
    } catch (e) {
      toast({ variant: "destructive", title: "Save Error", description: "Could not save your note." })
    }
  }

  const handleDeleteNote = async (noteId: string, title: string) => {
    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        toast({ title: "Note Deleted", description: `Removed note "${title}"` })
        fetchNotes()
        window.dispatchEvent(new Event("upshop_data_updated"))
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Delete Error", description: "Could not delete note." })
    }
  }

  const handleStartEditNote = (note: NoteItem) => {
    setEditingNoteId(note.id)
    setNoteTitleInput(note.title)
    setNoteContentInput(note.content)
    setNoteCategoryInput(note.category || "general")
    setNoteTagsInput(note.tags || "")
    setIsCreatingNote(true)
  }

  const handleShareNoteWithAi = (note: NoteItem) => {
    const formattedPrompt = `📋 [BUSINESS NOTE ATTACHED]\nTitle: ${note.title}\nCategory: ${note.category || 'General'}\nContent:\n${note.content}\n\nJAHWI AI, please review this note and suggest appropriate actions or insights.`
    setActiveTab("chat")
    setIsOpen(true)
    handleSendMessage(undefined, formattedPrompt)
    toast({ title: "Shared with JAHWI AI", description: `Sending "${note.title}" to AI assistant...` })
  }

  // Listen for external report notifications & speech events
  useEffect(() => {
    const handleReportNotification = (e: any) => {
      const detail = e.detail || {}
      const reportTitle = detail.title || "Official Period Financial Report"
      const reportFilename = detail.filename || "upshop_report.pdf"
      const periodLabel = detail.periodLabel || "Active Period"

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      const notifyMessage = `📊 JAHWI AI AUTOMATIC REPORT NOTIFICATION:\nYour official PDF report (${reportTitle}) for ${periodLabel} has been generated and compiled successfully!\nFilename: ${reportFilename}`

      setMessages(prev => [
        ...prev,
        {
          sender: "jahwi",
          text: notifyMessage,
          timestamp: timeStr,
          actionExecuted: `Generated & compiled ${reportFilename}`
        }
      ])

      toast({
        title: "JAHWI AI Notification",
        description: `Official PDF Report generated for ${periodLabel}.`
      })
    }

    const handleVoiceSpeech = (e: any) => {
      const speechText = e.detail?.text
      if (speechText) {
        setIsOpen(true)
        setActiveTab("chat")
        handleSendMessage(undefined, speechText)
      }
    }

    window.addEventListener("upshop_report_generated", handleReportNotification as EventListener)
    window.addEventListener("upshop_notify_jahwi", handleReportNotification as EventListener)
    window.addEventListener("upshop_voice_speech", handleVoiceSpeech as EventListener)

    return () => {
      window.removeEventListener("upshop_report_generated", handleReportNotification as EventListener)
      window.removeEventListener("upshop_notify_jahwi", handleReportNotification as EventListener)
      window.removeEventListener("upshop_voice_speech", handleVoiceSpeech as EventListener)
    }
  }, [toast])

  // Position state for floating draggable icon
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isInitialized, setIsInitialized] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const dragStartRef = useRef<{ mouseX: number; mouseY: number; elemX: number; elemY: number } | null>(null)
  const hasMovedRef = useRef(false)

  useEffect(() => {
    const margin = 24
    const iconSize = 64
    const defaultX = typeof window !== 'undefined' ? window.innerWidth - iconSize - margin : 1000
    const defaultY = typeof window !== 'undefined' ? window.innerHeight - iconSize - margin : 700

    try {
      const saved = localStorage.getItem("upshop_jahwi_pos")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          const clampedX = Math.max(margin, Math.min(window.innerWidth - iconSize - margin, parsed.x))
          const clampedY = Math.max(margin, Math.min(window.innerHeight - iconSize - margin, parsed.y))
          setPos({ x: clampedX, y: clampedY })
          setIsInitialized(true)
          return
        }
      }
    } catch (e) {
      console.warn("Could not load jahwi position:", e)
    }

    setPos({ x: defaultX, y: defaultY })
    setIsInitialized(true)
  }, [])

  useEffect(() => {
    const handleResize = () => {
      setPos(prev => {
        const iconSize = 64
        const margin = 20
        const isLeft = prev.x + iconSize / 2 < window.innerWidth / 2
        const targetX = isLeft ? margin : window.innerWidth - iconSize - margin
        const targetY = Math.max(margin, Math.min(window.innerHeight - iconSize - margin, prev.y))
        return { x: targetX, y: targetY }
      })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const snapToEdge = (currentX: number, currentY: number) => {
    const iconSize = 64
    const margin = 20
    const screenWidth = window.innerWidth
    const screenHeight = window.innerHeight

    const isLeft = (currentX + iconSize / 2) < (screenWidth / 2)
    const snappedX = isLeft ? margin : screenWidth - iconSize - margin
    const snappedY = Math.max(margin, Math.min(screenHeight - iconSize - margin, currentY))

    const finalPos = { x: snappedX, y: snappedY }
    setPos(finalPos)
    try {
      localStorage.setItem("upshop_jahwi_pos", JSON.stringify(finalPos))
    } catch (e) { }
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    hasMovedRef.current = false
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      elemX: pos.x,
      elemY: pos.y
    }
    setIsDragging(true)

    const handlePointerMove = (moveEvt: PointerEvent) => {
      if (!dragStartRef.current) return
      const deltaX = moveEvt.clientX - dragStartRef.current.mouseX
      const deltaY = moveEvt.clientY - dragStartRef.current.mouseY

      if (Math.hypot(deltaX, deltaY) > 4) {
        hasMovedRef.current = true
      }

      const nextX = dragStartRef.current.elemX + deltaX
      const nextY = dragStartRef.current.elemY + deltaY
      setPos({ x: nextX, y: nextY })
    }

    const handlePointerUp = (upEvt: PointerEvent) => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      setIsDragging(false)

      if (dragStartRef.current) {
        const deltaX = upEvt.clientX - dragStartRef.current.mouseX
        const deltaY = upEvt.clientY - dragStartRef.current.mouseY
        const finalX = dragStartRef.current.elemX + deltaX
        const finalY = dragStartRef.current.elemY + deltaY

        if (hasMovedRef.current) {
          snapToEdge(finalX, finalY)
        }
      }
      dragStartRef.current = null
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  const handleIconClick = () => {
    if (!hasMovedRef.current) {
      if (isListening) {
        stopListening()
      } else {
        setIsOpen(prev => !prev)
      }
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 150)
    return () => clearTimeout(timer)
  }, [messages, isOpen, isMaximized, activeTab])

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ variant: "destructive", title: "Invalid File", description: "Please select an image file (PNG, JPG, WEBP)." })
      return
    }
    setImageMimeType(file.type)
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result as string
      setSelectedImage(base64)
    }
    reader.readAsDataURL(file)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile()
        if (file) {
          handleFileSelect(file)
          break
        }
      }
    }
  }

  // Action Executor
  const executeAiAction = async (actionObj: any, userProfile: any): Promise<{ success: boolean; description: string; imageUrl?: string }> => {
    const { type, params } = actionObj
    try {
      if (type === 'pay_debtor') {
        const { saleId, amount } = params
        if (!saleId || amount === undefined) return { success: false, description: "Missing saleId or amount parameter." }
        const res = await fetch('/api/debtors/pay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ saleId, amount: Number(amount) })
        })
        if (res.ok) {
          const salesRes = await fetch('/api/sales', { headers: { 'Authorization': `Bearer ${token}` } })
          if (salesRes.ok) {
            const sales = await salesRes.json()
            const targetSale = sales.find((s: any) => s.id === saleId)
            if (targetSale) {
              const remaining = Math.max(0, targetSale.total - (targetSale.amountPaid || 0))
              printThermalReceipt({
                ...targetSale,
                amount: Number(amount),
                remainingDebt: remaining,
                timestamp: new Date().toISOString()
              }, userProfile, 'debt_payment')
            }
          }
          window.dispatchEvent(new Event("upshop_data_updated"))
          return { success: true, description: `Recorded payment of Shs ${Number(amount).toLocaleString()} for sale #${saleId.slice(0, 8)}.` }
        }
      }

      if (type === 'dismiss_debtor') {
        const { saleId } = params
        if (!saleId) return { success: false, description: "Missing saleId parameter." }
        const res = await fetch('/api/debtors/dismiss', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ saleId })
        })
        if (res.ok) {
          window.dispatchEvent(new Event("upshop_data_updated"))
          return { success: true, description: `Dismissed debtor notification for sale #${saleId.slice(0, 8)}.` }
        }
      }

      if (type === 'dismiss_return') {
        const { returnId } = params
        if (!returnId) return { success: false, description: "Missing returnId parameter." }
        const res = await fetch('/api/returns/dismiss', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ returnId })
        })
        if (res.ok) {
          window.dispatchEvent(new Event("upshop_data_updated"))
          return { success: true, description: `Dismissed return alert notification #${returnId}.` }
        }
      }

      if (type === 'pay_creditor') {
        const { creditorId, amount } = params
        if (!creditorId || amount === undefined) return { success: false, description: "Missing creditorId or amount parameter." }
        const res = await fetch('/api/creditors/pay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ creditorId, amount: Number(amount) })
        })
        if (res.ok) {
          window.dispatchEvent(new Event("upshop_data_updated"))
          return { success: true, description: `Recorded creditor payment of Shs ${Number(amount).toLocaleString()} for creditor #${creditorId}.` }
        }
      }

      if (type === 'dismiss_creditor') {
        const { creditorId } = params
        if (!creditorId) return { success: false, description: "Missing creditorId parameter." }
        const res = await fetch('/api/creditors/dismiss', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ creditorId })
        })
        if (res.ok) {
          window.dispatchEvent(new Event("upshop_data_updated"))
          return { success: true, description: `Dismissed creditor notification #${creditorId}.` }
        }
      }

      if (type === 'process_return') {
        const { saleId, productName, quantity, amount, status, reason } = params
        if (!saleId || !productName || !quantity) return { success: false, description: "Missing required return parameters." }
        const res = await fetch('/api/returns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            saleId,
            productName,
            quantity: Number(quantity),
            amount: Number(amount || 0),
            status: status || 'reinstated',
            reason: reason || 'Processed via JAHWI AI'
          })
        })
        if (res.ok) {
          const newReturn = await res.json()
          printThermalReceipt(newReturn, userProfile, 'return')
          window.dispatchEvent(new Event("upshop_data_updated"))
          return { success: true, description: `Processed return of ${quantity}x ${productName} (Sale #${saleId.slice(0, 8)}).` }
        }
      }

      if (type === 'update_target') {
        const { revenueTarget } = params
        if (revenueTarget === undefined) return { success: false, description: "Missing revenueTarget parameter." }
        const res = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ revenueTarget: Number(revenueTarget) })
        })
        if (res.ok) {
          window.dispatchEvent(new Event("upshop_data_updated"))
          return { success: true, description: `Updated revenue target to Shs ${Number(revenueTarget).toLocaleString()}.` }
        }
      }

      if (type === 'create_note') {
        const { title, content, category, tags } = params
        if (!title || !content) return { success: false, description: "Missing note title or content." }
        const res = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ title, content, category: category || 'general', tags: tags || 'ai_generated' })
        })
        if (res.ok) {
          window.dispatchEvent(new Event("upshop_data_updated"))
          return { success: true, description: `Saved note "${title}" in AI Business Notebook.` }
        }
      }

      if (type === 'delete_note') {
        const { noteId } = params
        if (!noteId) return { success: false, description: "Missing noteId parameter." }
        const res = await fetch(`/api/notes/${noteId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          window.dispatchEvent(new Event("upshop_data_updated"))
          return { success: true, description: `Deleted note #${noteId} from Business Notebook.` }
        }
      }

      if (type === 'generate_image') {
        const { prompt } = params
        const encodedPrompt = encodeURIComponent(prompt || 'retail store product poster')
        const synthesizedUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=600&nologo=true&seed=${Math.floor(Math.random() * 10000)}`
        return { success: true, description: `Generated visual output for: "${prompt}"`, imageUrl: synthesizedUrl }
      }
    } catch (e: any) {
      console.error("Action execution error", e)
    }
    return { success: false, description: "Action execution failed." }
  }

  // Dynamic Gemini Model Discovery & Multi-Fallback Pipeline
  const discoverAndGenerateContent = async (
    apiKey: string,
    contentsPayload: any[],
    onFirstSentence: (text: string) => void
  ): Promise<{ success: boolean; replyText: string; workingModel: string; lastError: string }> => {
    let cachedModel = localStorage.getItem("upshop_gemini_active_model") || ""
    let replyText = ""
    let lastError = ""

    const tryEndpoint = async (modelName: string): Promise<boolean> => {
      try {
        const streamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${apiKey}`
        const response = await fetch(streamUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: contentsPayload,
            generationConfig: { maxOutputTokens: 600, temperature: 0.2 }
          })
        })

        if (response.ok && response.body) {
          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          let accumulated = ""
          let spokenSentenceCount = 0

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunkText = decoder.decode(value, { stream: true })
            const lines = chunkText.split("\n")

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const jsonStr = line.replace(/^data:\s*/, "").trim()
                if (jsonStr === "[DONE]") break
                try {
                  const parsedChunk = JSON.parse(jsonStr)
                  const partText = parsedChunk.candidates?.[0]?.content?.parts?.[0]?.text || ""
                  if (partText) {
                    accumulated += partText

                    if (spokenSentenceCount === 0 && /[.!?\n]/.test(accumulated)) {
                      const firstSentence = accumulated.split(/[.!?\n]/)[0]
                      if (firstSentence.trim().length > 5 && !firstSentence.includes('{')) {
                        onFirstSentence(firstSentence)
                        spokenSentenceCount++
                      }
                    }
                  }
                } catch (e) {}
              }
            }
          }

          if (accumulated.trim()) {
            replyText = accumulated.trim()
            return true
          }
        }

        const stdUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`
        const stdRes = await fetch(stdUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: contentsPayload,
            generationConfig: { maxOutputTokens: 600, temperature: 0.2 }
          })
        })

        if (stdRes.ok) {
          const stdJson = await stdRes.json()
          const text = stdJson.candidates?.[0]?.content?.parts?.[0]?.text
          if (text) {
            replyText = text.trim()
            return true
          }
        } else {
          const errJson = await stdRes.json().catch(() => ({}))
          lastError = errJson.error?.message || `HTTP ${stdRes.status}`
        }
      } catch (e: any) {
        lastError = e.message || "Network error"
      }
      return false
    }

    if (cachedModel) {
      const ok = await tryEndpoint(cachedModel)
      if (ok) {
        setActiveGeminiModel(cachedModel)
        return { success: true, replyText, workingModel: cachedModel, lastError: "" }
      }
      localStorage.removeItem("upshop_gemini_active_model")
    }

    let discoveredModels: string[] = []
    try {
      const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      const listRes = await fetch(listUrl)
      if (listRes.ok) {
        const listData = await listRes.json()
        if (Array.isArray(listData.models)) {
          discoveredModels = listData.models
            .filter((m: any) => m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent"))
            .map((m: any) => m.name.replace(/^models\//, ""))
        }
      } else {
        const errJson = await listRes.json().catch(() => ({}))
        lastError = errJson.error?.message || `HTTP ${listRes.status}: API key check failed`
      }
    } catch (e: any) {
      lastError = e.message || "Failed to list models"
    }

    if (discoveredModels.length === 0) {
      discoveredModels = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-flash-8b", "gemini-1.5-pro", "gemini-pro"]
    }

    const preferredOrder = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-flash-8b", "gemini-1.5-pro", "gemini-pro"]
    discoveredModels.sort((a, b) => {
      const idxA = preferredOrder.indexOf(a)
      const idxB = preferredOrder.indexOf(b)
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB)
    })

    for (const modelCandidate of discoveredModels) {
      const ok = await tryEndpoint(modelCandidate)
      if (ok) {
        localStorage.setItem("upshop_gemini_active_model", modelCandidate)
        setActiveGeminiModel(modelCandidate)
        return { success: true, replyText, workingModel: modelCandidate, lastError: "" }
      }
    }

    return { success: false, replyText: "", workingModel: "", lastError: lastError || "No working Gemini model found" }
  }

  const handleSendMessage = async (e?: React.FormEvent, customSpeechText?: string) => {
    if (e && e.preventDefault) e.preventDefault()
    stopListening() // Force turn OFF Live Mode when prompt is sent!

    const textToSend = customSpeechText || inputMessage
    if ((!textToSend.trim() && !selectedImage) || loading) return

    const rawKey = localStorage.getItem("upshop_gemini_api_key") || ""
    const apiKey = rawKey.trim()
    const userMsg = textToSend.trim()
    const attachedImageBase64 = selectedImage
    const attachedImageMime = imageMimeType

    setInputMessage("")
    setSelectedImage(null)
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    setMessages(prev => [
      ...prev,
      {
        sender: "user",
        text: userMsg || (attachedImageBase64 ? "[Attached Image]" : ""),
        image: attachedImageBase64 || undefined,
        timestamp: timeStr
      }
    ])
    setLoading(true)

    if (!apiKey) {
      setTimeout(() => {
        const errText = "To activate live reasoning & autonomous tool execution, please configure your Gemini API Key in the Settings tab (under Admin Panel)!"
        setMessages(prev => [
          ...prev,
          {
            sender: "jahwi",
            text: errText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ])
        speakSentence(errText, selectedLanguage)
        setLoading(false)
      }, 500)
      return
    }

    try {
      const [profileRes, salesRes, productsRes, returnsRes, creditorsRes, notesRes] = await Promise.all([
        fetch('/api/user/profile', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/sales', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/products', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/returns', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/creditors', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/notes', { headers: { 'Authorization': `Bearer ${token}` } })
      ])

      let profileData: any = null
      let salesData: any[] = []
      let productsData: any[] = []
      let returnsData: any[] = []
      let creditorsData: any[] = []
      let notesData: any[] = []

      if (profileRes.ok) profileData = await profileRes.json()
      if (salesRes.ok) salesData = await salesRes.json()
      if (productsRes.ok) productsData = await productsRes.json()
      if (returnsRes.ok) returnsData = await returnsRes.json()
      if (creditorsRes.ok) creditorsData = await creditorsRes.json()
      if (notesRes.ok) notesData = await notesRes.json()

      const debtorsData = salesData.filter((s: any) => s.paymentMethod === 'credit' && s.status === 'unpaid')
      const activeCreditorsData = creditorsData.filter((c: any) => !c.dismissed)

      const systemContextPrompt = `You are JAHWI AI, an autonomous live business intelligence co-pilot for UPshop POS.
You understand English, Luganda (and Luglish), and Swahili spoken trade phrases.
[IMPORTANT FOR LIVE VOICE CONVERSATION]:
Keep spoken responses clear, concise, direct and natural (1-3 sentences) unless the user asks for a detailed report or full breakdown.

[DATABASES]
1. Products: ${JSON.stringify(productsData.slice(0, 50).map((p: any) => ({ id: p.id, name: p.name, category: p.category, price: p.price, shopStock: p.shopStock, warehouseStock: p.warehouseStock })))}
2. Recent Sales: ${JSON.stringify(salesData.slice(-25).map((s: any) => ({ id: s.id, customer: s.customerName, total: s.total, paid: s.amountPaid, status: s.status, items: s.items })))}
3. Debtors: ${JSON.stringify(debtorsData.map((d: any) => ({ id: d.id, customer: d.customerName, total: d.total, debt: d.total - d.amountPaid, dueDate: d.dueDate })))}
4. Returns: ${JSON.stringify(returnsData.slice(-10).map((r: any) => ({ id: r.id, product: r.productName, qty: r.quantity, amount: r.amount, reason: r.reason })))}
5. Creditors: ${JSON.stringify(activeCreditorsData.map((c: any) => ({ id: c.id, supplier: c.supplierName, product: c.productName, total: c.totalAmount, debt: c.totalAmount - (c.amountPaid || 0) })))}
6. Business Notes: ${JSON.stringify(notesData.map((n: any) => ({ id: n.id, title: n.title, content: n.content, category: n.category, tags: n.tags })))}

[AVAILABLE SYSTEM ACTIONS]
ACTION: {"type": "create_note", "params": {"title": "...", "content": "...", "category": "supplier/debtor/reminder", "tags": "..."}}
ACTION: {"type": "delete_note", "params": {"noteId": "..."}}
ACTION: {"type": "pay_debtor", "params": {"saleId": "...", "amount": 20000}}
ACTION: {"type": "dismiss_debtor", "params": {"saleId": "..."}}
ACTION: {"type": "pay_creditor", "params": {"creditorId": "...", "amount": 50000}}
ACTION: {"type": "dismiss_creditor", "params": {"creditorId": "..."}}
ACTION: {"type": "dismiss_return", "params": {"returnId": "..."}}
ACTION: {"type": "process_return", "params": {"saleId": "...", "productName": "...", "quantity": 1, "amount": 5000, "status": "reinstated", "reason": "..."}}
ACTION: {"type": "update_target", "params": {"revenueTarget": 5000000}}
ACTION: {"type": "generate_image", "params": {"prompt": "..."}}

Current Time: ${new Date().toLocaleString()}. Always format currency in Ugandan Shillings (Shs).`

      const contentsPayload: any[] = [
        { role: "user", parts: [{ text: systemContextPrompt }] },
        { role: "model", parts: [{ text: "Understood! I am JAHWI AI, your live business co-pilot." }] }
      ]

      const history = messages.slice(1)
      for (const m of history) {
        if (m.sender === "user") {
          const parts: any[] = []
          if (m.image && m.image.startsWith('data:image/')) {
            parts.push({
              inlineData: {
                mimeType: "image/jpeg",
                data: m.image.replace(/^data:image\/\w+;base64,/, "")
              }
            })
          }
          parts.push({ text: m.text || "[Attached Image]" })
          contentsPayload.push({ role: "user", parts })
        } else if (m.sender === "jahwi") {
          contentsPayload.push({ role: "model", parts: [{ text: m.text }] })
        }
      }

      const currentParts: any[] = []
      if (attachedImageBase64) {
        currentParts.push({
          inlineData: {
            mimeType: attachedImageMime,
            data: attachedImageBase64.replace(/^data:image\/\w+;base64,/, "")
          }
        })
      }
      currentParts.push({ text: userMsg || "Please analyze this attached image." })
      contentsPayload.push({ role: "user", parts: currentParts })

      let hasSpokenStreamedSentence = false

      const result = await discoverAndGenerateContent(apiKey, contentsPayload, (firstSentence) => {
        if (!hasSpokenStreamedSentence) {
          hasSpokenStreamedSentence = true
          speakSentence(firstSentence, selectedLanguage)
        }
      })

      if (result.success && result.replyText) {
        let cleanText = result.replyText
        let actionObj: any = null

        const jsonMatches = result.replyText.match(/(\{[\s\S]*?\})/g) || []
        for (const matchStr of jsonMatches) {
          try {
            const parsed = JSON.parse(matchStr)
            const actionType = parsed.type || parsed.action
            if (actionType && typeof actionType === 'string') {
              const validActions = [
                'generate_image', 'pay_debtor', 'dismiss_debtor',
                'pay_creditor', 'dismiss_creditor', 'dismiss_return',
                'process_return', 'update_target', 'create_note', 'delete_note'
              ]
              if (validActions.includes(actionType)) {
                let params = parsed.params || parsed.action_input || {}
                if (typeof params === 'string') {
                  try {
                    params = JSON.parse(params)
                  } catch (e) {
                    params = { prompt: params }
                  }
                }
                if (!params.prompt && parsed.prompt) {
                  params.prompt = parsed.prompt
                }
                actionObj = { type: actionType, params }
                cleanText = cleanText
                  .replace(matchStr, '')
                  .replace(/ACTION:\s*/gi, '')
                  .replace(/```(?:json)?/gi, '')
                  .replace(/```/g, '')
                  .trim()
                break
              }
            }
          } catch (e) {}
        }

        let actionDesc: string | undefined = undefined
        let generatedImgUrl: string | undefined = undefined

        if (actionObj) {
          const actionResult = await executeAiAction(actionObj, profileData)
          if (actionResult.success) {
            actionDesc = actionResult.description
            if (actionResult.imageUrl) {
              generatedImgUrl = actionResult.imageUrl
            }
          }
        }

        if (actionObj && actionObj.type === 'generate_image') {
          if (!cleanText || cleanText.startsWith('{') || cleanText.startsWith('```') || cleanText.length < 5) {
            cleanText = `🎨 Visual Concept Generated:`
          }
        }

        setMessages(prev => [
          ...prev,
          {
            sender: "jahwi",
            text: cleanText,
            image: generatedImgUrl,
            actionExecuted: actionDesc,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ])

        if (cleanText && !hasSpokenStreamedSentence) {
          speakSentence(cleanText, selectedLanguage)
        }
      } else {
        const errReply = `Error connecting to JAHWI AI: ${result.lastError || "Invalid response"}. Please check your API key.`
        setMessages(prev => [
          ...prev,
          {
            sender: "jahwi",
            text: errReply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ])
        speakSentence(errReply, selectedLanguage)
      }
    } catch (err: any) {
      console.error(err)
      const errReply = `Error connecting to JAHWI AI: ${err.message || "Unexpected Error"}.`
      setMessages(prev => [
        ...prev,
        {
          sender: "jahwi",
          text: errReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ])
    } finally {
      setLoading(false)
      // Robust Live Mode Safety Net: Guarantee mic re-arms for continuous multi-turn conversations
      if (isLiveModeRef.current && !isMutedRef.current) {
        setTimeout(() => {
          if (isLiveModeRef.current && !isMutedRef.current && !isSpeakingRef.current) {
            startListening()
          }
        }, 800)
      }
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }

  const isLeftHalf = typeof window !== 'undefined' ? pos.x < window.innerWidth / 2 : false
  const isTopHalf = typeof window !== 'undefined' ? pos.y < window.innerHeight / 2 : false

  return (
    <>
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
      />

      {/* Lightbox Preview Modal */}
      {previewImageUrl && (
        <div
          onClick={() => setPreviewImageUrl(null)}
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-200"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl border border-white/20 bg-slate-900">
            <img src={previewImageUrl} alt="Preview" className="max-w-full max-h-[85vh] object-contain" />
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute top-4 right-4 h-10 w-10 rounded-full bg-black/50 hover:bg-black text-white flex items-center justify-center font-bold"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Unified Draggable Floating Badge with Live Waveform Animation */}
      {isInitialized && (
        <div
          onPointerDown={handlePointerDown}
          onClick={handleIconClick}
          style={{
            left: `${pos.x}px`,
            top: `${pos.y}px`,
            transition: isDragging ? "none" : "left 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), top 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)"
          }}
          className={`fixed z-50 h-16 w-16 rounded-full overflow-hidden border-2 border-white shadow-2xl touch-none select-none cursor-grab active:cursor-grabbing ${
            isListening ? "ring-4 ring-rose-500 scale-110 shadow-rose-500/50" : isDragging ? "scale-110 shadow-blue-500/50" : "hover:scale-105 active:scale-95"
          }`}
          title={isListening ? "Live Mode Active... Click to stop" : "Drag to reposition / Click for JAHWI AI Assistant"}
        >
          <div className="relative h-full w-full pointer-events-none bg-slate-900 flex items-center justify-center">
            {isListening ? (
              <div className="flex items-center gap-0.5 h-7 px-1">
                {audioLevels.slice(0, 5).map((h, i) => (
                  <span
                    key={i}
                    style={{ height: `${h * 0.4}px` }}
                    className="w-1 rounded-full bg-gradient-to-t from-rose-500 via-amber-400 to-emerald-400 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <img
                src="/Square71x71Logo.png"
                alt="JAHWI AI"
                className="h-full w-full object-cover"
              />
            )}
            <span className={`absolute top-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-white ${isListening ? "bg-rose-500 animate-ping" : "bg-green-400 animate-ping"}`} />
            <span className={`absolute top-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-white ${isListening ? "bg-rose-500" : "bg-green-400"}`} />
          </div>
        </div>
      )}

      {/* Main Drawer Card */}
      {isOpen && (
        <Card
          style={isMaximized ? {} : {
            left: isLeftHalf ? `${Math.min(pos.x, window.innerWidth - 700)}px` : 'auto',
            right: isLeftHalf ? 'auto' : `${Math.max(16, window.innerWidth - pos.x - 64)}px`,
            top: isTopHalf ? `${pos.y + 72}px` : 'auto',
            bottom: isTopHalf ? 'auto' : `${Math.max(16, window.innerHeight - pos.y + 10)}px`
          }}
          className={`fixed border border-slate-300 shadow-2xl bg-white flex flex-col overflow-hidden animate-in fade-in duration-200 rounded-2xl transition-all duration-300 ${
            isMaximized
              ? "inset-2 sm:inset-4 z-[100] w-auto h-auto max-w-none max-h-none rounded-2xl"
              : "z-50 w-[680px] h-[670px] max-w-[94vw] max-h-[88vh]"
          }`}
        >
          {/* Header */}
          <CardHeader className="bg-emerald-800 text-white p-4 sm:p-5 flex flex-row justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-11 w-11 rounded-full overflow-hidden border-2 border-white/30 bg-white/10 shadow flex items-center justify-center">
                  <img
                    src="/Square71x71Logo.png"
                    alt="JAHWI AI"
                    className="h-full w-full object-cover"
                  />
                </div>
                <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-emerald-800 ${isListening ? 'bg-rose-500 animate-pulse' : 'bg-green-400'}`} />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-black tracking-wide flex items-center gap-2">
                  JAHWI AI
                  {activeTab === "settings" ? (
                    <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Voice & AI Settings
                    </span>
                  ) : activeTab === "notes" ? (
                    <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 shadow-xs">
                      <FileText className="h-3 w-3" />
                      Business Notebook
                    </span>
                  ) : (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 transition-all ${
                      isLiveMode ? "bg-rose-500 text-white animate-pulse shadow-md" : "bg-white/20 text-white"
                    }`}>
                      {isLiveMode && <span className="h-2 w-2 rounded-full bg-white animate-ping" />}
                      {isContinuousVoice && <Repeat className="h-3 w-3 animate-spin text-amber-300" />}
                      {isLiveMode ? "Live Mode Active" : "Live Co-pilot"}
                    </span>
                  )}
                </CardTitle>
                <span className="text-xs text-white/90 font-extrabold uppercase tracking-wider block">Autonomous Business Intelligence</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* AI Business Notes & Notebook Button (In empty red square position) */}
              <button
                onClick={() => {
                  setActiveTab(prev => prev === "notes" ? "chat" : "notes")
                  fetchNotes()
                }}
                className={`h-9 w-9 rounded-full flex items-center justify-center text-white transition-all ${
                  activeTab === "notes" ? "bg-white text-emerald-800 font-bold shadow-md scale-105" : "bg-white/15 hover:bg-white/30"
                }`}
                title={activeTab === "notes" ? "Back to Chat" : "Open Business Notes & Notebook"}
              >
                <FileText className="h-4 w-4" />
              </button>

              {/* Voice & Microphone Mute Toggle */}
              <button
                onClick={handleToggleMute}
                className={`h-9 w-9 rounded-full flex items-center justify-center text-white transition-colors ${
                  isMuted ? "bg-rose-600 hover:bg-rose-500 shadow-md ring-2 ring-rose-300" : "bg-white/15 hover:bg-white/30"
                }`}
                title={isMuted ? "Unmute Microphone & Speaker Audio" : "Mute Microphone & Speaker Audio"}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>

              {/* AI Voice & Assistant Settings Button */}
              <button
                onClick={() => setActiveTab(prev => prev === "chat" ? "settings" : "chat")}
                className={`h-9 w-9 rounded-full flex items-center justify-center text-white transition-colors ${
                  activeTab === "settings" ? "bg-white text-emerald-800 font-bold shadow-md" : "bg-white/15 hover:bg-white/30"
                }`}
                title={activeTab === "settings" ? "Back to Chat" : "AI Voice & Audio Settings"}
              >
                {activeTab === "settings" ? <ArrowLeft className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
              </button>

              <button
                onClick={() => setIsMaximized(!isMaximized)}
                className="h-9 w-9 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                title={isMaximized ? "Restore Size" : "Maximize Screen"}
              >
                {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="h-9 w-9 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                title="Close Window"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>

          {/* Body: Switch between Chat View, Settings View, and Business Notes View */}
          {activeTab === "notes" ? (
            <CardContent className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/90">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3">
                <div className="flex items-center gap-2">
                  <Notebook className="h-5 w-5 text-emerald-700" />
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800">Business Notes & AI Notebook</h3>
                    <p className="text-[11px] text-slate-500 font-semibold">Type, update, delete notes and share them directly with JAHWI AI</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (isCreatingNote) {
                        setIsCreatingNote(false)
                        setEditingNoteId(null)
                      } else {
                        setEditingNoteId(null)
                        setNoteTitleInput("")
                        setNoteContentInput("")
                        setNoteCategoryInput("general")
                        setNoteTagsInput("")
                        setIsCreatingNote(true)
                      }
                    }}
                    className="h-8 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5 shadow-xs"
                  >
                    {isCreatingNote ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    {isCreatingNote ? "Cancel" : "Add Note"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab("chat")}
                    className="h-8 text-xs font-bold text-slate-700 border-slate-300 hover:bg-slate-100"
                  >
                    Chat View
                  </Button>
                </div>
              </div>

              {/* Note Editor Form (Create / Edit) */}
              {isCreatingNote && (
                <form onSubmit={handleSaveNote} className="bg-white p-4 rounded-xl border border-emerald-200 shadow-md space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-emerald-800 tracking-wider flex items-center gap-1.5">
                      <Edit className="h-4 w-4 text-emerald-600" />
                      {editingNoteId ? "Edit Business Note" : "Create New Business Note"}
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Interactive Editor</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 uppercase">Note Title</label>
                      <Input
                        type="text"
                        placeholder="e.g., Supplier Stock Agreement / Debtor Schedule"
                        value={noteTitleInput}
                        onChange={(e) => setNoteTitleInput(e.target.value)}
                        className="h-9 text-xs font-semibold border-slate-300 focus:ring-emerald-500"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 uppercase">Category</label>
                      <select
                        value={noteCategoryInput}
                        onChange={(e) => setNoteCategoryInput(e.target.value)}
                        className="w-full h-9 border border-slate-300 rounded-md px-2 text-xs font-bold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="general">📌 General</option>
                        <option value="supplier">🚚 Supplier / Creditor</option>
                        <option value="debtor">💰 Customer Debtor</option>
                        <option value="inventory">📦 Inventory & Stock</option>
                        <option value="reminder">⏰ Reminder / Task</option>
                        <option value="strategy">📊 Business Strategy</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase">Tags (Comma separated)</label>
                    <Input
                      type="text"
                      placeholder="e.g., urgent, rice, supplier, uganda"
                      value={noteTagsInput}
                      onChange={(e) => setNoteTagsInput(e.target.value)}
                      className="h-9 text-xs font-semibold border-slate-300"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase">Note Details / Content</label>
                    <textarea
                      rows={4}
                      placeholder="Type your notes here... (e.g. Agreed with supplier to bring 20 boxes of Soap at Shs 45,000 per box on Monday)."
                      value={noteContentInput}
                      onChange={(e) => setNoteContentInput(e.target.value)}
                      className="w-full p-3 border border-slate-300 rounded-lg text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsCreatingNote(false)
                        setEditingNoteId(null)
                      }}
                      className="h-8 text-xs font-bold text-slate-600 hover:bg-slate-100"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      className="h-8 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
                    >
                      {editingNoteId ? "Update Note" : "Save Note"}
                    </Button>
                  </div>
                </form>
              )}

              {/* Search & Filter Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search notes by title, content, or tag..."
                  value={noteSearchQuery}
                  onChange={(e) => setNoteSearchQuery(e.target.value)}
                  className="h-9 pl-9 text-xs font-semibold border-slate-300 bg-white"
                />
              </div>

              {/* Notes List */}
              <div className="space-y-3">
                {notesLoading ? (
                  <div className="text-center py-8 text-xs font-bold text-slate-500">Loading Business Notes...</div>
                ) : userNotes.length === 0 ? (
                  <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center space-y-2">
                    <FileText className="h-8 w-8 text-slate-300 mx-auto" />
                    <h4 className="text-sm font-extrabold text-slate-700">No Business Notes Recorded</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Create your first note above, or speak to JAHWI AI to save notes automatically!
                    </p>
                  </div>
                ) : (
                  userNotes
                    .filter(n => {
                      if (!noteSearchQuery.trim()) return true
                      const q = noteSearchQuery.toLowerCase()
                      return (
                        n.title.toLowerCase().includes(q) ||
                        n.content.toLowerCase().includes(q) ||
                        (n.tags && n.tags.toLowerCase().includes(q)) ||
                        (n.category && n.category.toLowerCase().includes(q))
                      )
                    })
                    .map(note => (
                      <div
                        key={note.id}
                        className="bg-white border border-slate-200 hover:border-emerald-300 rounded-xl p-4 shadow-xs transition-all space-y-2 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-100">
                                {note.category || "General"}
                              </span>
                              {note.tags && (
                                <span className="text-[10px] font-semibold text-slate-500 italic">
                                  #{note.tags}
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-black text-slate-800 mt-1">{note.title}</h4>
                          </div>
                          <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                            {note.timestamp ? new Date(note.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-wrap bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                          {note.content}
                        </p>

                        <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-100">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleShareNoteWithAi(note)}
                            className="h-7 text-[11px] font-bold text-emerald-800 border-emerald-200 hover:bg-emerald-50 flex items-center gap-1"
                            title="Share this note with JAHWI AI to analyze or execute actions"
                          >
                            <Share2 className="h-3 w-3 text-emerald-600" /> Share with AI
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartEditNote(note)}
                            className="h-7 text-[11px] font-bold text-slate-600 hover:bg-slate-100 flex items-center gap-1"
                          >
                            <Edit className="h-3 w-3" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteNote(note.id, note.title)}
                            className="h-7 text-[11px] font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-1"
                          >
                            <Trash2 className="h-3 w-3" /> Delete
                          </Button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </CardContent>
          ) : activeTab === "settings" ? (
            <CardContent className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 bg-slate-50/80">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-emerald-700" />
                  <h3 className="text-base font-extrabold text-slate-800">Real-Time Voice Architecture Settings</h3>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveTab("chat")}
                  className="h-8 text-xs font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                >
                  Return to Chat
                </Button>
              </div>

              {/* Hands-Free Full-Duplex Barge-In Toggle */}
              <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div>
                  <label className="text-xs font-black uppercase text-slate-700 tracking-wide flex items-center gap-1.5">
                    <Mic className="h-4 w-4 text-rose-500" /> Full-Duplex Interruption (Barge-In)
                  </label>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Automatically cuts off JAHWI's voice output as soon as you speak over it.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={enableBargeIn}
                  onChange={(e) => {
                    setEnableBargeIn(e.target.checked)
                    try { localStorage.setItem("upshop_enable_barge_in", String(e.target.checked)) } catch (e) {}
                  }}
                  className="h-5 w-5 accent-emerald-600 cursor-pointer"
                />
              </div>

              {/* Continuous Hands-Free Mode Toggle */}
              <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div>
                  <label className="text-xs font-black uppercase text-slate-700 tracking-wide flex items-center gap-1.5">
                    <Repeat className="h-4 w-4 text-emerald-600" /> Continuous Hands-Free Mode
                  </label>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Re-arms the microphone automatically after JAHWI answers for endless conversation loops.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={isContinuousVoice}
                  onChange={(e) => {
                    setIsContinuousVoice(e.target.checked)
                    try { localStorage.setItem("upshop_continuous_voice", String(e.target.checked)) } catch (e) {}
                  }}
                  className="h-5 w-5 accent-emerald-600 cursor-pointer"
                />
              </div>

              {/* Speech Speed / Rate */}
              <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black uppercase text-slate-700 tracking-wide flex items-center gap-1.5">
                    <Volume1 className="h-4 w-4 text-emerald-600" /> Speech Rate / Speed
                  </label>
                  <span className="text-xs font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                    {speechRate}x speed
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  {[0.8, 1.0, 1.2, 1.5].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => {
                        setSpeechRate(rate)
                        try { localStorage.setItem("upshop_speech_rate", String(rate)) } catch (e) {}
                        speakSentence(`This is JAHWI speech speed set to ${rate}x rate.`, selectedLanguage)
                      }}
                      className={`flex-1 py-2 rounded-lg text-xs font-extrabold transition-all border ${
                        speechRate === rate
                          ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>

              {/* TTS Voice Selection */}
              <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <label className="text-xs font-black uppercase text-slate-700 tracking-wide block">
                  Text-to-Speech Voice Engine
                </label>
                <select
                  value={selectedVoiceUri}
                  onChange={(e) => {
                    const uri = e.target.value
                    setSelectedVoiceUri(uri)
                    try { localStorage.setItem("upshop_speech_voice_uri", uri) } catch (e) {}
                    speakSentence("Voice engine updated successfully.", selectedLanguage)
                  }}
                  className="w-full h-11 border border-slate-300 rounded-xl px-3 text-xs font-bold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Default System Voice (Auto Match)</option>
                  {availableVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>

              {/* Silence Auto-Submit Delay (VAD) */}
              <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black uppercase text-slate-700 tracking-wide">
                    Voice Activity Pause Threshold (VAD)
                  </label>
                  <span className="text-xs font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                    {silenceThresholdMs}ms
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  {[500, 750, 1000, 1500].map((ms) => (
                    <button
                      key={ms}
                      type="button"
                      onClick={() => {
                        setSilenceThresholdMs(ms)
                        try { localStorage.setItem("upshop_silence_delay", String(ms)) } catch (e) {}
                      }}
                      className={`flex-1 py-2 rounded-lg text-xs font-extrabold transition-all border ${
                        silenceThresholdMs === ms
                          ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {ms}ms
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Gemini API Model Status & Force Re-detect */}
              <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black uppercase text-slate-700 tracking-wide block">Active Reasoning Model</span>
                    <span className="text-xs font-bold font-mono text-emerald-700">
                      {activeGeminiModel || "Dynamic Auto-Discovery"}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      localStorage.removeItem("upshop_gemini_active_model")
                      setActiveGeminiModel("")
                      toast({ title: "Cache Reset", description: "JAHWI will re-discover working models on the next prompt." })
                    }}
                    className="h-8 text-xs font-extrabold flex items-center gap-1.5 border-slate-300"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Re-detect Models
                  </Button>
                </div>
              </div>
            </CardContent>
          ) : (
            /* Chat View Thread */
            <CardContent className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/60">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col max-w-[88%] ${msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"}`}
                >
                  <span className="text-xs text-slate-500 uppercase font-black tracking-wide mb-1 px-1">
                    {msg.sender === "user" ? "You" : "Jahwi AI"}
                  </span>

                  <div
                    className={`p-4 rounded-2xl text-sm sm:text-base font-semibold leading-relaxed space-y-2.5 ${
                      msg.sender === "user"
                        ? "bg-emerald-700 text-white rounded-tr-none shadow-md"
                        : "bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-sm"
                    }`}
                  >
                    {msg.image && (
                      <div className="relative group rounded-xl overflow-hidden border border-black/10 max-h-[320px]">
                        <img
                          src={msg.image}
                          alt="Message Attachment"
                          className="w-full h-auto object-cover max-h-[320px] cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setPreviewImageUrl(msg.image || null)}
                        />
                        <div className="absolute bottom-2 right-2 flex gap-1">
                          <a
                            href={msg.image}
                            download={`jahwi-output-${Date.now()}.png`}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-black/60 hover:bg-black text-white p-2 rounded-lg backdrop-blur-sm transition-colors"
                            title="Download Image"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    )}

                    {msg.text && <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>}

                    {msg.actionExecuted && (
                      <div className="flex items-center gap-2 text-xs sm:text-sm font-bold px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>{msg.actionExecuted}</span>
                      </div>
                    )}
                  </div>

                  <span className="text-[10px] sm:text-xs text-slate-400 font-semibold mt-1 opacity-80 px-1">
                    {msg.timestamp}
                  </span>
                </div>
              ))}
              {loading && (
                <div className="flex flex-col items-start max-w-[88%]">
                  <span className="text-xs text-slate-500 uppercase font-black tracking-wide mb-1 px-1">Jahwi AI</span>
                  <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </CardContent>
          )}

          {/* Attached Image Preview Bar */}
          {selectedImage && activeTab === "chat" && (
            <div className="px-4 py-3 bg-slate-100 border-t flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg overflow-hidden border border-slate-300 shadow-sm">
                  <img src={selectedImage} alt="Selected attachment" className="h-full w-full object-cover" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-slate-700">Image attached (Ready to analyze)</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="h-8 w-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-600"
                title="Remove attachment"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Chat Footer Input & Voice Controls */}
          {activeTab === "chat" && (
            <form onSubmit={handleSendMessage} className="p-3 sm:p-4 border-t bg-white flex gap-2 shrink-0 items-center">
              {/* Attachment Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-11 w-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors shrink-0"
                title="Attach image or document file"
              >
                <Paperclip className="h-5 w-5" />
              </button>

              {/* Live Microphone Toggle Button (Toggles Live Co-pilot Mode ON/OFF) */}
              <button
                type="button"
                onClick={toggleListening}
                className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0 ${
                  isLiveMode || isListening
                    ? "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/40 animate-pulse ring-2 ring-rose-300"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20"
                }`}
                title={isLiveMode || isListening ? "Turn OFF Live Co-pilot Mode" : "Turn ON Live Co-pilot Mode (Luganda / Swahili / English)"}
              >
                {isLiveMode || isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>

              {/* Trade Language Selector Dropdown */}
              <div className="relative hidden sm:flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-2.5 rounded-xl border border-slate-200 shrink-0">
                <Globe className="h-3.5 w-3.5 text-emerald-600" />
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value as any)}
                  className="bg-transparent text-slate-800 font-bold border-none focus:outline-none cursor-pointer text-xs"
                  title="Select Trade Language"
                >
                  <option value="lg-UG">🇺🇬 Luganda</option>
                  <option value="sw-KE">🇰🇪 Swahili</option>
                  <option value="en-US">🇬🇧 English</option>
                </select>
              </div>

              <Input
                ref={inputRef}
                type="text"
                placeholder={isListening ? "Speak now or type..." : "Ask JAHWI AI or speak..."}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    if ((inputMessage.trim() || selectedImage) && !loading) {
                      handleSendMessage(e)
                    }
                  }
                }}
                className="h-11 border-slate-300 text-sm sm:text-base font-semibold flex-1 rounded-xl px-4"
                disabled={loading}
              />

              <Button
                type="submit"
                size="icon"
                className="h-11 w-11 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow shrink-0"
                disabled={loading || (!inputMessage.trim() && !selectedImage)}
              >
                <Send className="h-5 w-5" />
              </Button>
            </form>
          )}
        </Card>
      )}
    </>
  )
}
