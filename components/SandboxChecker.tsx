"use client"

import { useState } from "react"
import { Loader2, ShieldX, ShieldCheck, Copy, Check, ChevronDown, ChevronUp } from "lucide-react"
import type { EnforcementResult } from "@/lib/types"

const SECTORS = [
  { value: "NigeriaFintechCompliance", label: "Nigeria Fintech", sub: "CBN · NDPA · NFIU · BVN/NIN" },
  { value: "NigeriaHealthcareCompliance", label: "Nigeria Healthcare", sub: "NHA 2014 · NDPA · FMOH" },
  { value: "NigeriaInsuranceCompliance", label: "Nigeria Insurance", sub: "NAICOM · Insurance Act · NDPA" },
  { value: "KenyaFintechCompliance", label: "Kenya Fintech", sub: "KDPA 2019" },
  { value: "PanAfricanFintechCompliance", label: "Pan-African", sub: "NG · KE · ZA · GH · RW + 5" },
]

const EXAMPLES = [
  {
    label: "₦500M transfer",
    blocked: true,
    sector: "NigeriaFintechCompliance",
    action: "transfer_funds",
    params: `{
  "amount": 500000000,
  "currency": "NGN",
  "destination_account": "0123456789",
  "destination_bank": "Zenith Bank",
  "kyc_tier": 1
}`,
    context: `{"kyc_tier": 1}`,
  },
  {
    label: "₦5K transfer",
    blocked: false,
    sector: "NigeriaFintechCompliance",
    action: "transfer_funds",
    params: `{"amount": 5000, "currency": "NGN", "destination_account": "0123456789", "kyc_tier": 3}`,
    context: `{"kyc_tier": 3}`,
  },
  {
    label: "HIV disclosure",
    blocked: true,
    sector: "NigeriaHealthcareCompliance",
    action: "query_health_records",
    params: `{"patient_id": "P-001", "special_category": true}`,
    context: `{"consent_provided": false, "purpose": "employment"}`,
  },
  {
    label: "Auto-approve claim",
    blocked: true,
    sector: "NigeriaInsuranceCompliance",
    action: "approve_insurance_claim",
    params: `{"claim_id": "CLM-001", "amount": 15000000}`,
    context: `{"human_reviewer_present": false}`,
  },
]

const PY_IMPORT: Record<string, string> = {
  NigeriaFintechCompliance: "from comply54.sectors import NigeriaFintechCompliance",
  NigeriaHealthcareCompliance: "from comply54.sectors import NigeriaHealthcareCompliance",
  NigeriaInsuranceCompliance: "from comply54.sectors import NigeriaInsuranceCompliance",
  KenyaFintechCompliance: "from comply54.sectors import KenyaFintechCompliance",
  PanAfricanFintechCompliance: "from comply54.sectors import PanAfricanFintechCompliance",
}

function toTsObj(obj: Record<string, unknown>, indent: string): string {
  const entries = Object.entries(obj)
  if (!entries.length) return "{}"
  if (entries.length <= 2 && entries.every(([, v]) => typeof v !== "object")) {
    return `{ ${entries.map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(", ")} }`
  }
  return `{\n${entries.map(([k, v]) => `${indent}  ${k}: ${JSON.stringify(v)},`).join("\n")}\n${indent}}`
}

function toPyDict(obj: Record<string, unknown>, indent: string): string {
  const entries = Object.entries(obj)
  if (!entries.length) return "{}"
  if (entries.length <= 2 && entries.every(([, v]) => typeof v !== "object")) {
    return `{${entries.map(([k, v]) => `"${k}": ${JSON.stringify(v)}`).join(", ")}}`
  }
  return `{\n${entries.map(([k, v]) => `${indent}  "${k}": ${JSON.stringify(v)},`).join("\n")}\n${indent}}`
}

function buildSnippet(
  lang: "ts" | "py",
  sector: string,
  action: string,
  params: Record<string, unknown>,
  context: Record<string, unknown>,
  result: EnforcementResult | null
): string {
  const ctxEntries = Object.entries(context)
  const resultComment = result
    ? result.blocked
      ? `// ⛔ ${result.primaryViolation?.messages[0] ?? "Blocked by comply54"}`
      : "// ✓ Allowed — no violations"
    : ""

  if (lang === "ts") {
    const ctxArg = ctxEntries.length > 0 ? `,\n  ${toTsObj(context, "  ")}` : ""
    return `import { ${sector} } from "@comply54/core"

const compliance = new ${sector}()
const result = compliance.check(
  "${action}",
  ${toTsObj(params, "  ")},
  ""${ctxArg}
)

if (result.blocked) {
  throw new Error(result.primaryViolation?.messages[0])
}
${resultComment}`
  }

  const ctxArg = ctxEntries.length > 0 ? `,\n    ${toPyDict(context, "    ")}` : ""
  const importLine = PY_IMPORT[sector] ?? `from comply54.sectors import ${sector}`
  return `${importLine}

compliance = ${sector}()
result = compliance.check(
    "${action}",
    ${toPyDict(params, "    ")},
    ""${ctxArg},
)

if result.blocked:
    raise Exception(result.primary_violation.messages[0])
${resultComment}`
}

