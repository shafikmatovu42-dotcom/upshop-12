"use client"

import { useState, useEffect, useRef } from "react"
import { Sparkles, X, Send, Bot, MessageSquare, Maximize2, Minimize2, Paperclip, ImageIcon, Trash2, Download, Eye, CheckCircle2, AlertTriangle } from "lucide-react"
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

export function JahwiAssistant() {
  const { token } = useAuth()
  const { toast } = useToast()

  const [isOpen, setIsOpen] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [inputMessage, setInputMessage] = useState("")
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [imageMimeType, setImageMimeType] = useState<string>("image/jpeg")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)

  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "jahwi",
      text: "Hello! I am JAHWI AI, your autonomous business co-pilot. I can analyze sales, process debtor payments, process product returns, dismiss notifications, attach & analyze image files, and generate images directly!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ])
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Listen for automatic report generation notifications
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

    window.addEventListener("upshop_report_generated", handleReportNotification as EventListener)
    window.addEventListener("upshop_notify_jahwi", handleReportNotification as EventListener)

    return () => {
      window.removeEventListener("upshop_report_generated", handleReportNotification as EventListener)
      window.removeEventListener("upshop_notify_jahwi", handleReportNotification as EventListener)
    }
  }, [toast])

  // Position state for floating draggable icon
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isInitialized, setIsInitialized] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const dragStartRef = useRef<{ mouseX: number; mouseY: number; elemX: number; elemY: number } | null>(null)
  const hasMovedRef = useRef(false)

  // Initialize position on mount (restore from localStorage or default to bottom-right)
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

  // Handle window resize to keep icon inside viewport
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

  // Snap to left or right edge
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

  // Pointer event handlers for dragging
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
      setIsOpen(prev => !prev)
    }
  }

  // Auto scroll to bottom of chat
  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 150)
    return () => clearTimeout(timer)
  }, [messages, isOpen, isMaximized])

  // File selection & Clipboard paste handlers
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
          // Fetch updated sales to calculate remaining debt and trigger thermal receipt
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!inputMessage.trim() && !selectedImage) || loading) return

    const rawKey = localStorage.getItem("upshop_gemini_api_key") || ""
    const apiKey = rawKey.trim()
    const userMsg = inputMessage.trim()
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
        setMessages(prev => [
          ...prev,
          {
            sender: "jahwi",
            text: "To activate my reasoning & autonomous tool execution, please configure your Gemini API Key in the Settings tab (under Admin Panel)!",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ])
        setLoading(false)
      }, 800)
      return
    }

    try {
      const [profileRes, salesRes, productsRes, returnsRes, creditorsRes] = await Promise.all([
        fetch('/api/user/profile', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/sales', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/products', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/returns', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/creditors', { headers: { 'Authorization': `Bearer ${token}` } })
      ])

      let profileData: any = null
      let salesData: any[] = []
      let productsData: any[] = []
      let returnsData: any[] = []
      let creditorsData: any[] = []

      if (profileRes.ok) profileData = await profileRes.json()
      if (salesRes.ok) salesData = await salesRes.json()
      if (productsRes.ok) productsData = await productsRes.json()
      if (returnsRes.ok) returnsData = await returnsRes.json()
      if (creditorsRes.ok) creditorsData = await creditorsRes.json()

      const debtorsData = salesData.filter((s: any) => s.paymentMethod === 'credit' && s.status === 'unpaid')
      const activeCreditorsData = creditorsData.filter((c: any) => !c.dismissed)

      const systemContextPrompt = `You are JAHWI AI, an autonomous business intelligence co-pilot integrated into UPshop POS.
[DATABASES]
1. Products: ${JSON.stringify(productsData.slice(0, 60).map((p: any) => ({ id: p.id, name: p.name, category: p.category, price: p.price, shopStock: p.shopStock, warehouseStock: p.warehouseStock })))}
2. Recent Sales: ${JSON.stringify(salesData.slice(-30).map((s: any) => ({ id: s.id, customer: s.customerName, total: s.total, paid: s.amountPaid, status: s.status, items: s.items })))}
3. Debtors: ${JSON.stringify(debtorsData.map((d: any) => ({ id: d.id, customer: d.customerName, total: d.total, debt: d.total - d.amountPaid, dueDate: d.dueDate })))}
4. Returns: ${JSON.stringify(returnsData.slice(-15).map((r: any) => ({ id: r.id, product: r.productName, qty: r.quantity, amount: r.amount, reason: r.reason })))}
5. Creditors: ${JSON.stringify(activeCreditorsData.map((c: any) => ({ id: c.id, supplier: c.supplierName, product: c.productName, total: c.totalAmount, debt: c.totalAmount - (c.amountPaid || 0) })))}

[AVAILABLE SYSTEM ACTIONS]
ACTION: {"type": "pay_debtor", "params": {"saleId": "...", "amount": 20000}}
ACTION: {"type": "dismiss_debtor", "params": {"saleId": "..."}}
ACTION: {"type": "pay_creditor", "params": {"creditorId": "...", "amount": 50000}}
ACTION: {"type": "dismiss_creditor", "params": {"creditorId": "..."}}
ACTION: {"type": "dismiss_return", "params": {"returnId": "..."}}
ACTION: {"type": "process_return", "params": {"saleId": "...", "productName": "...", "quantity": 1, "amount": 5000, "status": "reinstated", "reason": "..."}}
ACTION: {"type": "update_target", "params": {"revenueTarget": 5000000}}
ACTION: {"type": "generate_image", "params": {"prompt": "..."}}

Always format money in Ugandan Shillings (Shs). Current Date/Time: ${new Date().toLocaleString()}.`

      // 1. Check for saved working model in localStorage
      let cachedModel = localStorage.getItem("upshop_gemini_active_model") || ""

      const contentsPayload: any[] = [
        { role: "user", parts: [{ text: systemContextPrompt }] },
        { role: "model", parts: [{ text: "Understood! I am JAHWI AI, your autonomous business co-pilot." }] }
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

      let success = false
      let replyText = ""
      let lastError = ""

      // Helper function to try generating content with candidate endpoints
      const attemptGenerate = async (endpoints: { version: string; model: string }[]): Promise<boolean> => {
        for (const endpoint of endpoints) {
          try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 5000)

            const geminiUrl = `https://generativelanguage.googleapis.com/${endpoint.version}/models/${endpoint.model}:generateContent?key=${apiKey}`
            const response = await fetch(geminiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: controller.signal,
              body: JSON.stringify({
                contents: contentsPayload,
                generationConfig: { maxOutputTokens: 800, temperature: 0.2 }
              })
            })

            clearTimeout(timeoutId)

            if (response.ok) {
              const resJson = await response.json()
              const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text
              if (text) {
                replyText = text.trim()
                // Save working model for future direct requests
                localStorage.setItem("upshop_gemini_active_model", endpoint.model)
                return true
              }
            } else {
              const errJson = await response.json().catch(() => ({}))
              lastError = errJson.error?.message || `HTTP ${response.status}`
              if (response.status === 404 || lastError.toLowerCase().includes("not found")) {
                localStorage.removeItem("upshop_gemini_active_model")
              }
            }
          } catch (e: any) {
            lastError = e.name === 'AbortError' ? 'Connection timeout' : (e.message || "Network Error")
          }
        }
        return false
      }

      // Step A: If a saved working model exists, send directly to it
      if (cachedModel) {
        success = await attemptGenerate([{ version: "v1beta", model: cachedModel }])
      }

      // Step B: If no cached model or cached model failed/404'd, call ListModels to discover working models
      if (!success) {
        localStorage.removeItem("upshop_gemini_active_model")

        let availableModels: string[] = []
        try {
          const listModelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
          const modelsRes = await fetch(listModelsUrl)
          if (modelsRes.ok) {
            const modelsData = await modelsRes.json()
            if (Array.isArray(modelsData.models)) {
              availableModels = modelsData.models
                .filter((m: any) => m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent"))
                .map((m: any) => m.name.replace(/^models\//, ""))
            }
          } else {
            const errJson = await modelsRes.json().catch(() => ({}))
            lastError = errJson.error?.message || `HTTP ${modelsRes.status}: Key not authorized`
          }
        } catch (e: any) {
          lastError = e.message || "Failed to call ModelService.ListModels"
        }

        if (availableModels.length === 0 && !lastError) {
          availableModels = ["gemini-1.5-flash", "gemini-1.5-flash-8b"]
        }

        if (availableModels.length > 0) {
          const preferredPriority = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-flash-8b", "gemini-1.5-pro", "gemini-pro"]
          const sortedModels = [...availableModels].sort((a, b) => {
            const idxA = preferredPriority.indexOf(a)
            const idxB = preferredPriority.indexOf(b)
            return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB)
          })

          const freshEndpoints = sortedModels.map(m => ({ version: "v1beta", model: m }))
          success = await attemptGenerate(freshEndpoints)
        }
      }

      if (success && replyText) {
        let cleanText = replyText
        let actionObj: any = null

        // Universal JSON Action Extractor (Handles 'type', 'action', 'action_input', markdown blocks & raw text)
        const jsonMatches = replyText.match(/(\{[\s\S]*?\})/g) || []
        for (const matchStr of jsonMatches) {
          try {
            const parsed = JSON.parse(matchStr)
            const actionType = parsed.type || parsed.action
            if (actionType && typeof actionType === 'string') {
              const validActions = [
                'generate_image', 'pay_debtor', 'dismiss_debtor',
                'pay_creditor', 'dismiss_creditor', 'dismiss_return',
                'process_return', 'update_target'
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

        // Fallback: If user asked to generate an image but Gemini returned text prompt without JSON
        const userMsgLower = userMsg.toLowerCase()
        const isImageIntent = userMsgLower.includes("image") || userMsgLower.includes("picture") || userMsgLower.includes("photo") || userMsgLower.includes("generat") || userMsgLower.includes("draw")
        if (!actionObj && isImageIntent) {
          // Extract prompt from conversation
          const lastPromptMatch = replyText.match(/["']([^"']{10,})["']/) || replyText.match(/prompt:\s*([^\n\.]+)/i)
          const extractedPrompt = lastPromptMatch ? lastPromptMatch[1] : (userMsg || "retail store electronics display")
          actionObj = {
            type: "generate_image",
            params: { prompt: extractedPrompt }
          }
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
      } else {
        setMessages(prev => [
          ...prev,
          {
            sender: "jahwi",
            text: `Error connecting to JAHWI AI: ${lastError || "Invalid key or response"}. Please check your API key in Settings.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ])
      }
    } catch (err: any) {
      console.error(err)
      setMessages(prev => [
        ...prev,
        {
          sender: "jahwi",
          text: `Error connecting to JAHWI AI: ${err.message || "Unexpected Error"}. Please verify your API key.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ])
    } finally {
      setLoading(false)
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }

  const isLeftHalf = typeof window !== 'undefined' ? pos.x < window.innerWidth / 2 : false
  const isTopHalf = typeof window !== 'undefined' ? pos.y < window.innerHeight / 2 : false

  return (
    <>
      {/* Hidden File Input for Image Attachments */}
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

      {/* Draggable Floating Action Button */}
      {isInitialized && (
        <div
          onPointerDown={handlePointerDown}
          onClick={handleIconClick}
          style={{
            left: `${pos.x}px`,
            top: `${pos.y}px`,
            transition: isDragging ? "none" : "left 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), top 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)"
          }}
          className={`fixed z-50 h-16 w-16 rounded-full overflow-hidden border-2 border-white shadow-2xl touch-none select-none cursor-grab active:cursor-grabbing ${isDragging ? "scale-110 shadow-blue-500/50" : "hover:scale-105 active:scale-95"
            }`}
          title="Drag to reposition / Click to chat with JAHWI AI"
        >
          <div className="relative h-full w-full pointer-events-none">
            <img
              src="/Square71x71Logo.png"
              alt="JAHWI AI"
              className="h-full w-full object-cover"
            />
            <span className="absolute top-1 right-1 h-3.5 w-3.5 rounded-full bg-green-400 border-2 border-white animate-ping" />
            <span className="absolute top-1 right-1 h-3.5 w-3.5 rounded-full bg-green-400 border-2 border-white" />
          </div>
        </div>
      )}

      {/* Chat Drawer Window */}
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
              : "z-50 w-[680px] h-[650px] max-w-[94vw] max-h-[85vh]"
          }`}
        >
          <CardHeader className="bg-emerald-700 text-white p-4 sm:p-5 flex flex-row justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-11 w-11 rounded-full overflow-hidden border-2 border-white/30 bg-white/10 shadow">
                  <img
                    src="/Square71x71Logo.png"
                    alt="JAHWI AI"
                    className="h-full w-full object-cover"
                  />
                </div>
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-400 border-2 border-emerald-700" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-black tracking-wide">JAHWI AI</CardTitle>
                <span className="text-xs text-white/90 font-extrabold uppercase tracking-wider block">Autonomous Business Co-pilot</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMaximized(!isMaximized)}
                className="h-9 w-9 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                title={isMaximized ? "Restore Size" : "Maximize to Full App Screen"}
              >
                {isMaximized ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="h-9 w-9 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                title="Close Window"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </CardHeader>

          {/* Messages Thread */}
          <CardContent className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/60">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col max-w-[88%] ${msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
                  }`}
              >
                <span className="text-xs text-slate-500 uppercase font-black tracking-wide mb-1 px-1">
                  {msg.sender === "user" ? "You" : "Jahwi AI"}
                </span>

                <div
                  className={`p-4 rounded-2xl text-sm sm:text-base font-semibold leading-relaxed space-y-2.5 ${
                    msg.sender === "user"
                      ? "bg-emerald-600 text-white rounded-tr-none shadow-md"
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

          {/* Attached Image Preview Bar */}
          {selectedImage && (
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

          {/* Chat Footer Input */}
          <form onSubmit={handleSendMessage} className="p-3 sm:p-4 border-t bg-white flex gap-2.5 shrink-0 items-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-12 w-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors shrink-0"
              title="Attach image or document file"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <Input
              ref={inputRef}
              type="text"
              placeholder="Ask JAHWI AI or instruct an action..."
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
              className="h-12 border-slate-300 text-sm sm:text-base font-semibold flex-1 rounded-xl px-4"
              disabled={loading}
            />
            <Button
              type="submit"
              size="icon"
              className="h-12 w-12 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow shrink-0"
              disabled={loading || (!inputMessage.trim() && !selectedImage)}
            >
              <Send className="h-5 w-5" />
            </Button>
          </form>
        </Card>
      )}
    </>
  )
}
