/*
 *	NetworkStat.js
 *
 *	Copyright 2005-2008, Widgetschmie.de
 *
 */


// Globals
var _sections = new Array("options", "ping", "about");
var _wanIPWebsite = "http://ip.ossus.ch/";

var original_timer = getTimer();
var seconds_left = original_timer;						// seconds left till next refresh
var refreshMode = getRefreshMode();						// refresh-mode
var refreshOnShow = getRefreshOnShow();					// refresh on every Dashboard-activation?
var showAllInterfaces = getShowAllInterfaces();			// if true, we show even the inactive interfaces
var mail_notification_on = getMailNotificationOn();		// send mails on new IP?
var stylesheet = getStylesheet();
var dateformat = getDateformat();

var pingIP = getPingIP();									// get the IP the user wants to ping

var doCountdown = ('manual' == refreshMode) ? 0 : 1;		// countdown active or not?
var lastRefresh = new Date();
var currentLocation = "unknown";
var the_timeout;
var iface_count = 0;					// how many interfaces have assigned IPs
var iparr = new Array();				// holds the current IPs (index is the "iface_count" of the corresponding interface)
var no_network_tries = 0;				// if no network is present, raise this one and retry after 10, 20 or 30 seconds. If after 3 tries no network is there, give up.
var currentlyRefreshingState = false;
var refreshBlocked = false;				// true if we should not refresh (e.g. prefs are shown or ping is in progress)
var countdownCalledWhileBlocked = false;	// if true we will resume the countdown after the block was lifted

var _version = 0;						// will be set by versioncheck.js

var recent_ips = getRecentIPs();

//alert(SystemConfigurationPlugin.nameOfActiveConfiguration());
//alert(SystemConfigurationPlugin.isAirPortActive());

// Dashboard Setup by Apple (sets the stylesheet, creates the "done" button and refreshes for the first time)
function setup() {
	setStylesheet(stylesheet);		// set stylesheet matching prefs
	getObj('refreshbutton').src = "Images_" + stylesheet + "/refresh.png";	// set refreshbutton matching stylesheet
	createGenericButton(getObj("done"), "done", savePrefs);
	
	switchPrefTab("options");
	_version = getCurrentVersion();
	
	// refresh state
	setTimeout("refreshState()", 100);
}




/*********************
 *	Main Functions   *
 *********************/

// refreshes all Info
function refreshState() {
	if(refreshBlocked) {
		countdownCalledWhileBlocked = true;
		setTimer('blocked...');
		seconds_left = 0;
		return;
	}
	countdownCalledWhileBlocked = false;
	
	currentlyRefreshingState = true;
	setTimer("in progress...");
	window.clearTimeout(the_timeout);
	the_timeout = null;
	
	// get Location
	setupLocations();
	
	// setup internal and external IPs (calls checkWAN() on itself)
	addInterfaces();
}

// call if refresh ended
function refreshEnded(seconds_already_set) {
	lastRefresh = new Date();
	getObj("lastRefresh").innerHTML = formatDate(lastRefresh, true);
	
	currentlyRefreshingState = false;
	if(!seconds_already_set) {
		seconds_left = original_timer;
	}
	
	setTimeout("adjustTotalSize(-1)", ANIM_DEF_TIME);
	setTimeout("countdown()", 10);
}


// gets information of all system locations
function setupLocations() {
	var locations = new Array();
	var current_loc = '';
	var sel = getObj("change_location_menu");
	
	if(window.widget) {
		if(window.widget && SystemConfigurationPlugin) {
			locations = SystemConfigurationPlugin.namesOfAllConfigurations();
			current_loc = SystemConfigurationPlugin.nameOfActiveConfiguration();
		}
		
		// empty old locations
		while(null != sel.lastChild) {
			sel.removeChild(sel.lastChild);
		}
		
		// loop all locations fetched above
		for(var i = 0; i < locations.length; i++) {
			var value = locations[i];
			var selected = (value == current_loc);
			
			// set up the option-element
			var opt = document.createElement("option");
			opt.value = value;
			opt.innerHTML = value;
			sel.appendChild(opt);
			
			// current location
			if(selected) {
				opt.selected = selected;
				currentLocation = value;
			}
		}
		
		// add option to open Network Prefs and Network Doctor
		var opt1 = document.createElement("option");
		opt1.value = -1;
		opt1.innerHTML = "----";
		sel.appendChild(opt1);
		var opt2 = document.createElement("option");
		opt2.value = -2;
		opt2.innerHTML = "Open Network Preferences";
		sel.appendChild(opt2);
		var opt3 = document.createElement("option");
		opt3.value = -3;
		opt3.innerHTML = "Open Network Diagnostics";
		sel.appendChild(opt3);
	}
	else {
		var n_a = document.createElement("option");
		n_a.value = 0;
		n_a.innerHTML = "not available";
		sel.appendChild(n_a);
	}
	
	displayLocation();
}

// displays the current location and the Icon
function displayLocation() {
	var loc_img = getObj("change_location_cover");
	var loc_sel = getObj("change_location_menu");
	loc_img.src = "Images_" + stylesheet + "/Home.png";
	loc_sel.setAttribute('onmouseover', "getObj('change_location_cover').src='Images_" + stylesheet + "/Home_hover.png'");
	loc_sel.setAttribute('onmouseout', "getObj('change_location_cover').src='Images_" + stylesheet + "/Home.png'");
	
	var obj = getObj("location");
	var current = currentLocation ? currentLocation : "unknown";
	
	obj.innerHTML = current;
}



