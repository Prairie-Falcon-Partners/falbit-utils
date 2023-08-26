import { Step } from "../type";

export function splitAmounts(amounts: number[]) {
  const steps: Step[] = [];
  for (let i = 1; i < amounts.length; i++) {
    steps.push([amounts[i - 1], amounts[i]]);
  }
  return steps;
}

export function calculatePNL(steps: Step[]): number {
  let inputValue = steps[0][0];
  let outputValue = steps[steps.length - 1][1];
  let accPrice = 1;

  for (let i = 1; i < steps.length; i++) {
    const [inp, prevOut] = steps[i - 1];
    const [curIn, _] = steps[i];

    accPrice *= prevOut / inp;

    const deviation = curIn - prevOut;
    inputValue += deviation * accPrice;
  }

  const pnl = outputValue - inputValue;
  return pnl;
}
