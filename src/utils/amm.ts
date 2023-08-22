export function calculateAmountOut(
  rIn: number,
  rOut: number,
  amountIn: number,
  fee = 0
): number {
  return (amountIn * rOut) / (rIn * (1 / (1 - fee)) + amountIn);
}

export function calculateAmountIn(
  rIn: number,
  rOut: number,
  amountOut: number,
  fee = 0
): number {
  return (rIn * amountOut * (1 / (1 - fee))) / (rOut - amountOut) + 1;
}
