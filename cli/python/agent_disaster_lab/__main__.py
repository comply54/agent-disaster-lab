"""
Agent Disaster Lab CLI
Run: python -m agent_disaster_lab
"""
from __future__ import annotations

import asyncio
import sys

from .visualiser import _load_scenarios, print_banner, print_scenario_picker, run_scenario


def main() -> None:
    print_banner()

    try:
        scenarios = _load_scenarios()
    except FileNotFoundError as e:
        from rich.console import Console
        Console().print(f"[bold red]Error:[/bold red] {e}")
        sys.exit(1)

    while True:
        scenario = print_scenario_picker(scenarios)
        if scenario is None:
            break
        asyncio.run(run_scenario(scenario))


if __name__ == "__main__":
    main()
