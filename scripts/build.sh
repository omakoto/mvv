#!/bin/bash

set -e

cd "${0%/*}/.." # Move to the top dir

deploy_dest=~/cbin/omakoto.github.io/mvv/

echo -n 'Building MVV... '

tsc
cp -pr README.md LICENSE src/*.html src/*.css src/popbox/ src/res/ dist/

echo "Success"
