import { ArbitrageEngine, OrderBooks, ReservePool } from "../src"; // Update the path to your class

describe("ArbitrageEngine", () => {
  let engine: ArbitrageEngine;

  beforeEach(() => {
    engine = new ArbitrageEngine();
  });

  describe("updateOrderBooks", () => {
    it("should update order books", () => {
      const exchange = "testExchange";
      const pair = "BTC_USD";
      const orderbooks: OrderBooks = { bids: [], asks: [] };

      engine.updateOrderBooks(exchange, pair, orderbooks);

      expect(engine.getOrderBooks(exchange, pair)).toEqual(orderbooks);
    });

    it("should throw an error if reverse orderbooks already exist", () => {
      const exchange = "testExchange";
      const pair = "BTC_USD";
      const reversePair = "USD_BTC";
      const orderbooks: OrderBooks = { bids: [], asks: [] };

      engine.updateOrderBooks(exchange, reversePair, orderbooks);

      expect(() =>
        engine.updateOrderBooks(exchange, pair, orderbooks)
      ).toThrowError(`updateOrderBooks: reverse orderbooks already exists`);
    });
  });

  describe("updateReserves", () => {
    it("should update reserves", () => {
      const exchange = "testExchange";
      const pair = "BTC_USD";
      const reserves: ReservePool = { r0: 100, r1: 100 };

      engine.updateReserves(exchange, pair, reserves);

      expect(engine.getReserves(exchange, pair)).toEqual(reserves);
    });

    it("should throw an error if reverse reserves already exist", () => {
      const exchange = "testExchange";
      const pair = "BTC_USD";
      const reversePair = "USD_BTC";
      const reserves: ReservePool = { r0: 100, r1: 100 };

      engine.updateReserves(exchange, reversePair, reserves);

      expect(() =>
        engine.updateReserves(exchange, pair, reserves)
      ).toThrowError(`updateReserves: reverse reserves already exists`);
    });
  });

  describe("getAmountOut with Order Book", () => {
    const orderBooks: OrderBooks = {
      bids: [{ price: 900, size: 10 }],
      asks: [{ price: 1100, size: 10 }],
    };

    it("should calculate the amount out when selling", () => {
      engine.updateOrderBooks("exchange1", "BTC_USD", orderBooks);
      const result = engine.getAmountOut({
        exchange: "exchange1",
        pair: "BTC_USD",
        amountIn: 5,
      });
      expect(result.amountOut).toBeCloseTo(4500);
    });

    it("should calculate the amount out when buying", () => {
      engine.updateOrderBooks("exchange1", "BTC_USD", orderBooks);
      const result = engine.getAmountOut({
        exchange: "exchange1",
        pair: "USD_BTC",
        amountIn: 500,
      });
      expect(result.amountOut).toBeCloseTo(0.4545454545);
    });

    it("should throw an error when no orderbooks or reserves found", () => {
      expect(() => {
        engine.getAmountOut({
          exchange: "exchange1",
          pair: "BTC_USD",
          amountIn: 5,
        });
      }).toThrowError(`_getAmountOutOrderBook: no orderbooks found`);
    });

    it("should correctly apply fee when calculating amount out", () => {
      const fee = 0.02; // 2% fee
      engine.updateOrderBooks("exchange1", "BTC_USD", orderBooks);
      const resultWithoutFee = engine.getAmountOut({
        exchange: "exchange1",
        pair: "BTC_USD",
        amountIn: 5,
      });
      const resultWithFee = engine.getAmountOut({
        exchange: "exchange1",
        pair: "BTC_USD",
        amountIn: 5,
        fee: fee,
      });
      expect(resultWithFee.amountOut).toBeCloseTo(
        resultWithoutFee.amountOut * (1 - fee)
      );
    });

    // Test Multiple Level Order Books
    it("should correctly handle multiple level order books", () => {
      const multiLevelOrderBooks: OrderBooks = {
        bids: [
          { price: 900, size: 10 },
          { price: 800, size: 10 },
          { price: 700, size: 10 },
        ],
        asks: [
          { price: 1100, size: 10 },
          { price: 1200, size: 10 },
        ],
      };
      engine.updateOrderBooks("exchange1", "BTC_USD", multiLevelOrderBooks);
      const result = engine.getAmountOut({
        exchange: "exchange1",
        pair: "BTC_USD",
        amountIn: 25,
      });
      // Expected result based on your order book calculation logic
      expect(result.amountIn).toBeCloseTo(25);
      expect(result.amountOut).toBeCloseTo(20500);
    });

    // Test Exceed Volume Input Amount
    it("should handle exceed volume input amount", () => {
      const largeAmount = 100; // This should be larger than the total volume in the order book
      engine.updateOrderBooks("exchange1", "BTC_USD", orderBooks);
      const result = engine.getAmountOut({
        exchange: "exchange1",
        pair: "BTC_USD",
        amountIn: largeAmount,
      });
      expect(result.amountIn).toBe(10);
      expect(result.amountOut).toBe(9000);
    });
  });

  describe("getAmountOut with AMM", () => {
    const reserves: ReservePool = { r0: 1, r1: 1000 };

    it("should calculate the amount out using AMM", () => {
      engine.updateReserves("exchange1", "BTC_USD", reserves);
      const result = engine.getAmountOut({
        exchange: "exchange1",
        pair: "BTC_USD",
        amountIn: 0.1,
        orderType: "amm",
      });
      expect(result.amountOut).toBeCloseTo(90.9090909091); // Expected result based on the provided AMM formula
    });

    // Test Fee Calculation with AMM
    it("should correctly apply fee when calculating amount out using AMM", () => {
      const fee = 0.02; // 2% fee
      engine.updateReserves("exchange1", "BTC_USD", reserves);
      const resultWithoutFee = engine.getAmountOut({
        exchange: "exchange1",
        pair: "BTC_USD",
        amountIn: 0.1,
        orderType: "amm",
      });
      const resultWithFee = engine.getAmountOut({
        exchange: "exchange1",
        pair: "BTC_USD",
        amountIn: 0.1,
        fee: fee,
        orderType: "amm",
      });
      expect(resultWithFee.amountOut).toBeCloseTo(
        resultWithoutFee.amountOut * (1 - fee)
      );
    });

    // Test Exceed Volume Input Amount with AMM
    it("should handle exceed volume input amount using AMM", () => {
      const largeAmount = 10; // This should be larger than the total available in the reserve
      engine.updateReserves("exchange1", "BTC_USD", reserves);
      const result = engine.getAmountOut({
        exchange: "exchange1",
        pair: "BTC_USD",
        amountIn: largeAmount,
        orderType: "amm",
      });
      // Expected behavior when exceeding the volume (e.g., return the maximum possible value, throw an error, etc.)
      expect(result.amountOut).toBeCloseTo(909.09090909091); // Replace 'expectedBehavior' with your expected outcome
    });
  });

  describe("getAmountIn with Order Books", () => {
    const orderBooks: OrderBooks = {
      bids: [{ price: 900, size: 10 }],
      asks: [{ price: 1100, size: 10 }],
    };

    it("should calculate the correct amount in when selling", () => {
      engine.updateOrderBooks("exchange1", "BTC_USD", orderBooks);
      const result = engine.getAmountIn({
        exchange: "exchange1",
        pair: "BTC_USD",
        amountOut: 4500,
      });
      expect(result.amountIn).toBeCloseTo(5); // Amount out divided by the bid price
    });

    it("should calculate the correct amount in when selling with fee", () => {
      engine.updateOrderBooks("exchange1", "BTC_USD", orderBooks);
      const resultWithoutFee = engine.getAmountIn({
        exchange: "exchange1",
        pair: "BTC_USD",
        amountOut: 4500,
      });
      const resultWithFee = engine.getAmountIn({
        exchange: "exchange1",
        pair: "BTC_USD",
        amountOut: 4500,
        fee: 0.01
      });
      expect(resultWithFee.amountIn).toBeCloseTo(resultWithoutFee.amountIn * (1 + 0.01));
    });

    it("should calculate the correct amount in when buying", () => {
      engine.updateOrderBooks("exchange1", "BTC_USD", orderBooks);
      const result = engine.getAmountIn({
        exchange: "exchange1",
        pair: "USD_BTC",
        amountOut: 2,
      });
      expect(result.amountIn).toBeCloseTo(2200); // Amount out divided by the bid price
    });

    it("should calculate the correct amount in when buying with fee", () => {
      engine.updateOrderBooks("exchange1", "BTC_USD", orderBooks);
      const resultWithoutFee = engine.getAmountIn({
        exchange: "exchange1",
        pair: "USD_BTC",
        amountOut: 2,
      });
      const resultWithFee = engine.getAmountIn({
        exchange: "exchange1",
        pair: "USD_BTC",
        amountOut: 2,
        fee: 0.01
      });
      expect(resultWithFee.amountIn).toBeCloseTo(resultWithoutFee.amountIn * (1 + 0.01)); // Amount out divided by the bid price
    });

    // Test with Multiple Level Order Books
    it("should handle multiple level order books when calculating amount in", () => {
      const multiLevelOrderBooks: OrderBooks = {
        bids: [
          { price: 900, size: 10 },
          { price: 800, size: 10 },
          { price: 700, size: 10 },
        ],
        asks: [
          { price: 1100, size: 10 },
          { price: 1200, size: 10 },
        ],
      };
      engine.updateOrderBooks("exchange1", "BTC_USD", multiLevelOrderBooks);
      const amountOut = 26000;
      const result = engine.getAmountIn({
        exchange: "exchange1",
        pair: "BTC_USD",
        amountOut: amountOut,
      });
      expect(result.amountIn).toBeCloseTo(30);
      expect(result.amountOut).toBeCloseTo(24000);
    });
  });

  describe("getAmountIn with AMM", () => {
    const reserves: ReservePool = { r0: 100, r1: 1000 };

    // k = 100 * 1000 = 100000
    // r1 = 1000 - 10 = 990, r0 = k / r1 = 100000 / 990 = 101.0101010101
    // amountIn = 101.0101010101 - 100 = 1.0101010101
    it("should calculate the amount in for a given amount out (sell)", () => {
      engine.updateReserves("exchange1", "BTC_USD", reserves);
      const result = engine.getAmountIn({
        exchange: "exchange1",
        pair: "BTC_USD",
        amountOut: 10,
        orderType: "amm",
      });
      expect(result.amountIn).toBeCloseTo(1.0101010101); // Replace with actual expected value
    });

    // k = 100 * 1000 = 100000
    // r1 = 1000 - 10 = 990, r0 = k / r1 = 100000 / 990 = 101.0101010101
    // amountIn = 101.0101010101 - 100 = 1.0101010101
    // amountInWithFee = 1.0101010101 * (1 + 0.03) = 1.0414213141
    it("should calculate the amount in for a given amount out with fee (sell)", () => {
      engine.updateReserves("exchange1", "BTC_USD", reserves);
      const resultWithoutFee = engine.getAmountIn({
        exchange: "exchange1",
        pair: "BTC_USD",
        amountOut: 10,
        orderType: "amm",
      });
      const resultWithFee = engine.getAmountIn({
        exchange: "exchange1",
        pair: "BTC_USD",
        amountOut: 10,
        orderType: "amm",
        fee: 0.03,
      });
      expect(resultWithFee.amountIn).toBeCloseTo(
        resultWithoutFee.amountIn * (1 + 0.03)
      ); // Replace with actual expected value
    });

    // k = 100 * 1000 = 100000
    // r0 = 100 - 10 = 90, r1 = k / r0 = 100000 / 90 = 1111.1111111111
    // amountIn = 1111.1111111111 - 1000 = 111.1111111111
    it("should calculate the amount in for a given amount out (buy)", () => {
      engine.updateReserves("exchange1", "BTC_USD", reserves);
      const result = engine.getAmountIn({
        exchange: "exchange1",
        pair: "USD_BTC",
        amountOut: 10,
        orderType: "amm",
      });
      expect(result.amountIn).toBeCloseTo(111.1111111111); // Replace with actual expected value
    });

    // k = 100 * 1000 = 100000
    // r0 = 100 - 10 = 90, r1 = k / r0 = 100000 / 90 = 1111.1111111111
    // amountIn = 1111.1111111111 - 1000 = 111.1111111111
    // amountInWithFee = 111.1111111111 * (1 + 0.03) = 114.4444444444
    it("should calculate the amount in for a given amount out with fee (buy)", () => {
      engine.updateReserves("exchange1", "BTC_USD", reserves);
      const resultWithoutFee = engine.getAmountIn({
        exchange: "exchange1",
        pair: "USD_BTC",
        amountOut: 10,
        orderType: "amm",
      });
      const resultWitFee = engine.getAmountIn({
        exchange: "exchange1",
        pair: "USD_BTC",
        amountOut: 10,
        orderType: "amm",
        fee: 0.03,
      });
      expect(resultWitFee.amountIn).toBeCloseTo(
        resultWithoutFee.amountIn * (1 + 0.03)
      );
    });

    it("should handle zero amount out", () => {
      engine.updateReserves("exchange1", "BTC_USD", reserves);
      expect(() =>
        engine.getAmountIn({
          exchange: "exchange1",
          pair: "BTC_USD",
          amountOut: 0,
          orderType: "amm",
        })
      ).toThrowError("Reserves and amountOut must be greater than 0");
    });
  });

  describe("getAmountsOut", () => {

    const bkBTCTHBOrderBooks = {
      bids: [{ price: 900000, size: 10000 }],
      asks: [{ price: 1000000, size: 10000 }],
    }

    const bkUSDTTHBOrderBooks = {
      bids: [{ price: 30, size: 10000 }],
      asks: [{ price: 40, size: 10000 }],
    }

    const bnBTCUSDTOrderBooks = {
      bids: [{ price: 30000, size: 10000 }],
      asks: [{ price: 40000, size: 10000 }],
    }

    it('should correctly calculate amounts out for a given path and amount in - pure order books', () => {
      engine.updateOrderBooks("binance", "BTC_USDT", bnBTCUSDTOrderBooks);
      engine.updateOrderBooks("bitkub", "BTC_THB", bkBTCTHBOrderBooks);
      engine.updateOrderBooks("bitkub", "USDT_THB", bkUSDTTHBOrderBooks);

      const amounts = engine.getAmountsOut({
        route: ['USDT', 'THB', 'BTC', 'USDT'],
        exchanges: ['', 'bitkub', 'bitkub', 'binance'],
        amountIn: 100,
      })

      const expectedAmounts = [100, 3000, 0.003, 90];
      for (let i = 0; i < amounts.length; i++) {
        expect(amounts[i]).toBeCloseTo(expectedAmounts[i]);
      }
    })

    it('should correctly calculate amounts out for a given path and amount in - pure order books with fees', () => {
      engine.updateOrderBooks("binance", "BTC_USDT", bnBTCUSDTOrderBooks);
      engine.updateOrderBooks("bitkub", "BTC_THB", bkBTCTHBOrderBooks);
      engine.updateOrderBooks("bitkub", "USDT_THB", bkUSDTTHBOrderBooks);

      const amounts = engine.getAmountsOut({
        route: ['USDT', 'THB', 'BTC', 'USDT'],
        exchanges: ['', 'bitkub', 'bitkub', 'binance'],
        amountIn: 100,
        fees: [0, 0.0025, 0.0025, 0.001]
      })

      const expectedAmounts = [100, 3000 * (1 - 0.0025), 0.003 * (1 - 0.0025 - 0.0025), 90 * (1 - 0.0025 - 0.0025 - 0.001)];
      for (let i = 0; i < amounts.length; i++) {
        expect(amounts[i]).toBeCloseTo(expectedAmounts[i]);
      }
    })

    // k = 10000 * 300000000 = 3000000000000
    // r1 = 300000000 + 100 = 300000100, r0 = k / r1 = 3000000000000 / 300000100 = 9999.9966666678
    // amountOut = 10000 - 9999.9966666678 = 0.0033333322 
    const ammBTCUSDTReserves = {
      r0: 10000,
      r1: 300000000
    }

    // k = 10000 * 100000000 = 1000000000000
    // r0 = 10000 + 0.0033333322 = 10000.0033333322, r1 = k / r1 = 1000000000000 / 10000.0033333322 = 99999966.6666891111
    // amountOut = 99999966.6666891111 - 100000000 = 33.3333108889
    const ammBTCUSDCReserves = {
      r0: 10000,
      r1: 100000000
    }

    // k = 100000000 * 100000000 = 10000000000000000
    // r1 = 100000000 + 33.3333108889 = 100000033.3333108889, r0 = k / r1 = 10000000000000000 / 100000033.3333108889 = 99999966.6667002222
    // amountOut = 100000000 - 99999966.6667002222 = 33.3332997778
    const ammUSDTUSDCReserves = {
      r0: 100000000,
      r1: 100000000
    }

    it('should correctly calculate amounts out for a given path and amount in - pure amm', () => {
      engine.updateReserves("uniswap", "BTC_USDT", ammBTCUSDTReserves);
      engine.updateReserves("uniswap", "BTC_USDC", ammBTCUSDCReserves);
      engine.updateReserves("uniswap", "USDT_USDC", ammUSDTUSDCReserves);

      const amounts = engine.getAmountsOut({
        route: ['USDT', 'BTC', 'USDC', 'USDT'],
        exchanges: ['', 'uniswap', 'uniswap', 'uniswap'],
        orderTypes: ['amm', 'amm', 'amm', 'amm'],
        amountIn: 100,
      })

      const expectedAmounts = [100, 0.0033333322, 33.3333108889, 33.3332997778];
      for (let i = 0; i < amounts.length; i++) {
        expect(amounts[i]).toBeCloseTo(expectedAmounts[i]);
      }
    })

    it('should correctly calculate amounts out for a given path and amount in - pure amm with fee', () => {
      engine.updateReserves("uniswap", "BTC_USDT", ammBTCUSDTReserves);
      engine.updateReserves("uniswap", "BTC_USDC", ammBTCUSDCReserves);
      engine.updateReserves("uniswap", "USDT_USDC", ammUSDTUSDCReserves);

      const amounts = engine.getAmountsOut({
        route: ['USDT', 'BTC', 'USDC', 'USDT'],
        exchanges: ['', 'uniswap', 'uniswap', 'uniswap'],
        orderTypes: ['amm', 'amm', 'amm', 'amm'],
        fees: [0.003, 0.003, 0.003, 0.003],
        amountIn: 100,
      })

      const expectedAmounts = [100, 0.0033333322 * (1 - 0.003), 33.3333108889 * (1 - 0.003 - 0.003), 33.3332997778 * (1 - 0.003 - 0.003 - 0.003)];
      for (let i = 0; i < amounts.length; i++) {
        expect(amounts[i]).toBeCloseTo(expectedAmounts[i]);
      }

    })

  })
});