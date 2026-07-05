"""Rich-based terminal visualiser for Agent Disaster Lab."""
from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Any

from rich.columns import Columns
from rich.console import Console
from rich.layout import Layout
from rich.live import Live
from rich.panel import Panel
from rich.rule import Rule
from rich.text import Text
from rich.padding import Padding
from rich.table import Table

from .enforce import enforce

console = Console()

SECTOR_COLORS = {
    "Fintech": "blue",
    "Healthcare": "green",
    "Insurance": "magenta",
    "Identity": "yellow",
    "Data": "red",
}

SEVERITY_COLORS = {
    "critical": "bold red",
    "high": "bold yellow",
    "medium": "yellow",
}


def _load_scenarios() -> list[dict]:
    candidates = [
        Path(__file__).parent.parent.parent / "scenarios.json",  # cli/scenarios.json
        Path(__file__).parent.parent.parent.parent / "cli" / "scenarios.json",  # repo root
    ]
    for p in candidates:
        if p.exists():
            return json.loads(p.read_text())
    raise FileNotFoundError(
        "cli/scenarios.json not found. Run: npx tsx scripts/export-scenarios.ts"
    )


def print_banner() -> None:
    console.print()
    console.rule(
        "[bold red]💥  AGENT DISASTER LAB[/bold red]  [dim]by comply54[/dim]",
        style="dim",
    )
    console.print(
        "[dim]  Watch AI agents cause regulatory disasters — then watch comply54 stop them[/dim]"
    )
    console.print()


def print_scenario_picker(scenarios: list[dict]) -> dict | None:
    import questionary

    SECTOR_ANSI = {
        "Fintech": "\033[34m",
        "Healthcare": "\033[32m",
        "Insurance": "\033[35m",
        "Identity": "\033[33m",
        "Data": "\033[31m",
    }
    RESET = "\033[0m"
    DIM = "\033[2m"

    choices = [
        questionary.Choice(
            title=(
                f"{str(i + 1).zfill(2)}  "
                f"{SECTOR_ANSI.get(s['sector'], '')}{s['sector']:<12}{RESET}  "
                f"{s['name']:<40}  "
                f"{DIM}{s['regulation']}{RESET}"
            ),
            value=s["id"],
        )
        for i, s in enumerate(scenarios)
    ]
    choices.append(questionary.Choice(title="  ─── Exit", value="__exit__"))

    result = questionary.select(
        "Select a scenario to run:",
        choices=choices,
        use_indicator=True,
    ).ask()

    if result == "__exit__" or result is None:
        return None
    return next(s for s in scenarios if s["id"] == result)


# ── Pane renderer ──────────────────────────────────────────────────────────────

def _render_pane(
    title: str,
    border_color: str,
    entries: list[dict],
    state: str,
) -> Panel:
    lines = Text()

    for entry in entries:
        t = entry["type"]

        if t == "thinking":
            lines.append("  🤔 ", style="dim")
            lines.append(entry["content"] + "\n", style="italic dim")

        elif t == "assistant":
            lines.append("  ◆ ", style="dim")
            lines.append(entry["content"] + "\n", style="white")

        elif t == "tool_call":
            lines.append("\n  ▶ ", style="yellow")
            lines.append(entry.get("toolName", entry["content"]), style="bold yellow")
            lines.append("(\n", style="yellow")
            for k, v in list((entry.get("params") or {}).items())[:4]:
                lines.append(f"      {k}: {json.dumps(v)}\n", style="dim yellow")
            lines.append("  )\n", style="yellow")

        elif t == "tool_result":
            style = "bold red" if entry.get("isDisaster") else "green"
            icon = "⚠ EXECUTED" if entry.get("isDisaster") else "✓ Result"
            lines.append(f"  {icon}  ", style=style)
            content = str(entry.get("content", ""))[:70]
            lines.append(content + "\n", style="dim")

        elif t == "consequence":
            lines.append("\n  💥 ", style="bold red")
            lines.append(entry["content"] + "\n", style="bold red")

        elif t == "block":
            lines.append("\n  ⛔ BLOCKED BY COMPLY54\n", style="bold green")
            lines.append(f"  {entry.get('violation', '')}\n", style="white")
            if entry.get("regulation"):
                lines.append(f"  {entry['regulation']}\n", style="dim cyan")

    if state == "running" and not entries:
        lines.append("  Waiting for agent…\n", style="dim")

    state_suffix = {
        "running": " [dim]⠋[/dim]",
        "disaster": " [bold red]DISASTER[/bold red]",
        "blocked": " [bold green]BLOCKED[/bold green]",
        "done": " [dim]done[/dim]",
    }.get(state, "")

    return Panel(
        lines,
        title=f"[bold {border_color}]{title}[/bold {border_color}]{state_suffix}",
        border_style=border_color,
        padding=(0, 1),
    )


# ── Scenario runner ────────────────────────────────────────────────────────────

