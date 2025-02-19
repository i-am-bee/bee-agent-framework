#!/bin/sh

set -e

HOOK_NAME=$(basename "$0")
STAGED_FILES=$(git diff --staged --name-only)
if [ -z "$STAGED_FILES" ] && [ "$HOOK_NAME" = "pre-commit" ]; then
  echo "Error: Stash is empty. Aborting."
  exit 1
fi

COMMIT_MSG_FILE="$1"
HOOK_ARGS=${COMMIT_MSG_FILE:-$STAGED_FILES}

TS_DIR="typescript"
HAS_TS_FILES=$(echo "$STAGED_FILES" | grep -q "^$TS_DIR/" && echo 1 || echo 0)

PY_DIR="python"
HAS_PY_FILES=$(echo "$STAGED_FILES" | grep -q "^$PY_DIR/" && echo 1 || echo 0)

if [ "$HAS_TS_FILES" -eq 1 ] && [ "$HAS_PY_FILES" -eq 1 ]; then
  echo "Error: Cannot commit changes in both $TS_DIR and $PY_DIR at the same time."
  exit 1
fi

# Run hooks based on staged files
if [ "$HAS_TS_FILES" -eq 1  ] && grep -q "\"git:$HOOK_NAME\"" "$TS_DIR/package.json"; then
  echo "Running $HOOK_NAME hook in $TS_DIR..."
  (cd "$TS_DIR" && npm run "git:$HOOK_NAME" "$HOOK_ARGS") || exit $?
fi

if [ "$HAS_PY_FILES" -eq 1 ]; then
  echo "Running Python $HOOK_NAME hook..."
  (cd "$PY_DIR" && poetry run poe git --hook "$HOOK_NAME" "$HOOK_ARGS") || exit $?
fi

# General commit style check
if [ "$HAS_TS_FILES" -eq 0 ] && [ "$HAS_PY_FILES" -eq 0 ]; then
  if [ "$HOOK_NAME" = "commit-msg" ] ; then
    COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")
    CONVENTIONAL_COMMIT_REGEX="^(chore|ci|docs|revert)(\(\w+\))?!?: .+"

    if ! echo "$COMMIT_MSG" | grep -qE "$CONVENTIONAL_COMMIT_REGEX"; then
      echo "Error: The provided commit message does not adhere to conventional commit style!"
      echo "Validation Regex: $CONVENTIONAL_COMMIT_REGEX"
      echo "Your commit message: $COMMIT_MSG"
      exit 1
    fi
  fi
fi
