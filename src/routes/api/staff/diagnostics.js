// Diagnostica del collegamento a Discord (solo staff in whitelist). Non mostra mai il token.
const clip = (text, n = 160) => String(text).replace(/\s+/g, ' ').slice(0, n);

async function probe(url, headers) {
	try {
		const res = await fetch(url, {
			headers,
			signal: AbortSignal.timeout(15000),
		});
		const text = await res.text();
		return {
			body: clip(text),
			contentType: res.headers.get('content-type'),
			retryAfter: res.headers.get('retry-after'),
			status: res.status,
		};
	} catch (error) {
		return { error: error.message };
	}
}

module.exports.get = fastify => ({
	handler: async req => {
		/** @type {import('../../../client')} */
		const client = req.routeOptions.config.client;
		const token = process.env.DISCORD_TOKEN || '';

		const tokenCheck = await probe('https://discord.com/api/v10/users/@me', { Authorization: `Bot ${token.trim()}` });
		let botUser = null;
		if (tokenCheck.status === 200) {
			try {
				botUser = JSON.parse(tokenCheck.body)?.username ?? null;
			} catch { /* risposta troncata: non serve */ }
		}

		const verdict = (() => {
			if (client.isReady()) return 'OK: il bot e\' collegato a Discord.';
			if (!token) return 'DISCORD_TOKEN non e\' impostato su Render.';
			if (tokenCheck.error) return 'Render non riesce a raggiungere Discord (errore di rete).';
			if (tokenCheck.status === 401) return 'Il token e\' SBAGLIATO o revocato: fai Reset Token nel Developer Portal (scheda Bot) e rimettilo in DISCORD_TOKEN.';
			if (tokenCheck.status === 429 || tokenCheck.status === 403 || (tokenCheck.contentType || '').includes('text/html')) return 'Discord sta BLOCCANDO l\'indirizzo IP di Render (risposta Cloudflare/429). Serve un altro hosting o un\'altra regione.';
			if (tokenCheck.status === 200) {
				if (client.lastGatewayClose?.code === 4014) return 'Token valido, ma gli INTENTS non sono attivi: nel Developer Portal > Bot attiva Presence, Server Members e Message Content e salva.';
				return 'Token valido e Discord raggiungibile: il collegamento (gateway) non e\' ancora riuscito. Controlla lastGatewayClose e lastLoginError qui sotto.';
			}
			return 'Situazione non chiara: manda questo JSON a Claude.';
		})();

		return {
			verdict,
			bot: {
				guilds: client.guilds.cache.size,
				lastGatewayClose: client.lastGatewayClose ?? null,
				lastErrors: client.lastErrors ?? [],
				lastLoginError: client.lastLoginError ?? null,
				ping: client.ws.ping,
				ready: client.isReady(),
				user: client.user?.tag ?? botUser,
				wsStatus: client.ws.status,
			},
			env: {
				DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID ? 'impostato' : 'NON impostato',
				DISCORD_SECRET: process.env.DISCORD_SECRET ? 'impostato' : 'NON impostato',
				DISCORD_TOKEN: token
					? `impostato (${token.split('.').length} parti, ${token.length} caratteri${token !== token.trim() ? ', CONTIENE SPAZI' : ''})`
					: 'NON impostato',
			},
			test: {
				gatewayPubblico: await probe('https://discord.com/api/v10/gateway'),
				tokenBot: tokenCheck,
			},
		};
	},
	onRequest: [fastify.authenticate, fastify.staffOnly],
});
