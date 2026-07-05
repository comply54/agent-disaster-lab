/**
 * Generates cli/scenarios.json from the TypeScript scenario definitions.
 * Used by both the Node CLI and Python CLI.
 * Run with: tsx scripts/export-scenarios.ts
 */
import { scenarios } from "../lib/scenarios/index"
import { writeFileSync, mkdirSync } from "fs"
import { join } from "path"

const out = join(process.cwd(), "cli", "scenarios.json")
mkdirSync(join(process.cwd(), "cli"), { recursive: true })
writeFileSync(out, JSON.stringify(scenarios, null, 2))
console.log(`✅  Exported ${scenarios.length} scenarios → cli/scenarios.json`)
