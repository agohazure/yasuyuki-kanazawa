import { createSession, sessionCookie, verifyPassword } from '../../_lib/auth.js';
import { json, sameOrigin } from '../../_lib/config.js';

export async function onRequestPost({ request, env }) {
	if (!sameOrigin(request)) return json({ error: 'Invalid request origin.' }, 403);

	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request.' }, 400);
	}

	if (!(await verifyPassword(body.password, env))) return json({ error: 'Password is incorrect.' }, 401);
	const token = await createSession(env);
	return json({ ok: true }, 200, { 'set-cookie': sessionCookie(token, request) });
}
