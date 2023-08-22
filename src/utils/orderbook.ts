import { OrderBook } from '../type';
import { truncate } from './math';

export const buyBase = (
  asks: OrderBook[],
  base: number,
  commission = 0,
  precisions = 2,
) => {
  let quote = 0;
  for (let i = 0; i < asks.length && base > 0; i++) {
    let { size, price } = asks[i];
    let tradeVol = Math.min(size, base);
    base -= tradeVol;
    quote += tradeVol * price;
  }
  return truncate(quote * (1 + commission), precisions);
};

export const buyQuote = (
  asks: OrderBook[],
  quote: number,
  commission = 0,
  precisions = 2,
) => {
  let base = 0;
  for (let i = 0; i < asks.length && quote > 0; i++) {
    let { size, price } = asks[i];

    let tradeVol = Math.min(quote / price, size);
    quote -= tradeVol * price;
    base += tradeVol;
  }
  return truncate(base * (1 - commission), precisions);
};

export const sellBase = (
  bids: OrderBook[],
  base: number,
  commission = 0,
  precisions = 2,
) => {
  let quote = 0;
  for (let i = 0; i < bids.length && base > 0; i++) {
    let { size, price } = bids[i];

    let tradeVol = Math.min(base, size);

    base -= tradeVol;
    quote += tradeVol * price;
  }
  return truncate(quote * (1 - commission), precisions);
};

export const sellQuote = (
  bids: OrderBook[],
  quote: number,
  commission = 0,
  precisions = 2,
) => {
  let base = 0;
  for (let i = 0; i < bids.length && quote > 0; i++) {
    let { size, price } = bids[i];

    let tradeVol = Math.min(quote / price, size);

    quote -= tradeVol * price;
    base += tradeVol;
  }
  return truncate(base * (1 + commission), precisions);
};
