import { NextResponse } from 'next/server'
import QRCode from 'qrcode'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const text = searchParams.get('text')
  const baniId = searchParams.get('baniId') || text
  const eventId = searchParams.get('eventId')

  if (!baniId) {
    return NextResponse.json({ error: 'baniId or text is required' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  // Use the text as is if it's already a full URL, or build the join URL
  const joinUrl = baniId.startsWith('http') 
    ? baniId 
    : `${appUrl}/join?baniId=${baniId}${eventId ? `&eventId=${eventId}` : ''}`

  try {
    // We want to return a direct image buffer for img src
    const qrBuffer = await QRCode.toBuffer(joinUrl, {
      type: 'png',
      width: 400,
      margin: 2,
    })

    return new Response(qrBuffer as any, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    })
  } catch (error) {
    console.error('QR code generation error:', error)
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 })
  }
}
