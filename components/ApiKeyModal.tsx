"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { X, Eye, EyeOff, ExternalLink, ShieldCheck } from "lucide-react"
import { storeApiKey, getStoredApiKey, storeModel, getStoredModel, POPULAR_MODELS } from "@/lib/openrouter"

interface Props {
  onClose: () => void
  onConfirm: (key: string, model: string) => void
}

export function ApiKeyModal({ onClose, onConfirm }: Props) {
  const [key, setKey] = useState("")
  const [model, setModel] = useState(POPULAR_MODELS[0].id)
  const [show, setShow] = useState(false)

  useEffect(() => {
    setKey(getStoredApiKey())
    setModel(getStoredModel())
  }, [])

  const handleConfirm = () => {
    if (!key.trim()) return
    storeApiKey(key.trim())
    storeModel(model)
    onConfirm(key.trim(), model)
    onClose()
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", damping: 22, stiffness: 280 }}
        className="fixed inset-0 flex items-center justify-center z-50 p-4"
      >
        <div className="w-full max-w-md bg-[#0c0e14] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            <div>
              <h2 className="font-semibold text-white">Live Mode — OpenRouter</h2>
              <p className="text-white/40 text-xs mt-0.5">Your key is stored locally and never sent to our servers</p>
            </div>
            <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Privacy notice */}
            <div className="flex items-start gap-2.5 rounded-lg border border-green-500/15 bg-green-950/10 px-4 py-3">
              <ShieldCheck className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
              <p className="text-green-300/70 text-xs leading-relaxed">
                Your OpenRouter API key is stored in <strong>browser localStorage only</strong>.
                LLM calls go <strong>directly from your browser to OpenRouter</strong> — our server
                only evaluates comply54 enforcement (no key involved).
              </p>
            </div>

            {/* API Key input */}
            <div>
              <label className="text-xs font-medium text-white/50 block mb-1.5">
                OpenRouter API Key
              </label>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                  placeholder="sk-or-v1-..."
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-2.5 text-sm font-mono text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/25 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 mt-1.5 text-[11px] text-white/25 hover:text-white/50 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Get a free OpenRouter key
              </a>
            </div>

            {/* Model picker */}
            <div>
              <label className="text-xs font-medium text-white/50 block mb-1.5">
                Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white/80 focus:outline-none focus:border-white/25 appearance-none cursor-pointer"
              >
                {POPULAR_MODELS.map((m) => (
                  <option key={m.id} value={m.id} className="bg-[#0c0e14]">
                    {m.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-white/25 mt-1.5">
                Any model on OpenRouter that supports tool use will work. This proves comply54 is model-agnostic.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/5 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-white/10 text-white/40 hover:text-white/60 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!key.trim()}
              className="flex-1 py-2 rounded-lg bg-white text-black font-medium text-sm hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Run with live LLM
            </button>
          </div>
        </div>
      </motion.div>
    </>
  )
}
