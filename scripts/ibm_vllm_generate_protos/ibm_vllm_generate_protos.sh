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
GRPC_TYPES_TMP_PATH=types

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
  # Fix imports: add .js extension
  sed -i.bak -E "s| from '(\.[^']*)'| from '\1.js'|g" types/*.ts types/**/*.ts
  rm types/**/*.bak types/*.bak

  npx tsc --project tsconfig.proto.json
  npx api-extractor run

  # declare -> export
  # export const -> let (due to 'const' declarations must be initialized error)
  sed -i.bak -E "s/^declare/export/" dist/grpc-types.d.ts
  sed -i.bak -E "s/^export const/let/" dist/grpc-types.d.ts
  rm dist/grpc-types.d.ts.bak
cd -

mv "${SCRIPT_DIR}/dist/grpc-types.d.ts" "$GRPC_TYPES_PATH"
yarn run lint:fix "${GRPC_TYPES_PATH}"
yarn prettier --write "${GRPC_TYPES_PATH}"
