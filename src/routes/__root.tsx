import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import React from 'react'

// Fix for "React is not defined" error in some environments
if (typeof window !== 'undefined') {
  ;(window as any).React = React
}

import type { QueryClient } from '@tanstack/react-query'
import { BetterSocialBroadcaster } from '../components/BetterSocialBroadcaster'
import { PageLoader } from '../components/PageLoader'
import appCss from '~/styles/app.css?url'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Better Social - Premium SMM Services',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico' },
    ],
  }),
  notFoundComponent: () => <div>Route not found</div>,
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      {/* Removed PageLoader temporarily to verify app functionality */}
      <React.Suspense>
        <BetterSocialBroadcaster />
      </React.Suspense>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-neutral-950">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
