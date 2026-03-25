import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'Geocode API is active' })
}

export async function POST(request: Request) {
  try {
    const { address } = await request.json()
    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 })
    }

    const nominatimUrl = process.env.NEXT_PUBLIC_NOMINATIM_URL || 'https://nominatim.openstreetmap.org'
    const url = `${nominatimUrl}/search?q=${encodeURIComponent(address)}&format=json&limit=1&addressdetails=1`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'WaSiKa-App/1.0'
      }
    })
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Geocoding failed' }, { status: response.status })
    }

    const results = await response.json()
    
    if (results && results.length > 0) {
      const { lat, lon, display_name, address: addrDetails } = results[0]
      return NextResponse.json({
        lat: parseFloat(lat),
        lng: parseFloat(lon),
        displayName: display_name,
        addressDetails: addrDetails
      })
    }

    return NextResponse.json({ error: 'No results found' }, { status: 404 })
  } catch (error) {
    console.error('Geocoding error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
