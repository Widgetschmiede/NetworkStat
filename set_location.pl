#!/usr/bin/perl -w
#
#	for use with the Dashboard-Widget "Network Stat"
#	© by Pascal Pfiffner 2005/2006

use strict;

my $location = $ARGV[0] ? $ARGV[0] : 0;
my $string = `scselect "$location" 2>&1`;

if($? == 0) {
	#chomp $string;
	#$string =~ s/^.+?\((.+)\)$/$1/;
	print STDOUT 1;
}
else {
	print STDOUT "error: ".$?;
}