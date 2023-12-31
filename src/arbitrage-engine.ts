import { getPureArbTemplateRoutes } from "./templates/pure-arb";
import { OrderBooks, OrderType, ReservePool } from "./type";
import { calculateAmountIn, calculateAmountOut } from "./utils/amm";
import { buyBase, buyQuote, sellBase, sellQuote } from "./utils/orderbook";
import { calculatePNL, splitAmounts } from "./utils/route";

export class ArbitrageEngine {
  private DEFAULT_PRECISION = 8;

  private orderbooks: Record<string, Record<string, OrderBooks>> = {};
  private reserves: Record<string, Record<string, ReservePool>> = {};

  // Public functions
  public updateOrderBooks(
    exchange: string,
    pair: string,
    orderbooks: OrderBooks
  ) {
    const reverseOrderBooks = this._getReverseOrderbooks(exchange, pair);
    if (reverseOrderBooks)
      throw new Error(`updateOrderBooks: reverse orderbooks already exists`);
    this._setOrderBooks(exchange, pair, orderbooks);
  }

  public updateReserves(exchange: string, pair: string, reserves: ReservePool) {
    const reverseReserves = this._getReverseReserves(exchange, pair);
    if (reverseReserves)
      throw new Error(`updateReserves: reverse reserves already exists`);
    this._setReserves(exchange, pair, reserves);
  }

  public getAmountsOut({
    route,
    exchanges,
    amountIn,
    fees,
    precisions,
    orderTypes,
  }: {
    route: string[];
    exchanges: string[];
    amountIn: number;
    fees?: number[];
    precisions?: number[];
    orderTypes?: OrderType[];
  }) {
    const routeLen = route.length;
    if (exchanges.length !== routeLen)
      throw new Error(`getAmountsOut: exchanges length not match route length`);
    if (fees && fees.length !== routeLen)
      throw new Error(`getAmountsOut: fees length not match route length`);
    if (precisions && precisions.length !== routeLen)
      throw new Error(
        `getAmountsOut: precisions length not match route length`
      );
    if (orderTypes && orderTypes.length !== routeLen)
      throw new Error(
        `getAmountsOut: orderTypes length not match route length`
      );

    const amounts = [amountIn];
    for (let i = 1; i < routeLen; i++) {
      const pair = `${route[i - 1]}_${route[i]}`;
      const exchange = exchanges[i];
      const fee = fees ? fees[i] : 0;
      const precision = precisions ? precisions[i] : this.DEFAULT_PRECISION;
      const orderType = orderTypes ? orderTypes[i] : "orderbook";
      const result = this.getAmountOut({
        exchange,
        pair,
        amountIn: amounts[i - 1],
        fee,
        precision,
        orderType,
      });
      amounts.push(result.amountOut);
    }

    return amounts;
  }

  public getAmountOut({
    exchange,
    pair,
    amountIn,
    fee,
    precision,
    orderType,
  }: {
    exchange: string;
    pair: string;
    amountIn: number;
    fee?: number;
    precision?: number;
    orderType?: OrderType;
  }): { amountIn: number; amountOut: number } {
    return orderType === "amm"
      ? this._getAmountOutAMM({ exchange, pair, amountIn, fee, precision })
      : this._getAmountOutOrderBook({
          exchange,
          pair,
          amountIn,
          fee,
          precision,
        });
  }

  public getAmountIn({
    exchange,
    pair,
    amountOut,
    fee,
    precision,
    orderType,
  }: {
    exchange: string;
    pair: string;
    amountOut: number;
    fee?: number;
    precision?: number;
    orderType?: OrderType;
  }): { amountIn: number; amountOut: number } {
    return orderType === "amm"
      ? this._getAmountInAMM({ exchange, pair, amountOut, fee, precision })
      : this._getAmountInOrderBook({
          exchange,
          pair,
          amountOut,
          fee,
          precision,
        });
  }

