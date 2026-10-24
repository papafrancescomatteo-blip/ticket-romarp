const { pools } = require('../../../../lib/threads');
const { crypto } = pools;

const PAGE_SIZE = 25;

// lista ticket di tutti i server (o di uno solo) con filtri
module.exports.get = fastify => ({
	handler: async req => {
		/** @type {import('../../../../client')} */
		const client = req.routeOptions.config.client;
		const {
			guild,
			page = '1',
			priority,
			q,
			status = 'open',
		} = req.query;

		const where = { deleted: false };
		if (guild && /^\d{17,19}$/.test(guild)) where.guildId = guild;
		if (status === 'open') where.open = true;
		else if (status === 'closed') where.open = false;
		if (['LOW', 'MEDIUM', 'HIGH'].includes(priority)) where.priority = priority;
		if (q) {
			const term = String(q).trim().replace(/^#/, '');
			if (/^\d{1,6}$/.test(term)) where.number = Number(term);
			else if (/^\d{17,19}$/.test(term)) {
				where.OR = [
					{ createdById: term },
					{ claimedById: term },
					{ id: term },
				];
			}
		}

		const pageNumber = Math.max(1, parseInt(page, 10) || 1);
		const [total, rows] = await Promise.all([
			client.prisma.ticket.count({ where }),
			client.prisma.ticket.findMany({
				include: { category: { select: { name: true } } },
				orderBy: { createdAt: 'desc' },
				skip: (pageNumber - 1) * PAGE_SIZE,
				take: PAGE_SIZE,
				where,
			}),
		]);

		const tickets = await Promise.all(rows.map(async ticket => ({
			category: ticket.category?.name ?? null,
			claimedById: ticket.claimedById,
			claimedByName: ticket.claimedById ? client.users.cache.get(ticket.claimedById)?.username ?? null : null,
			closedAt: ticket.closedAt,
			createdAt: ticket.createdAt,
			createdById: ticket.createdById,
			createdByName: client.users.cache.get(ticket.createdById)?.username ?? null,
			guildId: ticket.guildId,
			guildName: client.guilds.cache.get(ticket.guildId)?.name ?? ticket.guildId,
			id: ticket.id,
			messageCount: ticket.messageCount,
			number: ticket.number,
			open: ticket.open,
			priority: ticket.priority,
			topic: ticket.topic ? await crypto.queue(w => w.decrypt(ticket.topic)) : null,
		})));

		return {
			page: pageNumber,
			pageSize: PAGE_SIZE,
			tickets,
			total,
		};
	},
	onRequest: [fastify.authenticate, fastify.staffOnly],
});
