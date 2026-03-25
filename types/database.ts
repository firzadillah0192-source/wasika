// types/database.ts

export interface Person {
  id: string
  name: string
  bani_id: string
  user_id?: string
  gender?: 'male' | 'female'
  birth_date?: string
  full_address?: string
  phone?: string
  latitude?: number
  longitude?: number
  city?: string
  province?: string
  created_at?: string
}

export interface Post {
  id: string
  bani_id: string
  person_id: string
  content: string | null
  media_urls: string[]
  media_types: ('image' | 'video')[]
  post_type: 'post' | 'repost' | 'quote'
  quoted_post_id: string | null
  created_at: string
  updated_at: string
  // joined fields
  person?: Person
  quoted_post?: Post
  reactions?: Reaction[]
  comments?: { count: number }[] | Comment[]
  reaction_count?: number
  comment_count?: number
  user_reaction?: string | null
  is_saved?: boolean
}

export interface Reaction {
  id: string
  post_id: string
  person_id: string
  emoji: string
  created_at: string
}

export interface Comment {
  id: string
  post_id: string
  person_id: string
  content: string
  created_at: string
  person?: Person
}

export interface SavedPost {
  id: string
  post_id: string
  person_id: string
  created_at: string
}
