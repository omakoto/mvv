#!/bin/bash

set -e

cd "${0%/*}/.."

./scripts/build.sh

cd dist

port=11080
(
    sleep 0.5
    google-chrome http://localhost:$port/

) &

python3 -m http.server $port
