import { effectiveState, STATES } from '/utils/process';

export default class ToggleStopStart {
  constructor(process) {
    this.process = process;
  }

  get verb() {
    if (effectiveState(this.process).state === STATES.STOPPED) {
      return 'stop/{underline}start{/}';
    } else {
      return '{underline}stop{/}/start';
    }
  }

  async toggle() {
    if (effectiveState(this.process).state === STATES.STOPPED) {
      await this.process.start();
    } else {
      await this.process.stop();
    }
  }
}
