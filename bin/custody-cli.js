#! /usr/bin/env node

const custody = require('..');

const argv = require('yargs')
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
  .example('$0 --notifications')
  .help('h')
  .alias('h', 'help')
  .argv;

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
