const { readFileSync } = require('fs');
const { join } = require('path');

const html = readFileSync(join(__dirname, '../../../site/staff.html'), 'utf8');

// pagina dell'area staff (l'accesso vero e' controllato dalle API /api/staff/*)
module.exports.get = () => ({
	handler: async (req, res) => {
		res.header('Content-Type', 'text/html; charset=utf-8');
		res.header('Cache-Control', 'no-store');
		res.header('X-Content-Type-Options', 'nosniff');
		res.header('X-Frame-Options', 'DENY');
		return res.send(html);
	},
});
