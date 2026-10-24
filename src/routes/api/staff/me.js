const { getAccess } = require('../../../lib/staff');

// restituisce chi e' loggato e se e' autorizzato (non blocca i non autorizzati: serve al pannello per mostrare il messaggio giusto)
module.exports.get = fastify => ({
	handler: async req => {
		const client = req.routeOptions.config.client;
		const access = await getAccess(client, req.user.id);
		return {
			allowed: access.allowed,
			avatar: req.user.avatar
				? `https://cdn.discordapp.com/avatars/${req.user.id}/${req.user.avatar}.png?size=64`
				: null,
			id: req.user.id,
			isOwner: access.isOwner,
			username: req.user.username,
		};
	},
	onRequest: [fastify.authenticate],
});
