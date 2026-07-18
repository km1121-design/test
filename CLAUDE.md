# CLAUDE.md

Guidance for AI assistants (Claude Code) working in this repository.

## What this repo is

`km1121-design/test` is a small **monorepo of internal browser tools** for a
Japanese logistics business (Gooner運送事業部 / "Gooner delivery division").
There is no single application — the repo bundles four independent tools that
are built/copied together and published as one static **GitHub Pages** site.

All user-facing text, code comments, and documentation are in **Japanese**.
Preserve this convention: write UI text, README content, and commit messages
in Japanese unless the user asks otherwise.

## Repository layout

| Path | Tool | Stack | Build? |
| --- | --- | --- | --- |
| `dashboard/` | 経営分析ダッシュボード (management analytics + What-If simulator) | React 19 + TypeScript + Vite + Tailwind v4 + lucide-react | Yes (Vite) |
| `invoice-tool/` | 請求書作成ツール (invoice creator, PDF via print) | Vanilla JS / HTML / CSS | No |
| `expense-app/` | 経費申請アプリ (expense requests, receipt OCR) | Vanilla JS / HTML / CSS | No |
| `apps-script/` | Backend for `expense-app` (Sheets DB + Drive image storage) | Google Apps Script (`Code.gs`) | No (deployed in Google) |
| `pages-root/` | Landing page linking to the three web tools | Static HTML | No |
| `docs/` | Requirements & spec documents (Japanese) | Markdown | — |
| `.github/workflows/` | GitHub Pages deploy pipeline | GitHub Actions | — |

The three vanilla tools (`invoice-tool/`, `expense-app/`, `pages-root/`) run by
opening `index.html` directly — no build step, no server. Keep them that way.

## Build, run, and lint

Only `dashboard/` has a toolchain. From `dashboard/`:

```bash
npm install
npm run dev      # dev server
npm run build    # tsc -b && vite build → dist/
npm run preview  # preview the production build
npm run lint     # oxlint
```

- Node 20 (matches CI). `npm ci` is used in CI, so keep `package-lock.json` committed.
- Vite is configured with `base: './'` — the build must work from any Pages
  subpath. Do not hardcode absolute asset paths.
- Lint is **oxlint** (see `dashboard/.oxlintrc.json`), not ESLint. Rules of
  Hooks is an error; `react/only-export-components` is a warning.
- The vanilla tools have no lint/build/test commands. Verify them by opening
  the HTML in a browser.

There are currently **no automated tests** in any tool.

## Deployment (important)

`.github/workflows/deploy-pages.yml` publishes to GitHub Pages on **push to
`main`** (or manual `workflow_dispatch`), only when files under
`invoice-tool/`, `expense-app/`, `dashboard/`, `pages-root/`, or the workflow
itself change.

The job assembles `_site/` like this:

- `pages-root/` → site root (the landing page)
- `invoice-tool/` → `/invoice-tool/`
- `expense-app/` → `/expense-app/`
- `dashboard/dist/` (built) → `/dashboard/`

So a tool's public URL mirrors its directory name. When you add a new tool,
update **both** the workflow's `paths:` filter and the `Assemble Pages site`
step, and add a card to `pages-root/index.html`.

## Key conventions

### Runs in constrained/iframe environments
Tools are designed to work offline and inside sandboxed iframes:
- **Do not use `alert()` / `confirm()` / `prompt()`.** The dashboard ships a
  custom toast UI (`dashboard/src/components/ToastProvider.tsx` +
  `useToast`); follow that pattern instead.
- Dependencies that must work offline (e.g. `lucide-react` icons) are bundled,
  not loaded from a CDN. Exception: `expense-app` loads Tesseract.js OCR and
  its language data from a CDN at analysis time (network needed only then).

### Dashboard architecture (`dashboard/src/`)
- `data/` — mock master data (drivers, vehicle expenses, enterprise projects,
  field-bug log) and **all tunable constants in `data/constants.ts`**. Business
  calculation defaults live there; change numbers there, not inline.
- `hooks/useSimulator.ts` — the What-If calculation engine. Pure
  `computeSimulation()` wrapped in `useMemo`; input ranges in
  `SIMULATOR_RANGES`, defaults in `DEFAULT_SIMULATOR_INPUTS`.
- `types.ts` — shared domain types (all commented in Japanese).
- `components/ui/` — reusable primitives (Card, Badge, Slider, StatTile,
  ProgressBar). `components/tabs/` — the four analytics views.
- Styling is Tailwind v4 utility classes with CSS variables (e.g.
  `bg-[var(--page)]`); no separate CSS modules.

### Vanilla tools (`invoice-tool/`, `expense-app/`)
- Single `script.js` in `'use strict'`, no framework, no bundler.
- State persists to `localStorage` under namespaced keys
  (`invoiceTool.draft.v1`, `expense-app:*`).
- `expense-app` uses JSDoc `@typedef` for its data shapes — keep types in sync
  when editing.

### expense-app ↔ Apps Script contract
`expense-app/script.js` talks to the Apps Script Web App (`apps-script/Code.gs`):
- Spreadsheet (`expenses` sheet) is the source of truth; localStorage is a
  read cache + offline resend queue.
- API: `GET ?token=` returns all records; `POST` (text/plain JSON) with
  `action: "create" | "update" | "delete"`.
- The record/column schema is documented in `apps-script/README.md` — if you
  change fields, update the Sheet columns, the `Code.gs` handler, and the
  client together.

## Git workflow

- Default branch: `main`. Feature work happens on `claude/...` branches and
  merges to `main` via PR; merging to `main` triggers the Pages deploy.
- Push with `git push -u origin <branch>`.
- **Do not open a pull request unless the user explicitly asks.**
- Commit messages in this repo are written in Japanese, matching history.

## Where to look first

- Overview & per-tool feature lists: root `README.md`.
- Dashboard requirements / business logic: `docs/gooner-dashboard-requirements.md`.
- Expense app spec: `docs/expense-app-spec.md`.
- Backend setup & data schema: `apps-script/README.md`.
