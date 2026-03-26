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
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'WaSiKa-App/1.0',
          'Accept-Language': 'id'
        },
        next: { revalidate: 86400 } // Cache results for 24h
      })
      
      if (response.ok) {
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
      }
    } catch (e) {
      console.warn('External geocoding failed, using fallback')
    }

    // Default Fallback to Jakarta if API fails or no results
    return NextResponse.json({
      lat: -6.2088,
      lng: 106.8456,
      displayName: 'Jakarta (Default Fallback)',
      fallback: true
    })

  } catch (error) {
    console.error('Geocoding error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
