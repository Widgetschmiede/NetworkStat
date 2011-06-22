
/*
 ********************
 *  Some Utilities  *
 * © Widgetschmiede *
 ********************
 */


// returns the object, whether you supply an id (string) or an object itself
function getObj(id) {
	var obj;
	if(typeof(id) == "string") {
		obj = getById(id) ? getById(id) : null;
	}
	else if(typeof(id) == "object") {
		obj = id;
	}
	
	return obj;
}

// returns the object with the correspondent ID
function getById(id) {
	if(document.getElementById)
		return document.getElementById(id);
	else if(document.all)
		return document.all[id];
	else
		return false;
}

// returns the child-nodes of an element (stripping all #text and #comment - nodes)
function getElementNodes(obj) {
	var elem = new Array();
	if(!obj || !obj.childNodes)
		return elem;
	
	var childs = obj.childNodes;
	for(var i = 0; i < childs.length; i++) {
		if("#text" != childs[i].nodeName.toLowerCase() && "#comment" != childs[i].nodeName.toLowerCase())
			elem.push(childs[i]);
	}
	return elem;
}


// returns a div
function getDiv(inner, css) {
	var div = document.createElement("div");
	div.setAttribute("class", css ? css : '');
	
	if(inner) {
		var div_inner = ('string' == typeof(inner)) ? document.createTextNode(inner) : inner;
		div.appendChild(div_inner);
	}
	
	return div;
}


// returns the whole DOM for the ping-stuff
function getPingDOM(iface, ping_ip) {
	iface = iface ? iface : 'wan';
	var dom = document.createElement("div");
	var body = getDiv(null, 'sub_body');
	body.setAttribute("class", "sub_body ping_div_sub");
	
	var span = document.createElement("span");
	span.setAttribute("id", "ping_packets_" + iface);
	
	// prepare the spans with IDs
	var ping_min = getClipboardLink("?");
	ping_min.setAttribute("id", "ping_min_" + iface);
	
	var ping_avg = getClipboardLink("?");
	ping_avg.setAttribute("id", "ping_avg_" + iface);
	
	var ping_max = getClipboardLink("?");
	ping_max.setAttribute("id", "ping_max_" + iface);
	
	// put it together: the header
	dom.appendChild(getDiv("Ping results" + (ping_ip ? " for " + ping_ip : ''), "sub_title"));
	body.appendChild(span);
	body.appendChild(document.createElement("br"));
	
	// min-ping
	var inline_div = getDiv(0, "inline_div_3");
	inline_div.appendChild(document.createTextNode("Min"));
	inline_div.appendChild(document.createElement("br"));
	inline_div.appendChild(ping_min);
	inline_div.appendChild(document.createTextNode(" ms"));
	body.appendChild(inline_div);
	
	// avg-ping
	var inline_div2 = getDiv(0, "inline_div_3");
	inline_div2.appendChild(document.createTextNode("Avg"));
	inline_div2.appendChild(document.createElement("br"));
	inline_div2.appendChild(ping_avg);
	inline_div2.appendChild(document.createTextNode(" ms"));
	body.appendChild(inline_div2);
	
	// max-ping
	var inline_div3 = getDiv(0, "inline_div_3");
	inline_div3.appendChild(document.createTextNode("Max"));
	inline_div3.appendChild(document.createElement("br"));
	inline_div3.appendChild(ping_max);
	inline_div3.appendChild(document.createTextNode(" ms"));
	body.appendChild(inline_div3);
	
	dom.appendChild(body);
	return dom;
}


// format a clipboard-link
function getClipboardLink(data, css) {
	var link = document.createElement("a");
	
	link.setAttribute("href", "javascript:;");
	link.setAttribute("onclick", "toClipboard(this.innerHTML)");
	link.setAttribute("class", css ? css : "data");
	
	var link_data = document.createTextNode(data);
	link.appendChild(link_data);
	
	return link;
}

// format a generic element with text
function getGeneric(type, data, id, css) {
	var elem = null;
	try {
		elem = document.createElement(type);
		
		if(id)
			elem.setAttribute("id", id);
		if(css)
			elem.setAttribute("class", css);
		var elem_data = document.createTextNode(data);
		elem.appendChild(elem_data);
	}
	catch(exc) {}
	
	return elem;
}


