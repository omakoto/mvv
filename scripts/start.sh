#!/bin/bash

set -e

cd "${0%/*}/.." # Move to the top dir

npm run build

npx live-server docs --port=11080 --open="/${ARGS:+?}${ARGS:-}"
