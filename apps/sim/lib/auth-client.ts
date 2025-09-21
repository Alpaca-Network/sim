import { useContext } from 'react'
import { stripeClient } from '@better-auth/stripe/client'
import {
  customSessionClient,
  emailOTPClient,
  genericOAuthClient,
  organizationClient,
} from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import type { auth } from '@/lib/auth'
import { env, getEnv } from '@/lib/env'
import { isProd } from '@/lib/environment'
import { SessionContext, type SessionHookResult } from '@/lib/session/session-context'

export function getBaseURL() {
  // Prefer explicit Better Auth URL, else public app URL, else window origin, else localhost
  const betterAuthUrl = env.BETTER_AUTH_URL || getEnv('BETTER_AUTH_URL')
  if (betterAuthUrl) return betterAuthUrl

  const publicUrl = getEnv('NEXT_PUBLIC_APP_URL')
  if (publicUrl) return publicUrl

  if (typeof window !== 'undefined') return window.location.origin

  return 'http://localhost:3000'
}

export const client = createAuthClient({
  baseURL: getBaseURL(),
  plugins: [
    emailOTPClient(),
    genericOAuthClient(),
    customSessionClient<typeof auth>(),
    // Only include Stripe client in production
    ...(isProd
      ? [
          stripeClient({
            subscription: true, // Enable subscription management
          }),
        ]
      : []),
    organizationClient(),
  ],
})

export function useSession(): SessionHookResult {
  const ctx = useContext(SessionContext)
  if (!ctx) {
    throw new Error(
      'SessionProvider is not mounted. Wrap your app with <SessionProvider> in app/layout.tsx.'
    )
  }
  return ctx
}

export const { useActiveOrganization } = client

export const useSubscription = () => {
  return {
    list: client.subscription?.list,
    upgrade: client.subscription?.upgrade,
    cancel: client.subscription?.cancel,
    restore: client.subscription?.restore,
  }
}

export const { signIn, signUp, signOut } = client
