import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getPeriodFromTimestamp(
  timestamp: string | undefined | null,
  isMonthMode: boolean,
  fallback?: string
): string {
  if (!timestamp) return fallback || (isMonthMode ? "January" : "Week 1");
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return fallback || (isMonthMode ? "January" : "Week 1");
    if (isMonthMode) {
      const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      return months[date.getMonth()];
    } else {
      const startOfYear = new Date(date.getFullYear(), 0, 1);
      const pastDays = (date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000);
      const weekNum = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);
      return `Week ${Math.min(52, Math.max(1, weekNum))}`;
    }
  } catch (e) {
    return fallback || (isMonthMode ? "January" : "Week 1");
  }
}

