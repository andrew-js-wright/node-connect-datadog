const DD = require("node-dogstatsd").StatsD;

module.exports = function (options) {
	let datadog = options.dogstatsd || new DD();
	let stat = options.stat || "node.express.router";
	let tags = options.tags || [];
	let path = options.path || false;
	let base_url = options.base_url || false;
	let method = options.method || false;
	let protocol = options.protocol || false;
	let response_code_all = options.response_code || false;
	let response_code_individual = options.response_code_individual || false;
	let DELIM = options.delim || '-';
	let REGEX_PIPE = /\|/g;

	/**
	 * Checks if str is a regular expression and stringifies it if it is.
	 * Returns a string with all instances of the pipe character replaced with
	 * the delimiter.
	 * @param  {*}       str  The string to check for pipe chars
	 * @return {string}       The input string with pipe chars replaced
	 */
	function replacePipeChar(str) {
		if (str instanceof RegExp) {
			str = str.toString();
		}

		return str && str.replace(REGEX_PIPE, DELIM);
	}

	return function (req, res, next) {
		if (!req._startTime) {
			req._startTime = new Date();
		}

		let end = res.end;
		res.end = function (chunk, encoding) {
			res.end = end;
			res.end(chunk, encoding);

			if (!req.route || !req.route.path) {
				return;
			}

			const baseUrl = (base_url !== false) ? req.baseUrl : '';
			let statTags = [`route:${baseUrl + replacePipeChar(req.route.path)}`].concat(tags);

			if (method !== false) {
				statTags.push(`method:${req.method.toLowerCase()}`);
			}

			if (protocol && req.protocol) {
				statTags.push(`protocol:${req.protocol}`);
			}

			if (path !== false) {
				statTags.push(`path:${req.path}`);
			}

			if (response_code_all) {
				statTags.push(`response_code:${res.statusCode}`);
				datadog.increment(`${stat}.response_code.all`, 1, statTags);
			}

			if (response_code_individual) {
				datadog.increment(`${stat}.response_code.${res.statusCode}`, 1, statTags);
			}

			datadog.histogram(`${stat}.response_time`, new Date() - req._startTime, 1, statTags);
		};

		next();
	};
};
