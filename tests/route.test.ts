// Import Jest functions for testing
import { expect } from "@jest/globals";
import { Step, calculatePNL } from "../src";

describe("Test route utils", () => {
  describe("PNL calculation", () => {
    // Test cases
    test("calculates PNL with exact matching steps", () => {
      const steps: Step[] = [
        [100, 0.5],
        [0.5, 3000],
        [3000, 101],
      ];
      const pnl = calculatePNL(steps);
      expect(pnl).toBeCloseTo(1, 4);
    });

    test("calculates PNL with deviation in one step", () => {
      const steps: Step[] = [
        [100, 0.5],
        [1, 3000],
        [3000, 101],
      ];
      const pnl = calculatePNL(steps);
      expect(pnl).toBeCloseTo(0.9975, 4);
    });

    test("calculates PNL with deviations in multiple steps", () => {
      const steps: Step[] = [
        [101, 0.5],
        [0.6, 3000],
        [2999, 101],
      ];
      // p1 = 1, p2 = 0.5 / 101 = 0.00495049505, p3 = (0.5 / 101) * (3000 / 0.6) = 24.7524752475
      // diff1 = 0.6 - 0.5 = 0.1, diff2 = 2999 - 3000 = -1
      // inputValue = 101 + 0.00495 * 0.1 + 24.7524752475 * -1 = 76.2480197525
      // output = 101
      // PNL = 101 - 76.2480197525 = 24.7519802475
      const pnl = calculatePNL(steps);
      expect(pnl).toBeCloseTo(24.7519802475, 4);
    });
  });
});
