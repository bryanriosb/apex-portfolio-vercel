'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import ReactGA from 'react-ga4'

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

export function GoogleAnalyticsInit() {
  useEffect(() => {
    if (GA_MEASUREMENT_ID) {
      ReactGA.initialize(GA_MEASUREMENT_ID, {
        gaOptions: {
          anonymizeIp: true,
        },
      })
    }
  }, [])

  return null
}

export function GoogleAnalyticsPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return

    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')

    ReactGA.send({
      hitType: 'pageview',
      page: url,
      title: document.title,
    })
  }, [pathname, searchParams])

  return null
}

// Utility functions for tracking events
export const trackEvent = (
  action: string,
  category: string,
  label?: string,
  value?: number
) => {
  if (!GA_MEASUREMENT_ID) return

  ReactGA.event({
    action,
    category,
    label,
    value,
  })
}

// Predefined events for common actions
export const AnalyticsEvents = {
  // CTA clicks
  clickCTA: (ctaName: string, location: string) => {
    trackEvent('click', 'CTA', `${ctaName} - ${location}`)
  },

  // Sign up funnel
  startSignUp: () => {
    trackEvent('begin_sign_up', 'Conversion')
  },

  completeSignUp: () => {
    trackEvent('sign_up', 'Conversion')
  },

  // Pricing interactions
  viewPricing: () => {
    trackEvent('view_item_list', 'Pricing')
  },

  selectPlan: (planName: string, price: number) => {
    trackEvent('select_item', 'Pricing', planName, price)
  },

  // Feature exploration
  viewFeature: (featureName: string) => {
    trackEvent('view_item', 'Features', featureName)
  },

  // Contact/Support
  clickWhatsApp: () => {
    trackEvent('click', 'Contact', 'WhatsApp Support')
  },

  // FAQ interactions
  expandFAQ: (question: string) => {
    trackEvent('expand', 'FAQ', question)
  },

  // Scroll depth
  scrollDepth: (percentage: number) => {
    trackEvent('scroll', 'Engagement', `${percentage}%`, percentage)
  },
}
