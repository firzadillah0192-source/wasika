"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import type { BaniMembership, Bani, Profile } from "@/types/database"

export type UserRole = "anggota" | "panitia" | "superadmin"

interface User {
  id: string
  name: string
  role: UserRole
  baniId?: string
  rootBaniId?: string
  baniName?: string
  rootBaniName?: string
}

interface UserContextType {
  user: User | null
  profile: Profile | null
  memberships: BaniMembership[]
  primaryBani: Bani | null
  rootBani: Bani | null
  allBaniIds: string[]
  hasBaniAccess: (baniId: string) => boolean
  setUser: (user: User | null) => void
  isAuthenticated: boolean
  isLoading: boolean
  refresh: () => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [memberships, setMemberships] = useState<BaniMembership[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const syncUser = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('*, bani:banis(id, name, bani_level, parent_bani_id, bani_code, status, owner_id, description, location, created_at)')
          .eq('id', session.user.id)
          .single()

        // Fetch all bani memberships (graceful fallback if table doesn't exist yet)
        const { data: membershipData } = await supabase
          .from('bani_memberships')
          .select('*, bani:banis(id, name, bani_level, parent_bani_id, bani_code, status, owner_id, description, location, created_at)')
          .eq('user_id', session.user.id)
          .limit(50)

        const mems: BaniMembership[] = membershipData || []
        setMemberships(mems)

        if (prof) {
          setProfile(prof as any)
          
          const primaryMem = mems.find(m => m.membership_type === 'primary' || m.membership_type === 'pengelola')
          const rootMem = mems.find(m => m.bani?.bani_level === 0) 

          setUser({
            id: session.user.id,
            name: prof.full_name || session.user.email || '',
            role: prof.role as UserRole,
            baniId: prof.bani_id || undefined,
            rootBaniId: (prof as any).root_bani_id || undefined,
            baniName: primaryMem?.bani?.name || (prof as any).bani?.name,
            rootBaniName: rootMem?.bani?.name || (prof as any).bani?.name,
          })
        } else {
          setUser(null)
        }
      } else {
        setUser(null)
        setProfile(null)
        setMemberships([])
      }
    } catch (err) {
      console.error("Context sync error:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    syncUser()

    const supabase = createClient()
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        setMemberships([])
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        syncUser()
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [syncUser])

  const primaryBani = memberships.find(
    m => m.membership_type === 'primary' || m.membership_type === 'pengelola'
  )?.bani || null

  const rootBani = memberships
    .map(m => m.bani)
    .find(b => b?.bani_level === 0) || primaryBani || null

  const allBaniIds = memberships.map(m => m.bani_id)

  const hasBaniAccess = (baniId: string) =>
    memberships.some(m => m.bani_id === baniId)

  return (
    <UserContext.Provider value={{ 
      user, 
      profile: profile as any,
      memberships,
      primaryBani: primaryBani as any,
      rootBani: rootBani as any,
      allBaniIds,
      hasBaniAccess,
      setUser, 
      isAuthenticated: !!user, 
      isLoading,
      refresh: syncUser,
    }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}
