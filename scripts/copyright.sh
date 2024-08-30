#!/bin/bash
# Copyright 2024 IBM Corp.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

set -e

# Path to the package.json file
PACKAGE_JSON_PATH="./package.json"

# Check if the package.json file exists
if [[ ! -f "$PACKAGE_JSON_PATH" ]]; then
  echo "Error: package.json file not found at $PACKAGE_JSON_PATH"
  exit 1
fi

# Retrieve the author property using jq
AUTHOR=$(jq -r '.author' "$PACKAGE_JSON_PATH")

# Check if the author property is not null or empty
if [[ -z "$AUTHOR" ]]; then
  echo "Error: author property not found in package.json"
  exit 1
fi

# Check if 'nwa' command is not available and 'go' is available, then install 'nwa'
if ! command -v nwa &> /dev/null && command -v go &> /dev/null; then
  echo "Installing 'nwa' via 'go' (https://github.com/B1NARY-GR0UP/nwa)"
  go install github.com/B1NARY-GR0UP/nwa@latest
  # Ensure the GOPATH is added to the PATH environment variable
  export PATH=$PATH:$(go env GOPATH)/bin
fi

if command -v nwa &> /dev/null; then
  nwa add -l apache -c "$AUTHOR" src dist tests scripts
elif command -v docker &> /dev/null; then
  docker run -it -v "${PWD}:/src" ghcr.io/b1nary-gr0up/nwa:main add -l apache -c "$AUTHOR" src dist tests scripts
else
  echo "Error: 'nwa' is not available. Either install it manually or install go/docker."
  exit 1
fi
