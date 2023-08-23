export function calculateAmountOut(
  rIn: number,
  rOut: number,
  amountIn: number,
  fee = 0
): number {
  // return (amountIn * rOut) / (rIn * (1 / (1 - fee)) + amountIn);
  if (rIn <= 0 || rOut <= 0 || amountIn <= 0) {
    throw new Error("Reserves and amountIn must be greater than 0");
  }
  const numerator = amountIn * rOut;
  const denominator = rIn + amountIn;
  return numerator / denominator * (1 - fee);;
}

export function calculateAmountIn(
  rIn: number,
  rOut: number,
  amountOut: number,
  fee = 0
): number {
  // return (rIn * amountOut * (1 / (1 - fee))) / (rOut - amountOut) + 1;
  if (rIn <= 0 || rOut <= 0 || amountOut <= 0) {
    throw new Error("Reserves and amountOut must be greater than 0");
  }
  const numerator = rIn * amountOut;
  const denominator = (rOut - amountOut)
  return numerator / denominator * (1 - fee);
}
