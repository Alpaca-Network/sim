import type { Socket } from 'socket.io'
import { auth } from '@/lib/auth'
import { env } from '@/lib/env'
import { createLogger } from '@/lib/logs/console/logger'

function decodeBase64Url(input: string): Buffer {
  input = input.replace(/-/g, '+').replace(/_/g, '/')
  const pad = input.length % 4
  if (pad) input += '='.repeat(4 - pad)
  return Buffer.from(input, 'base64')
}

function verifyHs256Jwt(token: string, secret: string): any | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [encodedHeader, encodedPayload, signature] = parts
    const header = JSON.parse(decodeBase64Url(encodedHeader).toString('utf8'))
    if (header.alg !== 'HS256') return null

    const crypto = require('crypto') as typeof import('crypto')
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(`${encodedHeader}.${encodedPayload}`)
    const expected = hmac.digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    if (expected !== signature) return null

    const payload = JSON.parse(decodeBase64Url(encodedPayload).toString('utf8'))
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && now >= payload.exp) return null
    return payload
  } catch {
    return null
  }
}

const logger = createLogger('SocketAuth')

// Extend Socket interface to include user data
export interface AuthenticatedSocket extends Socket {
  userId?: string
  userName?: string
  userEmail?: string
  activeOrganizationId?: string
}

// Enhanced authentication middleware
export async function authenticateSocket(socket: AuthenticatedSocket, next: any) {
  try {
    // Extract authentication data from socket handshake
    const token = socket.handshake.auth?.token
    const origin = socket.handshake.headers.origin
    const referer = socket.handshake.headers.referer

    logger.info(`Socket ${socket.id} authentication attempt:`, {
      hasToken: !!token,
      origin,
      referer,
    })

    if (!token) {
      logger.warn(`Socket ${socket.id} rejected: No authentication token found`)
      return next(new Error('Authentication required'))
    }

    // Validate one-time token with Better Auth
    try {
      logger.debug(`Attempting token validation for socket ${socket.id}`, {
        tokenLength: token?.length || 0,
        origin,
      })

      const session = await auth.api.verifyOneTimeToken({
        body: {
          token,
        },
      })

      if (!session?.user?.id) {
        logger.warn(`Socket ${socket.id} rejected: Invalid token - no user found`)
        return next(new Error('Invalid session'))
      }

      // Store user info in socket for later use
      socket.userId = session.user.id
      socket.userName = session.user.name || session.user.email || 'Unknown User'
      socket.userEmail = session.user.email
      socket.activeOrganizationId = session.session.activeOrganizationId || undefined

      next()
    } catch (tokenError) {
      // Fallback: accept locally issued HS256 JWT from /api/auth/socket-token
      const payload = verifyHs256Jwt(token, env.BETTER_AUTH_SECRET || '')
      if (payload?.sub) {
        socket.userId = payload.sub
        socket.userName = payload.name || payload.email || 'Unknown User'
        socket.userEmail = payload.email
        socket.activeOrganizationId = payload.org || undefined
        logger.info(`Socket ${socket.id} authenticated via local JWT fallback`)
        return next()
      }

      const errorMessage = tokenError instanceof Error ? tokenError.message : String(tokenError)
      const errorStack = tokenError instanceof Error ? tokenError.stack : undefined

      logger.warn(`Token validation failed for socket ${socket.id}:`, {
        error: errorMessage,
        stack: errorStack,
        origin,
        referer,
      })
      return next(new Error('Token validation failed'))
    }
  } catch (error) {
    logger.error(`Socket authentication error for ${socket.id}:`, error)
    next(new Error('Authentication failed'))
  }
}
