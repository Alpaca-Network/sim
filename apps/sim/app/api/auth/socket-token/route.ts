import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createLogger } from '@/lib/logs/console/logger'

const logger = createLogger('SocketToken')

export async function POST() {
  try {
    const hdrs = await headers()
    const response = await auth.api.generateOneTimeToken({
      headers: hdrs,
    })

    if (!response) {
      logger.error('Failed to generate socket token - no response from auth API')
      return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 })
    }

    return NextResponse.json({ token: response.token })
  } catch (error) {
    logger.error('Error generating socket token:', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
    })
    
    // Return more specific error if it's an auth issue
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 })
  }
}
