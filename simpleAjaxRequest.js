
/*
 ***************************
 *   Basic AJAX function   *
 *    © Pascal Pfiffner    *
 ***************************
 */


function simpleAjaxRequest(url, handlefunction, forceText) {
	if(!(this instanceof simpleAjaxRequest)) {
		return new simpleAjaxRequest(url, handlefunction, forceText);
	}
	
	var req = null;
	
	// sends a request for a page and calls the handlefunction, which will get 'null' if the request was unsuccessful
	this.requestPage = function() {
		try {
			req = createXMLHttpRequest();
			req.onreadystatechange = function() {
				if(4 == req.readyState) {
					handlefunction(forceText ? req.responseText : req.responseXML);
				}
			}
			
			req.open("GET", url, true);
			req.setRequestHeader("Cache-Control", "no-cache");
			req.send(null);
			return true;
		}
		
		catch(exc){
			alert('[simpleAjaxRequest.requestPage] Error: ' + exc);
			return false;
		}
	}
	
	
	// returns a new XMLHttpRequest-Object. Needed because MSIE has another implementation
	var createXMLHttpRequest = function() {
		var request = null;
		
		if(window.XMLHttpRequest) {
			request = new XMLHttpRequest;
		}
		else if(window.ActiveXObject) {
			try {
				request = new ActiveXObject("Msxml2.XMLHTTP");
			}
			catch(err_MSXML2) {
				try {
					request = new ActiveXObject("Microsoft.XMLHTTP");
				}
				catch(err_Microsoft) { }
			}
		}
		
		return request;
	}
	
	return this.requestPage(url, handlefunction, forceText);
}


