import blessed from 'blessed';

export default blessed.screen({
  autoPadding: true,
  smartCSR: true,
  title: 'Custody',
  // Enables F12 debug log (destination of `screen.debug` messages).
  debug: true
});