  public calculatePureArb({
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
    const arbRoutes = getPureArbTemplateRoutes({
      exchange0,
      exchange1,
      token0,
      token1,
      amountIn,
      fee0,
      fee1,
      middleToken,
    });

    const amountsOut = arbRoutes.map((arbRoute) =>
      this.getAmountsOut(arbRoute)
    );

    const bestRouteIndex = amountsOut.reduce((bestIndex, curr, index) => {
      const bestSteps = splitAmounts(amountsOut[bestIndex]);
      const curSteps = splitAmounts(curr);

      const bestPNL = calculatePNL(bestSteps);
      const curPNL = calculatePNL(curSteps);

      return curPNL > bestPNL ? index : bestIndex;
    }, 0 as number);

    return {
      route: arbRoutes[bestRouteIndex],
      amountsOut: amountsOut[bestRouteIndex],
    };
  }

  // Getters
  public getOrderBooks(exchange: string, pair: string): OrderBooks | null {
    if (!this.orderbooks[exchange]) return null;
    if (!this.orderbooks[exchange][pair]) return null;
    return this.orderbooks[exchange][pair];
  }

  public getReserves(exchange: string, pair: string): ReservePool | null {
    if (!this.reserves[exchange]) return null;
    if (!this.reserves[exchange][pair]) return null;
    return this.reserves[exchange][pair];
  }

  // Private functions
  // BTC_USDT -> How much USDT gotten when selling BTC -> amountIn of BTC -> amountOut of USDT
  // USDT_BTC -> How much BTC gotten when buying with USDT -> amountIn of USDT -> amountOut of BTC
  private _getAmountOutOrderBook({
    exchange,
    pair,
    amountIn,
    fee,
    precision,
  }: {
    exchange: string;
    pair: string;
    amountIn: number;
    fee?: number;
    precision?: number;
  }): { amountIn: number; amountOut: number } {
    if (!fee) fee = 0;
    if (!precision) precision = this.DEFAULT_PRECISION;

    const reverseOrderBooks = this._getReverseOrderbooks(exchange, pair);
    const orderBooks = this.getOrderBooks(exchange, pair);

    if (!reverseOrderBooks && !orderBooks)
      throw new Error(`_getAmountOutOrderBook: no orderbooks found`);

    if (reverseOrderBooks) {
      // Direction = buy
      const { base, quote } = buyQuote(
        reverseOrderBooks.asks,
        amountIn,
        fee,
        precision
      );
      return {
        amountIn: quote,
        amountOut: base,
      };
    } else if (orderBooks) {
      // Direction = sell
      const { base, quote } = sellBase(
        orderBooks.bids,
        amountIn,
        fee,
        precision
      );
      return {
        amountIn: base,
        amountOut: quote,
      };
    }

    // The code shouldn't reach here
    return {
      amountIn: 0,
      amountOut: 0,
    };
  }

  // BTC_USDT -> How much BTC sold to get the specific amount of USDT -> amountOut of USDT -> amountIn of BTC
  // USDT_BTC -> How much USDT paid to get the specific amount of BTC -> amountOut of BTC -> amountIn of USDT
  private _getAmountInOrderBook({
    exchange,
    pair,
    amountOut,
    fee,
    precision,
  }: {
    exchange: string;
    pair: string;
    amountOut: number;
    fee?: number;
    precision?: number;
  }): { amountIn: number; amountOut: number } {
    if (!fee) fee = 0;
    if (!precision) precision = this.DEFAULT_PRECISION;

    const reverseOrderBooks = this._getReverseOrderbooks(exchange, pair);
    const orderBooks = this.getOrderBooks(exchange, pair);

    if (!reverseOrderBooks && !orderBooks)
      throw new Error(`_getAmountInOrderBook: no orderbooks found`);

    if (reverseOrderBooks) {
      // Direction = buy
      const { base, quote } = buyBase(
        reverseOrderBooks.asks,
        amountOut,
        fee,
        precision
      );
      return {
        amountIn: quote,
        amountOut: base,
      };
    } else if (orderBooks) {
      // Direction = sell
      const { base, quote } = sellQuote(
        orderBooks.bids,
        amountOut,
        fee,
        precision
      );
      return {
        amountIn: base,
        amountOut: quote,
      };
    }

    // The code shouldn't reach here
    return { amountIn: 0, amountOut: 0 };
  }

  private _getAmountOutAMM({
    exchange,
    pair,
    amountIn,
    fee,
    precision,
  }: {
    exchange: string;
    pair: string;
    amountIn: number;
    fee?: number;
    precision?: number;
  }): { amountIn: number; amountOut: number } {
    if (!fee) fee = 0;
    const reverseReserves = this._getReverseReserves(exchange, pair);
    const reserves = this.getReserves(exchange, pair);

    if (!reverseReserves && !reserves)
      throw new Error(`_getAmountOutAMM: no reserves found`);

    if (reverseReserves) {
      const result = calculateAmountOut(
        reverseReserves.r1,
        reverseReserves.r0,
        amountIn,
        fee
      );
      return {
        amountIn,
        amountOut: result,
      };
    } else if (reserves) {
      const result = calculateAmountOut(
        reserves.r0,
        reserves.r1,
        amountIn,
        fee
      );
      return {
        amountIn,
        amountOut: result,
      };
    }

    // The code shouldn't reach here
    return { amountIn: 0, amountOut: 0 };
  }

  private _getAmountInAMM({
    exchange,
    pair,
    amountOut,
    fee,
    precision,
  }: {
    exchange: string;
    pair: string;
    amountOut: number;
    fee?: number;
    precision?: number;
  }): { amountIn: number; amountOut: number } {
    if (!fee) fee = 0;
    if (!precision) precision = this.DEFAULT_PRECISION;
    const [token0, token1] = pair.split("_");
    const reverseReserves = this._getReverseReserves(exchange, pair);
    const reserves = this.getReserves(exchange, pair);

    if (!reverseReserves && !reserves)
      throw new Error(`_getAmountInAMM: no reserves found`);

    if (reverseReserves) {
      // Direction = buy
      const result = calculateAmountIn(
        reverseReserves.r1,
        reverseReserves.r0,
        amountOut,
        fee
      );
      return {
        amountIn: result,
        amountOut,
      };
    } else if (reserves) {
      // Direction = sell
      const result = calculateAmountIn(
        reserves.r0,
        reserves.r1,
        amountOut,
        fee
      );
      return {
        amountIn: result,
        amountOut,
      };
    }

    // The code shouldn't reach here
    return { amountIn: 0, amountOut: 0 };
  }

  private _getReverseOrderbooks(
    exchange: string,
    pair: string
  ): OrderBooks | null {
    const [token0, token1] = pair.split("_");
    return this.getOrderBooks(exchange, `${token1}_${token0}`);
  }

  private _getReverseReserves(
    exchange: string,
    pair: string
  ): ReservePool | null {
    const [token0, token1] = pair.split("_");
    return this.getReserves(exchange, `${token1}_${token0}`);
  }

  private _setOrderBooks(
    exchange: string,
    pair: string,
    orderbooks: OrderBooks
  ) {
    if (!this.orderbooks[exchange]) {
      this.orderbooks[exchange] = {};
    }
    this.orderbooks[exchange][pair] = orderbooks;
  }

  private _setReserves(exchange: string, pair: string, reserves: ReservePool) {
    if (!this.reserves[exchange]) {
      this.reserves[exchange] = {};
    }
    this.reserves[exchange][pair] = reserves;
  }
}
