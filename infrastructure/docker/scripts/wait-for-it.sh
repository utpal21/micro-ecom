#!/usr/bin/env sh

set -eu

if [ "$#" -lt 2 ]; then
  echo "Usage: wait-for-it.sh host port [timeout]" >&2
  exit 1
fi

HOST="$1"
PORT="$2"
TIMEOUT="${3:-60}"
ELAPSED=0

until nc -z "$HOST" "$PORT" >/dev/null 2>&1; do
  ELAPSED=$((ELAPSED + 1))
  if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
    echo "Timeout waiting for ${HOST}:${PORT}" >&2
    exit 1
  fi
  sleep 1
done

echo "${HOST}:${PORT} is reachable"

