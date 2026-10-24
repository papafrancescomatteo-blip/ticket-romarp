/**
 * Bot Ticket Server Secondari Roma RP
 * Gestione whitelist dell'area staff (ID Discord autorizzati).
 *
 * - STAFF_OWNER_ID (env, separati da virgola): proprietari, sempre autorizzati e
 *   gli unici che possono aggiungere/rimuovere altri ID dal pannello.
 * - tabella `staff_access`: altri ID autorizzati dal proprietario.
 */

const ID_PATTERN = /^\d{17,19}$/;

const ownerIds = () => (process.env.STAFF_OWNER_ID || '')
	.split(',')
	.map(id => id.trim())
	.filter(id => ID_PATTERN.test(id));

/**
 * Registra i proprietari nel database (cosi' compaiono nella lista accessi).
 * @param {import('../client')} client
 */
async function ensureOwners(client) {
	for (const id of ownerIds()) {
		await client.prisma.staffAccess.upsert({
			create: {
				id,
				isOwner: true,
				note: 'Proprietario',
			},
			update: { isOwner: true },
			where: { id },
		});
	}
}

/**
 * @param {import('../client')} client
 * @param {string} userId
 * @returns {Promise<{allowed: boolean, isOwner: boolean}>}
 */
async function getAccess(client, userId) {
	if (!ID_PATTERN.test(String(userId))) return {
		allowed: false,
		isOwner: false,
	};
	if (ownerIds().includes(userId)) return {
		allowed: true,
		isOwner: true,
	};
	const row = await client.prisma.staffAccess.findUnique({ where: { id: userId } });
	return {
		allowed: !!row,
		isOwner: !!row?.isOwner,
	};
}

module.exports = {
	ensureOwners,
	getAccess,
	ID_PATTERN,
	ownerIds,
};
