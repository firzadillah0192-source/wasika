"use client"

import { useCallback, useState, useMemo, useEffect } from "react"
import Link from "next/link"
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  NodeProps,
  Handle,
  Position,
  useReactFlow,
  Panel,
} from "@xyflow/react"
import dagre from "dagre"
import "@xyflow/react/dist/style.css"
import { Search, FileText, X, User, Heart, Plus, ExternalLink, Calendar, ArrowRight, Edit3, Trash2 } from "lucide-react"
import { BottomNav } from "@/components/wasika/bottom-nav"

import { createClient } from "@/lib/supabase/client"
import { useSearchParams, useRouter } from "next/navigation"
import { useUser } from "@/context/user-context"

// Types
interface FamilyMember {
  id: string
  name: string
  gender?: string
  photo_url?: string
  user_id?: string
  bani_id?: string
  bani_name?: string
  bani_level?: number
  type: "regular" | "you" | "spouse" | "placeholder"
}

interface CustomNodeData extends Record<string, unknown> {
  label: string
  member: FamilyMember
  baniName?: string
  baniLevel?: number
}

type CustomNodeProps = NodeProps<Node<CustomNodeData>>

// Node Components
function RegularNode({ data }: CustomNodeProps) {
  const baniLevel = (data as any).baniLevel
  const baniName = (data as any).baniName
  return (
    <div className="relative group">
      <Handle type="target" position={Position.Top} className="opacity-0 w-full h-2" />
      <div className="bg-white border-2 border-wasika-copper rounded-xl px-4 py-3 min-w-[140px] text-center shadow-md cursor-pointer group-hover:shadow-lg transition-shadow">
        <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-wasika-cream flex items-center justify-center">
          <User className="w-5 h-5 text-wasika-copper" />
        </div>
        <p className="text-wasika-brown-dark font-medium text-sm truncate">{String(data.label)}</p>
        <p className="text-wasika-text-muted text-[10px] mt-0.5">{String((data as any).relationLabel || "")}</p>
        {baniLevel != null && baniLevel > 0 && baniName && (
          <span className="inline-block mt-1 text-[8px] font-bold px-1.5 py-0.5 rounded bg-wasika-gold/10 text-wasika-gold border border-wasika-gold/20">{baniName}</span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="opacity-0 w-full h-2" />
    </div>
  )
}

function YouNode({ data }: CustomNodeProps) {
  return (
    <div className="relative group">
      <Handle type="target" position={Position.Top} className="opacity-0 w-full h-2" />
      {/* Outer glow ring */}
      <div 
        className="absolute -inset-2 rounded-2xl opacity-60 blur-md animate-pulse"
        style={{ background: "radial-gradient(circle, rgba(212,168,67,0.5) 0%, rgba(212,168,67,0) 70%)" }}
      />
      <div 
        className="relative rounded-xl px-6 py-5 min-w-[192px] text-center shadow-xl cursor-pointer group-hover:shadow-2xl transition-shadow border-2 border-wasika-gold-light"
        style={{ 
          background: "linear-gradient(135deg, #cd7f32 0%, #d4a843 100%)",
          boxShadow: "0 0 20px rgba(212,168,67,0.4), 0 0 40px rgba(212,168,67,0.2)"
        }}
      >
        <div className="w-14 h-14 mx-auto mb-2.5 rounded-full bg-white/25 flex items-center justify-center ring-2 ring-white/30">
          <User className="w-7 h-7 text-white" />
        </div>
        <p className="text-white font-bold text-base truncate">{String(data.label)}</p>
        <span className="inline-flex items-center gap-1 mt-2 bg-wasika-gold-light/30 text-wasika-gold-light text-xs font-bold px-3 py-1 rounded-full">
          You <span className="text-xs">&#10022;</span>
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} className="opacity-0 w-full h-2" />
    </div>
  )
}

function SpouseNode({ data }: CustomNodeProps) {
  return (
    <div className="relative group">
      <Handle type="target" position={Position.Top} className="opacity-0 w-full h-2" />
      <div className="bg-wasika-cream border-2 border-wasika-gold rounded-xl px-4 py-3 min-w-[130px] text-center shadow-md cursor-pointer group-hover:shadow-lg transition-shadow">
        <div className="w-9 h-9 mx-auto mb-2 rounded-full bg-white flex items-center justify-center">
          <Heart className="w-4 h-4 text-wasika-gold" />
        </div>
        <p className="text-wasika-brown-dark font-medium text-sm truncate">{String(data.label)}</p>
        <span className="text-wasika-text-muted text-[10px]">
          {data.member?.gender === "male" ? "Suami" : data.member?.gender === "female" ? "Istri" : "Pasangan"}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} className="opacity-0 w-full h-2" />
    </div>
  )
}

