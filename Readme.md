# Falbit Utils

Utility functions for universal pure arbitrage strategy using TypeScript. This package supports both order book and amm systems, allowing flexible usage for different types of exchanges.

## Installation

Include the SDK in your project by adding it to your dependencies:

```bash
npm install --save @pfalcon/falbit-utils
```

## Usage

1. Pure arbitrage usage

```typescript
import { ArbitrageEngine } from "@pfalcon/falbit-utils";

// Initialize the engine
const arbEngine = new ArbitrageEngine();

// Initialize exchange connection API (with your options)
const binanceAPI = new BinanceAPI();
const krakenAPI = new KrakenAPI();

// Subscribe to order book and update data on engine
binanceAPI.getOrderBook("BTC_USDT").then((orderBook) => {
  arbEngine.updateOrderBook("BTC_USDT", "binance", orderBook);
});
krakenAPI.getOrderBook("BTC_USDT").then((orderBook) => {
  arbEngine.updateOrderBook("BTC_USDT", "kraken", orderBook);
});

// Interval check arbitrage opportunity
setInterval(() => {
  try {
    const result = arbEngine.calculatePureArb({
      exchange0: "binance",
      exchange1: "kraken",
      token0: "BTC",
      token1: "USDT",
      amountIn: 100,
      fee0: 0,
      fee1: 0,
    });
    console.log("No fee: ", result);
    /*
        Output:
        No fee:  {
            route: {
                route: [ 'USDT', 'BTC', 'USDT' ],
                exchanges: [ '', 'binance', 'kraken'],
                fees: [ 0, 0, 0 ],
                amountIn: 100
            },
            amountsOut: [ 100, 0.0033, 101 ]
        }
    */

    const resultWithFee = arbEngine.calculatePureArb({
      exchange0: "binance",
      exchange1: "kraken",
      token0: "BTC",
      token1: "USDT",
      amountIn: 100,
      fee0: 0.001,
      fee1: 0.001,
    });
    console.log("With fee: ", resultWithFee);
    /*
        Output:
        With fee:  {
            route: {
                route: [ 'USDT', 'BTC', 'USDT' ],
                exchanges: [ '', 'kraken', 'binance'],
                fees: [ 0, 0.001, 0.001 ],
                amountIn: 100
            },
            amountsOut: [ 100, 0.0029, 99.97 ]
        }
    */
  } catch (e) {
    console.error(e);
  }
}, 1000);
```

## Important Notes
1. The symbols used in the engine should conform this format: `{BASE}_{QUOTE}`, e.g. BTC_USDT, ETH_BTC, etc.
2. When calculating `getAmountOut` function, the engine will determine trade direction by considering the symbol format regarding the initilize symbol that is updated in the engine. 
For example, if the engine is initialized with symbol `BTC_USDT`, then using `getAmountOut('BTC_USDT')` means selling BTC to USDT (`BTC -> USDT`). In contrast, using `getAmountOut('USDT_BTC')` means buying BTC using USDT (`USDT -> BTC`).
3. Order book data must be in this format:
```typescript
type OrderBook = {
  bids: { size: number, price: number }[];
  asks: { size: number, price: number }[];
}
```


## Support

For issues and feature requests, please [open an issue](link-to-your-issue-tracker) on GitHub.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
