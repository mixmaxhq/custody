# custody — repo card

> A map, not a manual. Keep it ~1 screen; point to detail, don't inline it.

## What it is
A realtime terminal UI (TUI) developer tool that gives a richer view of a Supervisor-managed local microservices environment: live process status, log tailing, and stop/start/restart controls — all with minimum keystrokes. Published publicly as `@custody/cli` on npm.

## serves
role: CLI dev tool — terminal frontend for Supervisor (process monitoring, log tailing, EADDRINUSE auto-recovery)
referenced-by: [Mixmax local dev environment, custody-probe (sibling repo reports server health into custody), developers running Supervisor on port 9001]

## Code map
- CLI entry point     -> `bin/custody-cli/index.js`  (yargs, port/notifications flags)
- App entry (JSX)    -> `src/index.jsx`              (bootstraps screen, plugins, supervisor connection)
- React components   -> `src/components/`            (Console, FileLog, ProcessTable, processDetails, commandMenu)
- Data models        -> `src/models/`                (Process, Plugin, commands, history)
- Utilities          -> `src/utils/`                 (supervisor XML-RPC client, processMonitor, string helpers)
- Plugin registry    -> `src/registry/`
- Build output       -> `dist/index.js`              (rollup bundle; not committed)

## Conventions
- React + `@mixmaxhq/blessed` / `react-blessed` for terminal rendering — not a browser UI
- Absolute imports rooted at `src/` (e.g. `import Foo from '/components/Foo'`) via `rollup-plugin-root-import`
- Built with Rollup + Babel; config in `rollup.config.js`; run `npm run build` before testing CLI changes
- Supervisor connection defaults to port 9001; override with `--port`
- State shared with custody-probe via `CUSTODY_PROC_DIR` (default `/usr/local/var/custody`)

## Gotchas
- Node 10.16.0 introduced a file-watch regression that causes high CPU when tailing logs — test under a different Node version (see README)
- `CUSTODY_PROC_DIR` must be configured carefully when overriding; see issue #80 before changing it
- Dependencies include native addons (`kexec`) — `npm install` may require build tools

## Run / test
```sh
npm install          # install deps (legacy lockfile — npm, not pnpm)
npm run build        # compile src/ → dist/ via rollup
npm run watch        # rebuild on change (WATCH=true)
custody-cli          # run the built CLI (must have Supervisor running on --port 9001)
npm publish          # publish @custody/cli to npm (publishConfig.access=public)
```
No automated test suite is present in this repo.

## Load the matching domain card
This repo is cross-cutting tooling — it owns no product domain, so there is no domain card to load. When working here, load the card of the consuming service/domain if the change is driven by its needs.
