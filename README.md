# Agent Disaster Lab

**The OWASP Juice Shop for AI Agents.**

Watch AI agents cause real African regulatory disasters — then watch [comply54](https://comply54.io) stop every one.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/comply54/agent-disaster-lab)
[![Live Demo](https://img.shields.io/badge/demo-disaster.comply54.io-red)](https://disaster.comply54.io)
[![comply54](https://img.shields.io/badge/powered%20by-comply54-white)](https://comply54.io)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

---

## What is this?

Agent Disaster Lab is an interactive enforcement demo. It runs real AI agents against real comply54 policies — no mocks, no faked results. Every blocked tool call is a live evaluation of the actual Rego policies that power comply54.

**Two panes. Same agent. Real enforcement.**

| Left pane | Right pane |
|---|---|
| Agent runs without guardrails | Agent runs through comply54 |
| Tool call executes | Tool call intercepted |
| Regulatory disaster unfolds | Violation cited. Agent stops. |

---

## 9 Scenarios

| # | Scenario | Sector | Regulation | Severity |
|---|---|---|---|---|
| 01 | The ₦500M Transfer | Fintech | CBN NIP Framework | Critical |
| 02 | Tier-1 KYC Bypass | Fintech | CBN Tiered KYC | Critical |
| 03 | Sanctioned Entity Transfer | Fintech | NFIU / MLPPA 2022 | Critical |
| 04 | BVN Bulk Export | Fintech | NDPA 2023 | Critical |
| 05 | PII Harvest for Marketing | Data | NDPA + KDPA | High |
| 06 | HIV Status Disclosure | Healthcare | NHA 2014 | Critical |
| 07 | Autonomous AI Diagnosis | Healthcare | FMOH AI Policy | High |
| 08 | Discriminatory Denial | Insurance | NAICOM Market Conduct 2023 | High |
| 09 | NAICOM Auto-Approve Override | Insurance | NAICOM Operational Guidelines | Medium |

---

## Three ways to run it

### 1. Web (browser)

```
https://disaster.comply54.io
```

**Demo mode** — pre-scripted playback, no API key needed. Runs instantly.

**Live mode** — real LLM via OpenRouter. Paste your API key in the browser (never sent to the server — stored in `localStorage` and sent directly to OpenRouter from your browser).

### 2. Node CLI

```bash
git clone https://github.com/comply54/agent-disaster-lab
cd agent-disaster-lab
npm install
npm run disaster
```

Interactive terminal UI built with [ink](https://github.com/vadimdemedes/ink). Side-by-side panes, real comply54 enforcement, keyboard navigation.

### 3. Python CLI

```bash
cd cli/python
pip install -e .
python -m agent_disaster_lab
```

Built with [rich](https://github.com/Textualize/rich) + asyncio. Dual-panel live rendering, regulation spotlight table at the end.

---

## How enforcement works

```
User message
      ↓
AI Agent decides to call a tool
      ↓         ← before execution
comply54.check(action, params)
      ↓
  ┌───┴───┐
DENY    ALLOW
  │        │
Block    Execute
Cite     Audit
Reg      log
```

The `/api/enforce` route receives every tool call before it executes. comply54 evaluates it against the relevant policy packs (CBN, NDPA, NHA, NAICOM, NFIU, KDPA) and returns a structured decision. Blocked calls never reach the tool.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Enforcement | [@comply54/core](https://www.npmjs.com/package/@comply54/core) |
| LLM (live mode) | OpenRouter (model-agnostic) |
| Streaming | OpenAI-compatible SSE |
| Styling | Tailwind CSS v4 |
| Animation | Framer Motion |
| Node CLI | ink + React |
| Python CLI | rich + asyncio |

---

## Sandbox

`/sandbox` — pick any sector, type any action and params, and see exactly what comply54 returns before you write a single line of agent code.

```
Sectors: Nigeria Fintech · Nigeria Healthcare · Nigeria Insurance
         Kenya Fintech · Pan-African Fintech

Result: BLOCKED / ALLOWED + regulation cited + citations + rule triggered
        + auto-generated TypeScript and Python snippet
```

---

## Using comply54 in your own agent

```typescript
import { NigeriaFintechCompliance } from "@comply54/core"

const compliance = new NigeriaFintechCompliance()
const result = compliance.check(
  "transfer_funds",
  { amount: 500_000_000, currency: "NGN" },
  "",
  { kyc_tier: 1 }
)

if (result.blocked) {
  throw new Error(result.primaryViolation?.messages[0])
}
// ⛔ "CBN NIP Framework: Transaction exceeds ₦10,000,000 single-transaction cap"
```

```python
from comply54.sectors import NigeriaFintechCompliance

compliance = NigeriaFintechCompliance()
result = compliance.check(
    "transfer_funds",
    {"amount": 500_000_000, "currency": "NGN"},
    "",
    {"kyc_tier": 1},
)

if result.blocked:
    raise Exception(result.primary_violation.messages[0])
```

Works with LangChain, LangGraph, CrewAI, AutoGen, and any agent that calls tools. See [comply54.io/docs](https://comply54.io/docs) for framework adapters.

---

## Running locally

```bash
# Clone
git clone https://github.com/comply54/agent-disaster-lab
cd agent-disaster-lab

# Install
npm install

# Run dev server
npm run dev
# → http://localhost:3000

# Export scenario data for CLI (optional)
npm run export-scenarios
```

**Live mode** requires an [OpenRouter](https://openrouter.ai) API key. Set it in the app UI — it stays in your browser's `localStorage` and is sent directly to OpenRouter. The server never sees it.

---

## Project structure

```
agent-disaster-lab/
├── app/
│   ├── page.tsx                    # Homepage — scenario grid
│   ├── sandbox/page.tsx            # Freeform enforcement sandbox
│   ├── scenario/[id]/page.tsx      # Individual scenario runner
│   └── api/enforce/route.ts        # comply54 enforcement API
├── components/
│   ├── ScenarioRunner.tsx          # Dual-pane runner (core UI)
│   ├── SandboxChecker.tsx          # Freeform sandbox form
│   ├── ScenarioCodeSnippet.tsx     # Per-scenario code snippet
│   ├── CertificateViewer.tsx       # Raw PolicyDecision JSON viewer
│   ├── AgentTrace.tsx              # Step-by-step trace renderer
│   └── RegulationSpotlight.tsx     # Regulation detail drawer
├── lib/
│   ├── scenarios/                  # 9 scenario definitions
│   ├── openrouter.ts               # SSE streaming client
│   └── types.ts                    # Shared TypeScript types
└── cli/
    ├── node/                       # ink-based Node CLI
    └── python/                     # rich-based Python CLI
```

---

## Regulatory coverage

| Framework | Jurisdiction | Authority |
|---|---|---|
| CBN NIP Framework | Nigeria | Central Bank of Nigeria |
| CBN Tiered KYC | Nigeria | Central Bank of Nigeria |
| NDPA 2023 | Nigeria | NDPC |
| NFIU / MLPPA 2022 | Nigeria | NFIU |
| National Health Act 2014 | Nigeria | FMOH / MDCN |
| NAICOM Guidelines 2021 / 2023 | Nigeria | NAICOM |
| Kenya Data Protection Act 2019 | Kenya | ODPC |

Full policy pack coverage (21 packs, 10+ jurisdictions) at [comply54.io/docs/policy-reference](https://comply54.io/docs/policy-reference).

---

## Related

- **[comply54](https://github.com/comply54/comply54)** — the enforcement engine powering this demo
- **[agt-policies-nigeria](https://github.com/kingztech2019/agt-policies-nigeria)** — the Rego policy packs (cited in Microsoft AGT)
- **[comply54.io](https://comply54.io)** — documentation and guides

---

## License

MIT — see [LICENSE](LICENSE).

The comply54 policy packs are community-maintained governance starter templates, not certified legal compliance instruments. Always consult qualified legal and regulatory advisors before deploying in regulated environments.
