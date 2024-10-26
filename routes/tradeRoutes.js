const express = require('express');
const Trade = require('../models/Trade');
const router = express.Router();

// Create a new trade
router.post('/', async (req, res) => {
  const { userId, symbol, entryPoint, stopLoss, takeProfit } = req.body;
  const trade = new Trade({ userId, symbol, entryPoint, stopLoss, takeProfit });
  
  try {
    await trade.save();
    res.status(201).json(trade);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all trades for a user
router.get('/:userId', async (req, res) => {
  try {
    const trades = await Trade.find({ userId: req.params.userId });
    res.json(trades);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update trade status
router.patch('/:id', async (req, res) => {
  try {
    const trade = await Trade.findById(req.params.id);
    if (!trade) return res.status(404).json({ message: 'Trade not found' });

    trade.isOpen = false;
    trade.closedAt = new Date();
    // Update unrealizedPnL based on your logic

    await trade.save();
    res.json(trade);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
