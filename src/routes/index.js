const { readFileSync } = require('fs');
const { join } = require('path');

const html = readFileSync(join(__dirname, '../../site/home.html'), 'utf8');

// home pubblica
module.exports.get = () => ({
	handler: async (req, res) => {
		res.header('Content-Type', 'text/html; charset=utf-8');
		res.header('X-Content-Type-Options', 'nosniff');
		return res.send(html);
	},
});
