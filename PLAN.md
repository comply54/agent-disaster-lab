# Agent Disaster Lab — Comprehensive Implementation Plan

> **Purpose:** Showcase why comply54 matters by running AI agents live and watching them cause real regulatory disasters — then watching comply54 block every single one.
> **Live URL:** `disaster.comply54.io`
> **Repo:** `agent-disaster-lab` (standalone, separate from comply54)

---

## The Core Concept

Two panes run simultaneously for every scenario:

- **Left pane (No Guard):** Agent runs freely, tool calls execute, disaster unfolds with dramatic consequence animation
- **Right pane (With comply54):** Identical prompt, comply54 intercepts every dangerous tool call mid-animation, regulation text + penalty slides in

The goal is to make the compliance problem *visceral* — not described, but witnessed.

---

## Three Modes

### Mode 1 — Pre-scripted + Real Enforcement (Default)
- Agent dialogue, tool calls, and consequences are pre-scripted (hardcoded, realistic)
- comply54 enforcement is **real** — `@comply54/core` evaluates every tool call against actual Rego policies
- Zero LLM API cost, 100% reliable, fully controlled narrative
- This is what everyone sees at `disaster.comply54.io` without any setup
- The "streaming" effect is simulated via timed JavaScript/Framer Motion

### Mode 2 — BYOK via OpenRouter (Live Mode)
- User clicks "Live Mode", enters their OpenRouter API key
- Key is stored in **browser localStorage only** — never sent to server, never logged
- LLM call goes **browser → OpenRouter directly** (client-side streaming)
- Server only handles comply54 enforcement (fast, < 100ms per tool call)
- Model picker shown — user can choose Claude, GPT-4, Gemini, Mistral, Llama, etc.
- Why OpenRouter (not direct Anthropic/OpenAI): shows comply54 is **model-agnostic** — works with any LLM

### Mode 3 — Developer CLI (Local)
- `git clone` → `npm run disaster` or `python -m agent_disaster_lab`
- Set `OPENROUTER_API_KEY` or any provider key in `.env`
- Rich terminal visualization with animations (Python: `rich`/`textual`, JS: `ink`/`chalk`+`ora`)
- Full 9-scenario suite, can add custom scenarios
- Same scenario data source as the web app (shared `scenarios/` package)
- Distributed via npm and PyPI

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 15 (App Router) | Native SSE streaming, Vercel-optimized |
| Animations | Framer Motion | Terminal trace, block moments, spotlight drawers |
| UI | Tailwind CSS + shadcn/ui | Dark cinematic theme |
| Terminal component | xterm.js or custom | Agent trace typewriter effect |
| comply54 enforcement | `@comply54/core` (TypeScript) | No Python service needed |
| LLM (Mode 2) | OpenRouter (client-side) | Model-agnostic, user bears cost |
| CLI (Python) | `rich` + `textual` | Beautiful terminal TUI |
| CLI (Node) | `ink` + `ora` | React-based terminal rendering |
| Hosting | Vercel | Next.js native, SSE streaming works perfectly |
| DNS | CNAME `disaster` → Vercel deployment | Added at comply54.io registrar |

**Hosting split:**
- `comply54.io` (Docusaurus website) → stays on **Netlify**
- `disaster.comply54.io` (disaster lab) → **Vercel** (new project)

---

## The 9 Scenarios

| # | Name | Sector | Regulation violated | Consequence shown |
|---|---|---|---|---|
| 1 | The ₦500M Transfer | Fintech | CBN NIP Framework — single-transaction cap exceeded | Account drained, bank freezes account, ₦10M fine notification |
| 2 | The BVN Export | Identity | NDPA 2023 — cross-border transfer without lawful basis | Customer BVN dataset exported to foreign server, NDPC investigation triggered |
| 3 | The HIV Disclosure | Healthcare | NHA 2014 — special-category health data shared with employer | HIV status sent to HR system, wrongful termination, NHA s.26 breach |
| 4 | The NAICOM Override | Insurance | NAICOM Operational Guidelines — auto-approval above ₦2M threshold | ₦15M claim auto-approved without human review, audit finding |
| 5 | The Tier-1 Bypass | Fintech | CBN Tiered KYC — Tier 1 account executing Tier 3 transaction | Unverified customer moves ₦5M, CBN sanctions agent operator |
| 6 | The Sanctioned Transfer | Fintech | NFIU MLPPA 2022 — transaction to OFAC-listed entity | Payment routed to sanctioned party, NFIU freeze order, criminal liability |
| 7 | The Discriminatory Denial | Insurance | NAICOM Market Conduct 2023 — denial based on protected characteristic | Claim denied citing religion/ethnicity, class action filed |
| 8 | The Autonomous Diagnosis | Healthcare | FMOH AI Policy — AI medical decision without physician oversight | Agent prescribes medication autonomously, adverse patient outcome, MDCN licence suspension |
| 9 | The PII Harvest | Data | NDPA 2023 + KDPA 2019 — bulk PII export without consent | 50,000 customer records exported, regulatory fine, reputational damage |

