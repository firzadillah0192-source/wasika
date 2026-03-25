import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Playfair_Display } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { UserProvider } from '@/context/user-context'
import './globals.css'

const geist = Geist({ 
  subsets: ["latin"],
  variable: '--font-geist'
})

const geistMono = Geist_Mono({ 
  subsets: ["latin"],
  variable: '--font-geist-mono'
})

const playfairDisplay = Playfair_Display({ 
  subsets: ["latin"],
  variable: '--font-playfair',
  weight: ['400', '500', '600', '700', '800', '900']
})

export const metadata: Metadata = {
  title: 'WaSiKa - Warisan Silsilah Keluarga',
  description: 'Platform warisan keluarga Indonesia untuk silaturahmi Eid. Jaga silsilah keluarga, temukan bani Anda.',
  keywords: ['silsilah', 'keluarga', 'Indonesia', 'Eid', 'warisan', 'bani', 'family tree'],
  icons: {
    icon: '/wasika-favicon.png',
    apple: '/wasika-favicon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#1c0e00',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className={`${geist.variable} ${geistMono.variable} ${playfairDisplay.variable} font-sans antialiased`}>
        <UserProvider>
          {children}
        </UserProvider>
        <Analytics />
      </body>
    </html>
  )
}
