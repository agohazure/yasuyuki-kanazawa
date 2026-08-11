import { createSiteSession, siteSessionCookie, verifySitePassword } from '../_lib/site-auth.js';
import { json, sameOrigin } from '../_lib/config.js';

function safeNext(value) {
	if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/';
	return value;
}

function redirect(request, location, cookie) {
	return new Response(null, {
		status: 303,
		headers: {
			location: new URL(location, request.url).toString(),
			'cache-control': 'no-store',
			...(cookie ? { 'set-cookie': cookie } : {}),
		},
	});
}

export async function onRequestPost({ request, env }) {
	if (!sameOrigin(request)) return json({ error: 'Invalid request origin.' }, 403);

	const contentType = request.headers.get('content-type') ?? '';
	const wantsJson = contentType.includes('application/json');
	let password = '';
	let next = '/';

	try {
		if (wantsJson) {
			const body = await request.json();
			password = body.password;
			next = safeNext(body.next);
		} else {
			const form = await request.formData();
			password = form.get('password');
			next = safeNext(form.get('next'));
		}
	} catch {
		return wantsJson ? json({ error: 'Invalid request.' }, 400) : redirect(request, '/?access=denied');
	}

	if (!(await verifySitePassword(password, env))) {
		return wantsJson
			? json({ error: 'Password is incorrect.' }, 401)
			: redirect(request, `/?access=denied&next=${encodeURIComponent(next)}`);
	}

	const token = await createSiteSession(env);
	const cookie = siteSessionCookie(token, request);
	return wantsJson ? json({ ok: true }, 200, { 'set-cookie': cookie }) : redirect(request, next, cookie);
}
