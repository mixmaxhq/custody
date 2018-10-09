export default class Plugin {
  constructor(schema, opts = {}) {
    this._schema = schema;
    this._opts = opts;
  }

  commands(process) {
    if (!this._schema.commands) return [];
    return this._schema.commands(process, { opts: this._opts });
  }
}
