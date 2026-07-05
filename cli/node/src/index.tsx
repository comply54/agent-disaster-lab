#!/usr/bin/env node
import React, { useState } from "react"
import { render, Box, Text, useInput, useApp } from "ink"
import select from "@inquirer/select"
import { createRequire } from "module"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import type { Scenario } from "./types"
import { App } from "./App"

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

function loadScenarios(): Scenario[] {
  try {
    // When running from repo root via `npm run disaster`
    return require(join(__dirname, "../../scenarios.json"))
  } catch {
    try {
      // When running from cli/node/
      return require(join(__dirname, "../scenarios.json"))
    } catch {
      console.error("Could not load cli/scenarios.json — run `npm run export-scenarios` first")
      process.exit(1)
    }
  }
}

const SECTOR_COLORS: Record<string, string> = {
  Fintech: "\x1b[34m",
  Healthcare: "\x1b[32m",
  Insurance: "\x1b[35m",
  Identity: "\x1b[33m",
  Data: "\x1b[31m",
}
const RESET = "\x1b[0m"
const DIM = "\x1b[2m"
const BOLD = "\x1b[1m"

// Banner printed before ink takes over
function printBanner() {
  console.log("")
  console.log(`${BOLD}\x1b[31m  💥  AGENT DISASTER LAB${RESET}  ${DIM}by comply54${RESET}`)
  console.log(`${DIM}  Watch AI agents cause regulatory disasters — then watch comply54 stop them${RESET}`)
  console.log("")
}

interface SceneWrapperProps {
  scenario: Scenario
}

function SceneWrapper({ scenario }: SceneWrapperProps) {
  const { exit } = useApp()
  const [done, setDone] = useState(false)

  if (done) {
    return (
      <Box>
        <Text dimColor>Press Ctrl+C to exit or run again.</Text>
      </Box>
    )
  }

  return <App scenario={scenario} onBack={() => { exit(); process.exit(0) }} />
}

async function main() {
  const scenarios = loadScenarios()
  printBanner()

  // Scenario picker (uses @inquirer/select — full-screen before ink)
  const scenarioId = await select({
    message: "Select a scenario:",
    choices: scenarios.map((s, i) => ({
      name: `${String(i + 1).padStart(2, "0")}  ${SECTOR_COLORS[s.sector] ?? ""}${s.sector.padEnd(12)}${RESET}  ${s.name}  ${DIM}${s.regulation}${RESET}`,
      value: s.id,
      description: `  ${DIM}${s.teaser}${RESET}`,
    })),
  })

  const scenario = scenarios.find((s) => s.id === scenarioId)!
  console.log("")

  render(<SceneWrapper scenario={scenario} />, {
    exitOnCtrlC: true,
  })
}

main().catch((e) => {
  if (e?.name !== "ExitPromptError") {
    console.error(e)
    process.exit(1)
  }
})
