export const truncate = (num: number, d: number) =>
  Math.floor(num * 10 ** d) / 10 ** d;