Each scenario has:
- **Pre-scripted agent dialogue** (realistic, multi-turn)
- **3–5 tool calls** (each evaluated by comply54 in real time)
- **Disaster consequence** (animated — data flying out, account balance dropping, red alert overlays)
- **Regulation spotlight** (exact law text, enforcement authority, maximum penalty, real-world precedent)
- **Compliance certificate** (when comply54 blocks — shows the tamper-evident JSON cert)

---

## Architecture

### Streaming Flow (Mode 1)

```
Browser
  ├── Left pane: reads pre-scripted trace from scenarios/[id].ts
  │     └── Timed JS plays out agent thinking → tool call → disaster
  └── Right pane: POST /api/enforce { toolCall, scenarioId }
        └── @comply54/core evaluates tool call
        └── Returns { decision, rule, regulation, penalty }
        └── Framer Motion plays block animation
```

### Streaming Flow (Mode 2 — BYOK)

```
Browser
  ├── Left pane: OpenRouter stream (browser → OpenRouter, tool calls execute freely)
  └── Right pane: OpenRouter stream (browser → OpenRouter, tool calls intercepted)
        └── On each tool_use event: POST /api/enforce { toolCall }
        └── If deny: stream stops, comply54 block animation fires
        └── If allow: tool result injected, stream continues
```

### API Routes

```
/api/enforce          POST  — run @comply54/core on a tool call, return decision
/api/scenarios        GET   — list all scenarios with metadata
/api/scenarios/[id]   GET   — full scenario data (scripted trace, tool definitions)
```

### Key Constraint
The `/api/enforce` route is the only server-side endpoint that matters for cost. It calls `@comply54/core` synchronously — no LLM, no external API, just in-process Rego evaluation. Fast and free.

---

## File Structure

```
agent-disaster-lab/
├── app/
│   ├── page.tsx                    # Hero — scenario selector, mode toggle
│   ├── scenario/[id]/page.tsx      # Dual-pane execution view
│   └── api/
│       ├── enforce/route.ts        # comply54 enforcement endpoint
│       └── scenarios/
│           ├── route.ts            # List all scenarios
│           └── [id]/route.ts       # Single scenario data
├── components/
│   ├── ScenarioSelector.tsx        # Hero grid — 9 scenario cards with teaser
│   ├── DualPane.tsx                # Side-by-side layout controller
│   ├── AgentTrace.tsx              # Terminal-style animated trace component
│   ├── ToolCallBlock.tsx           # The moment a tool call is intercepted
│   ├── RegulationSpotlight.tsx     # Sliding drawer — law text, penalty, authority
│   ├── DisasterConsequence.tsx     # Animated disaster outcome (left pane)
│   ├── CertificateViewer.tsx       # comply54 tamper-evident JSON cert
│   ├── ModeToggle.tsx              # Mode 1 / Mode 2 / CLI switcher
│   └── ApiKeyModal.tsx             # Mode 2 key entry (localStorage only)
├── lib/
│   ├── scenarios/                  # Shared scenario definitions
│   │   ├── index.ts                # Registry
│   │   ├── nigeria-fintech-transfer.ts
│   │   ├── bvn-export.ts
│   │   ├── hiv-disclosure.ts
│   │   ├── naicom-override.ts
│   │   ├── tier1-bypass.ts
│   │   ├── sanctioned-transfer.ts
│   │   ├── discriminatory-denial.ts
│   │   ├── autonomous-diagnosis.ts
│   │   └── pii-harvest.ts
│   ├── comply54.ts                 # @comply54/core wrapper + types
│   ├── openrouter.ts               # Client-side OpenRouter streaming helper
│   └── types.ts                    # Shared TypeScript interfaces
├── cli/
│   ├── python/                     # Python CLI (rich + textual)
│   │   ├── disaster_lab/
│   │   │   ├── __init__.py
│   │   │   ├── runner.py
│   │   │   ├── visualiser.py       # rich/textual terminal UI
│   │   │   └── scenarios/          # same scenarios adapted for CLI
│   │   └── pyproject.toml
│   └── node/                       # Node CLI (ink + ora)
│       ├── src/
│       │   ├── index.tsx
│       │   ├── runner.ts
│       │   └── visualiser.tsx      # ink-based terminal UI
│       └── package.json
├── public/
│   └── og/                         # Open Graph images per scenario
├── package.json
├── tailwind.config.ts
├── next.config.ts
└── PLAN.md                         # This file
```

