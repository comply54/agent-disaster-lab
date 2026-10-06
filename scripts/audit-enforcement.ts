/**
 * Audits every scenario's comply54 configuration against the real engine.
 *
 * Each scenario promises that the protected pane blocks. This checks that the
 * engine actually returns blocked=true for the inputs the scenario sends, so a
 * scenario cannot claim a protection the packs do not provide.
 */

import { scenarios } from "../lib/scenarios"
import * as core from "@comply54/core"
import type { ComplianceResult } from "@comply54/core"

type Sector = { check(a: string, p?: any, o?: string, c?: any): ComplianceResult }

function sectorFor(name: string): Sector {
  const C = (core as unknown as Record<string, new () => Sector>)[name]
  if (!C) throw new Error(`unknown sector class: ${name}`)
  return new C()
}

let failures = 0

for (const s of scenarios) {
  const enforcedSteps = s.steps.filter(
    (st: any) => st.type === "tool_call" || (st.type === "voice_call" && st.voice_guard),
  )

  if (enforcedSteps.length === 0) {
    console.log(`SKIP  ${s.id} (no enforced step)`)
    continue
  }

  let blockedSomewhere = false
  const detail: string[] = []

  for (const st of enforcedSteps as any[]) {
    const cfg = st.type === "tool_call" ? st.comply54 : st.voice_guard.comply54
    if (!cfg) continue
    try {
      const r = sectorFor(s.comply54SectorClass).check(
        cfg.action,
        st.type === "tool_call" ? st.params ?? {} : cfg.context ?? {},
        cfg.output ?? "",
        cfg.context ?? {},
      )
      if (r.blocked) blockedSomewhere = true
      detail.push(`${cfg.action} -> ${r.overall}${r.blocked ? " (blocked)" : ""}`)
    } catch (e) {
      detail.push(`${cfg.action} -> ERROR ${e}`)
    }
  }

  if (blockedSomewhere) {
    console.log(`PASS  ${s.id}`)
  } else {
    failures++
    console.log(`FAIL  ${s.id}  [${s.comply54SectorClass}]`)
    detail.forEach((d) => console.log(`        ${d}`))
  }
}

console.log(`\n${failures} scenario(s) claim protection the engine does not provide`)
process.exit(failures > 0 ? 1 : 0)
