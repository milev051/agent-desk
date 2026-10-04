#!/bin/zsh
cd "${0:A:h}"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if curl -fsS http://127.0.0.1:4317/api/meta >/dev/null 2>&1; then
  open http://127.0.0.1:4317
  exit 0
fi
node server.mjs &
desk_pid=$!
trap 'kill "$desk_pid" 2>/dev/null' EXIT INT TERM
for attempt in {1..30}; do
  if curl -fsS http://127.0.0.1:4317/api/meta >/dev/null 2>&1; then
    open http://127.0.0.1:4317
    break
  fi
  sleep 0.2
done
wait "$desk_pid"
