const openSettings = require('./openSettings');
const CONFIG_PATH = require('./settingsPath');

exports.command = 'settings [command]';

exports.describe = 'manage custody\'s settings';

exports.builder = (yargs) => {
  return yargs
    .command('$0', 'opens custody\'s settings in an editor',
      () => {},
      () => {
        openSettings()
          .catch((err) => {
            console.error('Could not open settings:', err);
            process.exit(1);
          });
      })
    .command('path', 'print the location of custody\'s settings',
      () => {},
      () => {
        console.log(CONFIG_PATH);
      });
};

exports.handler = () => {
  // Nothing to do since commands above consume argv.
};