// parses the XML from system_profiler
function parseSystemProfiler(xmldoc) {
	var full = new Array();
	if(!xmldoc)
		return full;
	;
	var root = xmldoc.documentElement;
	//var dict_items = root.getElementsByTagName('dict');
	var dict_items = getElementNodes(getElementNodes(root)[0]);
	//alert("dict_items: " + dict_items);
	
	// get the dicts
	var main_dict = dict_items[0];
	var wireless_dict = dict_items[1];
	if(null == main_dict)
		return full;
	
	
	
	// ***************
	// GET WIRELESS INFO (must be before getting the interfaces to add information to the AirPort-interface!)
	var wlan = getElementNodes(wireless_dict);
	var wlan_hash = new Object();
	try {
		var wlan_items_dict = getElementNodes(getXMLvalueForKey('_items', wlan)[0]);
		wlan_hash['ssid'] = getXMLvalueForKey('spairport_current_network', wlan_items_dict);
		wlan_hash['wireless_channel'] = getXMLvalueForKey('spairport_wireless_channel', wlan_items_dict);
	}
	catch(exc) {
		alert("parseSystemProfiler() dropping off parsing WLAN: " + exc + "\n\nMaybe system_profiler delivers a broken XML?");
	}
	
	
	
	// ***************
	// GET INTERFACES
	var elements = getElementNodes(main_dict);
	var interface_nodes = null;
	
	// loop once to get all interfaces
	for(var i = 0; i < elements.length; i++) {
		if('key' == elements[i].nodeName && '_items' == elements[i].firstChild.nodeValue) {
			interface_nodes = getElementNodes(elements[i + 1]);
			break;
		}
	}
	
	// check if we got interfaces and loop them
	if(interface_nodes && interface_nodes.length > 0) {
		for(var i = 0; i < interface_nodes.length; i++) {
			var nodes = getElementNodes(interface_nodes[i]);
			if(nodes.length < 1)
				continue;
			
			// assign to our all-containing hash
			var hash = new Object();
			var foo = '';
			for(var j = 0; j < nodes.length; j++) {
				if('key' == nodes[j].nodeName.toLowerCase()) {
					foo += nodes[j].firstChild.nodeValue + ' -- ' + nodes[j + 1].nodeName.toLowerCase() + "\n";
					
					var value = ('string' == nodes[j + 1].nodeName.toLowerCase()) ? nodes[j + 1].firstChild.nodeValue : getElementNodes(nodes[j + 1]);
					hash[nodes[j].firstChild.nodeValue] = value;
				}
			}
			
			// parse interface
			if(showAllInterfaces || 'yes' == hash['ip_assigned']) {
				var hash2 = new Object();
				try {
					// some conversions
					hash2['x_ifname'] = hash['interface'] ? hash['interface'] : (hash['_name'] ? hash['_name'] : 'xxx');
					hash2['x_ifname'] = ("Bluetooth-Modem" == hash2['x_ifname']) ? "bt0" : hash2['x_ifname'];
					//alert("looping ifname: " + hash2['x_ifname']);
					
					hash2['x_name'] = hash['_name'] ? hash['_name'].replace(/Built-in /g, '') : hash2['x_ifname'];
					hash2['x_type'] = hash['type'] ? hash['type'] : 'unknown';
					hash2['x_ip_assigned'] = hash['ip_assigned'] ? hash['ip_assigned'] : "no";
					
					// special PPP treatment
					if('PPP' == hash2['x_type'].substr(0, 3)) {
						if('bt0' != hash2['x_ifname']) {
							hash2['x_type'] = "PPP";
						}
						else {
							hash2['x_type'] = "Bluetooth";
						}
					}
					
					// Wireless
					if('en1' == hash2['x_ifname']) {
						hash2['x_ssid'] = wlan_hash['ssid'];
						hash2['x_wireless_channel'] = wlan_hash['wireless_channel'];
					}
					
					// MAC
					if(hash['Ethernet']) {
						hash2['x_MAC'] = getXMLvalueForKey('MAC Address', hash['Ethernet']);
					}
					
					// dns
					hash2['x_dns'] = hash['DNS'] ? getElementNodes(hash['DNS'][1]) : new Array();
					for(var d = 0; d < hash2['x_dns'].length; d++) {
						hash2['x_dns'][d] = hash2['x_dns'][d].firstChild.nodeValue;
					}
					
					// ipv4 related
					if(hash['IPv4']) {
						hash2['x_ipv4'] = getXMLvalueForKey('Addresses', hash['IPv4']);
						hash2['x_ipv4'] = hash2['x_ipv4'] ? hash2['x_ipv4'][0].firstChild.nodeValue : 'inactive';
						hash2['x_ipv4_ifname'] = getXMLvalueForKey('InterfaceName', hash['IPv4']);
						hash2['x_ipv4_config'] = getXMLvalueForKey('ConfigMethod', hash['IPv4']);
						hash2['x_ipv4_gateway'] = getXMLvalueForKey('Router', hash['IPv4']);
						hash2['x_ipv4_netmask'] = getXMLvalueForKey('SubnetMasks', hash['IPv4']);
						hash2['x_ipv4_netmask'] = hash2['x_ipv4_netmask'] ? hash2['x_ipv4_netmask'][0].firstChild.nodeValue : hash2['x_ipv4_netmask'];
					}
					
					// proxy related
					if(hash['Proxies']) {
						hash2['x_proxy_method'] = getXMLvalueForKey('AppleProxyConfigurationSelected', hash['Proxies']);
						hash2['x_proxy_exceptions'] = getXMLvalueForKey('ExceptionsList', hash['Proxies']);
						hash2['x_proxy_PASV'] = getXMLvalueForKey('FTPPassive', hash['Proxies']);
						hash2['x_proxy_HTTP'] = getXMLvalueForKey('HTTPProxy', hash['Proxies']);
						hash2['x_proxy_HTTP_port'] = getXMLvalueForKey('HTTPPort', hash['Proxies']);
					}
				}
				catch(exc) {
					alert("parseSystemProfiler() dropping off parsing MAIN: " + exc);
				}
				//alert(hash2['x_proxy_exceptions'] + ' -- ' + hash2['x_ifname']);
				full[hash2['x_ifname']] = hash2;
			}
			else {
				delete(hash);
			}
		}
		// **************
	}
	
	return full;
}

