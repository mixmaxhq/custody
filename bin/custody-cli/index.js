#! /usr/bin/env node

require('yargs')
  .command('$0', 'launch the Supervisor frontend',
    (yargs) => {
      return yargs
        .usage('Usage: $0 [options]')
        .options({
          port: {
            alias: 'p',
            describe: 'The port on which supervisor is running. 9001 is the default for Mixmax engineers.',
            type: 'number',
            default: 9001
          },
          notifications: {
            alias: 'n',
            describe: '`true` to enable desktop notifications when processes change state. Experimental--please contribute UX feedback!',
            type: 'boolean',
            default: false
          }
        })
        .example('$0 --notifications');
    },
    (argv) => {
      // Delay requiring custody until we are about to launch the frontend to prevent taking over
      // the screen when other commmands are executed (see the note in custody's main module).
      const custody = require('../..');

      custody(argv)
        .then(() => process.exit(0))
        .catch((err) => {
          if (err.code === 'ECONNREFUSED') {
            console.error(`Error: Supervisor is not running on port ${argv.port}.`);
          } else {
            console.error(err);
          }
          process.exit(1);
        });
    })
  .command('settings', 'configure custody',
    () => {},
    () => {
      require('./openSettings')()
        .then(() => process.exit(0))
        .catch((err) => {
          console.error('Could not open settings:', err);
          process.exit(1);
        });
    })
  .help('h')
  .alias('h', 'help')
  .argv;


