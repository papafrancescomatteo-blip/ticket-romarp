const { pools } = require('../../../../lib/threads');
const { logTicketEvent } = require('../../../../lib/logging');
const { crypto } = pools;

const EMOJI = {
	HIGH: '🔴',
	LOW: '🟢',
	MEDIUM: '🟠',
};

const find = (client, id) => client.prisma.ticket.findUnique({
	include: {
		category: { select: { name: true } },
		feedback: true,
	},
	where: { id },
});

// dettaglio di un ticket
module.exports.get = fastify => ({
	handler: async (req, res) => {
		/** @type {import('../../../../client')} */
		const client = req.routeOptions.config.client;
		const ticket = await find(client, req.params.ticket);
		if (!ticket || ticket.deleted) return res.code(404).send({
			error: 'Not Found',
			message: 'Ticket non trovato.',
			statusCode: 404,
		});

		const channel = client.channels.cache.get(ticket.id);
		return {
			category: ticket.category?.name ?? null,
			channelExists: !!channel,
			claimedById: ticket.claimedById,
			claimedByName: ticket.claimedById ? client.users.cache.get(ticket.claimedById)?.username ?? null : null,
			closedAt: ticket.closedAt,
			closedById: ticket.closedById,
			closedReason: ticket.closedReason ? await crypto.queue(w => w.decrypt(ticket.closedReason)) : null,
			createdAt: ticket.createdAt,
			createdById: ticket.createdById,
			createdByName: client.users.cache.get(ticket.createdById)?.username ?? null,
			feedback: ticket.feedback
				? {
					comment: ticket.feedback.comment ? await crypto.queue(w => w.decrypt(ticket.feedback.comment)) : null,
					rating: ticket.feedback.rating,
				}
				: null,
			firstResponseAt: ticket.firstResponseAt,
			guildId: ticket.guildId,
			guildName: client.guilds.cache.get(ticket.guildId)?.name ?? ticket.guildId,
			id: ticket.id,
			messageCount: ticket.messageCount,
			number: ticket.number,
			open: ticket.open,
			priority: ticket.priority,
			topic: ticket.topic ? await crypto.queue(w => w.decrypt(ticket.topic)) : null,
		};
	},
	onRequest: [fastify.authenticate, fastify.staffOnly],
});

// modifica priorita' e/o argomento
module.exports.patch = fastify => ({
	handler: async (req, res) => {
		/** @type {import('../../../../client')} */
		const client = req.routeOptions.config.client;
		const ticket = await find(client, req.params.ticket);
		if (!ticket || ticket.deleted) return res.code(404).send({
			error: 'Not Found',
			message: 'Ticket non trovato.',
			statusCode: 404,
		});

		const body = req.body || {};
		const data = {};
		const original = {};
		const updated = {};
		const channel = client.channels.cache.get(ticket.id);

		if (body.priority !== undefined) {
			if (!['LOW', 'MEDIUM', 'HIGH'].includes(body.priority)) return res.code(400).send({
				error: 'Bad Request',
				message: 'Priorita\' non valida.',
				statusCode: 400,
			});
			data.priority = body.priority;
			original.priority = ticket.priority;
			updated.priority = body.priority;
			if (channel && ticket.open) {
				try {
					let name = channel.name;
					if (ticket.priority) name = name.replace(EMOJI[ticket.priority], EMOJI[body.priority]);
					else name = EMOJI[body.priority] + name;
					if (name !== channel.name) await channel.setName(name);
				} catch (error) {
					client.log.warn(`Impossibile rinominare il canale del ticket ${ticket.id}: ${error.message}`);
				}
			}
		}

		if (body.topic !== undefined) {
			const topic = String(body.topic).trim().slice(0, 100);
			original.topic = ticket.topic ? await crypto.queue(w => w.decrypt(ticket.topic)) : null;
			updated.topic = topic || null;
			data.topic = topic ? await crypto.queue(w => w.encrypt(topic)) : null;
			if (channel && ticket.open && topic) {
				try {
					await channel.setTopic(`<@${ticket.createdById}> | ${topic}`);
				} catch (error) {
					client.log.warn(`Impossibile aggiornare il topic del canale ${ticket.id}: ${error.message}`);
				}
			}
		}

		if (!Object.keys(data).length) return res.code(400).send({
			error: 'Bad Request',
			message: 'Nessuna modifica richiesta.',
			statusCode: 400,
		});

		await client.prisma.ticket.update({
			data,
			where: { id: ticket.id },
		});

		logTicketEvent(client, {
			action: 'update',
			diff: {
				original,
				updated,
			},
			target: {
				id: ticket.id,
				name: `<#${ticket.id}>`,
			},
			userId: req.user.id,
		});

		return { ok: true };
	},
	onRequest: [fastify.authenticate, fastify.staffOnly],
});
