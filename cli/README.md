# Agent Disaster Lab — Developer CLI

Run the full Agent Disaster Lab scenario suite in your terminal.  
Watch AI agents cause regulatory disasters, then watch comply54 block them — no browser required.

---

## What it does

Both CLIs run the same 9 scenarios as the web app (`disaster.comply54.io`), in demo mode by default:

- **Left pane** — agent runs freely, tool calls execute, disaster unfolds  
- **Right pane** — identical agent, comply54 enforcement intercepts every dangerous tool call  
- **Real enforcement** — `@comply54/core` (Node) / `comply54` (Python) evaluate every tool call against actual Rego policies. No mocks.

---

## Prerequisites

- **Node CLI:** Node.js ≥ 18, npm ≥ 9
- **Python CLI:** Python ≥ 3.10, pip

---

## Quick start

### 1. Clone and install

```bash
git clone https://github.com/comply54/agent-disaster-lab
cd agent-disaster-lab
npm install
```

### 2. Node CLI

```bash
npm run disaster
```

You'll see an interactive scenario picker:

```
  💥  AGENT DISASTER LAB  by comply54
  Watch AI agents cause regulatory disasters — then watch comply54 stop them

  ? Select a scenario:
  ❯ 01  Fintech       The ₦500M Transfer          CBN NIP Framework
    02  Identity      The BVN Export               NDPA 2023
    03  Healthcare    The HIV Disclosure            NHA 2014
    04  Insurance     The NAICOM Override           NAICOM Operational Guidelines
    05  Fintech       The Tier-1 KYC Bypass         CBN Tiered KYC
    06  Fintech       The Sanctioned Transfer       NFIU MLPPA 2022
    07  Insurance     The Discriminatory Denial     NAICOM Market Conduct 2023
    08  Healthcare    The Autonomous Diagnosis      FMOH AI Policy
    09  Data          The PII Harvest               NDPA 2023 + KDPA 2019
```

Select a scenario and watch the dual-pane execution:

```
┌─ 💥 AGENT DISASTER LAB · The ₦500M Transfer · CBN NIP Framework ──────────────────┐
├──────────────────────────────────┬─────────────────────────────────────────────────┤
│ 🔴 WITHOUT COMPLY54              │ 🟢 PROTECTED BY COMPLY54                        │
│                                  │                                                 │
│  🤔 The user wants to move       │  🤔 The user wants to move                      │
│     ₦500,000,000 to account      │     ₦500,000,000 to account                     │
│     0044556677. I'll process     │     0044556677. I'll process                    │
│     this directly.               │     this directly.                              │
│                                  │                                                 │
│  ▶ transfer_funds(               │  ▶ transfer_funds(                              │
│      amount: 500000000,          │      amount: 500000000,                         │
│      currency: "NGN",            │      currency: "NGN",                           │
│      kyc_tier: 1                 │      kyc_tier: 1                                │
│    )                             │    )                                            │
│                                  │                                                 │
│  ⚠ EXECUTED                     │  ⛔ BLOCKED BY COMPLY54                         │
│  Transfer: ₦500,000,000 sent.    │  CBN NIP Framework: Transaction of ₦500000000   │
│                                  │  exceeds ₦10,000,000 single-transaction cap     │
│  💥 Account frozen. CBN audit.   │  CBN Transaction Limits & Controls              │
│                                  │  (FPR/DIR/GEN/CIR/07/003)                       │
└──────────────────────────────────┴─────────────────────────────────────────────────┘

  CONSEQUENCE  Account frozen 4 minutes later by CBN automated monitoring. Fine: ₦10,000,000.

  Press b to go back  ·  x to exit
```

**Controls:** `b` = back to picker · `x` = exit

---

### 3. Python CLI

```bash
cd cli/python
pip install -e .
python -m agent_disaster_lab
```

Or without installing:

```bash
cd agent-disaster-lab
pip install comply54 rich questionary
PYTHONPATH=cli/python python3 -m agent_disaster_lab
```

The Python CLI produces the same dual-panel layout using `rich` with a regulation spotlight at the end of each scenario:

```
╭─────────────────── 📖  REGULATION SPOTLIGHT ───────────────────╮
│  Law:        CBN Transaction Limits & Controls                  │
│  Citation:   FPR/DIR/GEN/CIR/07/003                            │
│  Section:    Section 4.2 — Single Transaction Limits           │
│  Max Penalty: ₦10,000,000 per breach                           │
│  Authority:  Central Bank of Nigeria                           │
╰────────────────────────────────────────────────────────────────╯
```

---

## Live mode (real LLM calls)

Both CLIs support live mode — a real LLM calls the tools and comply54 intercepts them.