// initiate getting interfaces
function addInterfaces() {
	purgeInterfaces();
	var ajax = false;
	
	// do we have a dashboard?
	if(window.widget) {
		addParagraph('main', 'nil', 'checking...', 'iface_1', 0, "height:0px;");
		toggleDiv('iface_1');
		
		try {
			var uid = widget.system("/usr/bin/id -u", null).outputString;
			uid = uid ? uid.replace(/\D/g, '') : 501;
			var xml_path = "/tmp/NetworkStat_" + uid + ".xml";
			
			widget.system("system_profiler SPNetworkDataType SPAirPortDataType -xml > " + xml_path, null);
			ajax = new simpleAjaxRequest("file://" + xml_path, retrieveInterfaces);
		}
		catch(exc) {  }
	}
	
	if(!ajax) {
		retrieveInterfaces(false);
	}
}


// add interfaces
function retrieveInterfaces(xmldoc) {
	if(window.widget) {
		var active_interface = false;
		var all = new Object();
		
		if(xmldoc) {
			all = parseSystemProfiler(xmldoc);
		}
		else {
			alert("retrieveInterfaces(): There is no XML data");
		}
		
		
		// *****
		// add interfaces
		iface_count = 0;
		iparr = Array();
		for(var key in all) {
			var iface = all[key];
			var main = iface['x_ifname'] ? iface['x_ifname'] : 'nil';
			iface['has_more_info'] = ('none' != main);
			
			// set 'active' setting
			var getifaddr = ('yes' == iface['x_ip_assigned']);
			if(('yes' == iface['x_ip_assigned']) && ('PPP' != iface['x_type'])) {
				try {
					getifaddr = widget.system("/usr/sbin/ipconfig getifaddr " + main, null).outputString;
				}
				catch(exc) {  }
			}
			iface['active'] = getifaddr ? true : false;
			
			// debug
			//var foo = main + "\n";		for(var p in iface) foo += "\t\t" + p + " -- " + iface[p];		alert(foo);
			
			// skip inactive
			if(!showAllInterfaces && ('yes' != iface['x_ip_assigned'] && !iface['active'])) {
				continue;
			}
			iface_count++;
			
			// the interface-name
			if(1 == iface_count) {
				replaceParagraph('iface_1', 'main', main, iface);
			}
			else {
				addParagraph('main', main, iface, 'iface_' + iface_count);
			}
			
			// we have info for this interface: show details
			if(iface['has_more_info']) {
				active_interface = true;
				iface['iface_num'] = iface_count;
				addParagraph('iface_more', 0, iface, "iface_more_" + iface_count, "interface_more");
			}
			iparr[iface_count] = iface['x_ipv4'];
		}
		
		// no active interface
		if(0 == iface_count) {
			alert('DEBUG: iface_count is 0');
			replaceParagraph('iface_1', 'main', 'nil', 'no network');
		}
		
		// init WAN check
		if(active_interface) {
			setTimeout("checkWAN()", 10);
		}
		else {
			no_network_tries++;
			var seconds_already_set = false;
			if(no_network_tries <= 3) {
				seconds_left = no_network_tries * 10;
				seconds_already_set = true;
			}
			refreshEnded(seconds_already_set);
		}
	}
	
	// no dashboard
	else {
		setTimer("not performed");
		addParagraph('main', "nil", "no dashboard");
	}
}


// requests the external IP from _wanIPWebsite
function checkWAN() {
	addParagraph('main', "wan", "checking...", 'wan', 0, "height:0px;");			// adds another checking-indicator
	toggleDiv('wan');
	
	var ajax = new simpleAjaxRequest(_wanIPWebsite, receiveWAN, 1);
	
	if(!ajax) {
		replaceParagraph('wan', 'main', "wan", "no AJAX");
		refreshEnded();
	}
}


// receives the WAN IP (hopefully); gets called by the simpleAjaxRequest-object upon success
function receiveWAN(external) {
	var seconds_already_set = false;
	
	// got an IP: check for errors and adjust
	if(external) {
		if((external.toString()).length > 15) {
			
			// checked too frequent; recheck in two minutes
			if(external.search("requests received from your IP address") > 1) {
				external = 'too frequent';
				seconds_left = 120;
				seconds_already_set = true;
			}
			else {
				alert("NetworkStat got the following response in order of an IP address:\n" + external);
				external = "error (see Console)";
			}
		}

		// IP is valid: save IP (unixstamp:ip)
		else {
			external = external.replace(/[^\d\.]+/g, '');
			saveAndNotifyThisIP(external);
			no_network_tries = 0;
		}
		
		var arr = new Array();
		arr['x_ipv4'] = external;
		arr['has_more_info'] = true;
		arr['active'] = true;
		
		iparr['wan'] = external;
		replaceParagraph('wan', 'main', "wan", arr);
		
		// Start Ping
		addParagraph('wan_more', 0, 0, 'wan_more', "interface_more");
		setTimeout("startJSPing('wan')", 10);
	}
	
	// no IP gotten; recheck
	else {
		replaceParagraph('wan', 'main', "wan", 'no network');
		no_network_tries++;
		
		if(no_network_tries <= 3) {
			seconds_left = no_network_tries * 10;
			seconds_already_set = true;
		}
	}
	
	refreshEnded(seconds_already_set);
}




