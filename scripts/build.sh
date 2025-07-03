#!/bin/bash

set -e

cd "${0%/*}/.." # Move to the top dir

echo -n 'Building MVV... '

outdir=serve-root/

rm -fr ${outdir}
mkdir -p ${outdir}
mkdir -p ${outdir}res/
mkdir -p ${outdir}src/
npx tsc
cp -pr LICENSE src/*.html src/*.css src/popbox/ src/res js/* ${outdir}
cp -pr src/*.ts ${outdir}src/

echo "Success"
