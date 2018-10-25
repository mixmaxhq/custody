import blessed from 'blessed';

/**
 * @type {Screen}
 *
 * You must call `initialize` before using this variable or any of the other APIs in this module.
 */
let screen;

// Note that this must be exported using `{ screen as default }` vs. `default screen` or else the
// live binding won't work: https://github.com/rollup/rollup/issues/2524
export { screen as default };

// Enabling anything that's scrollable/hoverable/clickable will cause blessed to take over mouse
// events. The debug log counts since it's scrollable, thus `mouseEnabled` is `true` by default. As
// far as I can tell, blessed will never itself disable the mouse (without us disabling it or
// calling methods that disable it), so this wrapper should be accurate.
export let mouseEnabled = true;

/**
 * Initializes a Blessed screen, taking over rendering.
 *
 * You must call `screen.destroy()` to return control of the screen to the Terminal.
 *
 * Idempotent.
 */
export function initialize() {
  if (screen) return;

  screen = blessed.screen({
    autoPadding: true,
    smartCSR: true,
    title: 'Custody',
    // Enables F12 debug log (destination of `screen.debug` messages).
    debug: true
  });

  screen.key('f12', () => {
    // Override `mouseEnabled` as long as the debug log is shown, so it can be scrolled.
    // Then reset the enabled state afterward.
    if (screen.debugLog.hidden) {
      if (!mouseEnabled) screen.program.disableMouse();
    } else {
      screen.program.enableMouse();
    }
  });
}

/**
 * Enables or disables blessed's handling of mouse events.
 *
 * blessed needs to handle mouse events in order to support hovering and clicking. However, mouse
 * handling must be disabled in order to enable native terminal text selection:
 * https://github.com/chjj/blessed/issues/263#issuecomment-392290076. Luckily, disabling
 * mouse handling will also enable native terminal scrolling, which may be desirable anyway for
 * usability reasons: https://github.com/mixmaxhq/custody/issues/37#issuecomment-390855414.
 *
 * @param {Boolean} enable - `true` to enable blessed's handling of mouse events, `false` to disable
 *   it (and re-enable normal terminal handling of mouse events).
 */
export function enableMouse(enable) {
  if (enable) {
    screen.program.enableMouse();
  } else {
    screen.program.disableMouse();
  }
  mouseEnabled = enable;
}