// calls the shell script
var pingResult = null;
function startJSPing(iface, ping_ip) {
	if(pingResult) {
		getObj("ping_packets_" + iface).innerHTML = "retrying in 5 seconds...";
		setTimeout("startJSPing('" + iface + "', '" + ping_ip + "')", 5000);
		return;
	}
	
	if(window.widget) {
		if(!iface)
			return;
		if(!ping_ip)
			ping_ip = pingIP ? pingIP : "4.2.2.2";
		
		// show a message
		getObj("ping_packets_" + iface).innerHTML = "ping in progress...";
		try {
			pingResult = widget.system("./ping.sh " + iface + " " + ping_ip, displayJSPing);
		}
		catch(exc) {
			alert("error pinging");
		}
	}
	
	return false;
}

// gets the result from startJSPing and displays it
function displayJSPing() {
	refreshBlocked = false;
	if(countdownCalledWhileBlocked) {
		setTimeout("countdown()", 5000);
	}
	
	if(pingResult.outputString) {
		var arr = pingResult.outputString.replace(/[^\w\d\. \/]/g, "").split(/\/| /);
		var iface = arr[0] ? arr[0] : 'wan';
		var sent = arr[1] ? arr[1] : 0;
		var rec = arr[2] ? arr[2] : 0;
		pingResult = null;
		
		if(!getObj("ping_packets_" + iface)) {
			alert('error pinging: no ping_packets_' + iface + ' Object');
			return;
		}
		
		getObj("ping_packets_" + iface).innerHTML = Math.round((rec / sent) * 100) + "% of " + sent + " packets received";
		getObj("ping_min_" + iface).innerHTML = arr[3] ? arr[3] : "∞";
		getObj("ping_avg_" + iface).innerHTML = arr[4] ? arr[4] : "∞";
		getObj("ping_max_" + iface).innerHTML = arr[5] ? arr[5] : "∞";
	}
	else {
		alert('error pinging: no pingResult');
	}
}


// pings gateway of given interface and does all GUI stuff
function pingGateway(event) {
	if(!event || !event.target)
		return;
	
	var ping_ip = event.target.getAttribute('title');
	var iface = event.target.getAttribute('lang');
	var ping_id = "gateway_ping_" + iface;
	if(!getObj(ping_id)) {
		alert('cannot add ping_div');
		return;
	}
	
	// create the dom
	if(!getObj("ping_packets_" + iface)) {
		getObj(ping_id).appendChild(getPingDOM(iface, ping_ip));
	}
	
	// resize and init ping (if necessary)
	var resize = toggleDiv(ping_id, event.shiftKey);
	if(resize > 0) {
		refreshBlocked = true;
		startJSPing(iface, ping_ip);
	}
	setTimeout("adjustDiv('iface_more_" + iface + "', " + event.shiftKey + ")", event.shiftKey ? ANIM_LONG_TIME : ANIM_DEF_TIME);
}




// display time left to refresh and initiate refresh on t=0
function countdown() {
	if(refreshBlocked) {
		countdownCalledWhileBlocked = true;
		window.clearTimeout(the_timeout);
		the_timeout = null;
		setTimer('blocked...');
		return;
	}
	countdownCalledWhileBlocked = false;
	
	if(doCountdown) {
		var sleep_for = 60;
		
		// so, how long do we still have?
		if(seconds_left > 3600) {
			if(seconds_left % 3600 == 0)
				setTimer("in " + (seconds_left / 3600) + " hours");
			else {
				var hours = Math.floor(seconds_left / 3600);
				var minutes = Math.floor((seconds_left % 3600) / 60);
				setTimer("in " + hours + ((hours == 1) ? " hour" : " hours") + " " + minutes + ((minutes == 1) ? " minute" : " minutes"));
			}
		}
		
		// less than an hour but more than 60 seconds left
		else if(seconds_left > 60) {
			setTimer("in about " + Math.ceil(seconds_left / 60) + " minutes");
		}
		
		// less than a minute left
		else if(seconds_left > 0) {
			setTimer("in less than " + seconds_left + ((seconds_left == 1) ? " second" : " seconds"));
			sleep_for = 5;
		}
		
		// it is time, do a refresh
		else {
			setTimeout("refreshState()", 10);
			return;
		}
		
		// do it
		seconds_left -= sleep_for;
		window.clearTimeout(the_timeout);
		the_timeout = window.setTimeout("countdown()", sleep_for * 1000);
	}
	
	// refreshing manually
	else {
		window.clearTimeout(the_timeout);
		the_timeout = null;
		setTimer("MANUALLY");
	}
}


// gets called from the Plugin when the Mac awakes
function wokeFromSleep() {
	setTimer("in less than 10 seconds");
	window.clearTimeout(the_timeout);
	the_timeout = setTimeout("refreshState()", 10000);
}


function setTimer(text) {
	getObj('timer').innerHTML = text;
}








// called when a new location is chosen from the drop-down
function changeLocation(id, name) {
	no_network_tries = 0;
	
	if(window.widget) {
		if(id == -2) {
			widget.openApplication("com.apple.systempreferences");
			return;
		}
		else if(id == -3) {
			widget.openApplication("com.apple.NetworkDiagnostics");
			return;
		}
		else if(id != -1) {
			if(SystemConfigurationPlugin) {
				var loc_id = SystemConfigurationPlugin.IDOfConfigurationNamed(id);
				var set_success = widget.system("./set_location.pl '" + loc_id + "'", null).outputString;
				
				if(1 == set_success) {
					currentLocation = SystemConfigurationPlugin.nameOfActiveConfiguration();
				}
				else {
					currentLocation = set_success;
				}
			}
		}
	}
	
	setTimer("in less than 10 seconds");
	setTimeout("refreshState()", 10000);
}


