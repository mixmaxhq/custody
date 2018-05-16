#! /usr/bin/env node

const custody = require('..');

const argv = require('yargs')
  .usage('Usage: $0 [options]')
  .options({
    port: {
      describe: 'The port on which supervisor is running. 9001 is the default for Mixmax engineers.',
      type: 'number',
      default: 9001
    }
  })
  .example('$0')
  .help('h')
  .alias('h', 'help')
  .argv;

custody(argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
