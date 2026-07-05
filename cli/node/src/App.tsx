import React, { useState, useEffect } from "react"
import { Box, Text, useApp, useInput } from "ink"
import type { Scenario, TraceEntry, PaneState } from "./types"
import { enforce } from "./enforce"
import { Pane } from "./Pane"

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

interface Props {
  scenario: Scenario
  onBack: () => void
}

export function App({ scenario, onBack }: Props) {
  const { exit } = useApp()

  const [unsafeEntries, setUnsafeEntries] = useState<TraceEntry[]>([])
  const [safeEntries, setSafeEntries] = useState<TraceEntry[]>([])
  const [unsafeState, setUnsafeState] = useState<PaneState>("running")
  const [safeState, setSafeState] = useState<PaneState>("running")
  const [done, setDone] = useState(false)
  const [disasterLine, setDisasterLine] = useState("")

  useInput((input) => {
    if (input === "q" || input === "b") onBack()
    if (input === "x") exit()
  })

  useEffect(() => {
    async function runUnsafe() {
      for (const step of scenario.steps) {
        await sleep(step.delayMs)

        if (step.type === "thinking") {
          setUnsafeEntries((e) => [...e, { type: "thinking", content: step.content ?? "" }])
        } else if (step.type === "assistant") {
          setUnsafeEntries((e) => [...e, { type: "assistant", content: step.content ?? "" }])
        } else if (step.type === "tool_call") {
          setUnsafeEntries((e) => [...e, {
            type: "tool_call",
            content: step.toolName ?? "",
            toolName: step.toolName,
            params: step.params,
          }])
        } else if (step.type === "tool_result") {
          setUnsafeEntries((e) => [...e, {
            type: "tool_result",
            content: step.result ?? "",
            isDisaster: step.isDisaster,
          }])
          if (step.isDisaster) {
            setUnsafeState("disaster")
          }
        } else if (step.type === "consequence") {
          setUnsafeEntries((e) => [...e, { type: "consequence", content: step.headline ?? "" }])
          setDisasterLine(scenario.disasterConsequence.details)
        }
      }
      setUnsafeState((s) => s === "running" ? "done" : s)
    }

    async function runSafe() {
      for (const step of scenario.steps) {
        if (step.type === "tool_result" || step.type === "consequence") continue

        await sleep(step.delayMs)

        if (step.type === "thinking") {
          setSafeEntries((e) => [...e, { type: "thinking", content: step.content ?? "" }])
        } else if (step.type === "assistant") {
          setSafeEntries((e) => [...e, { type: "assistant", content: step.content ?? "" }])
        } else if (step.type === "tool_call") {
          setSafeEntries((e) => [...e, {
            type: "tool_call",
            content: step.toolName ?? "",
            toolName: step.toolName,
            params: step.params,
          }])

          if (step.comply54) {
            const result = enforce(
              step.comply54.action,
              step.params ?? {},
              scenario.comply54SectorClass,
              step.comply54.context ?? {}
            )

            if (result.blocked) {
              setSafeEntries((e) => [...e, {
                type: "block",
                content: result.violation ?? "Policy violation",
                violation: result.violation,
                regulation: result.regulation,
                pack: result.pack,
              }])
              setSafeState("blocked")
              return
            }
          }
        }
      }
      setSafeState((s) => s === "running" ? "done" : s)
    }

    Promise.all([runUnsafe(), runSafe()]).then(() => setDone(true))
  }, [])

  const sectorColor: Record<string, "blue" | "green" | "magenta" | "yellow" | "red"> = {
    Fintech: "blue",
    Healthcare: "green",
    Insurance: "magenta",
    Identity: "yellow",
    Data: "red",
  }

  return (
    <Box flexDirection="column" width="100%">
      {/* Header */}
      <Box paddingX={1} paddingY={0} borderStyle="single" borderColor="white">
        <Text bold color="red">💥 </Text>
        <Text bold color="white">AGENT DISASTER LAB  </Text>
        <Text color="white" dimColor>· </Text>
        <Text bold color={sectorColor[scenario.sector] ?? "white"}>{scenario.name}  </Text>
        <Text color="white" dimColor>· {scenario.regulation}</Text>
      </Box>

      {/* Dual pane */}
      <Box flexDirection="row" width="100%">
        <Pane
          title="WITHOUT COMPLY54"
          color="red"
          entries={unsafeEntries}
          state={unsafeState}
        />
        <Pane
          title="PROTECTED BY COMPLY54"
          color="green"
          entries={safeEntries}
          state={safeState}
        />
      </Box>

      {/* Disaster consequence footer */}
      {disasterLine !== "" && (
        <Box paddingX={2} paddingY={1} borderStyle="single" borderColor="red">
          <Text bold color="red">CONSEQUENCE  </Text>
          <Text color="white" dimColor wrap="wrap">{disasterLine}</Text>
        </Box>
      )}

      {/* Footer controls */}
      <Box paddingX={1} paddingY={0}>
        {done || unsafeState !== "running" || safeState !== "running" ? (
          <Text dimColor>
            Press <Text bold color="white">b</Text> to go back  ·  <Text bold color="white">x</Text> to exit
          </Text>
        ) : (
          <Text dimColor>Running scenario… press <Text bold color="white">x</Text> to abort</Text>
        )}
      </Box>
    </Box>
  )
}
