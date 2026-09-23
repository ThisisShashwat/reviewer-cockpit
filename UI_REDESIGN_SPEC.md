# Live Reviewer Cockpit — UI/UX Redesign Specification
**Architectural Blueprint & Design System Standards**
**Target App:** `/home/shashwat/projects/horizons/reviewer-cockpit`
**Reference Inspirations:** Linear.app, GitHub Pull Request Reviewer, Stripe Dashboard

---

## 1. Problem Statement & Design Vision

### 1.1 Root Cause Analysis: The "AI Slop" Anatomy
The previous prototype UI exhibited the classic failure modes of automated AI layout generation:
1. **The 3-Column Bento Trap**: Cramming Left Sidebar (320px), Center Workspace (6 nested stages), and Right Sidebar (320px) on the same screen simultaneously.
2. **Depressing Low-Contrast Dark Mode**: Muddy grays (`#121212`, `#1c1c1c`, `#242424`, `#333333`) with muted text (`#71717a`) that strains the eyes and feels gloomy.
3. **Container & Border Inflation**: Wrapping every text snippet, badge, and button inside a solid 1px border.
4. **Micro-Typography**: Extensive use of `text-[10px]` and `text-[11px]` font sizes that make reading tiring.
5. **Gratuitous Iconography**: Tacking a Lucide icon onto every single button, heading, and chip, generating severe visual noise.
6. **No Progressive Disclosure**: Forcing 18 interactive controls and inputs onto the reviewer's screen at the exact same moment.

### 1.2 Design Vision: "Linear for Hack Club Reviewers"
The redesigned Reviewer Cockpit will feel like a custom internal tool engineered by Linear or Vercel:
* **Pitch obsidian canvas with luminous crisp typography** (WCAG AAA contrast).
* **Single-focus stages**: The reviewer does ONE thing at a time with 100% of their attention.
* **Progressive 3-page workflow**:
  * **Page 1: The Queue** (Bird's-eye view of all 128 submissions).
  * **Page 2: The Step-by-Step Review Stage** (Calm 6-step linear flow with fixed contextual header).
  * **Page 3: The Admin Desk** (Clean clipboard copy terminal for Live dispatch).

---

## 2. Design System Tokens & Guidelines

### 2.1 Color Palette (Tailwind Tokens)
Replace muddy `#121212` and `#242424` with high-contrast, refined neutral tones:

- Canvas Background: `#09090b` (Obsidian Pitch Black)
- Card / Panel Surface: `#141416` (Deep Zinc)
- Hover Surface: `#1c1c20`
- Subtle Hairline Border: `rgba(255, 255, 255, 0.08)`
- Primary Text: `#fafafa` (Stark White, High Contrast)
- Secondary Text: `#d4d4d8` (Readable Light Zinc)
- Muted Labels: `#a1a1aa`
- Brand Accent: `#ec3750` (Hack Club Red) & `#ff6b35` (Vibrant Orange)
- Semantic Status Colors: `#22c55e` (Pass/Approved), `#f59e0b` (Warning/Delta), `#ef4444` (Blocker/Reject)

### 2.2 Typography Scale
Strict ban on `text-[10px]`. Clean, human-friendly hierarchy:
- Base Body: 14px with 1.6 line-height
- Table Data: 13px with 1.5 line-height
- Card & Section Titles: 15px font-semibold
- Page Headings: 20px font-bold
- Metrics / Numbers: 14–24px font-mono font-bold

---

## 3. Page Architecture

### Page 1: Clean Submissions Queue (`/`)
- Spacious table of the 128 real projects
- Columns: Submitter, Project Name, Track (Software/Hardware), Requested Hours, Hackatime ID, Time Submitted, Status, Action ("Start Review →")
- Filter pills: All (128), Pending (66), Rejected (27), Fraud (35)
- Live search bar (by project name, author, repo)
- Direct link to Page 3 (Admin Clipboard Desk)

### Page 2: Step-by-Step Review Cockpit (`/review/:id`)
- **Fixed Calm Top Header**:
  - `← Back to Queue` + Project Name + `@username` + Requested Hours (`12h`) + Project Counter (`3 of 128`) + `[P] Prev` and `[N] Next`
- **Progress Stepper Bar**:
  - `[ Step 1: Sanity ] ──► [ Step 2: Double-Dip ] ──► [ Step 3: Shipping ] ──► [ Step 4: Commits ] ──► [ Step 5: AI & Quality ] ──► [ Step 6: Final Verdict ]`
- **Single-Focus Full Width Stage Area**:
  - Step 1: Hackatime Sanity & Velocity (Clean cards, language distribution, bot check)
  - Step 2: Manifest Double-Dip & Past Submissions (Table of submitter's past submissions + automatic net delta calculation)
  - Step 3: Shipping & Demo (Full-width sandboxed interactive iframe, video player, or release binaries)
  - Step 4: Commits & Code Inspection (Clean commit timeline + syntax-highlighted diffs)
  - Step 5: AI & Quality Heuristics (Clean markdown README + agent detection)
  - Step 6: Final Verdict Desk (Checklist, hour adjustments, GitBook justification generator, public feedback)
- **Persistent Bottom Action Bar**:
  - Fail-Fast Reject button (left)
  - Next Step button (right, shortcut: `Enter`)
- **Slide-Out Context Drawer**:
  - Reviewer scratchpad notes and full append-only audit timeline (accessible via `[S]` key or button, without cluttering the screen!)

### Page 3: Dedicated Admin Pre-Approved Desk (`/admin`)
- Full-width standalone dispatch station (no modals!)
- Lists all projects pre-approved by first-pass reviewers
- Shows approved hours, deflated hours, reviewer name, date
- **1-Click "Copy for Live Admin" button**: Copies the exact GitBook qualitative statement into clipboard ready to paste into Live Admin!
