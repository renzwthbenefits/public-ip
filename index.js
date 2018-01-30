'use strict';

var dgram = require('dgram');
var dns = require('dns-socket');
var got = require('got');
var isIp = require('is-ip');
var pify = require('pify');

var defaults = {
	timeout: 5000,
	https: false
};

var type = {
	v4: {
		dnsServer: '208.67.222.222',
		dnsQuestion: {
			name: 'myip.opendns.com',
			type: 'A'
		},
		httpsUrl: 'https://ipv4.icanhazip.com/'
	},
	v6: {
		dnsServer: '2620:0:ccc::2',
		dnsQuestion: {
			name: 'myip.opendns.com',
			type: 'AAAA'
		},
		httpsUrl: 'https://ipv6.icanhazip.com/'
	}
};

var queryDns = function queryDns(version, opts) {
	var data = type[version];

	var socket = dns({
		retries: 0,
		socket: dgram.createSocket(version === 'v6' ? 'udp6' : 'udp4'),
		timeout: opts.timeout
	});

	var promise = pify(socket.query.bind(socket))({
		questions: [data.dnsQuestion]
	}, 53, data.dnsServer).then(function (res) {
		socket.destroy();
		var ip = (res.answers[0] && res.answers[0].data || '').trim();

		if (!ip || !isIp[version](ip)) {
			throw new Error('Couldn\'t find your IP');
		}

		return ip;
	}).catch(function (err) {
		socket.destroy();
		throw err;
	});

	promise.cancel = function () {
		socket.cancel();
	};

	return promise;
};

var queryHttps = function queryHttps(version, opts) {
	var gotOpts = {
		family: version === 'v6' ? 6 : 4,
		retries: 0,
		timeout: opts.timeout
	};

	var gotPromise = got(type[version].httpsUrl, gotOpts);

	var promise = gotPromise.then(function (res) {
		var ip = (res.body || '').trim();

		if (!ip) {
			throw new Error('Couldn\'t find your IP');
		}

		return ip;
	}).catch(function (err) {
		// Don't throw a cancellation error for consistency with DNS
		if (!(err instanceof got.CancelError)) {
			throw err;
		}
	});

	promise.cancel = gotPromise.cancel;

	return promise;
};

module.exports.v4 = function (opts) {
	opts = Object.assign({}, defaults, opts);

	if (opts.https) {
		return queryHttps('v4', opts);
	}

	return queryDns('v4', opts);
};

module.exports.v6 = function (opts) {
	opts = Object.assign({}, defaults, opts);

	if (opts.https) {
		return queryHttps('v6', opts);
	}

	return queryDns('v6', opts);
};
