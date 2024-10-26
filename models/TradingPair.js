const mongoose = require('mongoose');

const TradingPairSchema = new mongoose.Schema({
  instId: { type: String, required: true, unique: true }, // Instrument ID, e.g., 'BTCUSDT'
  instType: { type: String }, // Instrument type, e.g., 'SPOT'
});

module.exports = mongoose.model('TradingPair', TradingPairSchema);
