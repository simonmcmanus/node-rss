var sys = require('sys'), http = require('http');
var xml = require("./node-xml");
var urls = require('url');


exports.doGet = function(url, type, callback) {
	var parts = urls.parse(url);
	// set the default port to 80
	if(!parts.port) { parts.port = 80; }
	var redirection_level = 0;
       var client = http.createClient(parts.port, parts.hostname);
	smm.requestCount++;
	var request = client.request('GET', url, {'host': parts.hostname});
	request.addListener('response', function (response) {
	    // check to see the type of status
	    if(response.statusCode == 200) {
		// check for ALL OK
			var body = ''; 
			response.addListener('data', function (chunk) {
				body += chunk;
			});
			response.addListener('end', function() {
				callback(body, type);
			});
		}
	}); 
	request.end();	
};


exports.newRssParser = function(type, completeCallback) {

	return new xml.SaxParser(function(cb) {
		var articles = Array();

		var current_element = false;
		var article_count = 0;
		var in_item = false;
		var current_chars = '';
		cb.onStartDocument(function() { });
		// when finished parsing the RSS feed, trigger the callback
		cb.onEndDocument(function() {	    
			completeCallback(articles);
		});

		//track what element we are currently in. If it is an <item> this is
		// an article, add container array to the list of articles
		cb.onStartElementNS(function(elem, attrs, prefix, uri, namespaces) {
			current_element = elem.toLowerCase();
			if(current_element == 'item' || current_element == 'entry') {
				in_item = true;
				articles[article_count] = Array();
			}
		});
		// when we are at the end of an element, save its related content
		cb.onEndElementNS(function(elem, prefix, uri) {
		if(in_item) {
			articles[article_count]['type'] = type;
		
			switch(current_element) 
			{
			case 'pubdate':
				var date = current_chars.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
				articles[article_count][current_element] = date;
				articles[article_count]['epochdate'] = Date.parse(date);
				currdate = new Date(articles[article_count]['epochdate']);
				articles[article_count]['simpledate'] = currdate.getDate()+"/"+(currdate.getMonth()+1)+"/"+currdate.getFullYear();

			break;
			case 'description':
			case 'summary':
				articles[article_count][current_element] = current_chars.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
			break;
			case 'content':
			case 'encoded': // feedburner is <content:encoded>, node-xml reads as <encoded>
				current_element = 'content';
				articles[article_count][current_element] = current_chars.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
			break;
			case 'link':
			case 'title':
				if( articles[article_count][current_element] == undefined){
					articles[article_count][current_element] = current_chars.replace(/^\s\s*/, '').replace(/\s\s*$/, '');

				}
			break;
			}
			
			current_element = false;
			current_chars = '';
			if(elem.toLowerCase() == 'item' || elem.toString() == 'entry') {
				in_item = false;
				article_count ++;   
			}
		}
		});
		
		cb.onCharacters(addContent);
		cb.onCdata(addContent);
		function addContent(chars) {
			if(in_item) {
				current_chars += chars;
			}
		};

		// @TODO handle warnings and errors properly
		cb.onWarning(function(msg) {
			sys.puts('<WARNING>'+msg+"</WARNING>");
		});
		cb.onError(function(msg) {
			sys.puts('<ERROR>'+JSON.stringify(msg)+"</ERROR>");
		});
	});
};