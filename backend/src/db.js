const mongoose = require('mongoose');
const cfg = require('./config');
module.exports = () => mongoose.connect(cfg.mongo);
