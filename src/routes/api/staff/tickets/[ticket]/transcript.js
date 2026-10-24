const { pools } = require('../../../../../lib/threads');
const { export: pool } = pools;

// trascrizione completa (messaggi archiviati) di un ticket, in JSON
module.exports.get = fastify => ({
	handler: async (req, res) => {
		/** @type {import('../../../../../client')} */
		const client = req.routeOptions.config.client;
		const ticket = await client.prisma.ticket.findUnique({
			include: {
				archivedChannels: true,
				archivedMessages: true,
				archivedRoles: true,
				archivedUsers: true,
				feedback: true,
				questionAnswers: true,
			},
			where: { id: req.params.ticket },
		});
		if (!ticket || ticket.deleted) return res.code(404).send({
			error: 'Not Found',
			message: 'Ticket non trovato.',
			statusCode: 404,
		});

		res.header('Content-Type', 'application/json'); // exportTicket restituisce JSON gia' serializzato
		return await pool.queue(w => w.exportTicket(ticket));
	},
	onRequest: [fastify.authenticate, fastify.staffOnly],
});
