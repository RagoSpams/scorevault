# Handoff: ScoreVault Assessment Flow (Audit Console direction)

## Overview
Three connected screens for ScoreVault, a zero-knowledge assessment verification web app on the Midnight blockchain: (1) a protocol-compliance question screen, (2) a zero-knowledge proof generation screen, (3) a pass/fail result screen with an on-chain verification receipt. Visual direction is "Audit Console" — an enterprise compliance/audit tool aesthetic.

## About the Design Files
The bundled file (`ScoreVault Audit Console.dc.html`) is a **design reference built in HTML** — a high-fidelity prototype of look, layout, and motion, not production code to copy directly. The task is to **recreate this design in the target codebase's existing environment** (React, Vue, Swift, etc.) using its established component patterns, state management, and libraries. If no frontend framework exists yet, choose the one best suited to the project and implement there.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and animation are final-intent. Recreate pixel-perfectly using the codebase's own component library where possible; only fall back to raw CSS values below where no equivalent exists.

## Screens / Views

### 1. Question Screen
**Purpose:** Candidate answers one yes/no protocol-compliance question at a time.
**Layout:** Full-width top nav (64px) + two-column body below it. Left column ~1.55fr: question content, centered vertically, padding 72px/80px. Right column: fixed 460px sidebar, padding 56px/42px, left border 1px solid rgba(255,255,255,.08), background #0E1626 (slightly lighter than page background #0B1220).

