const axios = require('axios');

const fetchTradingPairs = async () => {
    try {
        const response = await axios.get('https://api.bitget.com/api/v2/spot/public/symbols');
        return response.data.data;  // Adjust based on the exact structure of Bitget's response
    } catch (error) {
        console.error('Error fetching trading pairs:', error);
        throw error;
    }
};

module.exports = { fetchTradingPairs };
