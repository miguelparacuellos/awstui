# aws-tui

A keyboard-driven terminal UI for managing AWS resources without leaving your terminal.

## Features

- **ECS** — browse clusters, services, view service details, and trigger force deploys
- **CloudWatch Logs** — browse log groups, streams, and tail log events with filtering
- **Profile switching** — select any AWS profile from `~/.aws/credentials` / `~/.aws/config`

## Requirements

- Node.js 18+
- AWS credentials configured (`~/.aws/credentials` or environment variables)

## Install

```sh
git clone https://github.com/your-username/aws-tui
cd aws-tui
npm install
```

Then link the `awstui` command globally:

```sh
npm link
```

This creates a global `awstui` command that points to the local source, so any changes you make are reflected immediately without re-linking.

## Run

From anywhere in your terminal:

```sh
awstui
```

Or during development without linking:

```sh
npm run dev
```

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate list |
| `Enter` | Select / confirm |
| `Esc` | Go back |
| `r` | Refresh current view |
| `/` or type | Filter list |
| `q` | Quit |

## Project structure

```
src/
  aws/          # AWS SDK calls (pure functions, no UI logic)
  components/   # Ink/React terminal components
  hooks/        # Custom React hooks
  state/        # Global app state (profile, screen, data)
  index.tsx     # Entry point
```

## Stack

- [Ink](https://github.com/vadimdemedes/ink) + React — terminal UI
- [AWS SDK v3](https://github.com/aws/aws-sdk-js-v3) — AWS API calls
- TypeScript (strict mode)
