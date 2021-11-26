#!/bin/bash

set -e

cd "${0%/*}/.." # Move to the top dir

./scripts/build.sh

cd dist

port=11080
(
    sleep 0.5
    (nohup google-chrome http://localhost:$port/ &)

) &

python3 -m http.server $port
