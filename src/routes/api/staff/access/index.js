const { ID_PATTERN } = require('../../../../lib/staff');

// elenco ID autorizzati (solo proprietario)
module.exports.get = fastify => ({
	handler: async req => {
		const client = req.routeOptions.config.client;
		const rows = await client.prisma.staffAccess.findMany({ orderBy: { createdAt: 'asc' } });
		return rows.map(row => ({
			addedBy: row.addedBy,
			createdAt: row.createdAt,
			id: row.id,
			isOwner: row.isOwner,
			note: row.note,
			username: client.users.cache.get(row.id)?.username ?? null,
		}));
	},
	onRequest: [fastify.authenticate, fastify.staffOnly, fastify.staffOwnerOnly],
});

// autorizza un nuovo ID Discord (solo proprietario)
module.exports.post = fastify => ({
	handler: async (req, res) => {
		const client = req.routeOptions.config.client;
		const id = String(req.body?.id ?? '').trim();
		const note = req.body?.note ? String(req.body.note).trim().slice(0, 100) : null;
		if (!ID_PATTERN.test(id)) return res.code(400).send({
			error: 'Bad Request',
			message: 'L\'ID Discord non e\' valido (17-19 cifre).',
			statusCode: 400,
		});
		await client.prisma.staffAccess.upsert({
			create: {
				addedBy: req.user.id,
				id,
				note,
			},
			update: { note },
			where: { id },
		});
		client.log.info(`Area staff: ${req.user.id} ha autorizzato l'ID ${id}`);
		return { ok: true };
	},
	onRequest: [fastify.authenticate, fastify.staffOnly, fastify.staffOwnerOnly],
});