function HighlightedPre({ code }: { code: string }) {
  return (
    <pre className="px-6 py-5 text-xs font-mono leading-relaxed overflow-x-auto text-white/70 whitespace-pre">
      {code.split("\n").map((line, i) => {
        if (line.trimStart().startsWith("//") || line.trimStart().startsWith("#")) {
          return (
            <div key={i} className={line.includes("⛔") ? "text-red-400/70" : line.includes("✓") ? "text-green-500/60" : "text-white/30"}>
              {line}
            </div>
          )
        }
        return (
          <div key={i}>
            {line
              .split(/\b(import|from|const|new|if|throw|raise|result|compliance|check)\b/)
              .map((part, j) =>
                /^(import|from|const|new|if|throw|raise|result|compliance|check)$/.test(part) ? (
                  <span key={j} className="text-violet-400">{part}</span>
                ) : part.includes('"') || part.includes("'") ? (
                  <span key={j} className="text-amber-300/80">{part}</span>
                ) : (
                  <span key={j}>{part}</span>
                )
              )}
          </div>
        )
      })}
    </pre>
  )
}

function parseJson(text: string): [Record<string, unknown> | null, string | null] {
  try {
    const val = JSON.parse(text.trim() || "{}")
    if (typeof val !== "object" || Array.isArray(val)) return [null, "Must be a JSON object"]
    return [val as Record<string, unknown>, null]
  } catch {
    return [null, "Invalid JSON"]
  }
}