function purgeInterfaces() {
	var parent = getObj('maincontent');
	var elements = parent.childNodes;
	var a = elements.length;
	
	for(i = a; i > 0; i--) {
		if(elements[i] && 'p' == elements[i].nodeName.toLowerCase())
			parent.removeChild(elements[i]);
	}
	
	adjustTotalSize(-1);
}

function purgeLastChild(id) {
	var parent = getObj(id);
	try {
		parent.removeChild(parent.lastChild);
	}
	catch(exc) {  }
}

function purgeParagraph(id) {
	var para = getObj(id);
	try {
		para.parentNode.removeChild(para);
	}
	catch(exc) {  }
}


// replaces a given (by ID) paragraph with new content
function replaceParagraph(id, type, iface_name, data_arr, my_class, my_style) {
	var p_old = getObj(id);
	var p_new = getParagraph(type, iface_name, data_arr, id, my_class, my_style);
	
	if(p_old && p_new) {
		try {
			p_old.replaceChild(p_new.firstChild, p_old.firstChild);
		}
		catch(exc) {
			alert("replaceParagraph(): failed replacing p_old");
		}
	}
	else {
		alert("replaceParagraph(): something`s missing - p_old is " + p_old + " and p_new is " + p_new);
		addParagraph(type, iface_name, data_arr, id, my_class, my_style);
	}
}


// adds a paragraph
function addParagraph(type, iface_name, data_arr, my_id, my_class, my_style) {
	var parent = getObj('maincontent');
	var paragraph = getParagraph(type, iface_name, data_arr, my_id, my_class, my_style);
	
	if(paragraph)
		parent.appendChild(paragraph);
}


