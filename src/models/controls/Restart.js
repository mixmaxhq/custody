export default class Restart {
  constructor(process) {
    this.process = process;
  }

  get verb() {
    return 'restart';
  }

  async toggle() {
    await this.process.restart();
  }
}
