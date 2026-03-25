"use client"
import { useState, useRef, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Send, Calendar, ArrowRight, CheckCircle2 } from "lucide-react"
import { BottomNav } from "@/components/wasika/bottom-nav"
import Link from "next/link"

interface Message {
  id: string
  senderId: string
  senderName: string
  content: string
  timestamp: Date
}

function getInitials(name: string): string {
  if (!name) return ".."
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
}

export default function ForumPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [userProfile, setUserProfile] = useState<any>(null)
  const [person, setPerson] = useState<any>(null)
  const [activeEvent, setActiveEvent] = useState<any>(null)
  const [hasCheckedIn, setHasCheckedIn] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchMessages = useCallback(async (baniId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from("forum_messages")
      .select("*, persons(name)")
      .eq("bani_id", baniId)
      .order("created_at", { ascending: true })
      .limit(50)
    
    if (data) {
      const msgs: Message[] = data.map((m: any) => ({
        id: m.id,
        senderId: m.person_id,
        senderName: m.persons?.name || "Keluarga",
        content: m.content,
        timestamp: new Date(m.created_at)
      }))
      setMessages(msgs)
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace("/login")
        return
      }

      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
      setUserProfile(profile)

      if (profile?.bani_id) {
        fetchMessages(profile.bani_id)
        
        // Fetch person
        const { data: personData } = await supabase.from("persons").select("*").eq("user_id", user.id).single()
        setPerson(personData)

        // Fetch latest upcoming event (today or future)
        const today = new Date().toISOString().split("T")[0]
        const { data: events } = await supabase
          .from("events")
          .select("*")
          .eq("bani_id", profile.bani_id)
          .gte("date", today)
          .order("date", { ascending: true })
          .limit(1)

        if (events?.[0] && personData) {
          setActiveEvent(events[0])
          // Check checkin ONLY if it is today
          if (events[0].date === today) {
            const { count } = await supabase.from("mood_checkins").select("*", { count: "exact", head: true }).eq("event_id", events[0].id).eq("person_id", personData.id)
            setHasCheckedIn(!!count)
          }
        }
      }
    }
    
    init()
  }, [router, fetchMessages])

  useEffect(() => {
    if (!userProfile?.bani_id) return
    
    const supabase = createClient()
    const channel = supabase
      .channel(`forum-${userProfile.bani_id}`)
      .on("postgres_changes", { 
        event: "INSERT", 
        schema: "public", 
        table: "forum_messages", 
        filter: `bani_id=eq.${userProfile.bani_id}` 
      }, () => {
        fetchMessages(userProfile.bani_id)
      })
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userProfile?.bani_id, fetchMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async () => {
    if (!newMessage.trim() || !userProfile?.bani_id || !person?.id) return

    const supabase = createClient()
    const content = newMessage.trim()
    setNewMessage("")

    await supabase.from("forum_messages").insert({
      bani_id: userProfile.bani_id,
      person_id: person.id,
      content: content
    })

    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const baniName = userProfile?.banis?.name || "Keluarga"
  const currentUserId = person?.id || "temp"

  return (
    <main className="min-h-screen bg-wasika-cream flex flex-col pb-20">
      {/* Dark Header */}
      <div className="bg-wasika-dark px-5 py-4 sticky top-0 z-40">
        <h1 className="font-serif text-xl text-wasika-gold">
          Forum Bani {baniName}
        </h1>
        <p className="text-wasika-text-muted text-sm mt-0.5">
          Siapapun bisa berdiskusi
        </p>

        {activeEvent && (
          <div className="mt-3">
            <div className={`rounded-xl p-3 border flex items-center justify-between transition-all ${
              hasCheckedIn 
                ? "bg-green-500/10 border-green-500/30" 
                : activeEvent.date === new Date().toISOString().split("T")[0]
                ? "bg-wasika-gold/15 border-wasika-gold/40 shadow-lg shadow-wasika-gold/5"
                : "bg-white/5 border-white/10"
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                  hasCheckedIn ? "bg-green-500/20" 
                  : activeEvent.date === new Date().toISOString().split("T")[0]
                  ? "bg-wasika-gold/20"
                  : "bg-white/10"
                }`}>
                  <Calendar className={`w-4 h-4 ${
                    hasCheckedIn ? "text-green-400" 
                    : activeEvent.date === new Date().toISOString().split("T")[0]
                    ? "text-wasika-gold"
                    : "text-wasika-text-muted"
                  }`} />
                </div>
                <div>
                   <p className={`${
                     hasCheckedIn ? "text-green-400" 
                     : activeEvent.date === new Date().toISOString().split("T")[0]
                     ? "text-wasika-gold"
                     : "text-wasika-text-muted"
                   } text-[9px] font-black uppercase tracking-widest`}>
                    {hasCheckedIn ? "ANDA SUDAH HADIR" 
                     : activeEvent.date === new Date().toISOString().split("T")[0]
                     ? "ACARA HARI INI"
                     : "Rencana Mendatang"}
                   </p>
                   <p className="text-white font-medium text-xs line-clamp-1">{activeEvent.name}</p>
                   {activeEvent.date !== new Date().toISOString().split("T")[0] && (
                     <p className="text-wasika-text-muted text-[10px]">
                      {new Date(activeEvent.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}
                     </p>
                   )}
                </div>
              </div>
              
              {hasCheckedIn ? (
                <div className="bg-green-500/20 p-2 rounded-lg text-green-400">
                  <CheckCircle2 size={18} />
                </div>
              ) : activeEvent.date === new Date().toISOString().split("T")[0] ? (
                <Link 
                  href="/checkin"
                  className="bg-wasika-gold hover:bg-wasika-gold-light text-wasika-brown-dark px-3 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all"
                >
                  CHECK-IN <ArrowRight size={12} />
                </Link>
              ) : (
                <div className="bg-white/5 px-3 py-1.5 rounded-lg text-wasika-text-muted text-[9px] font-bold">
                  REMINDER
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">
        {messages.map((message) => {
          const isOwn = message.senderId === currentUserId

          return (
            <div
              key={message.id}
              className={`flex gap-2.5 ${isOwn ? "flex-row-reverse" : ""}`}
            >
              {/* Avatar */}
              {!isOwn && (
                <div className="w-9 h-9 rounded-full bg-wasika-copper/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-wasika-copper text-xs font-bold">
                    {getInitials(message.senderName)}
                  </span>
                </div>
              )}

              {/* Bubble */}
              <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
                {/* Name & Time */}
                <div className={`flex items-center gap-2 mb-1 ${isOwn ? "justify-end" : ""}`}>
                  {!isOwn && (
                    <span className="text-wasika-brown-dark text-xs font-medium">
                      {message.senderName}
                    </span>
                  )}
                  <span className="text-wasika-text-muted text-[10px]">
                    {formatTime(message.timestamp)}
                  </span>
                </div>

                {/* Message Content */}
                <div
                  className={`rounded-2xl px-4 py-2.5 ${
                    isOwn
                      ? "bg-wasika-brown-dark text-wasika-text-on-dark rounded-br-md"
                      : "bg-white text-wasika-brown-dark border border-wasika-text-muted/20 rounded-bl-md"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="fixed bottom-[72px] left-0 right-0 bg-wasika-cream border-t border-wasika-text-muted/20 px-4 py-3">
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tulis pesan..."
            className="flex-1 bg-white border border-wasika-text-muted/30 rounded-full py-2.5 px-4 text-wasika-brown-dark placeholder:text-wasika-text-muted/60 focus:outline-none focus:border-wasika-gold focus:ring-1 focus:ring-wasika-gold/50 text-base"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="w-11 h-11 rounded-full bg-wasika-gold flex items-center justify-center hover:bg-wasika-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5 text-wasika-brown-dark" />
          </button>
        </div>
      </div>

      <BottomNav />
    </main>
  )
}
