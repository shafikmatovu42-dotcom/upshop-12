"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Download, Sparkles, CheckCircle2, AlertCircle } from "lucide-react"
import { useAppVersion } from "@/hooks/use-app-version"

export function UpdaterDialog() {
  const currentVersion = useAppVersion()
  const [open, setOpen] = useState(false)
  const [checking, setChecking] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState<any>(null)
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState<number>(0)
  const [downloadedBytes, setDownloadedBytes] = useState<number>(0)
  const [totalBytes, setTotalBytes] = useState<number>(0)
  const [statusMessage, setStatusMessage] = useState("")
  const [readyToRelaunch, setReadyToRelaunch] = useState(false)
  const [isTauri, setIsTauri] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      setIsTauri(true)
    }
  }, [])

  const handleCheckUpdate = async (manual = true) => {
    if (!isTauri) {
      if (manual) {
        setStatusMessage("Updates are managed automatically in desktop production builds.")
      }
      return
    }

    setChecking(true)
    setStatusMessage("Checking for application updates...")

    try {
      const { check } = await import("@tauri-apps/plugin-updater")
      const update = await check()

      if (update && update.available) {
        setUpdateAvailable(update)
        setStatusMessage(`Version ${update.version} is available!`)
        if (manual) setOpen(true)
      } else {
        setUpdateAvailable(null)
        setStatusMessage(`You are running the latest version (v${currentVersion}).`)
      }
    } catch (err: any) {
      console.error("Update check failed:", err)
      const errStr = typeof err === "string" ? err : err?.message || JSON.stringify(err)
      if (errStr.includes("404") || errStr.toLowerCase().includes("not found") || errStr.includes("Could not fetch")) {
        setStatusMessage("No update manifest (latest.json) found in GitHub release.")
      } else {
        setStatusMessage(`Could not check for updates: ${errStr}`)
      }
    } finally {
      setChecking(false)
    }
  }

  const handleDownloadAndInstall = async () => {
    if (!updateAvailable) return
    setDownloading(true)
    setProgress(0)
    setStatusMessage("Downloading update package...")

    try {
      let downloaded = 0
      let contentLength = 0

      await updateAvailable.downloadAndInstall((event: any) => {
        switch (event.event) {
          case "Started":
            contentLength = event.data.contentLength || 0
            setTotalBytes(contentLength)
            setStatusMessage("Starting update download...")
            break
          case "Progress":
            downloaded += event.data.chunkLength
            setDownloadedBytes(downloaded)
            if (contentLength > 0) {
              const pct = Math.round((downloaded / contentLength) * 100)
              setProgress(pct)
            }
            setStatusMessage(`Downloading... ${Math.round(downloaded / 1024 / 1024 * 10) / 10} MB`)
            break
          case "Finished":
            setProgress(100)
            setStatusMessage("Installation complete! Ready to relaunch.")
            setReadyToRelaunch(true)
            break
        }
      })

      setReadyToRelaunch(true)
      setStatusMessage("Update successfully installed. Click Relaunch to apply.")
    } catch (err: any) {
      console.error("Failed to download update:", err)
      setStatusMessage(`Download failed: ${err.message || "Unknown error"}`)
    } finally {
      setDownloading(false)
    }
  }

  const handleRelaunch = async () => {
    try {
      const { relaunch } = await import("@tauri-apps/plugin-process")
      await relaunch()
    } catch (err) {
      console.error("Failed to relaunch app:", err)
      // Fallback reload
      window.location.reload()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleCheckUpdate(true)}
          className="relative gap-2 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary font-bold transition-all shadow-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`} />
          <span>Updates</span>
          {updateAvailable && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md bg-white border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-extrabold text-primary">
            <Sparkles className="h-5 w-5 text-amber-500" />
            UPshop Software Updates
          </DialogTitle>
          <DialogDescription className="text-slate-500 font-medium">
            Keep UPshop updated with the latest features, security patches, and performance optimizations.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Installed Version</p>
              <p className="text-lg font-black text-slate-800 font-mono">v{currentVersion}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</p>
              {updateAvailable ? (
                <Badge className="bg-emerald-500 text-white font-bold">New v{updateAvailable.version} Available</Badge>
              ) : (
                <Badge variant="outline" className="text-slate-600 border-slate-200 font-bold">Latest</Badge>
              )}
            </div>
          </div>

          {updateAvailable && updateAvailable.body && (
            <div className="p-4 bg-amber-50/50 border border-amber-200/60 rounded-xl space-y-2">
              <p className="text-xs font-black text-amber-800 uppercase tracking-wider">Release Notes</p>
              <p className="text-xs text-amber-900 leading-relaxed font-medium max-h-32 overflow-y-auto whitespace-pre-wrap">
                {updateAvailable.body}
              </p>
            </div>
          )}

          {downloading && (
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs font-bold text-slate-600">
                <span>Downloading Update...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2.5 bg-slate-100" />
            </div>
          )}

          {statusMessage && (
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-100/70 p-3 rounded-lg">
              {readyToRelaunch ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : checking ? (
                <RefreshCw className="h-4 w-4 text-primary animate-spin shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-slate-500 shrink-0" />
              )}
              <span>{statusMessage}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            className="text-xs font-bold text-slate-500"
          >
            Close
          </Button>

          <div className="flex items-center gap-2">
            {!updateAvailable && (
              <Button
                onClick={() => handleCheckUpdate(true)}
                disabled={checking}
                className="gap-2 font-bold text-white bg-primary hover:bg-primary/95"
              >
                <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
                {checking ? "Checking..." : "Check Now"}
              </Button>
            )}

            {updateAvailable && !readyToRelaunch && (
              <Button
                onClick={handleDownloadAndInstall}
                disabled={downloading}
                className="gap-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md"
              >
                <Download className="h-4 w-4" />
                {downloading ? "Downloading..." : "Download & Install"}
              </Button>
            )}

            {readyToRelaunch && (
              <Button
                onClick={handleRelaunch}
                className="gap-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg animate-pulse"
              >
                <RefreshCw className="h-4 w-4" />
                Relaunch & Apply Update
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
