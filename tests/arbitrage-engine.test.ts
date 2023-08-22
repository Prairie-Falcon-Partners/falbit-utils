import { ArbitrageEngine, OrderBooks, ReservePool } from "../src"; // Update the path to your class

describe("ArbitrageEngine", () => {
  let engine: ArbitrageEngine;

  beforeEach(() => {
    engine = new ArbitrageEngine();
  });

  describe("getAmountOut", () => {
    it("should calculate the amount out using orderbook", () => {
      const orderBooks: OrderBooks = {
        bids: [{ price: 100, size: 10 }],
        asks: [{ price: 110, size: 10 }],
      };

      engine.updateOrderBooks("exchange1", "BTC_USD", orderBooks);

      const result = engine.getAmountOut("exchange1", "BTC_USD", 5);

      expect(result).toBeCloseTo(500); // Expecting 5 * 100
    });

    it("should calculate the amount out using AMM", () => {
      const reserves: ReservePool = { r0: 1000, r1: 100 };

      engine.updateReserves("exchange1", "BTC_USD", reserves);

      const result = engine.getAmountOut(
        "exchange1",
        "BTC_USD",
        10,
        0,
        8,
        "amm"
      );

      expect(result).toBeCloseTo(9.0909); // Expected result based on the provided AMM formula
    });

    it("should throw an error when no orderbooks or reserves found", () => {
      expect(() => {
        engine.getAmountOut("exchange1", "BTC_USD", 5);
      }).toThrowError(`_getAmountOutOrderBook: no orderbooks found`);
    });
  });
});
