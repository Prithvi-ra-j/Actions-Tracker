# Release Notes - Actions Tracker System-Wide Redesign

## Overview
Welcome to the brand new **Actions Tracker**! This update introduces a comprehensive, system-wide redesign prioritizing a mature, focus-driven aesthetic with Pinterest-inspired layouts, rounded corners, and a cleaner overall experience. 

## Key Highlights
- **Fresh Aesthetic:** Dark mode defaults with our signature burnt orange accent (`#e0763a`), rounded containers (`16px`), sheets (`24px`), and controls (`12px`).
- **Typography:** Updated to the beautiful **Geist** and **Geist Mono** font families for maximum readability and a premium feel.
- **Iconography:** Clean, uniform **Phosphor Icons** replacing legacy assets for a cohesive look.
- **Safe Area Support:** Full native support for Android safe areas, ensuring no overlap or clipping with the status bar or navigation bar.
- **Improved Android Navigation:** The hardware back button natively dismisses sheets, menus, and gracefully returns you to the Today tab.

## Features & Improvements
### 1. The App Shell & Navigation
- **Docked "Ask Jarvis" Pill:** A persistent, floating entry point available on all primary tabs (except when a sheet is open) to instantly consult Jarvis with your current context.
- **Bottom Navigation Bar:** Unified navigation spanning 4 primary tabs: **Today**, **Stats**, **Learn**, and **Goals**.

### 2. Tab Highlights
- **Today Tab:** Streamlined daily view with a new evidence composer sheet and overloaded-day strip.
- **Stats Tab:** Rebuilt axis sheets with radar charts and granular contribution tracking.
- **Goals & Learn Tabs:** Redesigned goal tracking and topics cards using the new Card and Pin primitives for consistent spacing and visual hierarchy.
- **Jarvis Tab:** Redesigned chat interface with "context attached" chips and inline action proposal execution.

### 3. Reliability & Data Safety
- **Zero Data Loss:** IndexedDB schemas, database names, and migration paths were strictly preserved. All your habits, logs, and historical data remain untouched.
- **Onboarding Continuity:** You will not be asked to onboard again. The app seamlessly transitions your current baseline straight into the new UI.
- **Local-First Capabilities:** Core tracking remains fully functional even when AI (Jarvis) or network connectivity is unavailable.

## Under the Hood
- Complete CSS tokenization replacing old `.card` and `.glass-panel` classes.
- Enhanced accessibility with comprehensive `:focus-visible` keyboard outlines and proper contrast checking.
- Refined test coverage preventing regressions in UI journeys and native flows.