async def run_scenario(scenario: dict) -> None:
    sector = scenario["sector"]
    sector_color = SECTOR_COLORS.get(sector, "white")

    console.print()
    console.rule(
        f"[bold {sector_color}]{scenario['name']}[/bold {sector_color}]"
        f"  [dim]·  {scenario['regulation']}  ·  {scenario['authority']}[/dim]"
    )
    console.print(f"[dim]  {scenario['teaser']}[/dim]")
    console.print()

    unsafe_entries: list[dict] = []
    safe_entries: list[dict] = []
    unsafe_state = "running"
    safe_state = "running"
    disaster_details = ""

    layout = Layout()
    layout.split_row(
        Layout(name="unsafe"),
        Layout(name="safe"),
    )

    def refresh():
        layout["unsafe"].update(
            _render_pane("🔴  WITHOUT COMPLY54", "red", unsafe_entries, unsafe_state)
        )
        layout["safe"].update(
            _render_pane("🟢  PROTECTED BY COMPLY54", "green", safe_entries, safe_state)
        )

    async def run_unsafe():
        nonlocal unsafe_state, disaster_details
        for step in scenario["steps"]:
            await asyncio.sleep(step["delayMs"] / 1000)
            t = step["type"]

            if t == "thinking":
                unsafe_entries.append({"type": "thinking", "content": step.get("content", "")})
            elif t == "assistant":
                unsafe_entries.append({"type": "assistant", "content": step.get("content", "")})
            elif t == "tool_call":
                unsafe_entries.append({
                    "type": "tool_call",
                    "content": step.get("toolName", ""),
                    "toolName": step.get("toolName"),
                    "params": step.get("params"),
                })
            elif t == "tool_result":
                unsafe_entries.append({
                    "type": "tool_result",
                    "content": step.get("result", ""),
                    "isDisaster": step.get("isDisaster", False),
                })
                if step.get("isDisaster"):
                    unsafe_state = "disaster"
            elif t == "consequence":
                unsafe_entries.append({"type": "consequence", "content": step.get("headline", "")})
                disaster_details = scenario["disasterConsequence"]["details"]

        if unsafe_state == "running":
            unsafe_state = "done"

    async def run_safe():
        nonlocal safe_state
        for step in scenario["steps"]:
            if step["type"] in ("tool_result", "consequence"):
                continue

            await asyncio.sleep(step["delayMs"] / 1000)
            t = step["type"]

            if t == "thinking":
                safe_entries.append({"type": "thinking", "content": step.get("content", "")})
            elif t == "assistant":
                safe_entries.append({"type": "assistant", "content": step.get("content", "")})
            elif t == "tool_call":
                safe_entries.append({
                    "type": "tool_call",
                    "content": step.get("toolName", ""),
                    "toolName": step.get("toolName"),
                    "params": step.get("params"),
                })
                comply = step.get("comply54")
                if comply:
                    result = enforce(
                        comply["action"],
                        step.get("params") or {},
                        scenario["comply54SectorClass"],
                        comply.get("context") or {},
                    )
                    if result.blocked:
                        safe_entries.append({
                            "type": "block",
                            "content": result.violation,
                            "violation": result.violation,
                            "regulation": result.regulation,
                            "pack": result.pack,
                        })
                        safe_state = "blocked"
                        return

        if safe_state == "running":
            safe_state = "done"

    with Live(layout, console=console, refresh_per_second=12, vertical_overflow="visible"):
        refresh()
        unsafe_task = asyncio.create_task(run_unsafe())
        safe_task = asyncio.create_task(run_safe())

        while not (unsafe_task.done() and safe_task.done()):
            await asyncio.sleep(0.08)
            refresh()

        await asyncio.gather(unsafe_task, safe_task)
        refresh()

    # Post-run consequence footer
    if disaster_details:
        console.print()
        console.print(
            Panel(
                f"[white]{disaster_details}[/white]",
                title="[bold red]💥  CONSEQUENCE[/bold red]",
                border_style="red",
                padding=(0, 2),
            )
        )

    # Regulation spotlight
    spotlight = scenario.get("regulationSpotlight", {})
    if spotlight:
        severity_style = SEVERITY_COLORS.get(spotlight.get("severity", "medium"), "yellow")
        table = Table.grid(padding=(0, 2))
        table.add_column(style="dim", width=22)
        table.add_column()
        table.add_row("Law:", f"[bold]{spotlight.get('lawName', '')}[/bold]")
        table.add_row("Citation:", spotlight.get("citation", ""))
        table.add_row("Section:", spotlight.get("relevantSection", ""))
        table.add_row("Max Penalty:", f"[{severity_style}]{spotlight.get('maxPenalty', '')}[/{severity_style}]")
        table.add_row("Authority:", spotlight.get("enforcementAuthority", ""))
        console.print()
        console.print(
            Panel(
                table,
                title="[bold cyan]📖  REGULATION SPOTLIGHT[/bold cyan]",
                border_style="cyan",
                padding=(0, 1),
            )
        )

    console.print()
    console.rule("[dim]Press Enter to go back[/dim]", style="dim")
    input()
