export function getPureArbTemplateRoutes({
  exchange0,
  exchange1,
  token0,
  token1,
  amountIn,
  fee0,
  fee1,
  middleToken,
}: {
  exchange0: string;
  exchange1: string;
  token0: string;
  token1: string;
  amountIn: number;
  fee0: number;
  fee1: number;
  middleToken?: string;
}) {
  if (middleToken) {
    return [
      {
        route: [token0, middleToken, token1, token0],
        exchanges: ["", exchange0, exchange0, exchange1],
        fees: [0, fee0, fee0, fee1],
        amountIn,
      },
      {
        route: [token0, token1, middleToken, token0],
        exchanges: ["", exchange1, exchange0, exchange0],
        fees: [0, fee1, fee1, fee0],
        amountIn,
      },
    ];
  }

  return [
    {
      route: [token0, token1, token0],
      exchanges: ["", exchange0, exchange1],
      fees: [0, fee0, fee1],
      amountIn,
    },
    {
      route: [token0, token1, token0],
      exchanges: ["", exchange1, exchange0],
      fees: [0, fee1, fee0],
      amountIn,
    },
  ];
}
