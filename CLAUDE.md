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
