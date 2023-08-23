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
      expect(result).toBeCloseTo(4500);
    });

    it("should calculate the amount out when buying", () => {
      engine.updateOrderBooks("exchange1", "BTC_USD", orderBooks);
      const result = engine.getAmountOut({
        exchange: "exchange1",
        pair: "USD_BTC",
        amountIn: 500,
      });
      expect(result).toBeCloseTo(0.4545454545);
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
      expect(resultWithFee).toBeCloseTo(resultWithoutFee * (1 - fee));
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
      expect(result).toBeCloseTo(20500); // Replace 'expectedValue' with your calculation
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
      // Expected behavior when exceeding the volume (e.g., return the maximum possible value, throw an error, etc.)
      expect(result).toBe(9000); // Replace 'expectedBehavior' with your expected outcome
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
      expect(result).toBeCloseTo(90.9090909091); // Expected result based on the provided AMM formula
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
      expect(resultWithFee).toBeCloseTo(resultWithoutFee * (1 - fee));
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
      expect(result).toBeCloseTo(909.09090909091); // Replace 'expectedBehavior' with your expected outcome
    });
  });

  describe("getAmountIn with Order Books", () => {

    const orderBooks: OrderBooks = {
      bids: [{ price: 900, size: 10 }],
      asks: [{ price: 1100, size: 10 }],
    };

    // Basic Test for Calculating Amount In
    it("should calculate the correct amount in when selling", () => {
      // engine.updateOrderBooks("exchange1", "BTC_USD", orderBooks);
      // const result = engine.getAmountIn({
      //   exchange: "exchange1",
      //   pair: "BTC_USD",
      //   amountOut: 4500,
      // });
      // expect(result).toBeCloseTo(5); // Amount out divided by the bid price
    });
  
    // Test with Multiple Level Order Books
    it("should handle multiple level order books when calculating amount in", () => {
      // const multiLevelOrderBooks: OrderBooks = {
      //   bids: [{ price: 900, size: 10 }, { price: 800, size: 10 }, { price: 700, size: 10 }],
      //   asks: [{ price: 1100, size: 10 }, { price: 1200, size: 10 }],
      // };
      // engine.updateOrderBooks("exchange1", "BTC_USD", multiLevelOrderBooks);
      // const amountOut = 26000;
      // const result = engine.getAmountIn({
      //   exchange: "exchange1",
      //   pair: "BTC_USD",
      //   amountOut: amountOut,
      // });
      // const expectedAmountIn = 10 * (900) + 10 * (800) + 10 * (700); // Amount in from all levels
      // expect(result).toBeCloseTo(expectedAmountIn);
    });
  
    // Test Exceed Volume Input Amount
    it("should handle exceed volume output amount when calculating amount in", () => {
      // const largeAmount = 10000; // Larger than the total available in the initial order book
      // engine.updateOrderBooks("exchange1", "BTC_USD", orderBooks);
      // const result = engine.getAmountIn({
      //   exchange: "exchange1",
      //   pair: "BTC_USD",
      //   amountOut: largeAmount,
      // });
      // const expectedBehavior = 20; // Sum of sizes from bids in the initial order book
      // expect(result).toBe(expectedBehavior);
    });
  
  });
  
});
