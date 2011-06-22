#!/bin/bash
#
#   NetworkStat Widget - http://www.widgetschmie.de/widgets/NetworkStat
#
#   Script to pack a widget from the git repo
#   Jun 22, 2011    Pascal Pfiffner
#

PACK="NetworkStat.wdgt"

# create the widget package
if [ -e $PACK ]; then
    echo -n "The widget package already exists. Should I remove it and start over? [yes/*no*] "
    read overwrite
    if [[ 'y' != ${overwrite:0:1} ]]; then
        exit
    fi
    rm -r $PACK
fi

mkdir $PACK

# copy most files
echo "Copying files"
SAVEIFS=$IFS
IFS=$(echo -en "\n\b")
for f in *; do
    if [[ "$PACK" == "$f" ]]; then
        continue
    elif [[ 'pack.sh' == "$f" ]]; then
        continue
    fi
    cp -R "$f" "$PACK/$f"
done
IFS=$SAVEIFS

# copy the plugin
echo "Adding the plugin"
echo "Done"