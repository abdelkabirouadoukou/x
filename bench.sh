#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  pkill -f "bun.*examples/basic" 2>/dev/null || true
  sleep 0.5
}
trap cleanup EXIT

echo "=== x benchmark ==="
echo ""

# 1. Cold dev server start
echo "--- 1. Cold dev server start ---"
cleanup
start=$(perl -MTime::HiRes=time -e 'printf "%d\n", time * 1000')
bun --hot examples/basic/server.ts &
for i in $(seq 1 30); do
  if curl -sf http://localhost:3000/ >/dev/null 2>&1; then break; fi
  sleep 0.2
done
end=$(perl -MTime::HiRes=time -e 'printf "%d\n", time * 1000')
echo "  Cold start to first response: $((end - start))ms"
cleanup

# 2. Build time
echo ""
echo "--- 2. Build time ---"
start=$(perl -MTime::HiRes=time -e 'printf "%d\n", time * 1000')
bun packages/cli/src/index.ts build 2>&1 || true
end=$(perl -MTime::HiRes=time -e 'printf "%d\n", time * 1000')
echo "  Build: $((end - start))ms"

# 3. TTFB helper
measure_ttfb() {
  local label="$1" path="$2"
  cleanup
  bun --hot examples/basic/server.ts &
  for i in $(seq 1 30); do
    if curl -sf http://localhost:3000/ >/dev/null 2>&1; then break; fi
    sleep 0.2
  done
  start=$(perl -MTime::HiRes=time -e 'printf "%d\n", time * 1000')
  code=$(curl -so /dev/null -w "%{http_code}" "http://localhost:3000${path}" 2>/dev/null || echo "FAIL")
  end=$(perl -MTime::HiRes=time -e 'printf "%d\n", time * 1000')
  echo "  ${label}: HTTP ${code} ($((end - start))ms)"
  cleanup
}

echo ""
echo "--- 3. TTFB: static page ---"
measure_ttfb "/about" "/about"

echo ""
echo "--- 4. TTFB: SSR page ---"
measure_ttfb "/posts/test" "/posts/test"

echo ""
echo "=== Done ==="