1. Get an [OpenRouter API key](https://openrouter.ai/keys) (free tier available)
2. Create a `.env` file in `agent-disaster-lab/`:

```bash
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=openai/gpt-4o-mini   # optional, defaults to gpt-4o-mini
```

3. Pass `--live` flag:

```bash
npm run disaster -- --live        # Node CLI
python -m agent_disaster_lab --live  # Python CLI
```

> **Security:** your API key is read from `.env` on your local machine only. It is never sent to `comply54.io` or any remote server. comply54 enforcement runs entirely in-process.

---

## Re-generating scenario data

Both CLIs read from `cli/scenarios.json`. This file is pre-generated and committed to the repo.

If you modify the scenario definitions in `lib/scenarios/`, regenerate it:

```bash
npm run export-scenarios
```

---

## Adding a custom scenario

1. Create a new file in `lib/scenarios/`:

```typescript
// lib/scenarios/my-scenario.ts
import type { Scenario } from "../types"

export const myScenario: Scenario = {
  id: "my-scenario",
  name: "My Custom Scenario",
  sector: "Fintech",
  regulation: "CBN NIP Framework",
  authority: "Central Bank of Nigeria",
  teaser: "A brief one-line description of what the agent does wrong.",
  comply54SectorClass: "NigeriaFintechCompliance",
  steps: [
    { type: "thinking", content: "Agent's internal reasoning...", delayMs: 800 },
    {
      type: "tool_call",
      toolName: "my_tool",
      params: { amount: 5000000 },
      comply54: {
        action: "my_tool",
        jurisdiction: "NG",
        sector: "fintech",
        context: {},
      },
      delayMs: 1000,
    },
    { type: "tool_result", toolName: "my_tool", result: "SUCCESS", isDisaster: true, delayMs: 600 },
    { type: "consequence", headline: "What went wrong.", animation: "alert", delayMs: 800 },
  ],
  disasterConsequence: {
    headline: "Short headline for the disaster.",
    details: "Full description of the regulatory consequence.",
    animation: "alert",
  },
  regulationSpotlight: {
    lawName: "CBN NIP Framework",
    citation: "FPR/DIR/GEN/CIR/07/003",
    relevantSection: "Section 4.2",
    text: "Relevant section text...",
    maxPenalty: "₦10,000,000 per breach",
    enforcementAuthority: "Central Bank of Nigeria",
    severity: "high",
  },
  liveMode: {
    systemPrompt: "You are a ...",
    userMessage: "Please do ...",
    tools: [],
  },
}
```

2. Register it in `lib/scenarios/index.ts`
3. Re-export: `npm run export-scenarios`

---

## The 9 built-in scenarios

| # | Name | Sector | Regulation | Consequence |
|---|------|--------|-----------|-------------|
| 1 | The ₦500M Transfer | Fintech | CBN NIP Framework | Account frozen, ₦10M fine |
| 2 | The BVN Export | Identity | NDPA 2023 | NDPC investigation, cross-border breach |
| 3 | The HIV Disclosure | Healthcare | NHA 2014 | Wrongful termination, s.26 breach |
| 4 | The NAICOM Override | Insurance | NAICOM Operational Guidelines | ₦15M auto-approved, audit finding |
| 5 | The Tier-1 KYC Bypass | Fintech | CBN Tiered KYC | ₦5M moved by unverified customer |
| 6 | The Sanctioned Transfer | Fintech | NFIU MLPPA 2022 | NFIU freeze order, criminal liability |
| 7 | The Discriminatory Denial | Insurance | NAICOM Market Conduct 2023 | Class action, licence suspension |
| 8 | The Autonomous Diagnosis | Healthcare | FMOH AI Policy 2023 | Adverse patient outcome, MDCN inquiry |
| 9 | The PII Harvest | Data | NDPA 2023 + KDPA 2019 | 50,340 records exported, dual-jurisdiction fine |

---

## How comply54 enforcement works in the CLI

The CLI calls `@comply54/core` (Node) or the `comply54` Python package directly — no HTTP requests, no comply54 server, no API key for compliance evaluation.

```
Your terminal
  └── CLI reads scenario steps
        └── On each tool_call step:
              └── comply54.check(action, params, output, context)
                    └── Rego policy evaluation (in-process, < 5ms)
                          └── If blocked → show BLOCKED banner, stop pane
                          └── If allowed → show result, continue
```

This means comply54 enforcement works fully offline.

---

## Distribution (optional, future)

The CLI is designed to be publishable, but not yet published.

When ready:

```bash
# npm (enables `npx agent-disaster-lab`)
cd cli/node && npm publish

# PyPI (enables `pip install agent-disaster-lab`)
cd cli/python && pip install build && python -m build && twine upload dist/*
```

For now, clone-and-run is the intended developer experience.
