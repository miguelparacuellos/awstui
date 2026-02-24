# aws-tui

Terminal UI tool built with TypeScript and Ink to manage AWS resources without leaving the terminal.

## Stack

- TypeScript (strict mode)
- Ink + React (terminal UI)
- AWS SDK v3 for Node.js

## Architecture

- `src/aws/` — pure functions, no UI logic, all AWS SDK calls live here
- `src/components/` — Ink components
- `src/hooks/` — custom React hooks
- `src/state/` — global state (active profile, current screen, loaded data)

## Decisions

- AWS profiles read from ~/.aws/credentials and ~/.aws/config directly
- No auto-refresh. All data loads on demand, user triggers refresh manually
- No retry logic. Show error message and done
- Debounce on all filter inputs to avoid AWS rate limiting
- Scroll implemented manually with offset state or ink-scroll-list
- Keyboard-driven: arrows to navigate, Enter to select, Esc to go back, r to refresh

## Code style

- Functional components only
- Explicit error handling (no silent catches)
- Simple and readable over clever

## UI/UX principles

This is a tool used daily by a developer. The experience should feel polished
and intentional, not like a rough CLI script.

- Use color meaningfully: green for healthy/success, yellow for warnings/pending,
  red for errors, dim/gray for secondary info
- Show status at a glance: task counts, deploy status, errors should be readable
  in under a second without parsing text
- Always show context: active profile and current location visible at all times
  (breadcrumb style, e.g. "aws-tui › CloudWatch › my-log-group")
- Loading states: always show a spinner with a descriptive label while fetching
- Empty states: if a list is empty, say why ("No log groups found" not just blank)
- Keyboard hints: show available keys at the bottom of each screen
  (e.g. "↑↓ navigate · enter select · r refresh · esc back")
- Consistent layout: header at top, content in middle, key hints at bottom
- Borders and spacing: use Box borders to separate sections, give content room to breathe
