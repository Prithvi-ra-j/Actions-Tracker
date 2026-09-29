# Real-World User Testing System

This implementation adds a layered testing laboratory around the existing Actions-Tracker test suite.

## Coverage
- Playwright smoke, Chromium regression, mobile emulation and WebKit.
- Persona-driven journeys: ideal, rushed, confused, checkbox-gamer and inactive.
- Input/path mutation primitives.
- Scenario schema with bounded action/time/LLM budgets.
- Deterministic browser-state evidence and error capture.
- 30/60/90-day compressed longitudinal sessions.
- Offline, slow-network and multi-tab resilience.
- Accessibility via axe WCAG A/AA and keyboard traversal.
- Security probes for XSS execution and rendered credential leakage.
- Capability map, risk register and failure taxonomy.
- Existing Vitest/property/migration/adversarial tests remain part of the release system.

## Oracle rule
Deterministic product state and persistence assertions outrank UI text and AI judgments. A Jarvis response claiming completion is never sufficient proof that state changed.

## Budgets
Normal scenarios: 40 actions / 5 minutes / <=10 LLM calls.
Approved long scenarios: 80 actions.
Retries are reserved for infrastructure failures.

## 30/60/90
The longitudinal suite is intentionally time-compressed. It validates repeated usage, interruptions, reloads and navigation over simulated day counts; it does not claim that calendar time has passed.

## Expansion rule
New coverage should be driven by product changes, real human findings, production incidents and newly discovered risk.