// returns a paragraph; supply a type to know which one we must compose
function getParagraph(type, iface_name, data_arr, my_id, my_class, my_style) {
	var data = new Array();
	if(typeof(data_arr) == "object") {
		data = data_arr;
	}
	else {
		data['ipv4'] = data_arr;
		data['active'] = ('no network' == data_arr);
	}
	
	// <p>
	var paragraph = document.createElement("p");
	if(my_id)
		paragraph.setAttribute('id', my_id);
	my_class = (my_class && my_class.length > 0) ? my_class : "interface_main";
	paragraph.setAttribute('class', my_class);
	if(my_style)
		paragraph.setAttribute('style', my_style);
	
	// sub
	var sub = document.createElement('div');
	sub.setAttribute('class', ('main' == type) ? "interface_main_sub" : "interface_more_sub");
	
	
	// ****
	// we have a major paragraph (that is, an interface main paragraph with image)
	if('main' == type) {
		
		// Interface-Image (or text if interface is not known)
		var known_ifaces = new Array();
		known_ifaces['en1'] = 'AirPort';
		known_ifaces['en0'] = 'Ethernet';
		known_ifaces['fw0'] = 'FireWire';
		known_ifaces['bt0'] = 'Bluetooth';
		known_ifaces['ppp0'] = 'PPP';
		known_ifaces['modem'] = 'PPP';			// the modem
		known_ifaces['wan'] = 'Internet';
		known_ifaces['nil'] = 'None';
		
		var img;
		if(known_ifaces[iface_name]) {
			img = document.createElement("img");
			img.setAttribute("src", "Images_" + stylesheet + "/" + known_ifaces[iface_name] + ".png");
			img.setAttribute("src", "Images_" + stylesheet + "/" + known_ifaces[iface_name] + ".png");
			img.setAttribute("class", "interface_img");
			if(data['has_more_info']) {
				img.setAttribute('onmouseover', "this.src='Images_" + stylesheet + "/" + known_ifaces[iface_name] + "_hover.png'");
				img.setAttribute('onmouseout', "this.src='Images_" + stylesheet + "/" + known_ifaces[iface_name] + ".png'");
			}
		}
		else {
			img = document.createElement("span");
			img.setAttribute("class", "interface_unknownname");
			img.innerHTML = data['x_ifname'] ? data['x_ifname'].substr(0, 3) : (iface_name ? iface_name.substr(0, 3) : "??");
		}
		
		if(data['has_more_info']) {
			img.setAttribute('onclick', "toggleMoreInfo(this.parentNode.parentNode, event)");
		}
		
		sub.appendChild(img);
		
		var display = data['x_ipv4'] ? data['x_ipv4'] : data_arr;
		sub.appendChild(data['active'] ? getClipboardLink(display, "data_big") : getGeneric('span', display, '', "inactive"));
	}
	
	
	// ******
	// we have an interface-moreinfo-paragraph
	else if('iface_more' == type) {
		
		// ***
		// First, IPv4 info
		if(data['x_ipv4_config'] || data['x_ipv4_gateway'] || data['x_ipv4_netmask'] || (data['x_dns'] && (data['x_dns'].length > 0))) {
			sub.appendChild(getDiv("IPv4", "sub_title"));
			var body = getDiv(null, 'sub_body');
			var ping_div = null;
			
			// ConfigMethod
			if(data['x_ipv4_config']) {
				body.appendChild(getDiv("Config", "inline_div_3"));
				body.appendChild(getDiv(getClipboardLink(data['x_ipv4_config']), "inline_div_6"));	
			}
			
			// Gateway
			if(data['x_ipv4_gateway']) {
				var my_router_ip = data['x_ipv4_gateway'] ? data['x_ipv4_gateway'] : 'unknown';
				body.appendChild(getDiv("Gateway", "inline_div_3"));
				var router_div = getDiv(getClipboardLink(my_router_ip), "inline_div_6");
				
				// let the gateway get pinged
				if(my_router_ip) {
					var ping_link = document.createElement("img");
					ping_link.setAttribute('src', "Images_" + stylesheet + "/pingButton.png");
					ping_link.setAttribute("class", "pingButton");
					ping_link.setAttribute("alt", "ping");
					ping_link.setAttribute("title", my_router_ip);
					ping_link.setAttribute("lang", data['iface_num']);
					ping_link.setAttribute("onclick", "pingGateway(event)");
					router_div.appendChild(ping_link);
					
					ping_div = document.createElement("div");
					ping_div.setAttribute("id", 'gateway_ping_' + data['iface_num']);
					ping_div.setAttribute("style", "position:relative; overflow:hidden; height:0px;");
				}
				
				body.appendChild(router_div);
			}
			
			// Netmask
			if(data['x_ipv4_netmask']) {
				var my_mask = data['x_ipv4_netmask'] ? data['x_ipv4_netmask'] : 'unknown';
				body.appendChild(getDiv("Netmask", "inline_div_3"));
				body.appendChild(getDiv(getClipboardLink(my_mask), "inline_div_6"));
			}
			
			// DNS Servers
			if(data['x_dns'] && (data['x_dns'].length > 0)) {
				var dns_arr = data['x_dns'] ? data['x_dns'] : new Array();
				for(var i in dns_arr) {
					body.appendChild(getDiv("DNS " + (1* i + 1), "inline_div_3"));
					body.appendChild(getDiv(getClipboardLink(dns_arr[i]), "inline_div_6"));
				}
			}
			
			/* Broadcast
			if(data['bcast']) {
				body.appendChild(getDiv("Broadcast", "inline_div_3"));
				body.appendChild(getDiv(getClipboardLink(data['bcast']), "inline_div_6"));
			}	// */
			
			sub.appendChild(body);
			
			// add the ping-div
			if(null != ping_div) {
				sub.appendChild(ping_div);
			}
		}
			
		
		// ***
		// IPv6 and Prefixlength
		if(data['ipv6']) {
			sub.appendChild(getDiv("IPv6", "sub_title"));
			var body = getDiv(null, 'sub_body');
			body.appendChild(getClipboardLink(data['ipv6']));
			body.appendChild(document.createTextNode(" | "));
			body.appendChild(getClipboardLink(data['prefixlen']));
			sub.appendChild(body);
		}
		
		
		// ***
		// wireless networks
		if(data['x_ssid'] || data['x_wireless_channel']) {
			sub.appendChild(getDiv("Wireless", "sub_title"));
			var body = getDiv(null, 'sub_body');
			
			// SSID
			if(data['x_ssid']) {
				body.appendChild(getDiv("SSID", "inline_div_3"));
				body.appendChild(getDiv(getClipboardLink(data['x_ssid']), "inline_div_6"));
				body.appendChild(document.createElement("br"));
			}
			
			// Wireless channel
			if(data['x_wireless_channel']) {
				body.appendChild(getDiv("Channel", "inline_div_3"));
				body.appendChild(getDiv(getClipboardLink(data['x_wireless_channel']), "inline_div_6"));
			}
			
			sub.appendChild(body);
		}
		
		
		// ***
		// Proxy information
		if(data['x_proxy_HTTP'] || data['x_proxy_HTTP_port']) {
			sub.appendChild(getDiv("Proxy settings", "sub_title"));
			var body = getDiv(null, 'sub_body');
			
			// Proxy
			if(data['x_proxy_HTTP']) {
				body.appendChild(getDiv("http proxy", "inline_div_3"));
				body.appendChild(getDiv(getClipboardLink(data['x_proxy_HTTP']), "inline_div_6"));
				
				if(data['x_proxy_HTTP_port']) {
					body.appendChild(getDiv("proxy port", "inline_div_3"));
					body.appendChild(getDiv(getClipboardLink(data['x_proxy_HTTP_port']), "inline_div_6"));
				}
				
				if(data['x_proxy_exceptions']) {
					body.appendChild(getDiv("exceptions", "inline_div_3"));
					body.appendChild(getDiv(getClipboardLink(data['x_proxy_exceptions'].shift().firstChild.nodeValue), "inline_div_6"));
					for(var e = 0; e < data['x_proxy_exceptions'].length; e++) {
						body.appendChild(getDiv('', "inline_div_3"));
						body.appendChild(getDiv(getClipboardLink(data['x_proxy_exceptions'][e].firstChild.nodeValue), "inline_div_6"));
					}
				}
			}
			
			// PASV
			if(0 != data['x_proxy_PASV']) {
				body.appendChild(document.createElement("br"));
				body.appendChild(getDiv("PASV", "inline_div_3"));
				body.appendChild(getDiv(getClipboardLink((data['x_proxy_PASV'] > 0) ? 'enabled' : 'disabled'), "inline_div_6"));
			}
			
			sub.appendChild(body);
		}
		
		
		// ***
		// tech info
		sub.appendChild(getDiv("other information", "sub_title"));
		var body = getDiv(null, 'sub_body');
		
		// BSD name
		body.appendChild(getDiv("Name", "inline_div_3"));
		body.appendChild(getDiv(getClipboardLink(data['x_ifname']), "inline_div_6"));
		
		// Type
		if(data['x_type']) {
			body.appendChild(getDiv("Type", "inline_div_3"));
			body.appendChild(getDiv(getClipboardLink(data['x_type']), "inline_div_6"));
		}
		
		// MAC
		if(data['x_MAC']) {
			body.appendChild(getDiv("MAC", "inline_div_3"));
			body.appendChild(getDiv(getClipboardLink(data['x_MAC']), "inline_div_6"));
		}
		
		sub.appendChild(body);
	}
	
	
	// ****
	// the WAN-moreinfo-paragraph
	else if('wan_more' == type) {
		
		// the last IPs
		if(recent_ips.length > 0) {
			sub.appendChild(getDiv("Your last WAN-IPs", "sub_title"));
			var body = getDiv(null, 'sub_body');
			
			// current IP (time info)
			var thisdate = new Date(recent_ips[0]['time'] * 1000);
			var datestring = formatDate(thisdate);
			body.appendChild(document.createTextNode("current IP since " + datestring));
			body.appendChild(document.createElement("br"));
			
			// older IPs
			for(var i = 1; i < recent_ips.length; i++) {
				var thisdate = new Date(recent_ips[i]['time'] * 1000);
				
				var ip_link = getClipboardLink(recent_ips[i]['ip']);
				
				body.appendChild(document.createTextNode(formatDate(thisdate) + ": "));
				body.appendChild(ip_link);
				body.appendChild(document.createElement("br"));
			}
			
			sub.appendChild(body);
		}
		
		// the ping-info
		var ping_dom = getPingDOM('wan', pingIP);
		sub.appendChild(ping_dom);
	}

	paragraph.appendChild(sub);
	return paragraph;
}


