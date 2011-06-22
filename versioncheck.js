/*
 ****************************
 *     Version checking     *
 *   © by widgetschmie.de   *
 ****************************
 */


function showVersion(ver) {
	if(getObj('infospan'))
		getObj('infospan').innerHTML = "NetworkStat " + (ver ? getBeautifulVersionnumber(ver) : '');
}


// returns the current version number from the Info.plist
function getCurrentVersion() {
	var localReq = new XMLHttpRequest(); 
	localReq.open("GET", "Info.plist", false); 
	localReq.send(null); 
	
	var infoPlist = localReq.responseText; 
	
	var versionRegEx = /<key>CFBundleVersion<\/key>\s*<string>([^<]*)<\/string>/;
	var versionRaw = infoPlist.match(versionRegEx);
	var thisVersion = versionRaw[1];
	
	// display this version on the backside of the Widget
	showVersion(thisVersion);
	if(undefined == thisVersion) {
		alert("An error occurred while checking the local version. Assuming local version up-to-date.");
		return 0;
	}
	
	return thisVersion;
}

// returns the version-number in a comparable form
	// we support version-numbering with up to 3 dots, e.g. 1.8.1.4
	// the last 2 steads support up to --6-- numbers, first 2 up to --3--
	// 1.8.1.4 becomes 1 008 000001 000004
function getComparableVersionnumber(ver) {
	var prts = ver ? ver.split(/\./) : new Array();
	var version = (prts[0] * 1000000 * 1000000 * 1000) +
						(prts[1] ? (prts[1] * 1000000 * 1000000) : 0) +
						(prts[2] ? (prts[2] * 1000000) : 0) +
						(prts[3] ? (prts[3] * 1) : 0);
	return version;
}

// returns a human readable versionnumber, from original version or comparable versionnumber
	// 1.8.060429 becomes 1.8.beta
	// 1008000001000000 becomes 1.8.1
function getBeautifulVersionnumber(ver) {
	
	// internal version number
	if(ver > 1000000) {
		var parts = new Array();
		
		parts[3] = ver % 1000000;
		ver = (ver - parts[3]) / 1000000;
		parts[2] = ver % 1000000;
		ver = (ver - parts[2]) / 1000000;
		parts[1] = ver % 1000;
		ver = (ver - parts[1]) / 1000;
		parts[0] = ver % 1000;
	}
	
	// raw number
	else {
		var parts = ver ? ver.split(/\./) : new Array();
	}
	
	// compose
	var version = (parts[3] > 0) ? ((parts[3] > 1000) ? 'beta' : parts[3]) : undefined;
	version = (parts[2] > 0) ? (((parts[2] > 1000) ? 'beta' : parts[2]) + (version ? ("." + version) : '')) : ((undefined == version) ? undefined : 0 + "." + version);
	version = (parts[1] > 0) ? (parts[1] + (version ? ("." + version) : '')) : ((undefined == version) ? undefined : "0." + version);
	version = (parts[0] > 0) ? (parts[0] + (version ? ("." + version) : '.0')) : ((undefined == version) ? undefined : "0." + version);
	
	//alert(parts[0] + "." + parts[1] + "." + parts[2] + "." + parts[3] + " -- " + version);
	return version;
}


// checks the latest version online
latest_obj = null
function checkLatestVersion(link) {
	latest_obj = getObj(link);
	if(latest_obj)
		latest_obj.innerText = "checking...";
	
	var ajax = new simpleAjaxRequest("http://widgetschmie.de/widgets/NetworkStat/latest", setLatestVersion, 1);
	if(!ajax) {
		latest_obj.innerHTML = "ajax-error";
	}
}


// receives the latest versionnumber
function setLatestVersion(latest) {
	if(null == latest) {
		if(latest_obj)
			latest_obj.innerHTML = "no network";
		return;
	}
	latest = latest ? ((latest.indexOf("\n") > 0) ? latest.substr(0, latest.indexOf("\n")) : latest) : '';
	latest = latest ? getComparableVersionnumber(latest) : 0.1;
	
	// error
	if(isNaN(latest)) {
		if(latest_obj)
			latest_obj.innerHTML = "error";
	}
	
	// compare
	else {
		var myVersion = _version ? getComparableVersionnumber(_version) : 0;
		if(latest_obj)
			latest_obj.innerHTML = (latest == myVersion) ? ("You are up to date") : ("Latest: " + getBeautifulVersionnumber(latest));
	}
}

