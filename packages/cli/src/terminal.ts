/** Minimal ANSI styling for x CLI output — no dependencies. */
const r = "\x1b[0m";
const dim = "\x1b[2m";
const bold = "\x1b[1m";
const amber = "\x1b[38;2;232;149;47m";
const cyan = "\x1b[38;2;61;214;198m";
const green = "\x1b[38;2;78;201;120m";
const red = "\x1b[38;2;248;113;113m";

export function xInfo(message: string): void {
  console.log(`${amber}${bold}[x]${r} ${message}`);
}

export function xSuccess(message: string): void {
  console.log(`${green}✓${r} ${message}`);
}

export function xWarn(message: string): void {
  console.warn(`${amber}⚠${r} ${message}`);
}

export function xError(message: string): void {
  console.error(`${red}✗${r} ${message}`);
}

export function xDim(message: string): void {
  console.log(`${dim}${message}${r}`);
}

export function xCommand(label: string, command: string): void {
  console.log(`  ${dim}${label}${r}  ${cyan}${command}${r}`);
}

export function xBanner(): void {
  console.log("");
  console.log(`  ${amber}${bold}x${r} ${dim}— fullstack framework for Bun${r}`);
  console.log("");
}
