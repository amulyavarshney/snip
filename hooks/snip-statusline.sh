#!/usr/bin/env bash
# Snip statusline badge for Claude Code.
# Reads ~/.claude/.snip-active and prints [SNIP:MODE] or nothing.

STATE="${HOME}/.claude/.snip-active"

if [ ! -f "$STATE" ]; then
  exit 0
fi

MODE=$(head -1 "$STATE" 2>/dev/null)
LANG=$(sed -n '2p' "$STATE" 2>/dev/null)

if [ -z "$MODE" ] || [ "$MODE" = "off" ]; then
  exit 0
fi

MODE_UPPER=$(echo "$MODE" | tr '[:lower:]' '[:upper:]')

if [ -n "$LANG" ]; then
  LANG_ABBREV=$(echo "$LANG" | cut -c1-2 | tr '[:lower:]' '[:upper:]')
  printf '[SNIP:%s:%s]' "$MODE_UPPER" "$LANG_ABBREV"
else
  printf '[SNIP:%s]' "$MODE_UPPER"
fi
