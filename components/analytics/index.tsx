'use client'

import { Suspense } from 'react'
import { GoogleAnalyticsInit, GoogleAnalyticsPageView } from './GoogleAnalytics'

export function Analytics() {
  return (
    <Suspense fallback={null}>
      <GoogleAnalyticsInit />
      <GoogleAnalyticsPageView />
    </Suspense>
  )
}

export { trackEvent, AnalyticsEvents } from './GoogleAnalytics'
