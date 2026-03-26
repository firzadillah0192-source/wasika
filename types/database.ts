// types/database.ts

export interface Bani {
  id: string
  name: string
  description: string | null
  location: string | null
  bani_code: string
  status: 'pending' | 'active' | 'suspended'
  owner_id: string
  parent_bani_id: string | null  // null = root/bani utama
  bani_level: number             // 0 = root, 1 = sub, 2 = sub-sub
  created_at: string
  // joined fields
  parent_bani?: Bani
  sub_banis?: Bani[]
  member_count?: number
}

export interface BaniMembership {
  id: string
  user_id: string
  bani_id: string
  membership_type: 'primary' | 'inherited' | 'pengelola'
  joined_at: string
  bani?: Bani
}

export interface Profile {
  id: string
  full_name: string | null
  email: string | null
  role: 'anggota' | 'panitia' | 'superadmin'
  bani_id: string | null       // primary bani (tempat daftar)
  root_bani_id: string | null  // bani utama (root ancestor)
  created_at: string
  // joined
  bani?: Bani
  root_bani?: Bani
  memberships?: BaniMembership[]
}

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
  // joined
  bani?: Pick<Bani, 'id' | 'name' | 'bani_level'>
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
  bani?: Pick<Bani, 'id' | 'name' | 'bani_level' | 'parent_bani_id'>
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
