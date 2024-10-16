const mongoose = require('mongoose');

const TradeSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  symbol: {
    type: String,
    required: true,
  },
  orderType: {
    type: String,
    required: true,
    enum: ['market', 'limit'], // Valid order types
  },
  entryPoint: {
    type: Number,
    required: function () {
      return this.orderType === 'limit'; // Only required for limit orders
    },
  },
  stopLoss: {
    type: Number,
    default: null, // Optional
  },
  takeProfit: {
    type: Number,
    default: null, // Optional
  },
  margin: {
    type: Number,
    required: true,
  },
  leverage: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number, // Quantity is not required, will be calculated
    default: 0,
  },
  status: {
    type: String,
    default: 'open',
  },
  executedAt: {
    type: Date,
    default: null,
  },
});

const Trade = mongoose.model('Trade', TradeSchema);

module.exports = Trade;
