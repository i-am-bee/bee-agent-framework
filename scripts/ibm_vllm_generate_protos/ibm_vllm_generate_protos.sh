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

GRPC_PROTO_PATH="./src/adapters/ibm-vllm/proto"
GRPC_TYPES_PATH="./src/adapters/ibm-vllm/types.ts"

SCRIPT_DIR="$(dirname "$0")"
OUTPUT_RELATIVE_PATH="dist/merged.d.ts"
GRPC_TYPES_TMP_PATH="types"

rm -f "$GRPC_TYPES_PATH"

rm -rf "${SCRIPT_DIR}"/{dist,dts,types}


yarn run proto-loader-gen-types \
  --defaults \
  --keepCase \
  --oneofs \
  --longs=Number \
  --enums=String \
  --grpcLib=@grpc/grpc-js \
  --"outDir=${SCRIPT_DIR}/${GRPC_TYPES_TMP_PATH}" \
  "${GRPC_PROTO_PATH}"/*.proto


cd "$SCRIPT_DIR"
  ENTRY="$(basename "$OUTPUT_RELATIVE_PATH" ".d.ts")" tsup --dts-only
  sed -i.bak '$ d' "$OUTPUT_RELATIVE_PATH"
  sed -i.bak -E "s/^interface/export interface/" "$OUTPUT_RELATIVE_PATH"
  sed -i.bak -E "s/^type/export type/" "$OUTPUT_RELATIVE_PATH"
cd -

mv "$SCRIPT_DIR/$OUTPUT_RELATIVE_PATH" "$GRPC_TYPES_PATH"
rm -rf "${SCRIPT_DIR}"/{dist,dts,types}

yarn run lint:fix "${GRPC_TYPES_PATH}"
yarn prettier --write "${GRPC_TYPES_PATH}"
TARGETS="$GRPC_TYPES_PATH" yarn copyright
