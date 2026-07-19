"use client"

import { useState } from "react"
import { X, Mail, Loader2, CheckCircle2, Shield } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

export function AuthModal() {
  const { authModalOpen, closeAuthModal, signInWithEmail, signInWithGoogle } = useAuth()

  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!authModalOpen) return null

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || sending) return
    setSending(true)
    setError(null)
    const { error: err } = await signInWithEmail(email.trim())
    setSending(false)
    if (err) setError(err)
    else setSent(true)
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    setError(null)
    const { error: err } = await signInWithGoogle()
    if (err) {
      setError(err)
      setGoogleLoading(false)
    }
    // On success the page redirects — no need to clear loading state
  }

  const handleClose = () => {
    closeAuthModal()
    setSent(false)
    setEmail("")
    setError(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-[#0e1017] shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Shield className="w-4 h-4 text-red-400" />
              <span className="text-[10px] font-medium text-red-400/70 uppercase tracking-widest">
                Agent Disaster Lab
              </span>
            </div>
            <h2 className="text-lg font-bold text-white">Sign in to save your score</h2>
            <p className="text-xs text-white/40 mt-0.5 leading-relaxed">
              Your completions sync to the global leaderboard.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-white/20 hover:text-white/50 transition-colors mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {sent ? (
            /* ── Success state ── */
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-5 text-center space-y-2">
              <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto" />
              <p className="text-sm font-semibold text-white">Check your inbox</p>
              <p className="text-xs text-white/40 leading-relaxed">
                We sent a sign-in link to <span className="text-white/60">{email}</span>.
                Click it to continue.
              </p>
            </div>
          ) : (
            <>
              {/* ── Email form ── */}
              <form onSubmit={handleEmail} className="space-y-2">
                <label className="block text-[10px] font-medium text-white/30 uppercase tracking-widest">
                  Email
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="flex-1 bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/20 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={sending || !email.trim()}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    {sending
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Mail className="w-3.5 h-3.5" />
                    }
                    Send link
                  </button>
                </div>
              </form>

              {/* ── Divider ── */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/6" />
                <span className="text-[10px] text-white/20">or</span>
                <div className="flex-1 h-px bg-white/6" />
              </div>

              {/* ── Google ── */}
              <button
                onClick={handleGoogle}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg border border-white/10 bg-white/[0.03] text-sm text-white/60 hover:text-white/80 hover:border-white/20 hover:bg-white/[0.06] disabled:opacity-40 transition-all"
              >
                {googleLoading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <span className="text-base leading-none">G</span>
                }
                Continue with Google
              </button>
            </>
          )}

          {/* Error */}
          {error && (
            <p className="text-xs text-red-400/80 text-center">{error}</p>
          )}

          <p className="text-[10px] text-white/20 text-center leading-relaxed">
            No password. No spam. Only used to save your score.
          </p>
        </div>
      </div>
    </div>
  )
}