function PlaceholderNode({ data }: CustomNodeProps) {
  return (
    <div className="relative group">
      <Handle type="target" position={Position.Top} className="opacity-0 w-full h-2" />
      <div className="bg-white/55 border-2 border-dashed border-wasika-copper/50 rounded-xl px-4 py-3 min-w-[120px] text-center cursor-pointer group-hover:border-wasika-copper group-hover:bg-white/70 transition-all">
        <div className="w-9 h-9 mx-auto mb-2 rounded-full border-2 border-dashed border-wasika-copper/40 flex items-center justify-center">
          <Plus className="w-4 h-4 text-wasika-copper/60" />
        </div>
        <p className="text-wasika-text-muted/70 text-sm">{String(data.label)}</p>
      </div>
      <Handle type="source" position={Position.Bottom} className="opacity-0 w-full h-2" />
    </div>
  )
}

const nodeTypes = {
  regular: RegularNode,
  you: YouNode,
  spouse: SpouseNode,
  placeholder: PlaceholderNode,
}

const nodeWidth = 200
const nodeHeight = 120

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))
  dagreGraph.setGraph({ rankdir: "TB", ranksep: 100, nodesep: 60 })

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight })
  })

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  const layoutedNodes = nodes.map((node, index) => {
    const nodeWithPosition = dagreGraph.node(node.id) || { x: index * 250, y: 100 }
    return {
      ...node,
      position: {
        x: (nodeWithPosition.x || index * 250) - nodeWidth / 2,
        y: (nodeWithPosition.y || 100) - nodeHeight / 2,
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}

export default function FamilyTreePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isManageMode = searchParams.get("manage") === "true"
  const { allBaniIds, memberships } = useUser()
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [bani, setBani] = useState<any>(null)
  const [activeEvent, setActiveEvent] = useState<any>(null)
  const [hasCheckedIn, setHasCheckedIn] = useState(false)
  const isManager = memberships.some(m => m.membership_type === 'pengelola') || userProfile?.role === 'panitia' || userProfile?.role === 'superadmin'

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.replace("/login")
      return
    }

    const { data: profile } = await (supabase.from("profiles").select("*, banis!profiles_bani_id_fkey(*)").eq("id", user.id).single() as any)
    
    // Sync role and bani_id if user is an owner of a bani
    const { data: ownedBani } = await supabase.from("banis").select("*").eq("owner_id", user.id).maybeSingle()
    if (ownedBani && profile) {
       // Force role to panitia if they own a bani
       if (profile.role !== 'panitia' || profile.role !== 'superadmin') {
          profile.role = 'panitia'
       }
       if (profile.bani_id !== ownedBani.id) {
          profile.bani_id = ownedBani.id
       }
       
       // Update DB quietly
       await supabase.from("profiles").update({ 
          role: 'panitia', 
          bani_id: ownedBani.id 
       }).eq("id", user.id)
       
       await supabase.from("persons").update({ 
          bani_id: ownedBani.id 
       }).eq("user_id", user.id)
    }

    setUserProfile(profile)
    setBani(profile?.banis || ownedBani)

    if (profile?.bani_id || ownedBani?.id) {
      const activeBaniId = profile?.bani_id || ownedBani?.id
      // Use all bani IDs from memberships for family-wide tree, fallback to single bani_id
      const baniIdsToFetch = allBaniIds.length > 0 ? allBaniIds : [activeBaniId]
      
      let allPersons: any[] = []
      let allRelations: any[] = []
      
      for (const bid of baniIdsToFetch) {
        const { data: ps } = await supabase.from("persons").select("*, bani:banis(id, name, bani_level)").eq("bani_id", bid)
        const { data: rs } = await supabase.from("relationships").select("*").eq("bani_id", bid)
        if (ps) allPersons = [...allPersons, ...ps]
        if (rs) allRelations = [...allRelations, ...rs]
      }
      
      // Deduplicate persons by ID AND by Name (fuzzy matching)
      // This solves the issue where the same person might exist twice due to historical data or multiple bani branches
      const persons = allPersons.filter((p, i, self) => {
        const firstById = self.findIndex(x => x.id === p.id)
        if (i !== firstById) return false
        
        // Also check for name duplicates (case-insensitive)
        // If a person with the same name already exists earlier in the array, skip this one
        const firstByName = self.findIndex(x => x.name.toLowerCase().trim() === p.name.toLowerCase().trim())
        if (i !== firstByName) return false
        
        return true
      })
      const relations = allRelations.filter((r, i, self) => i === self.findIndex(x => x.id === r.id))

      if (persons && relations) {
        const newNodes: Node[] = persons.map((p: any) => ({
          id: p.id,
          type: p.user_id === user.id ? "you" : (p.gender === "female" && relations.some((r: any) => r.related_person_id === p.id && r.type === "spouse") ? "spouse" : "regular"),
          data: { 
            label: p.name, 
            member: { ...p, bani_name: p.bani?.name, bani_level: p.bani?.bani_level },
            baniName: p.bani?.name,
            baniLevel: p.bani?.bani_level ?? 0
          },
          position: { x: 0, y: 0 },
        }))

        const newEdges: Edge[] = relations.map((r: any, idx: number) => {
          let source = r.person_id
          let target = r.related_person_id
          let isSpouse = r.type === "spouse"

          if (r.type === "parent") {
            // related is parent (above), person is child (below)
            source = r.related_person_id
            target = r.person_id
          } else if (r.type === "child") {
            // person is parent (above), related is child (below)
            source = r.person_id
            target = r.related_person_id
          }

          return {
            id: `e-${idx}`,
            source,
            target,
            type: "smoothstep",
            animated: isSpouse,
            style: { 
              stroke: isSpouse ? "#e11d48" : "rgba(139,69,19,0.35)", 
              strokeWidth: isSpouse ? 3 : 2 
            },
          }
        })

        const { nodes: lNodes, edges: lEdges } = getLayoutedElements(newNodes, newEdges)
        
        // Calculate generational levels relative to 'You' node
        const youNode = lNodes.find(n => n.type === 'you')
        if (youNode) {
          const depthMap: Record<string, number> = {}
          const queue: [string, number][] = [[youNode.id, 0]]
          depthMap[youNode.id] = 0
          
          while (queue.length > 0) {
            const [currId, level] = queue.shift()!
            // Upwards traversal (parents)
            lEdges.filter(e => e.target === currId).forEach(e => {
              if (depthMap[e.source] === undefined) {
                depthMap[e.source] = level + 1
                queue.push([e.source, level + 1])
              }
            })
            // Downwards traversal (children)
            lEdges.filter(e => e.source === currId).forEach(e => {
              if (depthMap[e.target] === undefined) {
                depthMap[e.target] = level - 1
                queue.push([e.target, level - 1])
              }
            })
          }
          
          const getTerm = (lvl: number) => {
             if (lvl === 0) return ""
             if (lvl === 1) return "Orang tua"
             if (lvl === 2) return "Kakek/Nenek"
             if (lvl === 3) return "Buyut"
             if (lvl === 4) return "Canggah"
             if (lvl === 5) return "Wareng"
             if (lvl === -1) return "Anak"
             if (lvl === -2) return "Cucu"
             if (lvl === -3) return "Cicit"
             return ""
          }
          
          lNodes.forEach(n => {
            if (depthMap[n.id] !== undefined) {
              (n.data as any).relationLabel = getTerm(depthMap[n.id])
            }
          })
        }

        setNodes(lNodes)
        setEdges(lEdges)
      }
    }
    setLoading(false)
  }, [router, setNodes, setEdges])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!userProfile?.bani_id) return
    
    // Realtime subscription
    const supabase = createClient()
    let timeoutId: NodeJS.Timeout
    
    const debouncedFetch = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        fetchData()
      }, 500)
    }

    const channel = supabase
      .channel(`family-tree-${userProfile.bani_id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "persons", filter: `bani_id=eq.${userProfile.bani_id}` }, () => debouncedFetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "relationships", filter: `bani_id=eq.${userProfile.bani_id}` }, () => debouncedFetch())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      clearTimeout(timeoutId)
    }
  }, [userProfile?.bani_id, fetchData])

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedMember(node.data.member as FamilyMember)
  }, [])

  const handleDelete = async (member: FamilyMember) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus ${member.name}? Seluruh data keturunan dan aktivitasnya akan ikut terhapus.`)) {
      return
    }
    
    try {
      const res = await fetch(`/api/persons/${member.id}`, {
        method: 'DELETE',
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Gagal menghapus anggota')
      }
      
      setSelectedMember(null)
      fetchData() // Refresh tree
    } catch (error: any) {
      alert(error.message)
    }
  }

  const youNode = useMemo(() => nodes.find(n => n.type === "you"), [nodes])
  const defaultViewport = useMemo(() => {
    if (youNode && typeof youNode.position.x === 'number' && !isNaN(youNode.position.x)) {
      return { x: -youNode.position.x + 150, y: -youNode.position.y + 200, zoom: 0.75 }
    }
    return { x: 50, y: 50, zoom: 0.75 }
  }, [youNode])

  const [searchQuery, setSearchQuery] = useState("")

  const searchResults = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return []
    return nodes.filter(n => 
      String(n.data.label).toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [searchQuery, nodes])

  const handleSearchSelect = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId)
    if (node) {
      setSelectedMember(node.data.member as FamilyMember)
      setShowSearch(false)
      setSearchQuery("")
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-wasika-cream flex flex-col pb-20">
        <div className="bg-wasika-dark px-5 py-4">
          <div className="h-6 w-48 bg-wasika-gold/20 rounded animate-pulse mb-3" />
          <div className="h-4 w-32 bg-wasika-gold/10 rounded animate-pulse" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="relative w-14 h-14 mx-auto mb-4">
              <div className="absolute inset-0 border-4 border-wasika-gold/20 rounded-full animate-pulse" />
              <div className="absolute inset-0 border-4 border-t-wasika-gold rounded-full animate-spin" />
            </div>
            <p className="text-wasika-gold font-serif animate-pulse">Membangun pohon keluarga...</p>
          </div>
        </div>
        <BottomNav />
      </main>
    )
  }

  return (
    <main className="h-screen bg-wasika-cream flex flex-col overflow-hidden">
      {/* Dark Header */}
      <div className="bg-wasika-dark px-5 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-serif text-xl text-wasika-gold">
            {bani?.name?.toLowerCase().startsWith("bani") ? "" : "Pohon Bani "}
            {bani?.name || "Keluarga"}
          </h1>
          <div className="flex gap-2">
            {isManager && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-bold animate-pulse">
                EDIT MODE
              </div>
            )}
            <button 
              onClick={() => setShowSearch(!showSearch)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-wasika-gold/40 text-wasika-gold text-sm hover:bg-wasika-gold/10 transition-colors"
            >
              <Search className="w-4 h-4" />
              Cari
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-wasika-gold/40 text-wasika-gold text-sm hover:bg-wasika-gold/10 transition-colors">
              <FileText className="w-4 h-4" />
              PDF
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-wasika-text-muted">
            <span className="text-wasika-gold font-semibold">{nodes.length}</span> anggota
          </span>
          <span className="text-wasika-text-muted italic text-xs">
            {bani?.description || "Silsilah warisan keluarga"}
          </span>
        </div>
        {/* Search Input */}
        {showSearch && (
          <div className="mt-3 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama anggota keluarga..."
              className="w-full bg-wasika-brown-dark/60 border border-wasika-gold/30 rounded-[11px] py-2.5 px-4 text-wasika-text-on-dark placeholder:text-wasika-text-muted/60 focus:outline-none focus:border-wasika-gold focus:ring-1 focus:ring-wasika-gold/50 text-base"
            />
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-wasika-text-muted/30 rounded-[11px] overflow-hidden shadow-lg z-50 max-h-48 overflow-y-auto">
                {searchResults.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => handleSearchSelect(node.id)}
                    className="w-full px-4 py-3 text-left hover:bg-wasika-cream transition-colors border-b border-wasika-text-muted/10 last:border-b-0 flex items-center gap-3"
                  >
                    <User className="w-4 h-4 text-wasika-copper flex-shrink-0" />
                    <span className="text-wasika-brown-dark text-sm">{String(node.data.label)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* React Flow Container */}
      <div className="flex-1 relative w-full h-full min-h-0">
        <ReactFlow
          style={{ width: '100%', height: '100%' }}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          defaultViewport={defaultViewport}
          minZoom={0.3}
          maxZoom={2}
          fitView={true}
          fitViewOptions={{ padding: 0.2 }}
          panOnScroll
          panOnDrag
          zoomOnScroll
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#c8a97a" gap={24} size={1} />
          <MiniMap 
            nodeColor={(node) => {
              if (node.type === "you") return "#d4a843"
              if (node.type === "spouse") return "#f5c842"
              if (node.type === "placeholder") return "#c8a97a"
              return "#cd7f32"
            }}
            maskColor="rgba(253, 246, 232, 0.8)"
            style={{ 
              backgroundColor: "#fdf6e8",
              border: "2px solid #c8a97a",
              borderRadius: "8px",
              bottom: 80,
            }}
          />
          <Controls 
            position="top-right"
            className="bg-wasika-cream border-wasika-gold/40 rounded-lg shadow-md"
          />
        </ReactFlow>

        {/* Floating Event Banner for Members */}
        {activeEvent && !hasCheckedIn && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm">
            <div className="bg-gradient-to-r from-wasika-brown-dark to-wasika-dark rounded-2xl p-4 shadow-2xl border border-wasika-gold/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-wasika-gold/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-wasika-gold" />
                </div>
                <div>
                   <p className="text-wasika-gold text-[10px] font-bold uppercase tracking-widest">Acara Hari Ini</p>
                   <p className="text-white font-medium text-sm line-clamp-1">{activeEvent.name}</p>
                </div>
              </div>
              <Link 
                href="/checkin"
                className="bg-wasika-gold hover:bg-wasika-gold-light text-wasika-brown-dark p-2.5 rounded-xl transition-all shadow-lg"
              >
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-20 left-4 bg-white/95 backdrop-blur-sm rounded-xl border border-wasika-text-muted/30 px-4 py-3 shadow-lg z-10">
          <p className="text-wasika-brown-dark text-xs font-medium mb-2">Legenda</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-wasika-copper bg-white" />
              <span className="text-wasika-text-muted text-xs">Anggota</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-wasika-copper to-wasika-gold" />
              <span className="text-wasika-text-muted text-xs">Anda</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-wasika-gold bg-wasika-cream" />
              <span className="text-wasika-text-muted text-xs">Pasangan</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-dashed border-wasika-copper/50 bg-white/50" />
              <span className="text-wasika-text-muted text-xs">Belum lengkap</span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Popup */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center sm:items-center">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div 
                    className={`w-14 h-14 rounded-full flex items-center justify-center ${
                      selectedMember.type === "you" 
                        ? "bg-gradient-to-br from-wasika-copper to-wasika-gold" 
                        : "bg-wasika-cream border-2 border-wasika-copper"
                    }`}
                  >
                    <User className={`w-7 h-7 ${selectedMember.type === "you" ? "text-white" : "text-wasika-copper"}`} />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg text-wasika-brown-dark">{selectedMember.name}</h3>
                    <p className="text-wasika-text-muted text-sm">{selectedMember.gender === "male" ? "Laki-laki" : "Perempuan"}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedMember(null)}
                  className="w-8 h-8 rounded-full bg-wasika-cream flex items-center justify-center hover:bg-wasika-text-muted/20 transition-colors"
                >
                  <X className="w-4 h-4 text-wasika-brown-dark" />
                </button>
              </div>
              
              {isManager ? (
                <div className="flex flex-col gap-3 mb-4">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => router.push(`/tree/edit?edit=${selectedMember.id}`)}
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-[11px] bg-wasika-brown-dark text-wasika-gold font-bold hover:bg-black transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit Data
                    </button>
                    <button
                      onClick={() => router.push(`/tree/edit?parentId=${selectedMember.id}`)}
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-[11px] bg-wasika-copper text-white font-bold hover:bg-wasika-copper/90 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Tambah Anak
                    </button>
                    <button
                      onClick={() => router.push(`/tree/edit?spouseId=${selectedMember.id}`)}
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-[11px] bg-rose-500 text-white font-bold hover:bg-rose-600 transition-colors"
                    >
                      <Heart className="w-4 h-4" />
                      Tambah Pasangan
                    </button>
                  </div>
                  <button
                    onClick={() => handleDelete(selectedMember)}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-[11px] bg-red-100/50 text-red-600 font-bold hover:bg-red-100 transition-colors border border-red-200"
                  >
                    <Trash2 className="w-4 h-4" />
                    Hapus Anggota
                  </button>
                </div>
              ) : null}

              <Link
                href={`/profile/${selectedMember.id}`}
                className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-[11px] bg-wasika-gold text-wasika-brown-dark font-bold hover:bg-wasika-gold-light transition-colors"
              >
                Lihat Profil Lengkap
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  )
}
