export type OrderBook = {
  price: number;
  size: number;
};

export type OrderBooks = {
    bids: OrderBook[];
    asks: OrderBook[];
}

export type ReservePool = {
    r0: number;
    r1: number;
}

export type OrderType = "orderbook" | "amm"