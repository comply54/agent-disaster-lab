from __future__ import annotations
from dataclasses import dataclass
from typing import Any

_SECTOR_MAP: dict[str, Any] = {}

def _get_sector(class_name: str) -> Any:
    if class_name not in _SECTOR_MAP:
        if class_name == "NigeriaFintechCompliance":
            from comply54 import NigeriaFintechCompliance
            _SECTOR_MAP[class_name] = NigeriaFintechCompliance()
        elif class_name == "NigeriaHealthcareCompliance":
            from comply54.sectors.nigeria_health import NigeriaHealthcareCompliance
            _SECTOR_MAP[class_name] = NigeriaHealthcareCompliance()
        elif class_name == "NigeriaInsuranceCompliance":
            from comply54.sectors.nigeria_insurance import NigeriaInsuranceCompliance
            _SECTOR_MAP[class_name] = NigeriaInsuranceCompliance()
        elif class_name == "KenyaFintechCompliance":
            from comply54 import KenyaFintechCompliance
            _SECTOR_MAP[class_name] = KenyaFintechCompliance()
        elif class_name == "PanAfricanFintechCompliance":
            from comply54 import PanAfricanFintechCompliance
            _SECTOR_MAP[class_name] = PanAfricanFintechCompliance()
        else:
            raise ValueError(f"Unknown sector class: {class_name}")
    return _SECTOR_MAP[class_name]


@dataclass
class EnforcementResult:
    blocked: bool
    overall: str
    violation: str = ""
    regulation: str = ""
    pack: str = ""


def enforce(
    action: str,
    params: dict[str, Any],
    sector_class: str,
    context: dict[str, Any] | None = None,
) -> EnforcementResult:
    try:
        compliance = _get_sector(sector_class)
        result = compliance.check(action, params, "", context or {})

        if result.blocked:
            deny = next((d for d in result.decisions if d.action == "deny"), None)
            return EnforcementResult(
                blocked=True,
                overall=result.overall,
                violation=deny.messages[0] if deny and deny.messages else "Policy violation",
                regulation=deny.regulation if deny else "",
                pack=deny.pack if deny else "",
            )
        return EnforcementResult(blocked=False, overall=result.overall)
    except Exception:
        return EnforcementResult(blocked=False, overall="allow")
