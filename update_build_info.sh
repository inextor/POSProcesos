#/bin/bash
myt=`date +"%s000"`;

echo "Building in $PWD";
echo "export const BuildInfo = {timestamp:$myt}" > $PWD/src/app/modules/shared/BuildInfo.ts

