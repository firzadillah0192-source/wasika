import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string // 'image' | 'video'
    const baniId = formData.get('baniId') as string

    if (!file || !type || !baniId) {
      return NextResponse.json({ error: 'Missing file configuration' }, { status: 400 })
    }

    // Validate size: images max 10MB, video max 100MB
    const maxSize = type === 'video' ? 100 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File terlalu besar' }, { status: 400 })
    }

    const supabase = await createClient()
    const ext = file.name.split('.').pop()
    const fileName = `${baniId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('wasika-media')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error("Storage upload error:", uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('wasika-media')
      .getPublicUrl(fileName)

    return NextResponse.json({ url: publicUrl, type })
  } catch (err: any) {
    console.error("Upload route error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
