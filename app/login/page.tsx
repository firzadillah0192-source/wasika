"use client"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { BatikParang } from "@/components/wasika/batik-parang"
import { WaSiKaLogo } from "@/components/wasika/wasika-logo"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Users, PartyPopper, Eye, EyeOff } from "lucide-react"

function LoginContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialMode = searchParams.get("mode") === "register" ? "register" : "login"
  const urlBaniCode = searchParams.get("bani") || ""
  
  // If there's a bani code in URL, enforce joining as "anggota" 
  const initialRole = urlBaniCode ? "anggota" : (searchParams.get("role") as "anggota" | "panitia" | null)

  const [activeTab, setActiveTab] = useState<"login" | "register">(initialMode || (urlBaniCode ? "register" : "login"))
  const [selectedRole, setSelectedRole] = useState<"anggota" | "panitia">(initialRole || "anggota")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Form states
  const [loginForm, setLoginForm] = useState({ email: "", password: "" })
  const [registerForm, setRegisterForm] = useState({
    nama: "",
    email: "",
    password: "",
    confirmPassword: "",
    baniCode: urlBaniCode,
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleGoogleSSO = async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/checkin`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: loginForm.email,
      password: loginForm.password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.replace("/checkin")
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (registerForm.password !== registerForm.confirmPassword) {
      setError("Password tidak cocok")
      return
    }
    if (registerForm.password.length < 6) {
      setError("Password minimal 6 karakter")
      return
    }
    setError(null)
    setLoading(true)

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: registerForm.email,
          password: registerForm.password,
          nama: registerForm.nama,
          role: selectedRole,
          baniCode: registerForm.baniCode,
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || "Pendaftaran gagal.")
        setLoading(false)
        return
      }

      // Try auto-login
      const supabase = createClient()
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: registerForm.email,
        password: registerForm.password,
      })

      if (loginError) {
        setSuccess("Akun berhasil dibuat! Silakan login secara manual.")
        setActiveTab("login")
        setLoading(false)
        return
      }

      // If registration is successful and auto-login works, redirect.
      // For "anggota", redirect to /checkin.
      // For "panitia", redirect to /join to create a family.
      if (selectedRole === "panitia") {
        router.replace("/join") // Panitia creates their family in the /join wizard after successful registration
      } else {
        router.replace("/checkin")
      }
    } catch (err) {
      console.error("Register error:", err)
      setError("Terjadi kesalahan jaringan.")
      setLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen bg-wasika-dark overflow-hidden">
      <BatikParang />

      <div className="relative z-10 min-h-screen px-6 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-wasika-text-muted hover:text-wasika-gold transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Kembali</span>
        </Link>

        <div className="flex flex-col items-center mb-6">
          <WaSiKaLogo size={56} className="mb-2" />
          <h1 className="text-xl font-bold text-wasika-gold font-serif">WaSiKa</h1>
          <p className="text-wasika-text-muted text-sm mt-1">Warisan Silsilah Keluarga</p>
        </div>

        {/* Messages */}
        {error && (
          <div className="max-w-sm mx-auto mb-4 bg-red-500/20 border border-red-500/40 rounded-[11px] px-4 py-3 text-center">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}
        {success && (
          <div className="max-w-sm mx-auto mb-4 bg-green-500/20 border border-green-500/40 rounded-[11px] px-4 py-3 text-center">
            <p className="text-green-300 text-sm">{success}</p>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="max-w-sm mx-auto mb-8">
          <div className="flex bg-wasika-brown-dark/60 rounded-[11px] p-1">
            <button
              onClick={() => { setActiveTab("login"); setError(null) }}
              className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all ${
                activeTab === "login"
                  ? "bg-wasika-gold text-wasika-brown-dark"
                  : "text-wasika-text-muted hover:text-wasika-text-on-dark"
              }`}
            >
              Masuk
            </button>
            <button
              onClick={() => { setActiveTab("register"); setError(null) }}
              className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all ${
                activeTab === "register"
                  ? "bg-wasika-gold text-wasika-brown-dark"
                  : "text-wasika-text-muted hover:text-wasika-text-on-dark"
              }`}
            >
              Daftar baru
            </button>
          </div>
        </div>

        {/* Login Tab */}
        {activeTab === "login" && (
          <div className="max-w-sm mx-auto">
            <button
              onClick={handleGoogleSSO}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-800 font-medium py-3.5 px-4 rounded-[11px] transition-colors mb-6 disabled:opacity-50"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Lanjutkan dengan Google
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-wasika-gold/30" />
              <span className="text-wasika-text-muted text-sm">atau</span>
              <div className="flex-1 h-px bg-wasika-gold/30" />
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-wasika-text-muted text-sm mb-2">Email</label>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  placeholder="nama@email.com"
                  className="w-full bg-wasika-brown-dark/60 border border-wasika-gold/30 rounded-[11px] py-3.5 px-4 text-wasika-text-on-dark placeholder:text-wasika-text-muted/60 focus:outline-none focus:border-wasika-gold focus:ring-1 focus:ring-wasika-gold/50 text-base"
                  required
                />
              </div>
              <div>
                <label className="block text-wasika-text-muted text-sm mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    placeholder="Masukkan password"
                    className="w-full bg-wasika-brown-dark/60 border border-wasika-gold/30 rounded-[11px] py-3.5 px-4 pr-12 text-wasika-text-on-dark placeholder:text-wasika-text-muted/60 focus:outline-none focus:border-wasika-gold focus:ring-1 focus:ring-wasika-gold/50 text-base"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-wasika-text-muted hover:text-wasika-gold"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-wasika-gold hover:bg-wasika-gold-light text-wasika-brown-dark font-bold py-3.5 px-4 rounded-[11px] transition-colors mt-6 disabled:opacity-50"
              >
                {loading ? "Memproses..." : "Masuk"}
              </button>
            </form>
          </div>
        )}

        {/* Register Tab */}
        {activeTab === "register" && (
          <div className="max-w-sm mx-auto">
            {/* Contextual Header based on Role */}
            <div className="mb-6 text-center">
              <h2 className="text-wasika-gold font-bold text-lg">
                Daftar sebagai {selectedRole === "panitia" ? "Pengelola Keluarga" : "Anggota Keluarga"}
              </h2>
              <p className="text-wasika-text-muted text-xs mt-1">
                {selectedRole === "panitia"
                  ? "Pembuatan data keluarga dapat dilakukan setelah login."
                  : "Bergabung bersama keluarga besar Anda."}
              </p>
            </div>

            {/* Google Signup Button */}
            <button
              onClick={handleGoogleSSO}
              type="button"
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-800 font-medium py-3.5 px-4 rounded-[11px] transition-colors mb-6 disabled:opacity-50"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Daftar dengan Google
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-wasika-gold/20" />
              <span className="text-wasika-text-muted text-xs">Atau gunakan email</span>
              <div className="flex-1 h-px bg-wasika-gold/20" />
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-wasika-text-muted text-sm mb-2">Nama Lengkap</label>
                <input
                  type="text"
                  value={registerForm.nama}
                  onChange={(e) => setRegisterForm({ ...registerForm, nama: e.target.value })}
                  placeholder="Nama lengkap Anda"
                  className="w-full bg-wasika-brown-dark/60 border border-wasika-gold/30 rounded-[11px] py-3.5 px-4 text-wasika-text-on-dark placeholder:text-wasika-text-muted/60 focus:outline-none focus:border-wasika-gold focus:ring-1 focus:ring-wasika-gold/50 text-base"
                  required
                />
              </div>
              <div>
                <label className="block text-wasika-text-muted text-sm mb-2">Email</label>
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  placeholder="nama@email.com"
                  className="w-full bg-wasika-brown-dark/60 border border-wasika-gold/30 rounded-[11px] py-3.5 px-4 text-wasika-text-on-dark placeholder:text-wasika-text-muted/60 focus:outline-none focus:border-wasika-gold focus:ring-1 focus:ring-wasika-gold/50 text-base"
                  required
                />
              </div>
              <div>
                <label className="block text-wasika-text-muted text-sm mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                    placeholder="Minimal 6 karakter"
                    className="w-full bg-wasika-brown-dark/60 border border-wasika-gold/30 rounded-[11px] py-3.5 px-4 pr-12 text-wasika-text-on-dark placeholder:text-wasika-text-muted/60 focus:outline-none focus:border-wasika-gold focus:ring-1 focus:ring-wasika-gold/50 text-base"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-wasika-text-muted hover:text-wasika-gold"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {registerForm.password.length > 0 && registerForm.password.length < 6 && (
                  <p className="text-red-400 text-[10px] mt-1">Minimal 6 karakter.</p>
                )}
              </div>
              <div>
                <label className="block text-wasika-text-muted text-sm mb-2">Ulangi Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={registerForm.confirmPassword}
                    onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                    className="w-full bg-wasika-brown-dark/60 border border-wasika-gold/30 rounded-[11px] py-3.5 px-4 pr-12 text-wasika-text-on-dark focus:outline-none focus:border-wasika-gold focus:ring-1 focus:ring-wasika-gold/50 text-base"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-wasika-text-muted hover:text-wasika-gold"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Role selection UI removed. Default to "anggota" and show baniCode input. */}
              {/* Panitia registration will be handled via a specific flow (e.g., /join) */}
              {selectedRole === "anggota" && (
                <div>
                  <label className="block text-wasika-text-muted text-sm mb-2">Kode Bani</label>
                  <input
                    type="text"
                    value={registerForm.baniCode}
                    onChange={(e) => setRegisterForm({ ...registerForm, baniCode: e.target.value.toUpperCase() })}
                    placeholder="Masukkan kode unik keluarga"
                    className="w-full bg-wasika-brown-dark/60 border border-wasika-gold/30 rounded-[11px] py-3.5 px-4 text-wasika-text-on-dark placeholder:text-wasika-text-muted/60 focus:outline-none focus:border-wasika-gold focus:ring-1 focus:ring-wasika-gold/50 text-base font-mono tracking-wider"
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-wasika-gold hover:bg-wasika-gold-light text-wasika-brown-dark font-bold py-3.5 px-4 rounded-[11px] transition-colors mt-6 disabled:opacity-50"
              >
                {loading ? "Memproses..." : "Daftar Sekarang"}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="relative min-h-screen bg-wasika-dark flex items-center justify-center">
        <div className="text-wasika-gold">Loading...</div>
      </main>
    }>
      <LoginContent />
    </Suspense>
  )
}
