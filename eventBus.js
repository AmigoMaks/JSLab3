const EventEmitter = require('events');

class StatsEmitter extends EventEmitter {}
const eventBus = new StatsEmitter();

module.exports = eventBus;