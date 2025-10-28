import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { env } from '@/lib/env'

function base64url(input: any): string {
  const base64 = (typeof input === 'string' ? Buffer.from(input) : Buffer.from(input))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
  return base64
}

function signHS256(data: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(data)
  return base64url(hmac.digest())
}

export async function POST() {
  try {
    const session = await getSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Token lifetime: 5 minutes
    const nowSec = Math.floor(Date.now() / 1000)
    const expSec = nowSec + 5 * 60

    const header = { alg: 'HS256', typ: 'JWT' }
    const payload = {
      sub: session.user.id,
      name: session.user.name || session.user.email || 'User',
      email: session.user.email,
      org: (session.session as any)?.activeOrganizationId || null,
      iat: nowSec,
      exp: expSec,
      // Token purpose scoping
      purpose: 'socket-auth',
    }

    const secret = env.BETTER_AUTH_SECRET || ''
    const encodedHeader = base64url(Buffer.from(JSON.stringify(header)))
    const encodedPayload = base64url(Buffer.from(JSON.stringify(payload)))
    const toSign = `${encodedHeader}.${encodedPayload}`
    const signature = signHS256(toSign, secret)
    const token = `${toSign}.${signature}`

    return NextResponse.json({ token }, { headers: { 'cache-control': 'no-store' } })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate socket token' }, { status: 500 })
  }
}
