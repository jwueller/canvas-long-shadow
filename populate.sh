#!/bin/bash

#
# This script pulls all gh-pages files from the build location.
#

if [ -z "$1" ];
then
    echo "Usage: $0 path/to/dist/gh-pages"
    exit 1
fi

cp -rfv "$1"/* .
