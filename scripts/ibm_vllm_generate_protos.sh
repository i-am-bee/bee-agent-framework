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
GRPC_TYPES_PATH="./src/adapters/ibm-vllm/types"

rm -r "$GRPC_TYPES_PATH"

yarn run proto-loader-gen-types \
  --defaults \
  --keepCase \
  --oneofs \
  --longs=Number \
  --enums=String \
  --grpcLib=@grpc/grpc-js \
  --"outDir=${GRPC_TYPES_PATH}" \
  "${GRPC_PROTO_PATH}"/*.proto

# Fix imports: relative -> absolute, add .js extension
sed -i.bak -E "s| from '\.\.?([^']*)'| from '@/${GRPC_TYPES_PATH//.\/src\//}\1.js'|g" \
  "${GRPC_TYPES_PATH}"/*.ts \
  "${GRPC_TYPES_PATH}"/**/*.ts
rm "${GRPC_TYPES_PATH}"/**/*.bak "${GRPC_TYPES_PATH}"/*.bak
yarn run lint:fix "${GRPC_TYPES_PATH}"
yarn prettier --write "${GRPC_TYPES_PATH}"
