#!/bin/sh
# stamp the current git sha into the page
S=$(git rev-parse --short HEAD)
sed -i "s#<meta name=\"build\" content=\"[^\"]*\"#<meta name=\"build\" content=\"$S\"#; s#\(data-testid=\"build-sha\">\)[^<]*#\1$S#" app/index.html
echo $S
