#!/bin/bash

set -e

cd "${0%/*}/.." # Move to the top dir

echo 'Building MVV...'

tsc
cp -pr README.md LICENSE src/*.html src/*.css src/popbox/ src/res/ dist/
