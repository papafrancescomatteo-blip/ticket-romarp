const { ownerIds } = require('../../../../lib/staff');

// revoca l'accesso a un ID (solo proprietario; i proprietari non si possono rimuovere dal pannello)
module.exports.delete = fastify => ({
	handler: async (req, res) => {
		const client = req.routeOptions.config.client;
		const id = req.params.id;
		const row = await client.prisma.staffAccess.findUnique({ where: { id } });
		if (!row) return res.code(404).send({
			error: 'Not Found',
			message: 'ID non presente in whitelist.',
			statusCode: 404,
		});
		if (row.isOwner || ownerIds().includes(id)) return res.code(400).send({
			error: 'Bad Request',
			message: 'Un proprietario non puo\' essere rimosso dal pannello (modifica STAFF_OWNER_ID su Render).',
			statusCode: 400,
		});
		await client.prisma.staffAccess.delete({ where: { id } });
		client.log.info(`Area staff: ${req.user.id} ha revocato l'ID ${id}`);
		return { ok: true };
	},
	onRequest: [fastify.authenticate, fastify.staffOnly, fastify.staffOwnerOnly],
});