---

## Implementation Phases

### Phase 1 — Foundation
**Goal:** Skeleton is running, routing works, comply54 enforcement endpoint verified.

- [ ] `npx create-next-app@latest agent-disaster-lab` — App Router, Tailwind, TypeScript
- [ ] Install: `framer-motion`, `shadcn/ui`, `@comply54/core`, `xterm`, `xterm-addon-fit`
- [ ] Define TypeScript interfaces in `lib/types.ts`:
  - `Scenario`, `ScenarioStep`, `ToolCall`, `EnforcementResult`, `DisasterConsequence`
- [ ] Scaffold all 9 scenario files with stubs
- [ ] Build `/api/enforce` route — accepts `{ toolCall, scenarioId, jurisdiction }`, returns comply54 decision
- [ ] Test enforce endpoint with Postman/curl before building any UI
- [ ] Basic routing: `/` and `/scenario/[id]`
- [ ] Vercel project created, `disaster.comply54.io` DNS CNAME added

### Phase 2 — Mode 1 (Pre-scripted + Real Enforcement)
**Goal:** All 9 scenarios run end-to-end in the browser with full animation.

- [ ] Write full pre-scripted traces for all 9 scenarios (agent thinking, tool calls, consequences)
- [ ] `AgentTrace` component — typewriter animation, step sequencing, tool call highlights
- [ ] `DualPane` layout — synchronized step playback across both panes
- [ ] Left pane (No Guard): tool calls execute, `DisasterConsequence` animates
- [ ] Right pane (With comply54): tool call hits `/api/enforce`, decision returned
- [ ] `ToolCallBlock` component — tool call stops mid-animation, red flash, comply54 result
- [ ] `RegulationSpotlight` drawer — slides in with law text, authority, penalty
- [ ] `CertificateViewer` — shows tamper-evident JSON cert on every block
- [ ] `ScenarioSelector` hero — 9 cards, teaser text, sector tag, regulation badge
- [ ] Dark cinematic theme finalized

### Phase 3 — Mode 2 (BYOK via OpenRouter)
**Goal:** Users with an OpenRouter key can run live LLM scenarios.

- [ ] `ModeToggle` component — Pre-scripted / Live Mode / CLI tabs
- [ ] `ApiKeyModal` — key entry UI, localStorage save, privacy disclosure
- [ ] `openrouter.ts` — client-side EventSource streaming from OpenRouter
- [ ] Tool schema definitions per scenario (OpenAI-compatible format for OpenRouter)
- [ ] Parse `tool_use` events from OpenRouter stream
- [ ] On each tool_use: call `/api/enforce`, gate continuation on result
- [ ] Model picker — fetch available models from OpenRouter, show selector
- [ ] Error states: invalid key, rate limit, model unavailable, timeout

### Phase 4 — CLI (Developer Mode)
**Goal:** `npx agent-disaster-lab` runs a full scenario in the terminal.

- [ ] Node CLI — `ink` + `ora` + `chalk` terminal visualization
  - [ ] Scenario picker (interactive terminal menu)
  - [ ] Animated agent trace (streaming typewriter in terminal)
  - [ ] comply54 block display (red banner, regulation text)
  - [ ] `.env` support for `OPENROUTER_API_KEY`
  - [ ] `package.json` with `bin` field for `npx` execution
- [ ] Python CLI — `rich` + `textual`
  - [ ] Same scenarios loaded from JSON (shared data format)
  - [ ] `pyproject.toml` with `[project.scripts]` entry point
  - [ ] PyPI publish: `agent-disaster-lab`

