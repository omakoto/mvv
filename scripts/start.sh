#!/bin/bash

set -e

cd "${0%/*}/.." # Move to the top dir

./scripts/build.sh

cd serve-root

port=11080
(
    sleep 0.5
    cd /
    (nohup google-chrome "http://localhost:$port/${ARGS:+?}${ARGS:-}" &)

) &

python3 -m http.server $port
