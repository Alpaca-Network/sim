import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      error: 'Socket.IO server not available',
      message:
        'Real-time features require a separate Socket.IO server deployment. See DEPLOY_VERCEL.md for setup instructions.',
      fallback: true,
    },
    { status: 503 }
  )
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      error: 'Socket.IO server not available',
      message:
        'Real-time features require a separate Socket.IO server deployment. See DEPLOY_VERCEL.md for setup instructions.',
      fallback: true,
    },
    { status: 503 }
  )
}
