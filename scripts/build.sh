#!/bin/bash

set -e

cd "${0%/*}/.." # Move to the top dir

echo -n 'Building MVV... '

rm -f src/res/*~
rm -fr docs/
mkdir -p docs/
mkdir -p docs/res/
mkdir -p docs/src/
npx tsc
cp -pr LICENSE src/*.html src/*.css src/popbox/ src/res js/* docs/
cp -pr src/*.ts docs/src/

echo "Success"
