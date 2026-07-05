"use client"

import { useState } from "react"
import { Copy, Check, Code2 } from "lucide-react"
import type { Scenario, ToolCallStep } from "@/lib/types"

interface Props {
  scenario: Scenario
}

const PY_IMPORT: Record<string, string> = {
  NigeriaFintechCompliance: "from comply54.sectors import NigeriaFintechCompliance",
  NigeriaHealthcareCompliance: "from comply54.sectors import NigeriaHealthcareCompliance",
  NigeriaInsuranceCompliance: "from comply54.sectors import NigeriaInsuranceCompliance",
  KenyaFintechCompliance: "from comply54.sectors import KenyaFintechCompliance",
  PanAfricanFintechCompliance: "from comply54.sectors import PanAfricanFintechCompliance",
}

function toTsObj(obj: Record<string, unknown>, baseIndent: string): string {
  const entries = Object.entries(obj)
  if (!entries.length) return "{}"
  if (entries.length <= 2 && entries.every(([, v]) => typeof v !== "object")) {
    return `{ ${entries.map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(", ")} }`
  }
  const lines = entries.map(([k, v]) => `${baseIndent}  ${k}: ${JSON.stringify(v)},`)
  return `{\n${lines.join("\n")}\n${baseIndent}}`
}

function toPyDict(obj: Record<string, unknown>, baseIndent: string): string {
  const entries = Object.entries(obj)
  if (!entries.length) return "{}"
  if (entries.length <= 2 && entries.every(([, v]) => typeof v !== "object")) {
    return `{${entries.map(([k, v]) => `"${k}": ${JSON.stringify(v)}`).join(", ")}}`
  }
  const lines = entries.map(([k, v]) => `${baseIndent}  "${k}": ${JSON.stringify(v)},`)
  return `{\n${lines.join("\n")}\n${baseIndent}}`
}

function buildTsSnippet(
  sc: string,
  action: string,
  params: Record<string, unknown>,
  context: Record<string, unknown>,
  blockHint: string
): string {
  const ctxEntries = Object.entries(context)
  const ctxArg = ctxEntries.length > 0 ? `,\n  ${toTsObj(context, "  ")}` : ""
  return `import { ${sc} } from "@comply54/core"

const compliance = new ${sc}()
const result = compliance.check(
  "${action}",
  ${toTsObj(params, "  ")},
  ""${ctxArg}
)

if (result.blocked) {
  throw new Error(result.primaryViolation?.messages[0])
}
// ⛔ Blocked by: ${blockHint}`
}

function buildPySnippet(
  sc: string,
  action: string,
  params: Record<string, unknown>,
  context: Record<string, unknown>,
  blockHint: string
): string {
  const ctxEntries = Object.entries(context)
  const ctxArg = ctxEntries.length > 0 ? `,\n    ${toPyDict(context, "    ")}` : ""
  const importLine = PY_IMPORT[sc] ?? `from comply54.sectors import ${sc}`
  return `${importLine}

compliance = ${sc}()
result = compliance.check(
    "${action}",
    ${toPyDict(params, "    ")},
    ""${ctxArg},
)

if result.blocked:
    raise Exception(result.primary_violation.messages[0])
# ⛔ Blocked by: ${blockHint}`
}

function HighlightedPre({ code }: { code: string }) {
  return (
    <pre className="px-6 py-5 text-xs font-mono leading-relaxed overflow-x-auto text-white/70 whitespace-pre">
      {code.split("\n").map((line, i) => {
        if (line.trimStart().startsWith("//") || line.trimStart().startsWith("#")) {
          return <div key={i} className="text-green-500/60">{line}</div>
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

export function ScenarioCodeSnippet({ scenario }: Props) {
  const [lang, setLang] = useState<"ts" | "py">("ts")
  const [copied, setCopied] = useState(false)

  const toolStep = scenario.steps.find((s) => s.type === "tool_call") as ToolCallStep | undefined
  if (!toolStep) return null

  const { comply54SectorClass } = scenario
  const action = toolStep.comply54.action
  const params = toolStep.params
  const context = toolStep.comply54.context ?? {}
  const blockHint = `${scenario.regulationSpotlight.lawName} — ${scenario.regulationSpotlight.relevantSection}`

  const code =
    lang === "ts"
      ? buildTsSnippet(comply54SectorClass, action, params, context, blockHint)
      : buildPySnippet(comply54SectorClass, action, params, context, blockHint)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section id="code-snippet" className="border-t border-white/5 bg-[#080a0f]">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center gap-2 mb-5">
          <Code2 className="w-4 h-4 text-white/20" />
          <p className="text-xs uppercase tracking-widest text-white/20">Use this in your project</p>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
          <div className="flex items-center gap-1 px-4 py-2.5 border-b border-white/5">
            <button
              onClick={() => setLang("ts")}
              className={`px-3 py-1 rounded-md text-xs font-mono transition-colors ${
                lang === "ts" ? "bg-white/10 text-white" : "text-white/30 hover:text-white/50"
              }`}
            >
              TypeScript
            </button>
            <button
              onClick={() => setLang("py")}
              className={`px-3 py-1 rounded-md text-xs font-mono transition-colors ${
                lang === "py" ? "bg-white/10 text-white" : "text-white/30 hover:text-white/50"
              }`}
            >
              Python
            </button>
            <span className="ml-auto text-[11px] text-white/20 hidden sm:block">
              Exact enforcement call for this scenario
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors ml-2"
            >
              {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <HighlightedPre code={code} />
        </div>

        <p className="mt-4 text-xs text-white/25 text-center">
          This is the exact call comply54 makes when intercepting the tool in the scenario above.{" "}
          <a href="/sandbox" className="text-white/40 hover:text-white/70 underline transition-colors">
            Try your own inputs in the Sandbox →
          </a>
        </p>
      </div>
    </section>
  )
}
