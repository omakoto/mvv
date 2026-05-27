#!/bin/bash

set -e

cd "${0%/*}/.." # Move to the top dir

npm run build