function toClipboard(value) {
	if(window.widget && SystemConfigurationPlugin && value) {
		SystemConfigurationPlugin.copyStringToClipboard(value);
	}
}


// saves the given IP if it is different from the last IP and sends an email (if set in the prefs)
function saveAndNotifyThisIP(ip) {
	//alert("given ip: " + ip + ", recent_ips[0][ip]: " + recent_ips[0]['ip']);
	if(!ip || (recent_ips[0] && (ip == recent_ips[0]['ip'])))
		return;
	
	if(window.widget) {
		
		// notify by email
		if(mail_notification_on) {
			setTimeout("notifyNewIP('" + ip + "')", 100);
		}
		
		// save new ip
		if(recent_ips.length >= 8) {
			recent_ips.pop();
		}
		var new_arr = new Array();
		new_arr['time'] = Math.round((new Date).getTime() / 1000);
		new_arr['ip'] = ip;
		recent_ips.unshift(new_arr);
		
		// concat all saved ips to a string
		var savestring = '';
		for(var i = 0; i < recent_ips.length; i++) {
			savestring += "|" + recent_ips[i]['time'] + ":" + recent_ips[i]['ip'];
		}
		
		widget.setPreferenceForKey(savestring, "recentIPs");
	}
}

// sends mail
function notifyNewIP(ip) {
	var to = getNotificationAddresses();
	var sent = sendMail(ip, to, "Network Stat: Your IP has changed");
	return sent;
}

// sends a test mail to the first email address
function sendTestMailClicked() {
	var sendbutton = getObj('testmail_send_button');
	if(sendbutton) {
		sendbutton.value = "sending...";
		sendbutton.disabled = true;
	}
	
	setTimeout("sendTestMail()", 10);
}

function sendTestMail() {
	var sendbutton = getObj('testmail_send_button');
	
	// extract first address
	var to = getNotificationAddresses();
	to = to ? to : '';
	to = to.split(' ');
	
	// send
	var sent = false;
	if(to && to[0]) {
		sent = sendMail(iparr['wan'], to[0], "Network Stat: Testmail");
	}
	
	// reset sendbutton
	if(sendbutton) {
		sendbutton.value = sent ? "testmail sent" : "sending failed";
		sendbutton.disabled = false;
	}
	setTimeout("resetTestmailButton()", 8000);
	return sent;
}


// formats and sends an email
function sendMail(ip, to, subject) {
	var sent = false;
	
	if(to && to.length > 6) {
		if(window.widget && SystemConfigurationPlugin.isMailConfigured()) {
			var mailbody = "Hy, this is the Network Stat Widget\n\nI send you this email to report the new IP-address of your Mac \"HOSTNAME\". The new IP-address is\n\n" + ip + "\n\nBye!\nNetwork Stat\n";
			sent = SystemConfigurationPlugin.sendMail(mailbody, to, subject);
			
			var failed_div = getObj('notification_mail_failed');
			if(!sent) {
				try {
					failed_div.style.display = 'block';
				}
				catch(exc) {
					alert('sending notification mails was unsuccessful');
				}
			}
			else if(failed_div) {
				failed_div.style.display = 'none';
			}
		}
		else {
			alert("Mail is not configured, cannot send notification emails");
		}
	}
	return sent;
}


function resetTestmailButton() {
	var sendbutton = getObj('testmail_send_button');
	if(sendbutton) {
		sendbutton.value = sendbutton.lang;
	}
}





