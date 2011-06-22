#!/bin/sh
#
#	for use with the Dashboard-Widget "Network Stat"
#	© by Pascal Pfiffner 2005/2006

ping -t 6 -q ${2:-"4.2.2.2"} | awk -v iface="${1:-wan}" '/round-trip/ { output = $4 } /packets transmitted/ { output2 = $1; output3 = $4 } END { print iface, output2, output3, output }';
