"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  Settings,
  RefreshCw,
  Trash2,
  AlertOctagon,
  ShieldAlert,
  HelpCircle,
  User,
  Calendar,
  Printer,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Shield,
  ShieldCheck,
  Lock
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"

export default function SettingsPage() {
  const { user, token, logout } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const isAdmin = !user?.role || user?.role === 'admin'

  // Section collapse state
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})

  const toggleSection = (id: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [motto, setMotto] = useState("")
  const [operationPeriodMode, setOperationPeriodMode] = useState("weeks")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [activeTheme, setActiveTheme] = useState("theme-1")

  // JAHWI AI Gemini API Key state
  const [geminiKeyInput, setGeminiKeyInput] = useState("")

  useEffect(() => {
    const savedKey = localStorage.getItem("upshop_gemini_api_key") || ""
    setGeminiKeyInput(savedKey)
  }, [])

  const handleSaveGeminiKey = () => {
    localStorage.setItem("upshop_gemini_api_key", geminiKeyInput.trim())
    window.dispatchEvent(new Event("storage"))
    toast({
      title: "JAHWI AI Key Saved",
      description: "Gemini API configuration successfully updated."
    })
  }

  // Load privacy settings
  const [privacySettings, setPrivacySettings] = useState({
    lockInventory: false,
    lockStore: false
  })

  useEffect(() => {
    const saved = localStorage.getItem("upshop_privacy_settings")
    if (saved) {
      setPrivacySettings(JSON.parse(saved))
    }
  }, [])

  const [showPrivacyVerify, setShowPrivacyVerify] = useState(false)
  const [pendingPrivacyChange, setPendingPrivacyChange] = useState<{ key: 'lockInventory' | 'lockStore', value: boolean } | null>(null)
  const [privacyEmail, setPrivacyEmail] = useState("")
  const [privacyPassword, setPrivacyPassword] = useState("")
  const [privacyVerifying, setPrivacyVerifying] = useState(false)

  const handlePrivacyCheckboxChange = (key: 'lockInventory' | 'lockStore', checked: boolean) => {
    setPendingPrivacyChange({ key, value: checked })
    setPrivacyEmail("")
    setPrivacyPassword("")
    setShowPrivacyVerify(true)
  }

  const handleVerifyPrivacyChange = async () => {
    if (!pendingPrivacyChange || !privacyEmail || !privacyPassword || !token) return
    setPrivacyVerifying(true)
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: privacyEmail,
          password: privacyPassword
        })
      })

      if (response.ok) {
        const updatedSettings = {
          ...privacySettings,
          [pendingPrivacyChange.key]: pendingPrivacyChange.value
        }
        setPrivacySettings(updatedSettings)
        localStorage.setItem("upshop_privacy_settings", JSON.stringify(updatedSettings))
        
        // Trigger storage event so layout.tsx gets updated if active
        window.dispatchEvent(new Event("storage"))

        toast({
          title: "Privacy Settings Updated",
          description: `Successfully ${pendingPrivacyChange.value ? "enabled" : "disabled"} privacy lock for the ${pendingPrivacyChange.key === 'lockInventory' ? 'Inventory' : 'Store Management'} section (Applies to Agent Accounts).`
        })

        setShowPrivacyVerify(false)
        setPendingPrivacyChange(null)
        setPrivacyEmail("")
        setPrivacyPassword("")
      } else {
        const errorData = await response.json()
        toast({
          variant: "destructive",
          title: "Verification Failed",
          description: errorData.error || "Incorrect credentials."
        })
      }
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to verify security credentials."
      })
    } finally {
      setPrivacyVerifying(false)
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem("upshop_theme") || "theme-1"
    setActiveTheme(saved)
  }, [])

  const handleSaveTheme = (newTheme: string) => {
    localStorage.setItem("upshop_theme", newTheme)
    document.documentElement.className = newTheme
    setActiveTheme(newTheme)
    toast({
      title: "Interface Theme Applied",
      description: `Successfully loaded theme style: ${newTheme.toUpperCase()}`
    })
  }

  // Printer settings state
  const [receiptPrintingEnabled, setReceiptPrintingEnabled] = useState(true)
  const [printerName, setPrinterName] = useState("UPshop Thermal Receipt-58")
  const [printerStatus, setPrinterStatus] = useState("Online")
  const [printerIp, setPrinterIp] = useState("192.168.8.100")
  const [receiptPaperWidth, setReceiptPaperWidth] = useState("58mm")
  const [discoveredPrinters, setDiscoveredPrinters] = useState<any[]>([])

  const [verifyAction, setVerifyAction] = useState<'profile' | 'reset_keep_products' | 'wipe_all' | null>(null)
  const [emailInput, setEmailInput] = useState("")
  const [passwordInput, setPasswordInput] = useState("")
  const [executing, setExecuting] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPeriodMode, setSavingPeriodMode] = useState(false)
  const [savingPrinter, setSavingPrinter] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (!token) {
      router.push('/login')
    }
  }, [token, router])

  // Load user profile details
  useEffect(() => {
    if (!token) return
    const loadProfileAndPrinters = async () => {
      try {
        const response = await fetch('/api/user/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (response.ok) {
          const profile = await response.json()
          setFullName(profile.fullName || "")
          setEmail(profile.email || "")
          setMotto(profile.motto || "")
          setOperationPeriodMode(profile.operationPeriodMode || "weeks")
          setReceiptPrintingEnabled(profile.receiptPrintingEnabled !== undefined ? profile.receiptPrintingEnabled : true)
          setPrinterName(profile.printerName || "UPshop Thermal Receipt-58")
          setPrinterStatus(profile.printerStatus || "Online")
          setPrinterIp(profile.printerIp || "192.168.8.100")
          setReceiptPaperWidth(profile.receiptPaperWidth || "58mm")
        }

        const printersRes = await fetch('/api/settings/printers', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (printersRes.ok) {
          setDiscoveredPrinters(await printersRes.json())
        }
      } catch (error) {
        console.error("Failed to load settings profile:", error)
      }
    }
    loadProfileAndPrinters()
  }, [token])

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    if (newPassword && newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords Do Not Match",
        description: "Please make sure your new password and confirmation password match."
      })
      return
    }

    setVerifyAction('profile')
  }

  const handleSavePeriodMode = async (mode: string) => {
    if (!token) return
    setSavingPeriodMode(true)

    const now = new Date()
    let calculatedPeriod = ""
    if (mode === 'weeks') {
      const firstDayOfYear = new Date(now.getFullYear(), 0, 1)
      const pastDays = (now.getTime() - firstDayOfYear.getTime()) / (24 * 60 * 60 * 1000)
      const weekNum = Math.ceil((pastDays + firstDayOfYear.getDay() + 1) / 7)
      calculatedPeriod = `Week ${Math.min(52, Math.max(1, weekNum))}`
    } else {
      const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ]
      calculatedPeriod = months[now.getMonth()]
    }

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          operationPeriodMode: mode,
          currentWeek: calculatedPeriod
        })
      })

      if (response.ok) {
        const updatedUser = await response.json()
        localStorage.setItem('authUser', JSON.stringify(updatedUser))
        setOperationPeriodMode(mode)
        toast({
          title: "Operational Mode Updated",
          description: `Switched operational period to ${mode === 'weeks' ? 'Weeks' : 'Months'} (Set to ${calculatedPeriod}).`
        })
      } else {
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: "Could not update settings."
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update operational settings."
      })
    } finally {
      setSavingPeriodMode(false)
    }
  }

  const handleSavePrinterSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    setSavingPrinter(true)
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          receiptPrintingEnabled,
          printerName,
          printerStatus,
          printerIp,
          receiptPaperWidth
        })
      })

      if (response.ok) {
        const updatedUser = await response.json()
        localStorage.setItem('authUser', JSON.stringify(updatedUser))
        toast({ title: "Printer Configured", description: "Receipt printer configuration saved successfully." })
      } else {
        toast({ variant: "destructive", title: "Save Failed", description: "Could not save printer settings." })
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to update printer settings." })
    } finally {
      setSavingPrinter(false)
    }
  }

  const handleVerifyAndExecute = async () => {
    if (!verifyAction || !emailInput || !passwordInput || !token) return

    setExecuting(true)
    try {
      // 1. Verify credentials first
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: emailInput,
          password: passwordInput
        })
      })

      if (!verifyRes.ok) {
        const errorData = await verifyRes.json()
        toast({
          variant: "destructive",
          title: "Verification Failed",
          description: errorData.error || "Incorrect credentials."
        })
        setExecuting(false)
        return
      }

      // 2. Credentials are correct! Run the actual action
      if (verifyAction === 'profile') {
        setSavingProfile(true)
        const payload: any = {
          fullName,
          email,
          motto
        }
        if (newPassword) {
          payload.password = newPassword
        }

        const response = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        })

        if (response.ok) {
          const updatedUser = await response.json()
          localStorage.setItem('authUser', JSON.stringify(updatedUser))
          toast({ title: "Profile Updated", description: "Your changes have been saved." })
          setNewPassword("")
          setConfirmPassword("")
          setVerifyAction(null)
          setEmailInput("")
          setPasswordInput("")
        } else {
          const data = await response.json()
          toast({
            variant: "destructive",
            title: "Update Failed",
            description: data.error || "Could not save changes."
          })
        }
        setSavingProfile(false)
      } else if (verifyAction === 'reset_keep_products') {
        const resetRes = await fetch('/api/settings/reset', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            type: 'reset_keep_products',
            email: emailInput,
            password: passwordInput
          })
        })
        if (resetRes.ok) {
          toast({ title: "Operation Successful", description: "Database reset operation completed." })
          router.push('/dashboard')
          setVerifyAction(null)
          setEmailInput("")
          setPasswordInput("")
        } else {
          const data = await resetRes.json()
          toast({ variant: "destructive", title: "Error", description: data.error || "Reset failed." })
        }
      } else if (verifyAction === 'wipe_all') {
        const resetRes = await fetch('/api/settings/reset', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            type: 'wipe_all',
            email: emailInput,
            password: passwordInput
          })
        })
        if (resetRes.ok) {
          toast({ title: "Operation Successful", description: "All database records wiped out." })
          logout()
          router.push('/signup')
          setVerifyAction(null)
          setEmailInput("")
          setPasswordInput("")
        } else {
          const data = await resetRes.json()
          toast({ variant: "destructive", title: "Error", description: data.error || "Wipe failed." })
        }
      }
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e.message || "Request execution failed."
      })
    } finally {
      setExecuting(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-primary">System Settings</h1>
        <p className="text-muted-foreground font-medium">Manage system data maintenance, profile edits, interface themes, hardware, and administrative controls.</p>
      </div>

      {/* Downward List of All Settings Sections */}
      <div className="flex flex-col gap-6 w-full">

        {/* 1. Profile Card */}
        <Card className="border-none shadow-lg bg-white overflow-hidden border-l-4 border-l-primary w-full">
          <CardHeader className="bg-slate-50/50 pb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <CardTitle className="text-lg flex items-center gap-2 text-primary font-black">
                  <User className="h-5 w-5 text-accent" />
                  Agent Profile Settings
                </CardTitle>
                <CardDescription className="mt-1">
                  Update your account credentials, name, and custom motto.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => toggleSection('profile')}
                className="h-9 px-3.5 text-xs font-bold border-slate-200 hover:bg-slate-100 flex items-center gap-1.5 shrink-0 rounded-xl"
              >
                {collapsedSections['profile'] ? (
                  <>
                    <ChevronDown className="h-4 w-4 text-slate-600" />
                    <span>Expand</span>
                  </>
                ) : (
                  <>
                    <ChevronUp className="h-4 w-4 text-slate-600" />
                    <span>Minimise</span>
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          {!collapsedSections['profile'] && (
            <CardContent className="pt-6">
              <form onSubmit={handleSaveProfile} className="space-y-4 max-w-3xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="font-bold text-slate-700">Agent Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="e.g. Matovu Shafik"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-11 border-slate-200"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-bold text-slate-700">Username</Label>
                    <Input
                      id="email"
                      type="text"
                      placeholder="e.g. shafik"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 border-slate-200"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="motto" className="font-bold text-slate-700">Motto / Status Statement</Label>
                  <Input
                    id="motto"
                    type="text"
                    placeholder="e.g. Customer first, always!"
                    value={motto}
                    onChange={(e) => setMotto(e.target.value)}
                    className="h-11 border-slate-200"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="font-bold text-slate-700">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-11 border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="font-bold text-slate-700">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-11 border-slate-200"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/95 text-white font-bold h-11 px-8 shadow-md rounded-xl"
                  disabled={savingProfile}
                >
                  {savingProfile ? "Saving Profile..." : "Save Profile Details"}
                </Button>
              </form>
            </CardContent>
          )}
        </Card>

        {/* 2. System Themes Card */}
        <Card className="border-none shadow-lg bg-white overflow-hidden border-l-4 border-l-emerald-600 w-full">
          <CardHeader className="bg-slate-50/50 pb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <CardTitle className="text-lg flex items-center gap-2 text-emerald-700 font-black">
                  <Settings className="h-5 w-5 text-accent animate-spin-slow" style={{ animationDuration: '10s' }} />
                  System Theme Style
                </CardTitle>
                <CardDescription className="mt-1">
                  Customize UI accent highlights, backgrounds, and contrast levels.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => toggleSection('theme')}
                className="h-9 px-3.5 text-xs font-bold border-slate-200 hover:bg-slate-100 flex items-center gap-1.5 shrink-0 rounded-xl"
              >
                {collapsedSections['theme'] ? (
                  <>
                    <ChevronDown className="h-4 w-4 text-slate-600" />
                    <span>Expand</span>
                  </>
                ) : (
                  <>
                    <ChevronUp className="h-4 w-4 text-slate-600" />
                    <span>Minimise</span>
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          {!collapsedSections['theme'] && (
            <CardContent className="pt-6 space-y-4">
              <Label className="font-bold text-slate-700 block">Select Active Interface Style</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { id: 'theme-1', name: 'Classic Light', desc: 'Light Mode (White & Navy)', colors: ['bg-white', 'bg-[#1A237E]', 'bg-[#FFC107]'] },
                  { id: 'theme-2', name: 'Midnight Navy', desc: 'Dark Mode (Navy & Golden Amber)', colors: ['bg-[#0B0F19]', 'bg-[#1D2433]', 'bg-[#F59E0B]'] },
                  { id: 'theme-3', name: 'Pitch Black', desc: 'Ultra Contrast (Pure Black & Cyan)', colors: ['bg-black', 'bg-[#0F0F0F]', 'bg-[#00FFFF]'] },
                  { id: 'theme-4', name: 'Forest Emerald', desc: 'Emerald Mode (Green & Gold)', colors: ['bg-[#04160A]', 'bg-[#0D2415]', 'bg-[#EAB308]'] },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSaveTheme(t.id)}
                    className={`rounded-2xl border border-slate-100 p-4 flex flex-col items-start gap-2 text-left transition-all cursor-pointer ${
                      activeTheme === t.id
                        ? 'border-primary bg-primary/5 text-primary font-bold shadow'
                        : 'border-slate-200 hover:border-slate-300 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex gap-1.5 w-full justify-between items-center">
                      <span className="text-xs font-black">{t.name}</span>
                      <div className="flex gap-1">
                        {t.colors.map((c, i) => (
                          <span key={i} className={`h-3.5 w-3.5 rounded-full border border-slate-300 ${c}`} />
                        ))}
                      </div>
                    </div>
                    <span className="text-[10px] opacity-80 leading-normal block">{t.desc}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          )}
        </Card>

        {/* 3. Receipt Printer Configurations Card */}
        <Card className="border-none shadow-lg bg-white overflow-hidden border-l-4 border-l-indigo-600 w-full">
          <CardHeader className="bg-slate-50/50 pb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <CardTitle className="text-lg flex items-center gap-2 text-indigo-700 font-black">
                  <Printer className="h-5 w-5 text-accent" />
                  Receipt Printer Settings
                </CardTitle>
                <CardDescription className="mt-1">
                  Toggle receipt printing and update terminal thermal printer parameters.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => toggleSection('printer')}
                className="h-9 px-3.5 text-xs font-bold border-slate-200 hover:bg-slate-100 flex items-center gap-1.5 shrink-0 rounded-xl"
              >
                {collapsedSections['printer'] ? (
                  <>
                    <ChevronDown className="h-4 w-4 text-slate-600" />
                    <span>Expand</span>
                  </>
                ) : (
                  <>
                    <ChevronUp className="h-4 w-4 text-slate-600" />
                    <span>Minimise</span>
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          {!collapsedSections['printer'] && (
            <CardContent className="pt-6">
              <form onSubmit={handleSavePrinterSettings} className="space-y-4 max-w-3xl">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Print Receipts</span>
                    <span className="text-[10px] text-slate-400 font-semibold leading-normal mt-0.5">Print receipt on sales & returns</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReceiptPrintingEnabled(!receiptPrintingEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      receiptPrintingEnabled ? 'bg-primary' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        receiptPrintingEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="printerName" className="font-bold text-slate-700">Printer Model (Discovered)</Label>
                    <Select value={printerName} onValueChange={(val) => {
                      setPrinterName(val)
                      const matched = discoveredPrinters.find(p => p.name === val)
                      if (matched) {
                        setPrinterStatus(matched.status || 'Online')
                        if (matched.port && matched.port.includes('.')) {
                          setPrinterIp(matched.port)
                        }
                      }
                    }}>
                      <SelectTrigger className="w-full h-11 border-slate-200 font-bold bg-white text-slate-700 rounded-xl focus:ring-1 focus:ring-accent shadow-sm">
                        <SelectValue placeholder="Select discovered printer" />
                      </SelectTrigger>
                      <SelectContent className="font-bold">
                        {discoveredPrinters.map(p => (
                          <SelectItem key={p.name} value={p.name}>
                            {p.name} ({p.status})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="printerIp" className="font-bold text-slate-700">Network IP Address</Label>
                    <Input
                      id="printerIp"
                      type="text"
                      placeholder="e.g. 192.168.8.100"
                      value={printerIp}
                      onChange={(e) => setPrinterIp(e.target.value)}
                      className="h-11 border-slate-200 font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="receiptPaperWidth" className="font-bold text-slate-700">Thermal Receipt Paper Roll Width (Print Size)</Label>
                  <Select value={receiptPaperWidth} onValueChange={(val) => setReceiptPaperWidth(val)}>
                    <SelectTrigger className="w-full h-11 border-slate-200 font-bold bg-white text-slate-700 rounded-xl focus:ring-1 focus:ring-accent shadow-sm">
                      <SelectValue placeholder="Select thermal paper size" />
                    </SelectTrigger>
                    <SelectContent className="font-bold">
                      <SelectItem value="58mm">58mm Roll Width (Standard Compact Thermal Paper)</SelectItem>
                      <SelectItem value="76mm">76mm Roll Width (Medium Thermal Paper)</SelectItem>
                      <SelectItem value="80mm">80mm Roll Width (Standard Wide Desktop Thermal Paper)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Automatically adjusts page dimensions, margins, and column layouts for receipts printed at POS.
                  </p>
                </div>

                <div className="flex items-center gap-2 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-indigo-800 text-xs font-semibold">
                  {receiptPrintingEnabled && printerStatus.toLowerCase() === 'online' ? (
                    <Wifi className="h-4 w-4 text-green-600 shrink-0" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-500 shrink-0" />
                  )}
                  <span>Status: {receiptPrintingEnabled ? printerStatus : "Disabled"} ({printerIp})</span>
                </div>

                <Button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 px-8 shadow-md rounded-xl"
                  disabled={savingPrinter}
                >
                  {savingPrinter ? "Saving Config..." : "Save Printer Config"}
                </Button>
              </form>
            </CardContent>
          )}
        </Card>


        {/* ==================== ADMIN PANEL SECTION ==================== */}
        <div className="mt-6 pt-6 border-t-2 border-slate-200 flex flex-col gap-6">
          <div className="flex items-center justify-between bg-gradient-to-r from-primary/10 via-slate-100 to-amber-50 p-4 rounded-2xl border border-primary/20 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary text-white rounded-xl shadow-md">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-primary flex items-center gap-2">
                  ADMIN PANEL
                  <span className="text-xs bg-amber-500 text-white px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider shadow-sm">
                    Business Admin Only
                  </span>
                </h2>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Administrative control parameters, operational modes, AI integration key setup, and system reset options.
                </p>
              </div>
            </div>
          </div>

          {!isAdmin ? (
            <Card className="border-none shadow-md bg-amber-50/50 border-l-4 border-l-amber-500 p-6">
              <div className="flex items-start gap-4">
                <Lock className="h-6 w-6 text-amber-600 shrink-0 mt-1" />
                <div>
                  <h3 className="text-base font-bold text-amber-900">Admin Privileges Required</h3>
                  <p className="text-xs text-amber-800 font-medium mt-1 leading-relaxed">
                    The Operational Preferences, JAHWI AI Integration & Setup, and System Reset options are restricted to Business Admin accounts. Please sign in as an administrator to adjust these parameters.
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <div className="flex flex-col gap-6 w-full">

              {/* 4. Operational Preferences Card (Transferred to ADMIN PANEL) */}
              <Card className="border-none shadow-lg bg-white overflow-hidden border-l-4 border-l-accent w-full">
                <CardHeader className="bg-slate-50/50 pb-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col">
                      <CardTitle className="text-lg flex items-center gap-2 text-accent-foreground font-black">
                        <Calendar className="h-5 w-5 text-accent" />
                        Operational Preferences
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Configure the time metric for active periods, targets, and sales analytics.
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => toggleSection('preferences')}
                      className="h-9 px-3.5 text-xs font-bold border-slate-200 hover:bg-slate-100 flex items-center gap-1.5 shrink-0 rounded-xl"
                    >
                      {collapsedSections['preferences'] ? (
                        <>
                          <ChevronDown className="h-4 w-4 text-slate-600" />
                          <span>Expand</span>
                        </>
                      ) : (
                        <>
                          <ChevronUp className="h-4 w-4 text-slate-600" />
                          <span>Minimise</span>
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                {!collapsedSections['preferences'] && (
                  <CardContent className="pt-6 space-y-6">
                    <div className="space-y-3 max-w-3xl">
                      <Label className="font-bold text-slate-700 block">Operational Period Mode</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => handleSavePeriodMode('weeks')}
                          disabled={savingPeriodMode}
                          className={`h-28 rounded-2xl border-2 p-4 flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer ${
                            operationPeriodMode === 'weeks'
                              ? 'border-primary bg-primary/5 text-primary font-bold'
                              : 'border-slate-200 hover:border-slate-300 text-slate-500'
                          }`}
                        >
                          <span className="font-bold text-sm">Weeks Mode</span>
                          <span className="text-[11px] opacity-80 leading-normal">Track by Week 1 to Week 52</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSavePeriodMode('months')}
                          disabled={savingPeriodMode}
                          className={`h-28 rounded-2xl border-2 p-4 flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer ${
                            operationPeriodMode === 'months'
                              ? 'border-accent bg-accent/5 text-accent-foreground font-bold'
                              : 'border-slate-200 hover:border-slate-300 text-slate-500'
                          }`}
                        >
                          <span className="font-bold text-sm">Months Mode</span>
                          <span className="text-[11px] opacity-80 leading-normal">Track by Jan to Dec</span>
                        </button>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-start gap-3 max-w-3xl">
                      <HelpCircle className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="text-xs text-slate-500 leading-normal font-semibold">
                        Changing this mode will immediately shift the main dashboard graphs and POS trackers to report either weekly or monthly operations.
                      </span>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* 5. JAHWI AI Integration & Setup Card (Transferred from Business Management to ADMIN PANEL) */}
              <Card className="border-none shadow-xl bg-white overflow-hidden border-l-4 border-l-emerald-600 w-full">
                <CardHeader className="bg-slate-50/50 pb-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col">
                      <CardTitle className="text-lg flex items-center gap-2 text-emerald-700 font-black">
                        <Sparkles className="h-5 w-5 text-accent animate-pulse" />
                        JAHWI AI Integration & Setup
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Configure your Gemini API key to activate JAHWI AI, your real-time intelligent business advisor.
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => toggleSection('ai_integration')}
                      className="h-9 px-3.5 text-xs font-bold border-slate-200 hover:bg-slate-100 flex items-center gap-1.5 shrink-0 rounded-xl"
                    >
                      {collapsedSections['ai_integration'] ? (
                        <>
                          <ChevronDown className="h-4 w-4 text-slate-600" />
                          <span>Expand</span>
                        </>
                      ) : (
                        <>
                          <ChevronUp className="h-4 w-4 text-slate-600" />
                          <span>Minimise</span>
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                {!collapsedSections['ai_integration'] && (
                  <CardContent className="pt-6 space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="font-bold text-slate-700 block">Jahwi AI Gemini API Key</Label>
                          <div className="flex gap-2">
                            <Input
                              type="password"
                              placeholder="Enter your Gemini API key (AIzaSy...)"
                              value={geminiKeyInput}
                              onChange={(e) => setGeminiKeyInput(e.target.value)}
                              className="h-11 border-slate-200 flex-1 font-mono"
                            />
                            <Button 
                              onClick={handleSaveGeminiKey}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-5 shadow rounded-xl"
                            >
                              Save Key
                            </Button>
                          </div>
                        </div>
                        
                        <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 flex flex-col gap-2">
                          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Get Official API Key</span>
                          <p className="text-xs text-slate-600 leading-normal">
                            To get your official Gemini API key or access corporate credentials, visit the official UP Corporations application portal:
                          </p>
                          <a 
                            href="https://todo-app-us15.vercel.app/" 
                            target="_blank" 
                            rel="noreferrer"
                            onClick={(e) => {
                              e.preventDefault();
                              const targetUrl = "https://todo-app-us15.vercel.app/";
                              if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
                                import('@tauri-apps/api/core').then(({ invoke }) => {
                                  invoke('open_external_url', { url: targetUrl }).catch(() => {
                                    window.open(targetUrl, '_blank');
                                  });
                                }).catch(() => {
                                  window.open(targetUrl, '_blank');
                                });
                              } else {
                                window.open(targetUrl, '_blank');
                              }
                            }}
                            className="text-xs font-black text-emerald-700 hover:underline flex items-center gap-1.5 mt-1 cursor-pointer"
                          >
                            🌐 Get API Key from Official App Site ↗
                          </a>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">What JAHWI AI Can Do</span>
                        <div className="space-y-2.5 text-sm text-slate-600 font-semibold leading-normal">
                          <div className="flex gap-2">
                            <span className="text-emerald-600">✓</span>
                            <span><strong>Real-time Inventory Tracking</strong>: Ask about remaining stock counts (e.g. <em>"How many woofer 8 items are remaining?"</em>)</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-emerald-600">✓</span>
                            <span><strong>Debtor Account Records</strong>: Retrieve outstanding customer balances (e.g. <em>"Who owes us money?"</em>)</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-emerald-600">✓</span>
                            <span><strong>Sales Analytics Summaries</strong>: Aggregate operations totals and sales log timelines.</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-emerald-600">✓</span>
                            <span><strong>Intelligent Assistant Responses</strong>: Converse naturally to recover transaction summaries or review trends.</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* 6. Additional Privacy Control Card (Transferred to ADMIN PANEL) */}
              <Card className="border-none shadow-xl bg-white overflow-hidden border-l-4 border-l-orange-500 w-full">
                <CardHeader className="bg-slate-50/50 pb-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col">
                      <CardTitle className="text-lg flex items-center gap-2 text-orange-700 font-black">
                        <Lock className="h-5 w-5 text-accent animate-pulse" />
                        Additional Privacy Control
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Toggle lock credentials requirement for sensitive system directories (Inventory and Store Management). Locks apply exclusively to non-admin terminal agent accounts.
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => toggleSection('privacy_control')}
                      className="h-9 px-3.5 text-xs font-bold border-slate-200 hover:bg-slate-100 flex items-center gap-1.5 shrink-0 rounded-xl"
                    >
                      {collapsedSections['privacy_control'] ? (
                        <>
                          <ChevronDown className="h-4 w-4 text-slate-600" />
                          <span>Expand</span>
                        </>
                      ) : (
                        <>
                          <ChevronUp className="h-4 w-4 text-slate-600" />
                          <span>Minimise</span>
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                {!collapsedSections['privacy_control'] && (
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
                        <Checkbox 
                          id="lock-inventory" 
                          checked={privacySettings.lockInventory} 
                          onCheckedChange={(checked) => handlePrivacyCheckboxChange('lockInventory', !!checked)}
                        />
                        <div className="flex flex-col">
                          <label htmlFor="lock-inventory" className="text-sm font-bold text-slate-800 cursor-pointer select-none flex items-center gap-2">
                            Inventory Tab Gate
                            <Badge variant="outline" className="text-[9px] bg-orange-50 text-orange-700 border-orange-200 font-extrabold">Agent Accounts Only</Badge>
                          </label>
                          <span className="text-[10px] text-muted-foreground font-semibold">Requires password credentials upon agent entry</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
                        <Checkbox 
                          id="lock-store" 
                          checked={privacySettings.lockStore} 
                          onCheckedChange={(checked) => handlePrivacyCheckboxChange('lockStore', !!checked)}
                        />
                        <div className="flex flex-col">
                          <label htmlFor="lock-store" className="text-sm font-bold text-slate-800 cursor-pointer select-none flex items-center gap-2">
                            Store Management Tab Gate
                            <Badge variant="outline" className="text-[9px] bg-orange-50 text-orange-700 border-orange-200 font-extrabold">Agent Accounts Only</Badge>
                          </label>
                          <span className="text-[10px] text-muted-foreground font-semibold">Requires password credentials upon agent entry</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* 6. Start New Sales Period Card (Transferred to ADMIN PANEL) */}
              <Card className="border-none shadow-lg bg-white overflow-hidden border-l-4 border-l-amber-500 w-full">
                <CardHeader className="bg-slate-50/50 pb-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col">
                      <CardTitle className="text-lg flex items-center gap-2 text-amber-600 font-bold">
                        <RefreshCw className="h-5 w-5 animate-spin-slow" />
                        Start New Sales Period
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Clears older logs, but keeps active debtors, products index, and the last 200 transactions.
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => toggleSection('reset_period')}
                      className="h-9 px-3.5 text-xs font-bold border-slate-200 hover:bg-slate-100 flex items-center gap-1.5 shrink-0 rounded-xl"
                    >
                      {collapsedSections['reset_period'] ? (
                        <>
                          <ChevronDown className="h-4 w-4 text-slate-600" />
                          <span>Expand</span>
                        </>
                      ) : (
                        <>
                          <ChevronUp className="h-4 w-4 text-slate-600" />
                          <span>Minimise</span>
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                {!collapsedSections['reset_period'] && (
                  <CardContent className="pt-6 space-y-4">
                    <p className="text-sm text-slate-500 leading-relaxed max-w-3xl">
                      This option is used to start a fresh sales period. Unlike a full wipe, it automatically retains all registered products, current unpaid credit debtors, and the last 200 transactions (sales and returns logs) so your dashboard analytics and notifications stay contextually accurate.
                    </p>
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-start gap-3 max-w-3xl">
                      <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <span className="text-xs font-semibold text-amber-800">
                        Notice: Older sales exceeding the 200 limit (excluding active debtors) and old logistical transfers will be deleted.
                      </span>
                    </div>
                    <Button
                      onClick={() => setVerifyAction('reset_keep_products')}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-11 px-8 rounded-xl"
                    >
                      Start New Period (Retain Products, Debtors & History)
                    </Button>
                  </CardContent>
                )}
              </Card>

              {/* 7. Wipe All Database Card (Transferred to ADMIN PANEL) */}
              <Card className="border-none shadow-lg bg-white overflow-hidden border-l-4 border-l-red-600 w-full">
                <CardHeader className="bg-slate-50/50 pb-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col">
                      <CardTitle className="text-lg flex items-center gap-2 text-red-600 font-bold">
                        <Trash2 className="h-5 w-5" />
                        Wipe All Database
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Deletes all records from the database, including products, logs, and user accounts.
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => toggleSection('wipe_db')}
                      className="h-9 px-3.5 text-xs font-bold border-slate-200 hover:bg-slate-100 flex items-center gap-1.5 shrink-0 rounded-xl"
                    >
                      {collapsedSections['wipe_db'] ? (
                        <>
                          <ChevronDown className="h-4 w-4 text-slate-600" />
                          <span>Expand</span>
                        </>
                      ) : (
                        <>
                          <ChevronUp className="h-4 w-4 text-slate-600" />
                          <span>Minimise</span>
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                {!collapsedSections['wipe_db'] && (
                  <CardContent className="pt-6 space-y-4">
                    <p className="text-sm text-slate-500 leading-relaxed max-w-3xl">
                      This option completely reinstates the database to its empty, clean state. Running this will wipe all data and require a new user registration to access the console.
                    </p>
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-start gap-3 max-w-3xl">
                      <AlertOctagon className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                      <span className="text-xs font-semibold text-red-800">
                        Critical Danger: All user credentials, business locations, images, and inventory will be permanently deleted.
                      </span>
                    </div>
                    <Button
                      onClick={() => setVerifyAction('wipe_all')}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold h-11 px-8 rounded-xl"
                    >
                      Destroy All Database Records
                    </Button>
                  </CardContent>
                )}
              </Card>

            </div>
          )}
        </div>

      </div>

      {/* Verification Overlay Modal */}
      {verifyAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-md border-none shadow-2xl bg-white p-6 animate-in zoom-in-95 duration-200 rounded-2xl">
            <CardHeader className="p-0 pb-4 border-b">
              <CardTitle className="text-xl text-primary font-black flex items-center gap-2">
                <ShieldAlert className="h-6 w-6 text-red-600" />
                Security Verification
              </CardTitle>
              <CardDescription className="text-slate-500 font-semibold mt-1">
                You must enter your account credentials to authorize this operation.
              </CardDescription>
            </CardHeader>
            <div className="py-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verify-email" className="font-bold">Username</Label>
                <Input
                  id="verify-email"
                  type="text"
                  placeholder="e.g. shafik"
                  className="h-11 border-slate-200"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  disabled={executing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="verify-password" className="font-bold">Password</Label>
                <Input
                  id="verify-password"
                  type="password"
                  placeholder="••••••••"
                  className="h-11 border-slate-200"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  disabled={executing}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t pt-4">
              <Button
                variant="outline"
                onClick={() => { setVerifyAction(null); setEmailInput(""); setPasswordInput(""); }}
                className="h-11 font-bold border-slate-200 rounded-xl"
                disabled={executing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleVerifyAndExecute}
                className={`h-11 font-bold px-6 text-white rounded-xl ${
                  verifyAction === 'wipe_all' ? 'bg-red-600 hover:bg-red-700' :
                  verifyAction === 'profile' ? 'bg-primary hover:bg-primary/95' : 'bg-amber-600 hover:bg-amber-700'
                }`}
                disabled={executing || !emailInput || !passwordInput}
              >
                {executing ? "Processing..." : "Confirm & Execute"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Privacy configuration change verification modal */}
      {showPrivacyVerify && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-md border-none shadow-2xl bg-white p-6 animate-in zoom-in-95 duration-200 rounded-2xl">
            <CardHeader className="p-0 pb-4 border-b">
              <CardTitle className="text-xl text-primary font-black flex items-center gap-2">
                <ShieldAlert className="h-6 w-6 text-red-600" />
                Security Verification
              </CardTitle>
              <CardDescription className="text-slate-500 font-semibold mt-1">
                You must verify your credentials to change privacy configurations.
              </CardDescription>
            </CardHeader>
            <div className="py-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="privacy-email" className="font-bold">Username</Label>
                <Input
                  id="privacy-email"
                  type="text"
                  placeholder="e.g. shafik"
                  className="h-11 border-slate-200"
                  value={privacyEmail}
                  onChange={(e) => setPrivacyEmail(e.target.value)}
                  disabled={privacyVerifying}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="privacy-password" className="font-bold">Password</Label>
                <Input
                  id="privacy-password"
                  type="password"
                  placeholder="••••••••"
                  className="h-11 border-slate-200"
                  value={privacyPassword}
                  onChange={(e) => setPrivacyPassword(e.target.value)}
                  disabled={privacyVerifying}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleVerifyPrivacyChange()
                  }}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t pt-4">
              <Button
                variant="outline"
                onClick={() => { setShowPrivacyVerify(false); setPendingPrivacyChange(null); }}
                className="h-11 font-bold border-slate-200 rounded-xl"
                disabled={privacyVerifying}
              >
                Cancel
              </Button>
              <Button
                onClick={handleVerifyPrivacyChange}
                className="h-11 font-bold px-6 text-white bg-primary hover:bg-primary/95 rounded-xl"
                disabled={privacyVerifying || !privacyEmail || !privacyPassword}
              >
                {privacyVerifying ? "Verifying..." : "Confirm & Apply"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

