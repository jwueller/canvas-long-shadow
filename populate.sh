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

DST_PATH=`dirname "$0"`
SELF_NAME=`basename "$0"`

# Clean up. Change the PWD to ensure that this script does not get deleted when
# calling from somewhere else.
pushd "$DST_PATH" > /dev/null
find * -not -name "$SELF_NAME" -delete
popd > /dev/null

# Get the latest stuff.
cp -rfv "$1"/* "$DST_PATH"
