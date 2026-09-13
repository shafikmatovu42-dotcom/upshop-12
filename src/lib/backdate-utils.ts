"use client"

export interface BackdateSettings {
  enabled: boolean
  date: string // YYYY-MM-DD
}

export interface DayOption {
  value: string // YYYY-MM-DD
  label: string // e.g. "09/10/2026 THURSDAY (Yesterday)"
  displayTag: string // e.g. "09/10/2026 THURSDAY"
}

export function getBackdateSettings(): BackdateSettings {
  if (typeof window === "undefined") {
    return { enabled: false, date: "" }
  }
  try {
    const saved = localStorage.getItem("upshop_backdate_settings")
    if (saved) {
      const parsed = JSON.parse(saved)
      return {
        enabled: !!parsed.enabled,
        date: parsed.date || getTodayDateStr()
      }
    }
  } catch (e) {
    console.error("Failed to parse backdate settings:", e)
  }
  return { enabled: false, date: getTodayDateStr() }
}

export function setBackdateSettings(settings: BackdateSettings): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem("upshop_backdate_settings", JSON.stringify(settings))
    window.dispatchEvent(new Event("storage"))
    window.dispatchEvent(new Event("upshop_backdate_updated"))
  } catch (e) {
    console.error("Failed to save backdate settings:", e)
  }
}

export function getTodayDateStr(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatBackdateDisplay(dateStr: string): string {
  if (!dateStr) return ""
  try {
    const parts = dateStr.split('-')
    if (parts.length !== 3) return dateStr
    const year = parts[0]
    const month = parts[1]
    const day = parts[2]
    const d = new Date(Number(year), Number(month) - 1, Number(day))
    const daysOfWeek = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]
    const dayOfWeek = daysOfWeek[d.getDay()] || ""
    return `${month}/${day}/${year} ${dayOfWeek}`
  } catch (e) {
    return dateStr
  }
}

export function getPastSevenDaysOptions(): DayOption[] {
  const options: DayOption[] = []
  const now = new Date()

  for (let i = 0; i < 7; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)

    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const value = `${year}-${month}-${day}`

    const daysOfWeek = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]
    const dayOfWeek = daysOfWeek[d.getDay()]
    const displayTag = `${month}/${day}/${year} ${dayOfWeek}`

    let relativeLabel = ""
    if (i === 0) relativeLabel = "(Today)"
    else if (i === 1) relativeLabel = "(Yesterday)"
    else relativeLabel = `(${i} days ago)`

    options.push({
      value,
      label: `${displayTag} ${relativeLabel}`,
      displayTag
    })
  }

  return options
}

export function getActiveRecordingDate(): Date {
  const settings = getBackdateSettings()
  if (settings.enabled && settings.date) {
    try {
      const parts = settings.date.split('-')
      if (parts.length === 3) {
        const year = Number(parts[0])
        const month = Number(parts[1]) - 1
        const day = Number(parts[2])
        const d = new Date()
        d.setFullYear(year, month, day)
        return d
      }
    } catch (e) {
      console.error("Failed to construct active backdate:", e)
    }
  }
  return new Date()
}
