const { EventEmitter } = require('node:events');

class StreamResponse extends EventEmitter {
  constructor() {
    super();
    this.req = new EventEmitter();
    this.req.aborted = false;
    this.frames = [];
    this.headers = {};
    this.destroyed = false;
    this.writableEnded = false;
    this.acceptWrites = true;
  }
  setHeader(name, value) { this.headers[name] = value; }
  flushHeaders() { this.flushed = true; }
  write(frame) { this.frames.push(frame); return this.acceptWrites; }
  destroy() { this.destroyed = true; this.emit('close'); }
  events(name) {
    return this.frames.filter(frame => frame.startsWith(`event: ${name}\n`))
      .map(frame => JSON.parse(frame.split('data: ')[1].trim()));
  }
  changes() { return this.events('availability_changed'); }
}
module.exports = { StreamResponse };
