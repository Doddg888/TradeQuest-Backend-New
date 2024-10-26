const mongoose = require('mongoose');

const tradingPairSchema = new mongoose.Schema({
  instId: { type: String, required: true, unique: true },
  baseCurrency: { type: String, required: true },
  quoteCurrency: { type: String, required: true },
});

module.exports = mongoose.model('TradingPair', tradingPairSchema);
