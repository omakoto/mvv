#!/bin/bash

set -e

cd "${0%/*}/.." # Move to the top dir

deploy_dest=~/cbin/omakoto.github.io/mvv/

build() {
    echo -n 'Building MVV... '

    tsc
    cp -pr README.md LICENSE src/*.html src/*.css src/popbox/ src/res/ dist/

    echo "Success"
}

deploy() {
    echo -n 'Deploying MVV... '

    if ! [[ -d "$deploy_dest" ]] ; then
        echo "Target directory \"$deploy_dest\" not found" 1>&2
        return 1
    fi

    rm -fr "$deploy_dest/*"

    mkdir -p "$deploy_dest"
    cp -pr dist/* "$deploy_dest"

    echo "Success"
}

build
if [[ "$1" == -d ]] || (( $MVV_ALWAYS_DEPLOY + 0 )) ; then
    deploy
fi
