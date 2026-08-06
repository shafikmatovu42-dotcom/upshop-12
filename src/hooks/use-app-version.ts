"use client"

import { useState, useEffect } from "react"
import pkg from "../../package.json"

export function useAppVersion() {
  const [version, setVersion] = useState<string>(pkg.version || "1.0.0")

  useEffect(() => {
    async function fetchVersion() {
      try {
        if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
          const { getVersion } = await import("@tauri-apps/api/app")
          const appVer = await getVersion()
          if (appVer) setVersion(appVer)
        }
      } catch (e) {
        // Fallback to package.json version
      }
    }
    fetchVersion()
  }, [])

  return version
}
