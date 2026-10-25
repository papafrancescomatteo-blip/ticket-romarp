const { getSUID } = require('./logging');
const {
	EmbedBuilder,
	codeBlock,
} = require('discord.js');

// salva gli ultimi errori in memoria (visibili nella pagina diagnostica) e li scrive su console in una riga
module.exports.recordError = (client, where, ref, error) => {
	try {
		const entry = {
			code: error?.code ?? null,
			message: String(error?.message ?? error),
			ref,
			stack: String(error?.stack ?? '').split('\n').slice(0, 6).map(l => l.trim()),
			time: new Date().toISOString(),
			where,
		};
		client.lastErrors = [entry, ...(client.lastErrors || [])].slice(0, 20);
		console.error(`[ERRORE ${ref}] ${where}: ${entry.message}`);
	} catch { /* mai bloccare la risposta all'utente */ }
};

/**
 *
 * @param {Object} event
 * @param {import("discord.js").Interaction<"cached">} event.interaction
 * @param {Error} event.error
 * @returns
 */
module.exports.handleInteractionError = async event => {
	const {
		interaction,
		error,
	} = event;
	const { client } = interaction;

	const ref = getSUID();
	client.log.error.buttons(ref);
	module.exports.recordError(client, interaction.isButton() ? `button ${event.button?.id}` : interaction.isModalSubmit() ? `modal ${event.modal?.id}` : interaction.isCommand() ? `command ${event.command?.name}` : 'menu', ref, error);

	if (interaction.isAnySelectMenu()) {
		client.log.error.menus(`"${event.menu.id}" menu execution error:`, error);
	} else if (interaction.isButton()) {
		client.log.error.buttons(`"${event.button.id}" button execution error:`, error);
	} else if (interaction.isModalSubmit()) {
		client.log.error.modals(`"${event.modal.id}" modal execution error:`, error);
	} else if (interaction.isCommand()) {
		client.log.error.commands(`"${event.command.name}" command execution error:`, error);
	}


	let locale = null;
	if (interaction.guild) {
		locale = (await client.prisma.guild.findUnique({
			select: { locale: true },
			where: { id: interaction.guild.id },
		})).locale;
	}
	const getMessage = client.i18n.getLocale(locale);

	const data = {
		components: [],
		embeds: [],
	};

	if (error.code === 10011 || (error.code === 'Invalid Type' && /Role/.test(error.message))) {
		data.embeds.push(
			new EmbedBuilder()
				.setColor('Orange')
				.setTitle(getMessage('misc.role_error.title'))
				.setDescription(getMessage('misc.role_error.description'))
				.addFields([
					{
						name: getMessage('misc.role_error.fields.for_admins.name'),
						value: getMessage('misc.role_error.fields.for_admins.value', { url: 'https://discordtickets.app/self-hosting/troubleshooting/#invalid-user-or-role' }),
					},
				]),
		);
	} else if (/Missing (Access|Permissions)/.test(error.message)) {
		data.embeds.push(
			new EmbedBuilder()
				.setColor('Orange')
				.setTitle(getMessage('misc.permissions_error.title'))
				.setDescription(getMessage('misc.permissions_error.description'))
				.addFields([
					{
						name: getMessage('misc.permissions_error.fields.for_admins.name'),
						value: getMessage('misc.permissions_error.fields.for_admins.value', { url: 'https://discordtickets.app/self-hosting/troubleshooting/#missing-permissions' }),
					},
				]),
		);
	} else {
		data.embeds.push(
			new EmbedBuilder()
				.setColor('Orange')
				.setTitle(getMessage('misc.error.title'))
				.setDescription(getMessage('misc.error.description'))
				.addFields([
					{
						name: getMessage('misc.error.fields.identifier'),
						value: codeBlock(ref),
					},
				]),
		);
	}



	return interaction.reply(data).catch(() => interaction.editReply(data));
};
