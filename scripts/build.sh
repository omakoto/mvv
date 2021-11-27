#!/bin/bash

set -e

cd "${0%/*}/.." # Move to the top dir

echo -n 'Building MVV... '

tsc
cp -pr LICENSE src/*.html src/*.css src/popbox/ src/res/ docs/

echo "Success"
