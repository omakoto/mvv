#!/bin/bash

set -e

cd "${0%/*}/.."

tsc
cp -pr src/*.html src/*.css src/popbox/ src/res/ dist/
