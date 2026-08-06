"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"

export function useKeyboardShortcuts() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. GLOBAL NAVIGATION (Alt + [1-8])
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const key = e.key
        let targetPath = ""

        switch (key) {
          case "1":
            targetPath = "/dashboard"
            break
          case "2":
            targetPath = "/sales"
            break
          case "3":
            targetPath = "/inventory"
            break
          case "4":
            targetPath = "/settings"
            break
          case "5":
            targetPath = "/store"
            break
          case "6":
            targetPath = "/returns"
            break
          case "7":
            targetPath = "/notifications"
            break
          case "8":
            targetPath = "/about"
            break
        }

        if (targetPath && pathname !== targetPath) {
          e.preventDefault()
          router.push(targetPath)
          return
        }
      }

      // Get active element info
      const activeEl = document.activeElement
      const isInputFocused =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "SELECT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.getAttribute("contenteditable") === "true")

      // 2. GLOBAL SEARCH FOCUS (Ctrl + F or '/' when not typing)
      if (
        (e.key === "/" && !isInputFocused) ||
        (e.ctrlKey && e.key.toLowerCase() === "f")
      ) {
        // Find search input on the page
        const searchInput = document.querySelector(
          'input[type="search"], input[placeholder*="search" i], .search-input'
        ) as HTMLInputElement

        if (searchInput) {
          e.preventDefault()
          searchInput.focus()
          searchInput.select()
          return
        }
      }

      // 3. SMART FOCUS TRAVERSAL (Enter / Shift + Enter inside forms or dialogs)
      if (e.key === "Enter" && isInputFocused) {
        // Skip for button elements, textareas (unless ctrl key is pressed), or if autocomplete dropdown is open
        if (activeEl?.tagName === "BUTTON") return
        if (activeEl?.tagName === "TEXTAREA" && !e.ctrlKey) return

        // Find nearest logical container
        const container =
          activeEl.closest("form") ||
          activeEl.closest('[role="dialog"]') ||
          activeEl.closest(".card") ||
          document.body

        if (container) {
          // Query all potentially focusable elements in logical order
          const selector = [
            "input:not([disabled]):not([type='hidden']):not([readonly]):not([type='submit'])",
            "select:not([disabled]):not([readonly])",
            "textarea:not([disabled]):not([readonly])",
            "button:not([disabled]):not([tabindex='-1'])",
          ].join(", ")

          const focusables = Array.from(
            container.querySelectorAll(selector)
          ) as HTMLElement[]

          // Filter focusable elements that are visible (width & height > 0)
          const visibleFocusables = focusables.filter((el) => {
            const rect = el.getBoundingClientRect()
            return rect.width > 0 && rect.height > 0
          })

          const currentIndex = visibleFocusables.indexOf(activeEl as HTMLElement)

          if (currentIndex !== -1) {
            e.preventDefault()
            
            if (e.shiftKey) {
              // Shift+Enter -> Go to previous field
              const prevIndex = currentIndex - 1
              if (prevIndex >= 0) {
                visibleFocusables[prevIndex].focus()
                if (visibleFocusables[prevIndex] instanceof HTMLInputElement) {
                  (visibleFocusables[prevIndex] as HTMLInputElement).select()
                }
              }
            } else {
              // Enter -> Go to next field
              const nextIndex = currentIndex + 1
              if (nextIndex < visibleFocusables.length) {
                visibleFocusables[nextIndex].focus()
                if (visibleFocusables[nextIndex] instanceof HTMLInputElement) {
                  (visibleFocusables[nextIndex] as HTMLInputElement).select()
                }
              } else {
                // If it's the last input, check if there's a primary submit button in the container and click it
                const primaryButton = container.querySelector(
                  "button[type='submit'], button.bg-primary, .primary-action-btn"
                ) as HTMLButtonElement

                if (primaryButton && primaryButton !== activeEl) {
                  primaryButton.click()
                }
              }
            }
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [router, pathname])
}
