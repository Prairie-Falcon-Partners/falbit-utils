import { OrderBooks, OrderType, ReservePool } from "./type";
import { calculateAmountIn, calculateAmountOut } from "./utils/amm";
import { buyBase, buyQuote, sellBase, sellQuote } from "./utils/orderbook";

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

  public getAmounsOut({
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
      throw new Error(`getAmounsOut: exchanges length not match route length`);
    if (fees && fees.length !== routeLen)
      throw new Error(`getAmounsOut: fees length not match route length`);
    if (precisions && precisions.length !== routeLen)
      throw new Error(`getAmounsOut: precisions length not match route length`);
    if (orderTypes && orderTypes.length !== routeLen)
      throw new Error(`getAmounsOut: orderTypes length not match route length`);

    const amounts = [amountIn];
    for (let i = 1; i < routeLen; i++) {
      const pair = `${route[i - 1]}_${route[i]}`;
      const exchange = exchanges[i - 1];
      const fee = fees ? fees[i - 1] : 0;
      const precision = precisions ? precisions[i - 1] : this.DEFAULT_PRECISION;
      const orderType = orderTypes ? orderTypes[i - 1] : "orderbook";
      const amount = this.getAmountOut({
        exchange,
        pair,
        amountIn: amounts[i - 1],
        fee,
        precision,
        orderType,
      });
      amounts.push(amount);
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
  }): number {
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
  }): number {
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
  }): number {
    if (!fee) fee = 0;
    if (!precision) precision = this.DEFAULT_PRECISION;

    const reverseOrderBooks = this._getReverseOrderbooks(exchange, pair);
    const orderBooks = this.getOrderBooks(exchange, pair);

    if (!reverseOrderBooks && !orderBooks)
      throw new Error(`_getAmountOutOrderBook: no orderbooks found`);

    if (reverseOrderBooks) {
      // Direction = buy
      return buyQuote(reverseOrderBooks.asks, amountIn, fee, precision);
    } else if (orderBooks) {
      // Direction = sell
      return sellBase(orderBooks.bids, amountIn, fee, precision);
    }

    // The code shouldn't reach here
    return 0;
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
  }): number {
    if (!fee) fee = 0;
    if (!precision) precision = this.DEFAULT_PRECISION;

    const reverseOrderBooks = this._getReverseOrderbooks(exchange, pair);
    const orderBooks = this.getOrderBooks(exchange, pair);

    if (!reverseOrderBooks && !orderBooks)
      throw new Error(`_getAmountInOrderBook: no orderbooks found`);

    if (reverseOrderBooks) {
      // Direction = buy
      return buyBase(reverseOrderBooks.asks, amountOut, fee, precision);
    } else if (orderBooks) {
      // Direction = sell
      return sellQuote(orderBooks.bids, amountOut, fee, precision);
    }

    // The code shouldn't reach here
    return 0;
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
  }): number {
    if (!fee) fee = 0;
    const reverseReserves = this._getReverseReserves(exchange, pair);
    const reserves = this.getReserves(exchange, pair);

    if (!reverseReserves && !reserves)
      throw new Error(`_getAmountOutAMM: no reserves found`);

    if (reverseReserves) {
      return calculateAmountOut(
        reverseReserves.r1,
        reverseReserves.r0,
        amountIn,
        fee
      );
    } else if (reserves) {
      return calculateAmountOut(reserves.r0, reserves.r1, amountIn, fee);
    }

    // The code shouldn't reach here
    return 0;
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
  }): number {
    if (!fee) fee = 0;
    if (!precision) precision = this.DEFAULT_PRECISION;
    const [token0, token1] = pair.split("_");
    const reverseReserves = this._getReverseReserves(exchange, pair);
    const reserves = this.getReserves(exchange, pair);

    if (!reverseReserves && !reserves)
      throw new Error(`_getAmountInAMM: no reserves found`);

    if (reverseReserves) {
      // Direction = buy
      return calculateAmountIn(
        reverseReserves.r1,
        reverseReserves.r0,
        amountOut,
        fee
      );
    } else if (reserves) {
      // Direction = sell
      return calculateAmountIn(reserves.r0, reserves.r1, amountOut, fee);
    }

    // The code shouldn't reach here
    return 0;
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