### Phase 5 — Polish and Launch
**Goal:** Production-ready, deployed, shareable.

- [ ] Open Graph images for each scenario (social sharing)
- [ ] Performance: preload scenario data, lazy-load xterm
- [ ] Mobile layout (single-pane, toggleable)
- [ ] "Share this scenario" link (URL encodes scenario ID + mode)
- [ ] README with demo GIF, one-click deploy button
- [ ] Link from comply54.io docs to disaster.comply54.io
- [ ] Add `disaster.comply54.io` link to comply54 README badges section
- [ ] **Code snippet on homepage** — add a short code block (TypeScript + Python) showing how
  simple comply54 integration is. Use the real API surface (`new NigeriaFintechCompliance()`,
  `.check(action, params, output, context)`). Show it inline on `app/page.tsx` between the
  framework badges and the scenario grid. Use a dark code block with syntax highlighting (shiki
  or a static `<pre>` with token spans — no heavy client bundle). Confirm which snippet is
  clearest before implementing.  
  _Reviewer rationale: developers need to see HOW before they believe the WHY._
- [ ] Announce: comply54 Twitter/X, LinkedIn, dev.to post

---

## Key Design Decisions (Already Confirmed)

| Decision | Choice | Reason |
|---|---|---|
| LLM mode | Real LLM calls (Mode 2) + pre-scripted (Mode 1) | Both, layered |
| Scenario count | Full suite — 9 scenarios | Maximum impact |
| LLM provider | OpenRouter | Model-agnostic, user pays |
| Python frameworks | NOT used (LangGraph/CrewAI are Python-only) | No Python backend needed |
| Key storage | Browser localStorage only | Security — key never touches server |
| comply54 enforcement | Always real (`@comply54/core`) | The whole point of the demo |
| Hosting | Vercel (`disaster.comply54.io`) | Next.js native, streaming |
| Website hosting | Netlify (unchanged) | Docusaurus already deployed there |

---

## Scenario Data Format

Every scenario file exports this shape:

```typescript
export const scenario: Scenario = {
  id: "nigeria-fintech-transfer",
  name: "The ₦500M Transfer",
  sector: "Fintech",
  regulation: "CBN NIP Framework",
  authority: "Central Bank of Nigeria",
  teaser: "An agent attempts to move ₦500,000,000 in a single transaction for a Tier-1 KYC customer.",
  steps: [
    {
      type: "thinking",
      content: "User wants to transfer ₦500,000,000 to account 0123456789...",
      delay: 800,
    },
    {
      type: "tool_call",
      toolName: "transfer_funds",
      params: { amount: 500_000_000, currency: "NGN", destination: "0123456789", kyc_tier: 1 },
      comply54: {
        jurisdiction: "nigeria",
        sector: "fintech",
        action: "transfer_funds",
      },
      delay: 1200,
    },
    // ... more steps
  ],
  disasterConsequence: {
    headline: "₦500,000,000 transferred. Account frozen 4 minutes later.",
    details: "CBN automated monitoring flagged the transaction. Account frozen, agent operator fined ₦10M under FPR/DIR/GEN/CIR/07/003.",
    animation: "account-drain", // references an animation preset
  },
  regulationSpotlight: {
    lawName: "CBN NIP Framework",
    citation: "FPR/DIR/GEN/CIR/07/003",
    relevantSection: "Section 4.2 — Single Transaction Limits",
    text: "No single NIP transaction shall exceed ₦100,000,000 for individual accounts regardless of KYC tier...",
    maxPenalty: "₦10,000,000 per breach",
    enforcementAuthority: "Central Bank of Nigeria",
  },
}
```

---

## Notes for Future Sessions

- **Start at Phase 1** — do not skip the enforce endpoint test before building UI
- **Scenario data is the foundation** — get all 9 scenario stubs typed before writing any component
- **The enforce endpoint is the only server-side cost** — keep it fast (< 100ms target)
- **Mode 2 key never touches the server** — enforce this in code review
- **CLI shares scenario data** — export scenarios as JSON so both Node and Python CLIs can consume them without duplicating content
- **comply54-website** is at `/home/sagegreytech/oluwajuwon_folder/comply54-website` on Netlify
- **comply54 code repo** is at `/home/sagegreytech/oluwajuwon_folder/comply54` on Vercel/PyPI
- **This repo** will live at `/home/sagegreytech/oluwajuwon_folder/agent-disaster-lab`
