const { readFileSync } = require('fs');
const { join } = require('path');

// file statici del sito (solo quelli in elenco, nessun accesso a percorsi arbitrari)
const FILES = {
	'staff.js': 'application/javascript; charset=utf-8',
	'style.css': 'text/css; charset=utf-8',
};
const cache = {};
for (const name of Object.keys(FILES)) cache[name] = readFileSync(join(__dirname, '../../../site', name), 'utf8');

module.exports.get = () => ({
	handler: async (req, res) => {
		const name = req.params.file;
		if (!Object.prototype.hasOwnProperty.call(FILES, name)) return res.code(404).send({
			error: 'Not Found',
			message: 'File non trovato.',
			statusCode: 404,
		});
		res.header('Content-Type', FILES[name]);
		res.header('Cache-Control', 'public, max-age=300');
		res.header('X-Content-Type-Options', 'nosniff');
		return res.send(cache[name]);
	},
});
