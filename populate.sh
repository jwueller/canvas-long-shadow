#!/bin/bash
set -e # fail on error

#
# This script pulls all gh-pages files from the build location.
#

if [ -z "$1" ];
then
    echo "Usage: $0 path/to/dist/gh-pages"
    exit 1
fi

ABSOLUTE_SRC_PATH=`realpath $1`
DST_PATH=`dirname "$0"`

pushd "$DST_PATH" > /dev/null
find * -not -name ".gitignore" -not -name "populate.sh" -delete
popd > /dev/null

cp -rfv "$1"/* "$DST_PATH"
