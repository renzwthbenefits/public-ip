'use strict';

var isIp = require('is-ip');

var defaults = {
	timeout: 5000
};

var urls = {
	v4: 'https://ipv4.icanhazip.com/',
	v6: 'https://ipv6.icanhazip.com/'
};

function queryHttps(version, opts) {
	return new Promise(function (resolve, reject) {
		var doReject = function doReject() {
			return reject(new Error('Couldn\'t find your IP'));
		};
		var xhr = new XMLHttpRequest();

		xhr.onerror = doReject;
		xhr.ontimeout = doReject;
		xhr.onload = function () {
			var ip = xhr.responseText.trim();

			if (!ip || !isIp[version](ip)) {
				doReject();
			}

			resolve(ip);
		};

		xhr.open('GET', urls[version]);
		xhr.timeout = opts.timeout;
		xhr.send();
	});
}

module.exports.v4 = function (opts) {
	opts = Object.assign({}, defaults, opts);
	return queryHttps('v4', opts);
};

module.exports.v6 = function (opts) {
	opts = Object.assign({}, defaults, opts);
	return queryHttps('v6', opts);
};
