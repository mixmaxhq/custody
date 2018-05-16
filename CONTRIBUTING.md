## How to build and run the local project

Run `npm run watch` to automatically rebuild the project when the files change. You'll have to
manually restart the app though (maybe we can livereload it somehow? #13).

Run `npm run start` to run the local project--or use `npm link` (with no arguments) to link the
local project as a global binary.

Pass arguments through `npm run start` like so: `npm run start -- --notifications`.

## Development tips

Don't use `console.log` since it'll overwrite the app's output. Instead, `import screen` and do
`screen.debug`. Those logs will show up in the Debug log pane that appears if you press F12.

It's ok to use `console.error` if you're about to exit the process.
