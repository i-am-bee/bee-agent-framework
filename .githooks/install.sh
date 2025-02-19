#!/bin/sh

set -e

GIT_ROOT_DIR=`git rev-parse --show-toplevel`
SCRIPT_DIR=`(cd "$(dirname "$0")" && pwd)`

WRAPPER_SCRIPT="${SCRIPT_DIR}/hook.sh"
chmod +x "$WRAPPER_SCRIPT"

HOOK_NAMES="pre-commit commit-msg pre-push post-merge post-commit"
for HOOK in $HOOK_NAMES; do
  TARGET="$GIT_ROOT_DIR/.git/hooks/$HOOK"
  cp -f "$WRAPPER_SCRIPT" "$TARGET"
  chmod u+x "$TARGET"
done

echo "All Git hooks are now set up!"
