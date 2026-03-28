"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useUser } from "@/context/user-context"
import { TreePine, Sparkles, User, Map, MessageCircle, LayoutDashboard } from "lucide-react"

const baseNavItems = [
  { href: "/tree", icon: TreePine, label: "Pohon" },
  { href: "/activities", icon: Sparkles, label: "Cerita" },
  { href: "/profile", icon: User, label: "Profil" },
  { href: "/map", icon: Map, label: "Peta" },
  { href: "/forum", icon: MessageCircle, label: "Forum" },
]

const panitiaNavItem = {
  href: "/panitia",
  icon: LayoutDashboard,
  label: "Pengelola",
}

export function BottomNav() {
  const pathname = usePathname()
  const { user, memberships, isLoading } = useUser()

  // Wait until loading is finished to avoid menu flicker/wrong menu
  if (isLoading) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 pb-safe bg-[#1c0e00] h-[64px] border-t border-[#d4a843]/25">
        <div className="w-full h-full flex items-center justify-center opacity-20" />
      </nav>
    )
  }

  const userRole = user?.role || 'anggota'
  const isManagement = userRole === "panitia" || userRole === "superadmin" || memberships.some(m => m.membership_type === 'pengelola')

  const displayItems = isManagement 
    ? [...baseNavItems, panitiaNavItem]
    : baseNavItems

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 pb-safe"
      style={{
        background: "#1c0e00",
        borderTop: "1px solid rgba(212, 168, 67, 0.25)",
        height: "64px",
      }}
    >
      {displayItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-0.5 px-0.5 py-1 min-w-[38px]"
          >
            <div className="relative">
              <Icon
                size={22}
                style={{ color: isActive ? "#d4a843" : "#c8a97a", opacity: isActive ? 1 : 0.6 }}
                strokeWidth={isActive ? 2 : 1.5}
              />
              {isActive && (
                <span
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                  style={{ background: "#d4a843" }}
                />
              )}
            </div>
            <span
              className="text-[9px] font-medium"
              style={{ color: isActive ? "#d4a843" : "#c8a97a", opacity: isActive ? 1 : 0.6 }}
            >
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
