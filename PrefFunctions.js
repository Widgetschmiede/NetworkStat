
/*
 ********************
 *  Pref Functions  *
 * © Widgetschmiede *
 ********************
 */

function getTimer() {		// get refresh-timer from prefs
	var value = 7200;
	if(window.widget) {
		value = widget.preferenceForKey("timer");
	}
	value = value ? value : 7200;
	return value;
}

function getRefreshMode() {		// get mode from prefs (manual or countdown)
	var value = 'countdown';
	if(window.widget) {
		value = widget.preferenceForKey("refreshMode");
		value = inArray(new Array('manual', 'countdown'), value) ? value : "countdown";
	}
	
	return value;
}

function getShowAllInterfaces() {
	var value = false;
	if(window.widget) {
		value = widget.preferenceForKey("showAllInterfaces");
	}
	value = value ? value : false;
	return value;
}

function getRefreshOnShow() {
	var value = false;
	if(window.widget) {
		value = widget.preferenceForKey("refreshOnShow");
	}
	value = value ? value : false;
	return value;
}

// returns a bool whether to send mails on new IP
function getMailNotificationOn() {
	var value = false;
	if(window.widget) {
		value = widget.preferenceForKey("mail_notification_on");
	}
	
	return value;
}

// returns the saved addresses blank
function getNotificationAddressesBlank() {
	var value = '';
	if(window.widget) {
		value = widget.preferenceForKey("notification_mail");
	}
	value = value ? value : '';
	return value;
}

// returns an array containing all email-addresses to be notified
function getNotificationAddresses() {
	var value = getNotificationAddressesBlank();
	if(value && value.length > 6)
		value = value.replace(/[^\w\.\-\+_@]+/g, ' ');
	else
		value = false;
	
	return value;
}

function getStylesheet() {		// get from prefs
	var value = 1;
	if(window.widget) {
		value = widget.preferenceForKey("stylesheet");
	}
	value = value ? value : 1;
	return value;
}


function setStylesheet(style) {
	if(! style)
		style = 1;
	
	var stylelink = getObj('stylesheet_themed');
	stylelink.href = "NetworkStat_" + style + ".css";
}

function getDateformat() {		// get from prefs
	if(window.widget) {
		var value = widget.preferenceForKey("dateformat");
	}
	
	return ("eu" == value || "us" == value) ? value : "eu";
}

function getPingIP() {		// get from prefs
	var value = '4.2.2.2';
	if(window.widget) {
		value = widget.preferenceForKey("pingIP");
	}
	value = value ? value : '4.2.2.2';
	return value;
}


function adjustPrefs() {
	// timer
	var myseconds = original_timer;
	var timerelem = document.forms[0].timer;
	
	if(refreshMode == 'manual') {
		timerelem.options[0].selected = true;
	}
	else {
		selectValue(timerelem, myseconds);
	}
	
	// onShow-refresh and other options
	if(refreshOnShow)
		document.forms[0].onshow.checked = true;
	if(showAllInterfaces)
		document.forms[0].showAllInterfaces.checked = true;
	
	// notification
	if(window.widget && SystemConfigurationPlugin.isMailConfigured()) {
		document.forms[0].mail_notification_on.checked = mail_notification_on ? true : false;
		document.forms[0].notification_mail.value = getNotificationAddressesBlank();
		try {
			getObj('notification_mail_setup_warning').style.display = 'none';
			getObj('notification_mail_setup_input').style.display = 'block';
		}
		catch(exc) {  }
	}
	else {
		document.forms[0].mail_notification_on.disabled = true;
		try {
			getObj('notification_mail_setup_warning').style.display = 'block';
			getObj('notification_mail_setup_input').style.display = 'none';
		}
		catch(exc) {  }
	}
	
	// selected stylesheet
	selectValue(document.forms[0].style, getStylesheet());
	
	// date format
	selectValue(document.forms[0].dateformat, getDateformat());
	
	// insert ping-IP
	document.forms[0].ping_ip.value = pingIP;
}


function savePrefs() {
	// timer
	var timerelem = document.forms[0].timer;
	var timer = timerelem.options[timerelem.selectedIndex].value;
	original_timer = (timer == 'manual') ? 7200 : timer;
	
	// mode
	if(timerelem.options[timerelem.selectedIndex].value == 'manual')
		refreshMode = 'manual';
	else
		refreshMode = "countdown";
	
	
	// onshow and other options
	refreshOnShow = document.forms[0].onshow.checked;
	showAllInterfaces = document.forms[0].showAllInterfaces.checked;
	
	// notification mail
	mail_notification_on = document.forms[0].mail_notification_on.checked;
	var mailto = document.forms[0].notification_mail.value;
	
	// stylesheet
	var styleform = document.forms[0].style;
	stylesheet = styleform.options[styleform.selectedIndex].value;
	
	// date format
	var dateform = document.forms[0].dateformat;
	dateformat = dateform.options[dateform.selectedIndex].value;
	
	// ping-IP
	pingIP = document.forms[0].ping_ip.value.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/) ? document.forms[0].ping_ip.value : "4.2.2.2";
	
	if(window.widget) {
		widget.setPreferenceForKey(original_timer, "timer");
		widget.setPreferenceForKey(refreshMode, "refreshMode");
		widget.setPreferenceForKey(refreshOnShow, "refreshOnShow");
		widget.setPreferenceForKey(showAllInterfaces, "showAllInterfaces");
		widget.setPreferenceForKey(mail_notification_on, "mail_notification_on");
		widget.setPreferenceForKey(mailto, "notification_mail");
		widget.setPreferenceForKey(stylesheet, "stylesheet");
		widget.setPreferenceForKey(dateformat, "dateformat");
		widget.setPreferenceForKey(pingIP, "pingIP");
	}
	
	hidePrefs();
}

function showPrefs() {
	var front = document.getElementById("front");
	var back = document.getElementById("back");
	refreshBlocked = true;
	
	// resize
	setMinDimensionsTo(250, 270);
	adjustPrefs();
	
	if(window.widget) {
		widget.prepareForTransition('ToBack');
	}
				
	front.style.display = "none";
	back.style.display = "block";
		
	if(window.widget)
		setTimeout("widget.performTransition();", 10);  
}

function switchPrefTab(tab) {
	var found = false;
	var thedivs = _sections ? _sections : new Array();
	
	for(var i = 0; i < thedivs.length; i++) {
		var this_tab = getObj("tab_" + thedivs[i]);
		var this_pref = getObj("prefs_" + thedivs[i]);
		
		if(tab == thedivs[i]) {
			this_tab.setAttribute("class", "tabitem selected");
			this_pref.style.display = "block";
			found = true;
		}
		else {
			this_tab.setAttribute("class", "tabitem");
			this_pref.style.display = "none";
		}
	}
	
	if(!found) {
		getObj("prefs_about").style.display = "block";
	}
}

function hidePrefs() {
	var front = document.getElementById("front");
	var back = document.getElementById("back");
	
	setStylesheet(stylesheet);
	document.getElementById('refreshbutton').src = "Images_" + stylesheet + "/refresh.png";		// set refreshbutton matching stylesheet
	
	refreshBlocked = false;
	no_network_tries = 0;
	seconds_left = original_timer;
	doCountdown = (refreshMode == 'manual') ? 0 : 1;
	
	if(window.widget)
		widget.prepareForTransition("ToFront");
				
	front.style.display = "block";
	back.style.display = "none";
		
	if(window.widget)
		setTimeout("widget.performTransition();", 10);
	
	setTimeout("refreshState()", 200);
}

