# Student Finance Tracker

**Theme:** Student Finance Tracker (Theme 1) — budgets, transactions, search.

**Live demo:** https://blewis-bump.github.io/alu-front-end/#dashboard
**demo video:** https://youtu.be/TgmX2cXt5c8
**Wire-frame:** https://canva.link/yju1u1jc5f2nss8

## How to Run

1. Clone the repository
2. Open `index.html` with VS Code Live Server
3. App runs at `http://127.0.0.1:5500` — no build step, no dependencies

---

## Features

- Add, edit, and delete expense transactions across six categories: Food, Books, Transport, Entertainment, Fees, Other
- Regex-validated form with real-time inline error messages (4 rules + 1 advanced)
- Transactions table with sort by date, description, or amount
- Live regex search with case-insensitive toggle and `<mark>` match highlighting
- Dashboard: total records, total expenses, top spending category, 7-day trend bar chart
- Monthly spending cap with ARIA live alerts (polite when under, assertive when exceeded)
- Currency conversion: USD base + EUR + RWF with manual rates in Settings
- Import and export transaction data as JSON with structural validation
- Data stored in `localStorage` — no login, no server required
- Fully keyboard-navigable; mobile-first across three breakpoints (360px, 768px, 1024px)

---

## Regex Catalog

| Pattern | Field | Purpose | Matches | Rejects |
|---|---|---|---|---|
| `/^\S(?:.*\S)?$/` | Description | No leading or trailing whitespace | `"Lunch at cafe"` | `" Lunch"`, `"Lunch "` |
| `/^(0\|[1-9]\d*)(\.\d{1,2})?$/` | Amount | Valid monetary value, no leading zeros, max 2 decimal places | `"12.50"`, `"0"` | `"01.50"`, `"1.999"`, `"-5"` |
| `/^\d{4}-(0[1-9]\|1[0-2])-(0[1-9]\|[12]\d\|3[01])$/` | Date | Strict YYYY-MM-DD format | `"2026-06-18"` | `"2026-13-01"`, `"2026-06-00"` |
| `/^[A-Za-z]+(?:[ -][A-Za-z]+)*$/` | Category | Letters only, words separated by spaces or hyphens | `"Food"`, `"Non-Food"` | `"Food123"`, `"Food@"` |
| `/\b(\w+)\s+\1\b/i` | Description | **Advanced (back-reference):** flags adjacent duplicate words | `"the the coffee"` → error | `"coffee shop"` → ok |
| `try { new RegExp(input) } catch { return null }` | Search | Safe compiler — invalid patterns fall back to showing all records | Any valid regex | `[[[` → no crash |

---

## Keyboard Map

| Key | Action |
|---|---|
| `Tab` | Move focus forward |
| `Shift + Tab` | Move focus backward |
| `Enter` / `Space` | Activate focused button or link |
| `Tab` on first load | Reaches *"Skip to main content"* link before the nav |
| `Enter` on skip link | Jumps focus to `<main>`, bypassing navigation |
| Arrow keys | Navigate `<select>` dropdowns |

---

## Accessibility Notes

- **Semantic landmarks:** `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>` throughout; headings follow `h1 → h2 → h3`
- **Skip link:** Off-screen by default, visible on focus, targets `#main-content`
- **Focus styles:** 3px orange outline on all interactive elements — never suppressed
- **Labels:** Every `<input>` and `<select>` has a matching `<label for="...">`
- **ARIA live regions:** `role="status" aria-live="polite"` for confirmations and status; switches to `assertive` when budget cap is exceeded; form error `<span>` elements each have `aria-live="polite"`
- **Accessible chart:** Each trend bar has `role="img"` and `aria-label="YYYY-MM-DD: $X.XX"`
- **Keyboard flow:** All features (add, edit, delete, search, sort, import, export) work without a mouse

---

## How to Run Tests

**Manual tests:** See [`tutorial.md`](tutorial.md) — step-by-step tests per page, each mapped to an assignment requirement.

**Automated regex tests:** Open [`tests.html`](tests.html) in the browser. Runs assertions against all regex patterns and reports pass/fail for each case.

**Seed data:** Import [`seed.json`](seed.json) from the Settings page to load 15 sample transactions across all categories.
