#!/usr/bin/env bun
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const lock = readFileSync("bun.lock");
const hash = createHash("sha256").update(lock).digest("hex");
writeFileSync(".github/bun-lock.sha256", hash + "\n");
console.log(`Updated .github/bun-lock.sha256: ${hash}`);