**Top nav (repeats on all 3 screens, 64px tall, background #0A101C, border-bottom 1px rgba(255,255,255,.08)):**
- Logo mark: 22×22px square, background #5B7FE0, rotated 45° (diamond), with a small checkmark notch cut via a pseudo-element border trick.
- Wordmark "ScoreVault" — Inter 700 15px, color #F3F5F9.
- Vertical divider, then a small mono label for current screen context (e.g. "PROTOCOL COMPLIANCE ASSESSMENT · v2.3").
- Right-aligned: session id ("SESSION #A83F19", IBM Plex Mono 500 12px, rgba(231,234,240,.35)) and a pill badge "ENCRYPTED SESSION" (green dot #2ECC9A + IBM Plex Mono 600 11px #2ECC9A, background rgba(46,204,154,.1), border rgba(46,204,154,.3), radius 20px).

**Question content (left):**
- Clause tag row: 7×7px square #5B7FE0 + label "CLAUSE 4.2 — DATA RETENTION" (IBM Plex Mono 600 13px, color #93A9F0, letter-spacing .06em).
- Question headline: Inter 600 36px/1.35, color #F3F5F9, max-width 660px.
- Sub-question: Inter 500 20px/1.55, color #8A93A6, max-width 600px.
- Reference caption: IBM Plex Mono 400 13px, rgba(138,147,166,.55) — e.g. "Reference: Data Governance Policy §4.2.1(b), rev. March 2026".
- Two answer buttons side by side, gap 16px, each max-width 250px, padding 22px vertical, radius 6px, centered icon (circular checkmark/x glyph) + label:
  - Primary ("YES, COMPLY"): border 1px rgba(91,127,224,.55), background rgba(91,127,224,.08), text #93A9F0.
  - Secondary ("NO, ESCALATE"): border 1px rgba(231,234,240,.18), text #C7CCDA, transparent background.
- Footnote below buttons: Inter 400 12px, rgba(138,147,166,.45) — "Your response is recorded locally and encrypted before it ever leaves this device."

**Sidebar (right), "ASSESSMENT STRUCTURE":**
- Section label: IBM Plex Mono 600 12px, rgba(231,234,240,.4), letter-spacing .05em.
- 4 rows, each: 22×22px status chip (checkmark/complete = green #2ECC9A bg+border; active = filled #5B7FE0 bg with number; upcoming = outlined rgba(231,234,240,.2), dim number) + section name + right-aligned progress fraction (e.g. "4/4", "2/4").
- Segmented progress bar: 14 segments, gap 3px, height 7px, radius 2px — filled segments #5B7FE0, unfilled rgba(255,255,255,.1). Header row above it: "QUESTION 6 OF 14" / "43%" in IBM Plex Mono 600 12px.
- Bottom panel "SESSION INTEGRITY": pulsing 6px dot (#5B7FE0) + label, then a mono commitment hash line (e.g. "commit: 9f2a1c…e8b04d") and one line of explainer copy in the same blue, separated from the rest by a top border rgba(255,255,255,.08).

### 2. Proof Generation Screen
**Purpose:** Shows the ZK proof being computed after submission — the emotional/technical centerpiece.
**Layout:** Same nav (dimmed to 50% opacity, label changes to "SESSION LOCKED — ASSESSMENT SUBMITTED"). Body below is a full-bleed dark panel (#080B12) with a faint blueprint grid background (52px grid, rgba(91,127,224,.055) lines) and a horizontal light band that sweeps top-to-bottom on a loop (scanline).

**Center content, vertically stacked:**
1. Headline "GENERATING ZERO-KNOWLEDGE PROOF" — IBM Plex Mono 600 15px, #93A9F0, letter-spacing .08em.
2. A horizontal pipeline row (gap 56px):
   - Left: a 7-column grid of small 16×16px squares (14 total) labelled "14 ENCRYPTED RESPONSES" — filled/animated squares (border #5B7FE0, subtle fill, gentle up-down pulse loop, staggered delay per square) represent consumed answers; remaining squares are outlined only. Caption below: "values never leave this diagram."
   - Arrow "→" (IBM Plex Mono, dim blue).
   - Center: three concentric rotating squares (outer static outline rotated 45°, middle ring rotating clockwise ~12s loop, inner ring rotating counter-clockwise ~8s loop, all borders #5B7FE0-toned) with a "PLONK" chip centered on top.
   - Arrow "→".
   - Right: a small rounded-rect card with a green checkmark labelled "PASS / FAIL only" — communicates the one-bit output.
3. A 4-line status log (monospace, 13.5px): two completed steps (dim, checkmark + elapsed time), one active step in blue with a live percentage, one pending step in very dim gray with an em-dash.
4. Reassurance footnote: "This process runs entirely on your device. No answer, score, or raw response is ever transmitted."

**Animation notes:** scanline sweep (~3.2s linear, loops), outer/middle/inner square rotation (12s and 8s, opposite directions, linear, infinite), response squares pulse (1.8s ease-in-out, staggered ~0.1s per square). These motifs (scanline + rotating nested squares) were specifically called out as must-keep.

### 3. Result Screen
**Purpose:** Reveal pass/fail outcome and present the on-chain proof as credible evidence.
**Layout:** Same nav (full opacity, label "ASSESSMENT COMPLETE"). Centered two-column certificate card, 920px wide, border 1px rgba(91,127,224,.35), radius 10px, with four L-shaped corner brackets (2px, #5B7FE0) at each corner suggesting a certified/stamped document.

**Left panel (background #0E1626, ~1.15fr):**
- 64×64px circular badge, 2px border #2ECC9A, checkmark glyph, color #2ECC9A.
- "ASSESSMENT: PASS" — Inter 800 32px, #F3F5F9.
- "VERIFIED VIA ZERO-KNOWLEDGE PROOF" — IBM Plex Mono 500 13px, rgba(231,234,240,.45).
- Reassurance paragraph (Inter 400 15.5px/1.65, #8A93A6): scores/answers never disclosed, only the pass/fail outcome and its proof were recorded on-chain.
- Two buttons: primary "Download proof receipt" (filled #5B7FE0, dark text #0B1220) and secondary "Return to dashboard" (outlined, rgba(255,255,255,.15) border, #C7CCDA text).

**Right panel (background #0B1220, divided by a 1px vertical rgba(255,255,255,.08) border), "ON-CHAIN VERIFICATION RECEIPT":**
- Section label (IBM Plex Mono 600 12px, dim).
- Contract address block: label "CONTRACT ADDRESS · MIDNIGHT NETWORK" then the address in IBM Plex Mono 500 14px, #93A9F0, word-break all (e.g. `mn_shield-addr_test1qq...7f9a3c1b8e2d4f6a9c0e`).
- Two-up row: "PROOF SYSTEM" (PLONK / BLS12-381) and "BLOCK HEIGHT" (e.g. 1,842,207).
- "TIMESTAMP" row (e.g. 2026-07-17 14:22:08 UTC).
- Footer row (top border rgba(255,255,255,.08)): green dot + "CONFIRMED ON-CHAIN" on the left, "View on explorer →" link on the right (Inter 600 12px, #93A9F0).

This split-panel treatment (verdict left, verification evidence right) is intentional — it's meant to make the address/receipt feel like credible technical evidence rather than a footnote.

## Interactions & Behavior
- Question screen: selecting Yes/No advances to the next question; progress bar segments and the "QUESTION N OF 14" counter update; the sidebar checklist advances sections as clauses complete.
- On final question submit, transition to the Proof Generation screen. Log lines progress through their 4 states sequentially (not literally simultaneous); percentage on the active step increments to 100% before moving to the next line.
- Proof screen auto-advances to the Result screen once all 4 steps complete and the commitment is published on-chain (real async wait on the actual proof job / chain confirmation).
- Result screen: "Download proof receipt" should export the verification data (contract address, proof system, block height, timestamp) as a PDF/JSON. "View on explorer →" opens the transaction on a Midnight block explorer in a new tab.
- No hover/focus states were specified in the mock — add standard interactive states (subtle brightness/border shift) using the codebase's existing button/link conventions.

## State Management
- Current question index / total (e.g. 6 of 14) and per-section completion counts.
- Selected answer per question (not shown until submit — must never be persisted or transmitted in plaintext).
- Proof generation step index/status (idle → encrypting → witness → proving → publishing → done) and elapsed/percentage per step, driven by the real proof-generation job, not fixed timers.
- Final result: pass/fail boolean, contract address, proof system, block height, timestamp — all sourced from the real on-chain transaction, not hardcoded.

## Design Tokens

**Colors**
- Background (page): `#0B1220`
- Panel/sidebar background: `#0E1626`
- Deepest panel (proof screen): `#080B12`
- Nav background: `#0A101C`
- Primary text: `#F3F5F9` / `#E7EAF0`
- Secondary text: `#8A93A6`
- Muted/dim text: `rgba(231,234,240,.35–.45)`
- Accent blue: `#5B7FE0` (with tints `#93A9F0`, `rgba(91,127,224,.08–.55)`)
- Success green: `#2ECC9A` (with tint `rgba(46,204,154,.1–.3)`)
- Borders: `rgba(255,255,255,.06–.18)`

**Typography**
- UI sans: Inter (400/500/600/700/800)
- Data/mono: IBM Plex Mono (400/500/600)
- Headline sizes: 36px (question), 32px (result), 15px (nav wordmark)
- Body: 20px / 15.5px / 13–14px depending on hierarchy

**Spacing / Radius**
- Section padding: 56–80px
- Card/button radius: 6px; badge/pill radius: 20px (full)
- Corner bracket size: 30×30px, 2px stroke

**Shadows**
- Screen container: `0 20px 60px rgba(0,0,0,.5)`

## Assets
No external images. All icons are drawn with CSS/inline glyphs (✓, ✕, →) and simple geometric shapes (squares, circles, rotated diamonds) — no SVG icon library was used. If the target codebase has an icon set, swap these for equivalent check/x/arrow/shield icons at the same sizes.

## Files
- `ScoreVault Audit Console.dc.html` — the full HTML prototype containing all three screens (question, proof generation, result), stacked vertically, at native 1440×900 resolution each.
