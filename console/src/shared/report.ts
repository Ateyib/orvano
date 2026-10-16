import type { ErrorInfo } from 'react'

// The one error reporter (spec 0003 FLT-4). It writes to the browser console until feature 47 defines a
// reporting endpoint; the console sends nothing to third party services.
export function reportConsoleError(error: unknown, errorInfo?: ErrorInfo): void {
  console.error(error, errorInfo?.componentStack)
}