export function SandboxChecker() {
  const [sector, setSector] = useState("NigeriaFintechCompliance")
  const [action, setAction] = useState("")
  const [paramsText, setParamsText] = useState("{}")
  const [contextText, setContextText] = useState("{}")
  const [showContext, setShowContext] = useState(false)
  const [paramsError, setParamsError] = useState<string | null>(null)
  const [contextError, setContextError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<EnforcementResult | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [snippetLang, setSnippetLang] = useState<"ts" | "py">("ts")
  const [copied, setCopied] = useState(false)

  const loadExample = (ex: (typeof EXAMPLES)[number]) => {
    setSector(ex.sector)
    setAction(ex.action)
    setParamsText(ex.params)
    setContextText(ex.context)
    setShowContext(ex.context !== "{}")
    setParamsError(null)
    setContextError(null)
    setResult(null)
    setFetchError(null)
  }

  const handleCheck = async () => {
    const [params, pe] = parseJson(paramsText)
    const [context, ce] = parseJson(contextText)
    setParamsError(pe)
    setContextError(ce)
    if (!params || !context || !action.trim()) return

    setLoading(true)
    setResult(null)
    setFetchError(null)

    try {
      const res = await fetch("/api/enforce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolName: action.trim(), params, sectorClass: sector, action: action.trim(), context }),
      })
      const data: EnforcementResult = await res.json()
      setResult(data)
    } catch {
      setFetchError("Request failed — is the dev server running?")
    } finally {
      setLoading(false)
    }
  }

  const [parsedParams] = parseJson(paramsText)
  const [parsedContext] = parseJson(contextText)
  const snippet =
    parsedParams && parsedContext
      ? buildSnippet(snippetLang, sector, action || "your_action", parsedParams, parsedContext, result)
      : null

  const handleCopy = async () => {
    if (!snippet) return
    await navigator.clipboard.writeText(snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Quick examples */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-white/20 mb-3">Quick examples</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              onClick={() => loadExample(ex)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/8 bg-white/[0.02] text-xs text-white/40 hover:text-white/70 hover:border-white/15 transition-all"
            >
              <span className={ex.blocked ? "text-red-400" : "text-green-400"}>{ex.blocked ? "⛔" : "✓"}</span>
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sector selector */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-white/20 mb-3">Sector</p>
        <div className="flex flex-wrap gap-2">
          {SECTORS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSector(s.value)}
              className={`px-3 py-2 rounded-lg border text-xs transition-all text-left ${
                sector === s.value
                  ? "border-white/20 bg-white/[0.06] text-white"
                  : "border-white/8 bg-white/[0.02] text-white/40 hover:text-white/60 hover:border-white/12"
              }`}
            >
              <div className="font-medium">{s.label}</div>
              <div className="text-[10px] text-white/25 mt-0.5">{s.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Action input */}
      <div>
        <label className="block text-[10px] uppercase tracking-widest text-white/20 mb-2">
          Action
        </label>
        <input
          type="text"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="e.g. transfer_funds, query_health_records, approve_insurance_claim"
          className="w-full px-4 py-2.5 rounded-lg border border-white/10 bg-white/[0.03] text-sm text-white placeholder-white/20 font-mono focus:outline-none focus:border-white/20 transition-colors"
        />
      </div>

      {/* Params input */}
      <div>
        <label className="block text-[10px] uppercase tracking-widest text-white/20 mb-2">
          Params <span className="text-white/15 normal-case tracking-normal">(JSON)</span>
        </label>
        <textarea
          value={paramsText}
          onChange={(e) => { setParamsText(e.target.value); setParamsError(null) }}
          onBlur={() => { const [, err] = parseJson(paramsText); setParamsError(err) }}
          rows={5}
          className={`w-full px-4 py-3 rounded-lg border text-xs font-mono text-white/70 bg-white/[0.03] focus:outline-none transition-colors resize-none ${
            paramsError ? "border-red-500/40" : "border-white/10 focus:border-white/20"
          }`}
        />
        {paramsError && <p className="mt-1 text-xs text-red-400/70">{paramsError}</p>}
      </div>

      {/* Context (collapsible) */}
      <div>
        <button
          onClick={() => setShowContext((v) => !v)}
          className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/20 hover:text-white/40 transition-colors mb-2"
        >
          {showContext ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          Context{" "}
          <span className="normal-case tracking-normal text-white/15">(optional — KYC tier, flags, etc.)</span>
        </button>
        {showContext && (
          <>
            <textarea
              value={contextText}
              onChange={(e) => { setContextText(e.target.value); setContextError(null) }}
              onBlur={() => { const [, err] = parseJson(contextText); setContextError(err) }}
              rows={3}
              className={`w-full px-4 py-3 rounded-lg border text-xs font-mono text-white/70 bg-white/[0.03] focus:outline-none transition-colors resize-none ${
                contextError ? "border-red-500/40" : "border-white/10 focus:border-white/20"
              }`}
            />
            {contextError && <p className="mt-1 text-xs text-red-400/70">{contextError}</p>}
          </>
        )}
      </div>

      {/* Submit */}
      <button
        onClick={handleCheck}
        disabled={loading || !action.trim()}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-black font-medium text-sm hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {loading ? "Checking…" : "Check with comply54"}
      </button>

      {/* Result */}
      {fetchError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4 text-sm text-red-400">
          {fetchError}
        </div>
      )}

      {result && (
        <div
          className={`rounded-xl border overflow-hidden ${
            result.blocked
              ? "border-red-500/25 bg-red-500/5"
              : "border-green-500/25 bg-green-500/5"
          }`}
        >
          <div
            className={`flex items-center gap-2.5 px-5 py-3 border-b ${
              result.blocked ? "border-red-500/15" : "border-green-500/15"
            }`}
          >
            {result.blocked ? (
              <ShieldX className="w-4 h-4 text-red-400 shrink-0" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-green-400 shrink-0" />
            )}
            <span className={`font-semibold text-sm ${result.blocked ? "text-red-300" : "text-green-300"}`}>
              {result.blocked ? "BLOCKED" : "ALLOWED"}
            </span>
            {result.primaryViolation && (
              <span className="text-white/30 text-xs ml-1">{result.primaryViolation.regulation}</span>
            )}
          </div>

          <div className="px-5 py-4 space-y-3">
            {result.primaryViolation ? (
              <>
                <p className="text-sm text-white/70">{result.primaryViolation.messages[0]}</p>

                {result.primaryViolation.ruleTriggered && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-widest text-white/20">Rule</span>
                    <code className="text-xs font-mono text-white/40 bg-white/5 px-2 py-0.5 rounded">
                      {result.primaryViolation.ruleTriggered}
                    </code>
                  </div>
                )}

                {result.primaryViolation.citations.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-white/20 mb-1.5">Citations</p>
                    <div className="space-y-1">
                      {result.primaryViolation.citations.map((c, i) => (
                        <div key={i} className="text-xs text-white/35">
                          {c.document} {c.section} · {c.authority} ({c.year})
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-white/50">
                No violations found — this action is permitted under the selected sector&apos;s policies.
              </p>
            )}

            {result.auditId && (
              <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                <span className="text-[10px] text-white/20 uppercase tracking-widest">Audit ID</span>
                <code className="text-[10px] font-mono text-white/25">{result.auditId}</code>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Code snippet (shown once action + params are filled in) */}
      {snippet && action.trim() && (
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/20 mb-3">Generated code</p>
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
            <div className="flex items-center gap-1 px-4 py-2.5 border-b border-white/5">
              <button
                onClick={() => setSnippetLang("ts")}
                className={`px-3 py-1 rounded-md text-xs font-mono transition-colors ${
                  snippetLang === "ts" ? "bg-white/10 text-white" : "text-white/30 hover:text-white/50"
                }`}
              >
                TypeScript
              </button>
              <button
                onClick={() => setSnippetLang("py")}
                className={`px-3 py-1 rounded-md text-xs font-mono transition-colors ${
                  snippetLang === "py" ? "bg-white/10 text-white" : "text-white/30 hover:text-white/50"
                }`}
              >
                Python
              </button>
              <button
                onClick={handleCopy}
                className="ml-auto flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <HighlightedPre code={snippet} />
          </div>
        </div>
      )}
    </div>
  )
}
