const https = require('https');

/**
 * Fetches stock price from Yahoo Finance API (unofficial)
 * @param {string} ticker - Stock ticker symbol (e.g., 'CCC.L' for UK stocks)
 * @returns {Promise<{price: number, currency: string}>}
 */
const fetchFromYahoo = (ticker) => {
  return new Promise((resolve, reject) => {
    // For UK stocks, append .L if not present
    const symbol = ticker.includes('.') ? ticker : `${ticker}.L`;
    
    const options = {
      hostname: 'query1.finance.yahoo.com',
      path: `/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          
          if (json.chart?.result?.[0]?.meta) {
            const meta = json.chart.result[0].meta;
            const price = meta.regularMarketPrice;
            const currency = meta.currency || 'GBP';
            
            if (price) {
              resolve({ price, currency });
            } else {
              reject(new Error(`No price data available for ${symbol}`));
            }
          } else {
            reject(new Error(`Invalid response for ${symbol}`));
          }
        } catch (err) {
          reject(new Error(`Failed to parse Yahoo Finance response: ${err.message}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`Yahoo Finance request failed: ${err.message}`));
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error(`Yahoo Finance request timed out for ${symbol}`));
    });

    req.end();
  });
};

/**
 * Fetches stock price from Twelve Data API
 * Note: Uses demo API key for testing. In production, use environment variable.
 * @param {string} ticker - Stock ticker symbol
 * @returns {Promise<{price: number, currency: string}>}
 */
const fetchFromTwelveData = (ticker) => {
  return new Promise((resolve, reject) => {
    // For UK stocks, use LSE exchange
    const symbol = ticker.includes('.') ? ticker.replace('.L', '') : ticker;
    const exchange = 'LSE'; // London Stock Exchange
    
    // In production, use: process.env.TWELVE_DATA_API_KEY || 'demo'
    const apiKey = 'demo';
    
    const options = {
      hostname: 'api.twelvedata.com',
      path: `/price?symbol=${encodeURIComponent(symbol)}&exchange=${exchange}&apikey=${apiKey}`,
      method: 'GET'
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          
          if (json.price) {
            resolve({ 
              price: parseFloat(json.price), 
              currency: 'GBP' 
            });
          } else {
            reject(new Error(`No price data from Twelve Data for ${symbol}`));
          }
        } catch (err) {
          reject(new Error(`Failed to parse Twelve Data response: ${err.message}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`Twelve Data request failed: ${err.message}`));
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error(`Twelve Data request timed out for ${symbol}`));
    });

    req.end();
  });
};

/**
 * Fetches stock price with fallback strategy:
 * 1. Try Yahoo Finance first (free, no API key needed)
 * 2. Fall back to Twelve Data if Yahoo fails
 * @param {string} ticker - Stock ticker symbol
 * @returns {Promise<{price: number, currency: string, source: string}>}
 */
const fetchStockPrice = async (ticker) => {
  try {
    const result = await fetchFromYahoo(ticker);
    return { ...result, source: 'yahoo' };
  } catch (yahooErr) {
    console.log(`Yahoo Finance failed for ${ticker}: ${yahooErr.message}, trying Twelve Data...`);
    
    try {
      const result = await fetchFromTwelveData(ticker);
      return { ...result, source: 'twelvedata' };
    } catch (twelveErr) {
      throw new Error(`All price sources failed for ${ticker}. Yahoo: ${yahooErr.message}. Twelve Data: ${twelveErr.message}`);
    }
  }
};

/**
 * Converts price to GBP if needed
 * @param {number} price - Price value
 * @param {string} currency - Currency code
 * @returns {Promise<number>} Price in GBP
 */
const convertToGBP = async (price, currency) => {
  if (currency === 'GBP' || currency === 'GBp') {
    // GBp is pence, convert to pounds
    return currency === 'GBp' ? price / 100 : price;
  }
  
  // For simplicity, if not GBP, return as-is
  // In production, you'd want to use an exchange rate API
  console.warn(`Currency ${currency} is not GBP, returning price as-is`);
  return price;
};

module.exports = {
  fetchStockPrice,
  convertToGBP
};
