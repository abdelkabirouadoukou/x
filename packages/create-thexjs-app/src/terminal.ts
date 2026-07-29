const reset = "\x1b[0m";
const muted = "\x1b[2m";
const bold = "\x1b[1m";
const amber = "\x1b[38;2;232;149;47m";
const cyan = "\x1b[38;2;61;214;198m";
const green = "\x1b[38;2;78;201;120m";

export function banner(): void {
  console.log("");
  console.log(`  ${amber}${bold}create-thexjs-app${reset}`);
  console.log(`  ${muted}Scaffold a new x project${reset}`);
  console.log("");
}

export function step(message: string): void {
  console.log(`${amber}→${reset} ${message}`);
}

export function success(message: string): void {
  console.log(`${green}✓${reset} ${message}`);
}

export function command(cmd: string): void {
  console.log(`  ${cyan}${cmd}${reset}`);
}

export function dim(message: string): void {
  console.log(`${muted}${message}${reset}`);
}

export function dimText(message: string): string {
  return `${muted}${message}${reset}`;
}
