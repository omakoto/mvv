#!/bin/bash

set -e

SCRIPT_DIR="${0%/*}"

cd "$SCRIPT_DIR/../src"

port=11080
(
    sleep 0.5
    google-chrome http://localhost:$port/

) &

python3 -m http.server $port