// returns the next value following a <key> tag in an XML tree
function getXMLvalueForKey(key, tree) {
	if(tree) {
		for(var i = 0; i < tree.length; i++) {
			try {
				if(key == tree[i].firstChild.nodeValue) {
					var node_name = tree[i + 1].nodeName.toLowerCase();
					var value = ('string' == node_name || 'integer' == node_name) ? tree[i + 1].firstChild.nodeValue : getElementNodes(tree[i + 1]);
					return value;
				}
			}
			catch(exc) {}
		}
	}
	
	return null;
}




// sorts DESC
function NumDESCsort(a, b) {
	a = a.replace(/\D+/g, '');
	b = b.replace(/\D+/g, '');
	
	return b - a;
}




function removeKeyFromHash(removeKey, array)
{
	var result = new Object();
	for (var key in array)
	{
		if (key != removeKey) result[key] = array[key];
	}
	return result;
}

function keysFromHash(hash)
{
	var keys = new Array();
	for (var key in hash)
	{
		keys.push(key);
	}
	return keys;
}

function indexOfObjectInArray(array, object)
{
	if("object" != typeof(array)) return -1;
	for (i = 0; i < array.length; i++)
	{
		if (array[i] == object) return i;
	}
	return -1;
}

function inArray(value, arr)
{
	if("object" != typeof(arr)) return false;
	
	for(var i = 0; i < arr.length; i++)
	{
		if(arr[i] == value) return true;
	}
	return false;
}


// selects a value in a dropdown list
function selectValue(element, value) {
	if(!element)
		return;
	
	for(i = 0; i < element.length; i++) {
		if(value == element.options[i].value) {
			element.selectedIndex = i;
			return;
		}
	}
}


// checks the preceding checkbox
function selectVal(clicked) {
	var elem = getObj(clicked);
	while(null != elem.previousSibling) {
		if('input' == elem.previousSibling.nodeName.toLowerCase()) {
			if(! elem.previousSibling.disabled)
				elem.previousSibling.checked = ! elem.previousSibling.checked;
			return;
		}
		elem = elem.previousSibling;
	}
}