// returns a two-dimensional sorted array holding all IPs; returns arr[#][time] and arr[#][ip]
function getRecentIPs() {
	var sorted = new Array();
	
	if(window.widget) {
		//var value = "1145782849:195.186.11.11|1145782591:195.18.2.2|1145682500:127.0.0.1";		// debug
		var value = widget.preferenceForKey("recentIPs");
		var arr = value ? value.split("|") : false;
		
		if(arr) {
			// new array containing the dates
			var sortarr = new Array();
			var fullarr = new Array();
			
			for(var i = 0; i < arr.length; i++) {
				var foo = arr[i].split(":");
				
				if(foo[0] > 0) {
					sortarr.push(foo[0]);
					fullarr[foo[0]] = foo[1];
				}
			}
			
			// sort
			sortarr.sort(NumDESCsort);
			
			// compose to full array
			for(var i = 0; i < sortarr.length; i++) {
				var key = sortarr[i];
				
				if(fullarr[key]) {
					var ar = new Array();
					ar['time'] = key.replace("/\D+/g");
					ar['ip'] = fullarr[key].replace("/[^\.\d]+/g");
					
					sorted.push(ar);
				}
			}
		}
	}
	
	return sorted;
}


function startMail() {
	if(window.widget) {
		widget.openApplication("com.apple.mail");
	}
}



/*
 *************
 * Utilities *
 *************
 */



//	Localization
/*
function getLocalizedString (key)
{
	try {
		return localizedStrings[key];
	} catch (ex) {}

	return key;
}
*/






/*
 **********
 * Events *
 **********
 */

if(window.widget) {
	widget.onshow = onShow;
	widget.onhide = onHide;
}


function onShow() {
	doCountdown = ('manual' == refreshMode) ? 0 : 1;
	
	// refresh now
	if(refreshOnShow) {
		refreshState();
	}
}

function onHide() {	
}





/*
 ********************
 * GUI manipulation *
 ********************
 */


function blendFromTo(from_id, to_id) {
	var from = getObj(from_id);
	var to = getObj(to_id);
	
	if(from && to) {
		from.style.display = 'none';
		to.style.display = 'block';
	}
}


// toggles the next sibling (in DOM node)
function toggleMoreInfo(obj, event) {
	if(!obj || !obj.nextSibling)
		return;
	
	var moreinfo = obj.nextSibling;
	if((moreinfo == null) || ('interface_more' != moreinfo.className))
		return;
	
	toggleDiv(obj.nextSibling, event.shiftKey);
}



/*
 *	Anmiation
 */
var ANIM_DEF_TIME = 300;
var ANIM_LONG_TIME = 3000;

var resize = new Array();
var dimensions = new Array();
dimensions[1] = { topheight:54, bottomheight:22, width:250, minheight:140 };
dimensions[2] = { topheight:54, bottomheight:22, width:250, minheight:140 };
dimensions[3] = { topheight:49, bottomheight:18, width:230, minheight:140 };

// a class holding resize-information
function resizeValues(obj, longtime, startsize, endsize, diff) {
	if(!(this instanceof resizeValues))
		return new resizeValues(obj, longtime, startsize, endsize, diff);
	
	this.obj = obj;
	this.duration = longtime ? ANIM_LONG_TIME : ANIM_DEF_TIME;
	this.startsize = startsize;
	this.endsize = endsize;
	
	var now = (new Date()).getTime();
	this.starttime = now;
	this.endtime = 1 * now + this.duration;
	this.diff = diff;
	
	this.windowAdjusted = false;
	this.timeout = null;
	
	return this;
}


// same as toggleDiv, but simply adjusts a parent div to the needed height of its child(s). Only call if a child uses toggleDiv since this one wont resize the widget!
function adjustDiv(div, longtime) {
	var now = (new Date()).getTime();
	var obj = getObj(div);
	if(!obj) {
		alert("adjustDiv(" + div + "): no obj given!");
		return;
	}
	
	// prepare
	var rid = (new Date()).getTime();
	var startsize = getComputedValue('height', obj, 1);
	var endsize = getComputedValue('height', obj.firstChild, 1) + ('interface_main' == obj.className ? 5 : 12);
	
	resize[rid] = new resizeValues(obj, longtime, startsize, endsize, endsize - startsize);
	resize[rid].windowAdjusted = true;
	
	// init
	//alert(obj.id + ': resize from ' + resize[rid].startsize + ' to ' + resize[rid].endsize + ' (diff is ' + resize[rid].diff + ') initiating' + ' in ' + resize[rid].duration);
	setTimeout("resizeDiv(" + rid + ")", 10);
}

// toggles a divs size (visible or 0 height). Returns the amount of pixels to resize.
function toggleDiv(div, longtime) {
	var now = (new Date()).getTime();
	var obj = getObj(div);
	if(!obj) {
		alert('toggleDiv(): no obj given!');
		return 0;
	}
	
	// prepare
	var rid = (new Date()).getTime();
	var startsize = getComputedValue('height', obj, 1);
	var endsize = (startsize > 0) ? 0 : (getComputedValue('height', obj.firstChild, 1) + ('interface_main' == obj.className ? 5 : 12));
	
	resize[rid] = new resizeValues(obj, longtime, startsize, endsize, endsize - startsize );
	
	// resize the widget
	if(resize[rid].diff > 0) {
		adjustTotalSize(rid);
		resize[rid].windowAdjusted = true;
	}
	
	// init
	//alert(obj.id + ': resize from ' + resize[rid].startsize + ' to ' + resize[rid].endsize + ' (diff is ' + resize[rid].diff + ') initiating' + ' in ' + resize[rid].duration);
	setTimeout("resizeDiv(" + rid + ")", 10);
	return resize[rid].diff;
}


