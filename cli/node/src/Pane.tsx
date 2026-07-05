import React from "react"
import { Box, Text } from "ink"
import type { TraceEntry, PaneState } from "./types"

interface PaneProps {
  title: string
  color: "red" | "green"
  entries: TraceEntry[]
  state: PaneState
}

function EntryLine({ entry }: { entry: TraceEntry }) {
  if (entry.type === "thinking") {
    return (
      <Box gap={1}>
        <Text dimColor>  🤔</Text>
        <Text italic dimColor>{entry.content}</Text>
      </Box>
    )
  }

  if (entry.type === "assistant") {
    return (
      <Box gap={1}>
        <Text dimColor>  ◆</Text>
        <Text color="white">{entry.content}</Text>
      </Box>
    )
  }

  if (entry.type === "tool_call") {
    const paramsStr = entry.params
      ? Object.entries(entry.params)
          .slice(0, 4)
          .map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`)
          .join("\n")
      : ""
    return (
      <Box flexDirection="column" marginY={1}>
        <Box gap={1}>
          <Text color="yellow">  ▶</Text>
          <Text bold color="yellow">{entry.toolName ?? entry.content}</Text>
          <Text color="yellow">(</Text>
        </Box>
        {paramsStr && (
          <Text color="yellow" dimColor>{paramsStr}</Text>
        )}
        <Text color="yellow">  )</Text>
      </Box>
    )
  }

  if (entry.type === "tool_result") {
    return (
      <Box gap={1}>
        <Text color={entry.isDisaster ? "red" : "green"}>
          {entry.isDisaster ? "  ⚠ EXECUTED" : "  ✓ Result"}
        </Text>
        <Text color={entry.isDisaster ? "red" : "white"} dimColor>
          {entry.content?.slice(0, 60)}
        </Text>
      </Box>
    )
  }

  if (entry.type === "consequence") {
    return (
      <Box flexDirection="column" marginY={1} paddingX={1}
        borderStyle="round" borderColor="red">
        <Text bold color="red">  💥 {entry.content}</Text>
      </Box>
    )
  }

  if (entry.type === "block") {
    return (
      <Box flexDirection="column" marginY={1} paddingX={1}
        borderStyle="round" borderColor="green">
        <Text bold color="green">  ⛔ BLOCKED BY COMPLY54</Text>
        <Text color="white" dimColor wrap="wrap">  {entry.violation}</Text>
        {entry.regulation && (
          <Text color="cyan" dimColor>  {entry.regulation}</Text>
        )}
      </Box>
    )
  }

  return null
}

export function Pane({ title, color, entries, state }: PaneProps) {
  return (
    <Box
      flexDirection="column"
      flexBasis="50%"
      borderStyle="single"
      borderColor={state === "disaster" ? "red" : state === "blocked" ? "green" : color}
      paddingX={1}
      paddingY={0}
    >
      {/* Header row */}
      <Box gap={1} marginBottom={1}>
        <Text bold color={color}>
          {color === "red" ? "🔴" : "🟢"} {title}
        </Text>
        {state === "running" && (
          <Text color="white" dimColor>⠋</Text>
        )}
        {state === "disaster" && (
          <Text bold color="red"> DISASTER</Text>
        )}
        {state === "blocked" && (
          <Text bold color="green"> BLOCKED</Text>
        )}
        {state === "done" && (
          <Text color="white" dimColor> done</Text>
        )}
      </Box>

      {/* Trace entries */}
      {entries.map((entry, i) => (
        <EntryLine key={i} entry={entry} />
      ))}

      {/* Running indicator */}
      {state === "running" && entries.length === 0 && (
        <Text dimColor>  Waiting for agent...</Text>
      )}
    </Box>
  )
}
