import _ from 'underscore';
import { STATES } from '/models/Process';

function processIsHalted(process) {
  return _.contains([STATES.STOPPED, STATES.FATAL], process.effectiveState.state);
}

export default class ToggleStopStart {
  constructor(process) {
    this.process = process;
  }

  get verb() {
    if (processIsHalted(this.process)) {
      return 'stop/{underline}start{/}';
    } else {
      return '{underline}stop{/}/start';
    }
  }

  async toggle() {
    if (processIsHalted(this.process)) {
      await this.process.start();
    } else {
      await this.process.stop();
    }
  }
}