var resize_timeout = null;
function resizeDiv(rid) {
	var obj = resize[rid].obj;
	if(!obj)
		return;
	
	clearTimeout(resize[rid].timeout);
	resize[rid].timeout = null;
	
	var now = (new Date()).getTime();
	
	// while resizing
	if(now < resize[rid].endtime) {
		//obj.style.background = "url(Images/bevelTop.png) top left repeat-x";
		var delta = (now - resize[rid].starttime) / resize[rid].duration;
		var factor = ((delta * delta) * 3.0) - ((delta * delta * delta) * 2.0);
		var size = (resize[rid].startsize * (1 - factor)) + (resize[rid].endsize * factor);
		
		obj.style.height = size + "px";
	}
	
	// finishing
	else {
		//obj.style.background = 'transparent';
		obj.style.height = resize[rid].endsize + "px";
		if(!resize[rid].windowAdjusted) {
			adjustTotalSize(rid);
		}
		delete(resize[rid]);
		return;
	}
	
	resize[rid].timeout = setTimeout("resizeDiv(" + rid + ")", 40);
}


// scales the whole widget up (using the diff-amount) or down (calculating the needed height)
function adjustTotalSize(rid) {
	if(window.widget) {
		var diff = resize[rid] ? resize[rid].diff : rid;
		var newTotalSize = window.innerHeight + (1* diff);

		if(diff < 0) {
			newTotalSize = getComputedValue('height', getObj('main'), 1) + dimensions[stylesheet].topheight + dimensions[stylesheet].bottomheight;
			//alert("height of main is " + getComputedValue('height', getObj('main')) + ", shrinking to " + newTotalSize);
		}

		window.resizeTo(dimensions[stylesheet].width, (newTotalSize < dimensions[stylesheet].minheight) ? dimensions[stylesheet].minheight : newTotalSize);

		//alert("window.resizeTo(" + dimensions[stylesheet].width + ", " + ((newTotalSize < dimensions[stylesheet].minheight) ? dimensions[stylesheet].minheight : newTotalSize) + ")");
		if(resize[rid]) {
			resize[rid].windowAdjusted = true;
		}
	}
}






// sets the window-height to a min-height
function setMinDimensionsTo(width, height) {
	if(!window.widget || !width || !height)
		return;
	
	var is_w = window.innerWidth;
	var is_h = window.innerHeight;
	
	if((is_w < width) || (is_h < height)) {
		window.resizeTo((is_w < width) ? width : is_w, (is_h < height) ? height : is_h);
	}
}


// formats a date-stamp in the desired format (err... well, yeah, just like that)
function formatDate(stamp, with_seconds) {
	if(!stamp)
		stamp = new Date();
	
	var timestring = '';
	
	// date
	var day = stamp.getDate();
	var month = stamp.getMonth() + 1;
	var year = stamp.getFullYear();
	
	// time
	var hours = stamp.getHours();
	hours = (hours < 10) ? "0" + hours : hours;
	var minutes = stamp.getMinutes();
	minutes = ":" + ((minutes < 10) ? "0" + minutes : minutes);
	var seconds = '';
	if(with_seconds) {
		seconds = stamp.getSeconds();
		seconds = ":" + ((seconds < 10) ? "0" + seconds : seconds);
	}
	var timestring = '';
	
	// compose
	if(dateformat && ("us" == dateformat)) {
		var ampm = "AM";
		if(hours > 12) {
			ampm = "PM";
			hours -= 12;
			hours = (hours < 10) ? "0" + hours : hours;
		}
		timestring = month + "/" + day + "/" + year + " " + hours + minutes + seconds + " " + ampm;
	}
	else {
		timestring = day + "." + month + "." + year + " " + hours + minutes + seconds;
	}
	
	return timestring;
}



/*
 **************
 *  by Apple  *
 **************
 */

var flipShown = false;
var animation = { duration:0, starttime:0, to:1.0, now:0.0, from:0.0, firstElement:null, timer:null };

function mousemove(event) {
	if(!flipShown) {
		if (animation.timer != null) {
			clearInterval(animation.timer);
			animation.timer = null;
		}
 
		var starttime = (new Date).getTime() - 13;
 
		animation.duration = 500;
		animation.starttime = starttime;
		animation.firstElement = getObj('flip');
		animation.timer = setInterval("animate();", 13);
		animation.from = animation.now;
		animation.to = 1.0;
		animate();
		flipShown = true;
	}
}


function mouseexit(event) {
	if(flipShown) {
		
		// fade out the info button
		if (animation.timer != null)
		{
			clearInterval (animation.timer);
			animation.timer  = null;
		}

		var starttime = (new Date).getTime() - 13;

		animation.duration = 500;
		animation.starttime = starttime;
		animation.firstElement = getObj('flip');
		animation.timer = setInterval ("animate();", 13);
		animation.from = animation.now;
		animation.to = 0.0;
		animate();
		flipShown = false;
	}
}

function animate() {
	var T;
	var ease;
	var time = (new Date).getTime();
	
	T = limit_3(time-animation.starttime, 0, animation.duration);

	if (T >= animation.duration) {
		clearInterval (animation.timer);
		animation.timer = null;
		animation.now = animation.to;
	}
	else {
		ease = 0.5 - (0.5 * Math.cos(Math.PI * T / animation.duration));
		animation.now = computeNextFloat (animation.from, animation.to, ease);
	}

	animation.firstElement.style.opacity = animation.now;
}

function limit_3(a, b, c) {
	return a < b ? b : (a > c ? c : a);
}

function computeNextFloat(from, to, ease) {
	return from + (to - from) * ease;
}


// these functions are called when the info button itself receives onmouseover and onmouseout events (by Apple)

function enterflip(event) {
	getObj("fliprollie").style.display = "block";
}

function exitflip(event) {
	getObj("fliprollie").style.display = "none";
}




