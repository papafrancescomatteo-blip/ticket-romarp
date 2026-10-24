/* Area staff - Bot Ticket Server Secondari Roma RP
 * Tutto il contenuto proveniente dagli utenti viene inserito con textContent (mai innerHTML) per evitare XSS. */
(() => {
	const $ = id => document.getElementById(id);
	const PRIORITY = { HIGH: 'Alta', MEDIUM: 'Media', LOW: 'Bassa' };

	const state = { guild: '', page: 1, me: null };

	/** crea un elemento: el('div', {class:'x', onclick: fn}, ['testo', altroElemento]) */
	function el(tag, attrs = {}, children = []) {
		const node = document.createElement(tag);
		for (const [key, value] of Object.entries(attrs)) {
			if (value === undefined || value === null || value === false) continue;
			if (key === 'class') node.className = value;
			else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
			else node.setAttribute(key, value === true ? '' : value);
		}
		for (const child of [].concat(children)) {
			if (child === null || child === undefined || child === false) continue;
			node.append(child instanceof Node ? child : document.createTextNode(String(child)));
		}
		return node;
	}

	function toast(message, type = 'ok') {
		const t = $('toast');
		t.textContent = message;
		t.className = `toast show ${type}`;
		clearTimeout(toast.timer);
		toast.timer = setTimeout(() => { t.className = 'toast'; }, 3500);
	}

	async function api(path, options = {}) {
		const res = await fetch(path, {
			credentials: 'same-origin',
			headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
			...options,
			body: options.body ? JSON.stringify(options.body) : undefined,
		});
		let data = null;
		try { data = await res.json(); } catch { /* nessun corpo */ }
		if (!res.ok) {
			const error = new Error(data?.message || `Errore ${res.status}`);
			error.status = res.status;
			throw error;
		}
		return data;
	}

	const fmtDate = value => value ? new Date(value).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }) : '—';
	const userLabel = (name, id) => name ? `${name} (${id})` : id;

	/* ---------- stati iniziali ---------- */
	function showGate(title, text, button) {
		const gate = $('gate');
		gate.classList.remove('hidden');
		$('app').classList.add('hidden');
		gate.replaceChildren(el('div', { class: 'center-box' }, [
			el('h1', {}, title),
			el('p', {}, text),
			button,
		]));
	}

	async function init() {
		try {
			state.me = await api('/api/staff/me');
		} catch (error) {
			if (error.status === 401) {
				return showGate(
					'Accesso riservato',
					'Questa area è riservata allo staff autorizzato. Accedi con il tuo account Discord.',
					el('a', { class: 'btn gold', href: '/auth/login?r=/staff' }, 'Accedi con Discord'),
				);
			}
			return showGate('Errore', error.message, el('a', { class: 'btn secondary', href: '/staff' }, 'Riprova'));
		}

		$('userbox').classList.remove('hidden');
		$('user-name').textContent = state.me.username;
		if (state.me.avatar) $('user-avatar').src = state.me.avatar; else $('user-avatar').remove();

		if (!state.me.allowed) {
			return showGate(
				'Non autorizzato',
				`Il tuo ID Discord (${state.me.id}) non è nella lista degli accessi. Chiedi al proprietario di autorizzarti.`,
				el('a', { class: 'btn secondary', href: '/auth/logout' }, 'Esci e cambia account'),
			);
		}

		$('gate').classList.add('hidden');
		$('app').classList.remove('hidden');
		if (state.me.isOwner) $('tab-access').classList.remove('hidden');
		await Promise.all([loadServers(), loadTickets()]);
	}

	/* ---------- server ---------- */
	async function loadServers() {
		const servers = await api('/api/staff/overview');
		const box = $('servers');
		box.replaceChildren();

		const totalOpen = servers.reduce((n, s) => n + s.open, 0);
		box.append(serverCard({ id: '', name: 'Tutti i server', open: totalOpen, closed: servers.reduce((n, s) => n + s.closed, 0) }));
		servers.forEach(server => box.append(serverCard(server)));
	}

	function serverCard(server) {
		const icon = server.icon
			? el('img', { src: server.icon, alt: '' })
			: el('div', { class: 'ph' }, (server.name || '?').slice(0, 1).toUpperCase());
		return el('div', {
			class: `stat${state.guild === server.id ? ' active' : ''}`,
			onclick: () => {
				state.guild = server.id;
				state.page = 1;
				document.querySelectorAll('.stat').forEach(s => s.classList.remove('active'));
				loadServers().catch(() => {});
				loadTickets();
			},
		}, [
			icon,
			el('div', {}, [
				el('div', { class: 'name' }, server.name),
				el('div', { class: 'nums' }, [el('b', {}, `${server.open} aperti`), ` · ${server.closed} chiusi`]),
			]),
		]);
	}

	/* ---------- lista ticket ---------- */
	async function loadTickets() {
		const params = new URLSearchParams({
			page: state.page,
			status: $('f-status').value,
		});
		if (state.guild) params.set('guild', state.guild);
		if ($('f-priority').value) params.set('priority', $('f-priority').value);
		if ($('f-q').value.trim()) params.set('q', $('f-q').value.trim());

		let data;
		try {
			data = await api(`/api/staff/tickets?${params}`);
		} catch (error) {
			return toast(error.message, 'err');
		}

		const body = $('rows');
		body.replaceChildren();
		$('empty').classList.toggle('hidden', data.tickets.length > 0);

		for (const t of data.tickets) {
			body.append(el('tr', { class: 'row', onclick: () => openTicket(t.id) }, [
				el('td', {}, `#${t.number}`),
				el('td', {}, t.guildName),
				el('td', {}, t.createdByName || t.createdById),
				el('td', {}, t.topic ? (t.topic.length > 50 ? `${t.topic.slice(0, 50)}…` : t.topic) : (t.category || '—')),
				el('td', {}, t.priority ? el('span', { class: `pill ${t.priority}` }, PRIORITY[t.priority]) : '—'),
				el('td', {}, el('span', { class: `pill ${t.open ? 'open' : 'closed'}` }, t.open ? 'Aperto' : 'Chiuso')),
				el('td', {}, fmtDate(t.createdAt)),
			]));
		}

		const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
		$('pageinfo').textContent = `Pagina ${data.page} di ${pages} · ${data.total} ticket`;
		$('prev').disabled = data.page <= 1;
		$('next').disabled = data.page >= pages;
	}

	/* ---------- dettaglio ticket ---------- */
	function closeDrawer() {
		$('drawer').classList.remove('show');
		$('bg').classList.remove('show');
	}

	async function openTicket(id) {
		let t;
		try {
			t = await api(`/api/staff/tickets/${id}`);
		} catch (error) {
			return toast(error.message, 'err');
		}

		const priority = el('select', { id: 'e-priority' }, [
			el('option', { value: '' }, '— non impostata —'),
			...Object.entries(PRIORITY).map(([value, label]) => el('option', { value, selected: t.priority === value }, label)),
		]);
		const topic = el('textarea', { id: 'e-topic', rows: '2', maxlength: '100' });
		topic.value = t.topic || '';
		const reason = el('input', { id: 'e-reason', placeholder: 'Motivo della chiusura (facoltativo)', maxlength: '500', style: 'width:100%' });
		const transcript = el('div', { class: 'transcript hidden', id: 'transcript' });

		const save = async () => {
			const body = {};
			if (priority.value && priority.value !== (t.priority || '')) body.priority = priority.value;
			if (topic.value.trim() !== (t.topic || '')) body.topic = topic.value;
			if (!Object.keys(body).length) return toast('Nessuna modifica da salvare', 'err');
			try {
				await api(`/api/staff/tickets/${t.id}`, { method: 'PATCH', body });
				toast('Ticket aggiornato');
				closeDrawer();
				loadTickets(); loadServers();
			} catch (error) { toast(error.message, 'err'); }
		};

		const closeTicket = async () => {
			if (!confirm(`Chiudere definitivamente il ticket #${t.number}? Il canale verrà eliminato.`)) return;
			try {
				await api(`/api/staff/tickets/${t.id}/close`, { method: 'POST', body: { reason: reason.value } });
				toast('Ticket chiuso');
				closeDrawer();
				loadTickets(); loadServers();
			} catch (error) { toast(error.message, 'err'); }
		};

		const loadTranscript = async button => {
			button.disabled = true;
			try {
				const data = await api(`/api/staff/tickets/${t.id}/transcript`);
				renderTranscript(transcript, data);
			} catch (error) {
				toast(error.message, 'err');
				button.disabled = false;
			}
		};

		const transcriptButton = el('button', { class: 'btn secondary small' }, 'Mostra trascrizione');
		transcriptButton.addEventListener('click', () => loadTranscript(transcriptButton));

		const drawer = $('drawer');
		drawer.replaceChildren(
			el('div', { style: 'display:flex;justify-content:space-between;align-items:start' }, [
				el('div', {}, [
					el('h2', {}, `Ticket #${t.number}`),
					el('span', { class: `pill ${t.open ? 'open' : 'closed'}` }, t.open ? 'Aperto' : 'Chiuso'),
				]),
				el('button', { class: 'btn secondary small', onclick: closeDrawer }, 'Chiudi ✕'),
			]),
			el('dl', { class: 'kv' }, [
				el('dt', {}, 'Server'), el('dd', {}, t.guildName),
				el('dt', {}, 'Categoria'), el('dd', {}, t.category || '—'),
				el('dt', {}, 'Creato da'), el('dd', {}, userLabel(t.createdByName, t.createdById)),
				el('dt', {}, 'In carico a'), el('dd', {}, t.claimedById ? userLabel(t.claimedByName, t.claimedById) : 'Nessuno'),
				el('dt', {}, 'Creato il'), el('dd', {}, fmtDate(t.createdAt)),
				el('dt', {}, 'Prima risposta'), el('dd', {}, fmtDate(t.firstResponseAt)),
				t.open ? null : el('dt', {}, 'Chiuso il'), t.open ? null : el('dd', {}, fmtDate(t.closedAt)),
				t.open ? null : el('dt', {}, 'Motivo'), t.open ? null : el('dd', {}, t.closedReason || '—'),
				t.feedback ? el('dt', {}, 'Valutazione') : null,
				t.feedback ? el('dd', {}, `${'⭐'.repeat(t.feedback.rating)}${t.feedback.comment ? ` — ${t.feedback.comment}` : ''}`) : null,
				el('dt', {}, 'Messaggi'), el('dd', {}, t.messageCount ?? '—'),
			]),
			el('div', { class: 'field' }, [el('label', { for: 'e-priority' }, 'Priorità'), priority]),
			el('div', { class: 'field' }, [el('label', { for: 'e-topic' }, 'Argomento'), topic]),
			el('div', { class: 'row-actions' }, [el('button', { class: 'btn gold', onclick: save }, 'Salva modifiche')]),
			el('div', { class: 'field', style: 'margin-top:26px' }, [el('label', {}, 'Trascrizione'), transcriptButton, transcript]),
			t.open
				? el('div', { class: 'field', style: 'margin-top:26px;border-top:1px solid var(--line);padding-top:18px' }, [
					el('label', { for: 'e-reason' }, 'Chiusura forzata'),
					reason,
					el('div', { class: 'row-actions' }, [el('button', { class: 'btn danger', onclick: closeTicket }, 'Chiudi ticket')]),
				])
				: null,
		);

		drawer.classList.add('show');
		$('bg').classList.add('show');
	}

	function renderTranscript(container, ticket) {
		container.classList.remove('hidden');
		container.replaceChildren();
		const users = {};
		(ticket.archivedUsers || []).forEach(u => { users[u.userId] = u.displayName || u.username || u.userId; });
		const messages = (ticket.archivedMessages || []).slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
		if (!messages.length) {
			container.append(el('div', { class: 'empty' }, 'Nessun messaggio archiviato (l\'archiviazione potrebbe essere disattivata).'));
			return;
		}
		for (const m of messages) {
			let text = m.content;
			try {
				const parsed = JSON.parse(m.content);
				if (parsed && typeof parsed === 'object') text = parsed.content || (parsed.embeds?.length ? '[embed]' : '');
			} catch { /* testo semplice */ }
			container.append(el('div', { class: 'msg' }, [
				el('span', { class: 'who' }, users[m.authorId] || m.authorId),
				el('span', { class: 'when' }, fmtDate(m.createdAt)),
				el('div', { class: 'txt' }, text || '[allegato/embed]'),
			]));
		}
	}

	/* ---------- accessi ---------- */
	async function loadAccess() {
		const body = $('access-rows');
		let rows;
		try {
			rows = await api('/api/staff/access');
		} catch (error) { return toast(error.message, 'err'); }
		body.replaceChildren();
		for (const row of rows) {
			body.append(el('tr', {}, [
				el('td', {}, row.id),
				el('td', {}, row.username || '—'),
				el('td', {}, row.note || '—'),
				el('td', {}, row.isOwner ? el('span', { class: 'pill HIGH' }, 'Proprietario') : 'Staff'),
				el('td', {}, row.isOwner ? '' : el('button', {
					class: 'btn danger small',
					onclick: async () => {
						if (!confirm(`Revocare l'accesso all'ID ${row.id}?`)) return;
						try { await api(`/api/staff/access/${row.id}`, { method: 'DELETE' }); toast('Accesso revocato'); loadAccess(); } catch (error) { toast(error.message, 'err'); }
					},
				}, 'Revoca')),
			]));
		}
	}

	/* ---------- eventi ---------- */
	document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
		document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));
		const which = tab.dataset.tab;
		$('view-tickets').classList.toggle('hidden', which !== 'tickets');
		$('view-access').classList.toggle('hidden', which !== 'access');
		if (which === 'access') loadAccess();
	}));

	$('f-go').addEventListener('click', () => { state.page = 1; loadTickets(); });
	$('f-q').addEventListener('keydown', e => { if (e.key === 'Enter') { state.page = 1; loadTickets(); } });
	$('f-status').addEventListener('change', () => { state.page = 1; loadTickets(); });
	$('f-priority').addEventListener('change', () => { state.page = 1; loadTickets(); });
	$('prev').addEventListener('click', () => { state.page = Math.max(1, state.page - 1); loadTickets(); });
	$('next').addEventListener('click', () => { state.page += 1; loadTickets(); });
	$('bg').addEventListener('click', closeDrawer);
	document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

	$('a-add').addEventListener('click', async () => {
		const id = $('a-id').value.trim();
		try {
			await api('/api/staff/access', { method: 'POST', body: { id, note: $('a-note').value } });
			$('a-id').value = ''; $('a-note').value = '';
			toast('ID autorizzato');
			loadAccess();
		} catch (error) { toast(error.message, 'err'); }
	});

	init();
})();
