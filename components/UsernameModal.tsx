"use client"

import { useState, useEffect, useRef } from "react"
import { Loader2, CheckCircle2, XCircle, Trophy } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/

type CheckState = "idle" | "checking" | "available" | "taken" | "invalid"

export function UsernameModal() {
  const { usernameModalOpen, createProfile, checkUsername } = useAuth()

  const [value, setValue] = useState("")
  const [checkState, setCheckState] = useState<CheckState>("idle")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (usernameModalOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [usernameModalOpen])

  const validate = (v: string): string | null => {
    if (v.length < 3) return "At least 3 characters"
    if (v.length > 20) return "Max 20 characters"
    if (!USERNAME_REGEX.test(v)) return "Letters, numbers, and underscores only"
    return null
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.slice(0, 20)
    setValue(v)
    setError(null)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    const validationError = validate(v)
    if (validationError) {
      setCheckState(v.length === 0 ? "idle" : "invalid")
      return
    }

    setCheckState("checking")
    debounceRef.current = setTimeout(async () => {
      const available = await checkUsername(v)
      setCheckState(available ? "available" : "taken")
    }, 400)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (checkState !== "available" || saving) return
    setSaving(true)
    setError(null)
    const { error: err } = await createProfile(value)
    if (err) {
      setError(err.includes("unique") ? "Username already taken" : err)
      setSaving(false)
      setCheckState("taken")
    }
    // On success, modal closes via context (usernameModalOpen → false)
  }

  if (!usernameModalOpen) return null

  const statusIcon = () => {
    if (checkState === "checking") return <Loader2 className="w-3.5 h-3.5 text-white/30 animate-spin" />
    if (checkState === "available") return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
    if (checkState === "taken" || checkState === "invalid") return <XCircle className="w-3.5 h-3.5 text-red-400" />
    return null
  }

  const statusText = () => {
    if (checkState === "checking") return "Checking…"
    if (checkState === "available") return "Available"
    if (checkState === "taken") return "Already taken"
    if (checkState === "invalid") return validate(value)
    return null
  }

  const statusColor = () => {
    if (checkState === "available") return "text-emerald-400"
    if (checkState === "taken" || checkState === "invalid") return "text-red-400/80"
    return "text-white/25"
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-[#0e1017] shadow-2xl">
        <div className="p-6 pb-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Choose your username</h2>
              <p className="text-[11px] text-white/35">Shown on the global leaderboard</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={value}
                  onChange={handleChange}
                  placeholder="e.g. red_teamer_ng"
                  maxLength={20}
                  className="w-full bg-white/[0.04] border border-white/8 rounded-lg px-3 py-3 pr-9 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/20 transition-colors font-mono"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {statusIcon()}
                </div>
              </div>
              <div className="flex items-center justify-between mt-1.5 px-0.5">
                {statusText() && (
                  <p className={`text-[10px] ${statusColor()}`}>{statusText()}</p>
                )}
                <p className="text-[10px] text-white/20 ml-auto tabular-nums">
                  {value.length}/20
                </p>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-400/80">{error}</p>
            )}

            <button
              type="submit"
              disabled={checkState !== "available" || saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-white text-black font-semibold text-sm hover:bg-white/90 disabled:opacity-35 disabled:cursor-not-allowed transition-all"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saving ? "Saving…" : "Confirm username"}
            </button>
          </form>

          <p className="text-[10px] text-white/20 text-center mt-3 leading-relaxed">
            Letters, numbers, underscores · 3–20 characters
          </p>
        </div>
      </div>
    </div>
  )
}