// toggles an input-elements "enabled" value
function toggleDisabledIfChecked(check, element) {
	var disable = (getObj(check) && (false == getObj(check).checked));
	var elem = getObj(element);
	
	if(elem) {
		
		// disable main element
		if(('span' == elem.nodeName.toLowerCase()) || ('div' == elem.nodeName.toLowerCase()))
			elem.className = disable ? elem.className.replace(/ *disabled/g, '') + ' disabled' : elem.className.replace(/ *disabled/g, '');
		else
			elem.disabled = disable;
		
		// also disable correspondend Text
		while(null != elem.nextSibling) {
			if(('span' == elem.nextSibling.nodeName.toLowerCase()) && (elem.nextSibling.className && elem.nextSibling.className.match(/clicksel/))) {
				var thisclass = elem.nextSibling.className;
				var newclass = disable ? thisclass.replace(/ *disabled/g, '') + ' disabled' : thisclass.replace(/ *disabled/g, '');
				
				elem.nextSibling.className = newclass;
				return;
			}
			elem = elem.nextSibling;
		}
	}
}


// unchecks an input-element if another gets checked
function uncheckIfChecked(elements, reference) {
	var all_elems = new Array();
	if('string' == typeof(elements))
		all_elems.push(elements);
	else
		all_elems = elements;
	
	var uncheck = (getObj(reference) && (true == getObj(reference).checked));
	if(!uncheck)
		return;
	
	for(var i = 0; i < all_elems.length; i++) {
		var elem = getObj(all_elems[i]);
		
		if(elem) {
			elem.checked = false;
		}
	}
}


// returns two merged hashes
function mergeHashes(hashOne, hashTwo) {
	var result = new Object();
	for(var key in hashOne) {
		if(key)
			result[key] = hashOne[key];
	}
	for(var key in hashTwo) {
		if(key)
			result[key] = hashTwo[key];
	}
	
	return result;
}

// returns a SHALLOW copy of a hash
// not appropriate for DEEP copies!
function copyHash(hash)
{
	var result = new Object();
	for (var key in hash)
	{
		result[key] = hash[key];
	}
	return result;
}

function copyArray(array)
{
	var result = new Array();
	for (var i = 0; i < array.length; i++)
	{
		result.push(array[i]);
	}
	return result;
}


function debug(string)
{
	if (!debugMode) return;
	alert(string);
}


// returns the property the browser calculated, if that`s not supported, from the style.
function getComputedValue(prop, obj, num) {
	var myObj = getObj(obj);
	if(!myObj)
		return 0;
	
	var getit;
	if(document.defaultView.getComputedStyle)
		getit = document.defaultView.getComputedStyle(myObj, null).getPropertyValue(prop);
	else
		getit = myObj.style[prop];
	
	return num ? (1* getit.replace(/[^\d\.]/g, '')) : getit;
}


// JS serialization

function Serialize(obj) {
    var strSource = "";

    if (typeof(obj) == "undefined") {
        strSource = "undefined";
    }

    else if (obj == null) {
        strSource = "null";
    }

    else if (typeof(obj) == "boolean" || typeof(obj) == "number" || typeof(obj) == "function") {
        strSource = obj;
    }

    else if (typeof(obj) == "string") {
        strSource = "'" + obj.replace(/([\\'"])/g, "\\$1") + "'"; 		//" (just to avoid the texteditors problems with the single Notation Mark)
    }

    else if (typeof(obj) == "object") {
        if (obj.constructor == Boolean) {
            strSource = "new Boolean(" + obj.valueOf() + ")";
        }

        else if (obj.constructor == Number) {
            strSource = "new Number(" + obj.valueOf() + ")";
        }

        else if (obj.constructor == String) {
            strSource = "new String(" + Serialize(obj.toString()) + ")";
        }

        else if (obj.constructor == Date) {
            strSource = "new Date(" + obj.valueOf() + ")";
        }

        else if (obj.constructor == Array) {
            strSource = "[";
            for (var i=0; i<obj.length; i++)
                strSource += Serialize(obj[i]) + ",";
            if (i>0)
                strSource = strSource.substring(0, strSource.length-1);
            strSource += "]";
        }

        else if (obj.constructor == RegExp) {
            strSource = obj.toString();
        }

        else if (obj.constructor == Object) {
            var strSource = "{"
            for (var key in obj)
                strSource = strSource + "" + key + ":" + Serialize(obj[key]) + ","
            if (strSource.length > 1)
                strSource = strSource.substring(0, strSource.length-1);
            strSource += "}";
        }
    }

    else {
        throw new Error(0, "Serialize encountered unexpected object type: " + typeof(obj));
    }

    return strSource;
}


function Deserialize(strSource) {
	if(typeof strSource != "string")
		throw new Error(0, "Deserialize expects a string argument");
	
	var x;
	return eval("x = " + strSource);
}

