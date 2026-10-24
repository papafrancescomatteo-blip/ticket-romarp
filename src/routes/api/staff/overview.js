// elenco dei server in cui e' presente il bot, con conteggio ticket
module.exports.get = fastify => ({
	handler: async req => {
		/** @type {import('../../../client')} */
		const client = req.routeOptions.config.client;

		const counts = await client.prisma.ticket.groupBy({
			_count: { _all: true },
			by: ['guildId', 'open'],
			where: { deleted: false },
		});

		return client.guilds.cache.map(guild => {
			const open = counts.find(c => c.guildId === guild.id && c.open)?._count._all ?? 0;
			const closed = counts.find(c => c.guildId === guild.id && !c.open)?._count._all ?? 0;
			return {
				closed,
				icon: guild.iconURL({ size: 64 }),
				id: guild.id,
				members: guild.memberCount,
				name: guild.name,
				open,
			};
		}).sort((a, b) => a.name.localeCompare(b.name));
	},
	onRequest: [fastify.authenticate, fastify.staffOnly],
});
