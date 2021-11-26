#!/bin/bash

set -e

dest=~/cbin/omakoto.github.io/mvv/

cd "${0%/*}/.." # Move to the top dir

./scripts/build.sh

rm -fr "$dest"

cp -pr dist/* "$dest"
