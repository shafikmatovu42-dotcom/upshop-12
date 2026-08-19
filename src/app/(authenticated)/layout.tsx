"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/lib/auth-context"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { JahwiAssistant } from "@/components/layout/jahwi-assistant"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ShieldAlert } from "lucide-react"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { useAppVersion } from "@/hooks/use-app-version"
import { UpdaterDialog } from "@/components/layout/updater-dialog"

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useKeyboardShortcuts()
  const appVersion = useAppVersion()
  const { user, token } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const [currentTime, setCurrentTime] = useState("")
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsOnline(navigator.onLine)
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const [authorizedTabs, setAuthorizedTabs] = useState<Record<string, boolean>>({})
  const [showGateModal, setShowGateModal] = useState(false)
  const [gatePath, setGatePath] = useState("")
  const [gateEmail, setGateEmail] = useState("")
  const [gatePassword, setGatePassword] = useState("")
  const [gateVerifying, setGateVerifying] = useState(false)
  const [gateError, setGateError] = useState("")

  // Load privacy settings
  const [privacySettings, setPrivacySettings] = useState({
    lockInventory: false,
    lockStore: false
  })

  useEffect(() => {
    const checkPrivacy = () => {
      const saved = localStorage.getItem("upshop_privacy_settings")
      if (saved) {
        setPrivacySettings(JSON.parse(saved))
      } else {
        setPrivacySettings({ lockInventory: false, lockStore: false })
      }
    }
    checkPrivacy()
    window.addEventListener("storage", checkPrivacy)
    return () => window.removeEventListener("storage", checkPrivacy)
  }, [])

  // Check path navigation (Only gates non-admin agent accounts)
  useEffect(() => {
    const isInventory = pathname === "/inventory"
    const isStore = pathname === "/store"
    const isAdmin = !user?.role || user?.role === 'admin'

    const saved = localStorage.getItem("upshop_privacy_settings")
    const settings = saved ? JSON.parse(saved) : { lockInventory: false, lockStore: false }

    if (!isAdmin && isInventory && settings.lockInventory && !authorizedTabs["/inventory"]) {
      setGatePath("/inventory")
      setGateError("")
      setShowGateModal(true)
    } else if (!isAdmin && isStore && settings.lockStore && !authorizedTabs["/store"]) {
      setGatePath("/store")
      setGateError("")
      setShowGateModal(true)
    } else {
      setShowGateModal(false)
    }
  }, [pathname, authorizedTabs, user])

  // Reset authorization when navigating away from the locked tab
  useEffect(() => {
    setAuthorizedTabs(prev => {
      const paths = ["/inventory", "/store"]
      const next = { ...prev }
      paths.forEach(p => {
        if (pathname !== p) {
          next[p] = false
        }
      })
      return next
    })
  }, [pathname])

  const handleGateVerify = async () => {
    if (!gateEmail || !gatePassword || !token) return
    setGateVerifying(true)
    setGateError("")
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: gateEmail,
          password: gatePassword
        })
      })

      if (response.ok) {
        setAuthorizedTabs(prev => ({ ...prev, [gatePath]: true }))
        setGateEmail("")
        setGatePassword("")
        setShowGateModal(false)
      } else {
        const errorData = await response.json()
        setGateError(errorData.error || "Incorrect credentials.")
      }
    } catch (e) {
      setGateError("Verification failed due to a system error.")
    } finally {
      setGateVerifying(false)
    }
  }

  const handleGateCancel = () => {
    router.push("/dashboard")
    setGateEmail("")
    setGatePassword("")
    setShowGateModal(false)
  }

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      const dayName = days[now.getDay()]
      const monthName = months[now.getMonth()]
      const date = String(now.getDate()).padStart(2, '0')
      let hours = now.getHours()
      const ampm = hours >= 12 ? 'PM' : 'AM'
      hours = hours % 12
      hours = hours ? hours : 12
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const seconds = String(now.getSeconds()).padStart(2, '0')
      setCurrentTime(`${dayName}, ${monthName} ${date} | ${hours}:${minutes}:${seconds} ${ampm}`)
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!token) {
      router.push("/login")
    }
  }, [token, router])

  if (!token) {
    return null
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex flex-col">
          <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b bg-card px-4 shadow-sm">
            <SidebarTrigger className="-ml-1" />
            <SidebarTrigger className="hidden" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex flex-1 items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">UPshop Console</h2>
              <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                {isOnline ? (
                  <span className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200 font-bold">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    System Online
                  </span>
                ) : (
                  <span className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1.5 rounded-full border border-red-200 font-bold">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    System Offline
                  </span>
                )}
                <span className="font-bold font-mono bg-primary/5 text-primary border border-primary/10 px-3 py-1.5 rounded-full hidden md:inline">
                  🕒 {currentTime}
                </span>
                <span>v{appVersion}</span>
                <UpdaterDialog />
              </div>
            </div>
          </header>
          <main className="flex-1 p-6 md:p-8 overflow-auto bg-slate-50/50">
            {showGateModal ? (
              <div className="flex h-[60vh] items-center justify-center">
                <Card className="w-full max-w-md border-none shadow-xl bg-white p-6">
                  <div className="flex flex-col items-center justify-center text-center py-4">
                    <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 mb-4 animate-bounce">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Privacy Lock Active</h3>
                    <p className="text-xs text-muted-foreground mt-1 px-4 leading-normal">
                      Access to the {gatePath === "/inventory" ? "Inventory" : "Store Management"} directory is restricted. Please verify your credentials in the verification window.
                    </p>
                  </div>
                </Card>
              </div>
            ) : (
              children
            )}
          </main>
        </SidebarInset>
      </div>
      <JahwiAssistant />

      {/* Security Gate Modal */}
      {showGateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-md border-none shadow-2xl bg-white p-6 animate-in zoom-in-95 duration-200">
            <CardHeader className="p-0 pb-4 border-b">
              <CardTitle className="text-xl text-primary font-black flex items-center gap-2">
                <ShieldAlert className="h-6 w-6 text-orange-600" />
                Security Verification
              </CardTitle>
              <CardDescription className="text-slate-500 font-semibold mt-1">
                Enter your terminal credentials to unlock this directory.
              </CardDescription>
            </CardHeader>
            <div className="py-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gate-email" className="font-bold">Username</Label>
                <Input
                  id="gate-email"
                  type="text"
                  placeholder="e.g. shafik"
                  className="h-11 border-slate-200"
                  value={gateEmail}
                  onChange={(e) => setGateEmail(e.target.value)}
                  disabled={gateVerifying}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gate-password" className="font-bold">Password</Label>
                <Input
                  id="gate-password"
                  type="password"
                  placeholder="••••••••"
                  className="h-11 border-slate-200"
                  value={gatePassword}
                  onChange={(e) => setGatePassword(e.target.value)}
                  disabled={gateVerifying}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleGateVerify()
                  }}
                />
              </div>
              {gateError && (
                <p className="text-xs font-bold text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 animate-pulse">
                  {gateError}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-3 border-t pt-4">
              <Button
                variant="outline"
                onClick={handleGateCancel}
                className="h-11 font-bold border-slate-200"
                disabled={gateVerifying}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGateVerify}
                className="h-11 font-bold px-6 text-white bg-primary hover:bg-primary/95"
                disabled={gateVerifying || !gateEmail || !gatePassword}
              >
                {gateVerifying ? "Unlocking..." : "Verify & Access"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </SidebarProvider>
  )
}
