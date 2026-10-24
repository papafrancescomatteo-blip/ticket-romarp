// chiusura forzata di un ticket dal pannello staff
module.exports.post = fastify => ({
	handler: async (req, res) => {
		/** @type {import('../../../../../client')} */
		const client = req.routeOptions.config.client;
		const ticket = await client.prisma.ticket.findUnique({ where: { id: req.params.ticket } });
		if (!ticket || ticket.deleted) return res.code(404).send({
			error: 'Not Found',
			message: 'Ticket non trovato.',
			statusCode: 404,
		});
		if (!ticket.open) return res.code(409).send({
			error: 'Conflict',
			message: 'Il ticket e\' gia\' chiuso.',
			statusCode: 409,
		});

		const reason = req.body?.reason ? String(req.body.reason).trim().slice(0, 500) : null;
		await client.tickets.finallyClose(ticket.id, {
			closedBy: req.user.id,
			reason: reason || 'Chiuso dall\'area staff',
		});

		const after = await client.prisma.ticket.findUnique({ where: { id: ticket.id } });
		if (after?.open) return res.code(500).send({
			error: 'Internal Server Error',
			message: 'Non sono riuscito a chiudere il ticket, controlla i log del bot.',
			statusCode: 500,
		});
		return { ok: true };
	},
	onRequest: [fastify.authenticate, fastify.staffOnly],
});
