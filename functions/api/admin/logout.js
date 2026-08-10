import { clearSessionCookie, requireAdmin } from '../../_lib/auth.js';
import { json, sameOrigin } from '../../_lib/config.js';

export async function onRequestPost({ request, env }) {
	if (!sameOrigin(request)) return json({ error: 'Invalid request origin.' }, 403);
	const denied = await requireAdmin(request, env);
	if (denied) return denied;
	return json({ ok: true }, 200, { 'set-cookie': clearSessionCookie(request) });
}
