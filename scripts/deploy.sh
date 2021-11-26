#!/bin/bash

set -e

dest=~/cbin/omakoto.github.io/mvv/

cd "${0%/*}/.." # Move to the top dir

./scripts/build.sh

echo 'Deploying MVV...'

rm -fr "$dest/*"

mkdir -p "$dest"
cp -pr dist/* "$dest"
