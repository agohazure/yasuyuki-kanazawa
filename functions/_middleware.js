import { isSiteAuthenticated, siteAuthIsConfigured } from './_lib/site-auth.js';

const OPEN_PATHS = new Set(['/api/site-login', '/api/site-logout']);

function isPublicPath(pathname) {
	return pathname === '/kitchen' || pathname.startsWith('/kitchen/');
}

function escapeHtml(value) {
	return String(value)
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#039;');
}

function loginPage(request, configured) {
	const url = new URL(request.url);
	const next = `${url.pathname}${url.search}`;
	const hasError = url.searchParams.get('access') === 'denied';
	const statusText = configured
		? hasError ? 'Password is incorrect.' : 'Enter password to view.'
		: 'Private preview is not configured.';
	const disabled = configured ? '' : ' disabled';
	return new Response(`<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<meta name="robots" content="noindex,nofollow,noarchive" />
	<title>Private Preview | Yasuyuki Kanazawa</title>
	<style>
		*{box-sizing:border-box}html{background:#f5f5f2;color:#111;font-family:Helvetica Neue,Helvetica,Arial,sans-serif}body{margin:0;min-height:100svh;display:grid;grid-template-rows:auto 1fr;padding:24px clamp(18px,4vw,56px)}header{font-size:12px;letter-spacing:.09em;text-transform:uppercase}main{display:grid;place-items:center}form{width:min(100%,360px)}h1{font-size:clamp(34px,7vw,64px);line-height:.94;letter-spacing:-.055em;font-weight:400;margin:0 0 44px}label{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px}input{width:100%;border:0;border-bottom:1px solid #111;background:transparent;border-radius:0;padding:13px 0;font:inherit;font-size:18px;outline:none}button{width:100%;margin-top:28px;border:1px solid #111;background:#111;color:#fff;padding:14px 18px;font:inherit;font-size:12px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer}button:disabled{opacity:.35}.status{min-height:18px;margin:12px 0 0;color:#747474;font-size:12px}.error{color:#9b2c2c}
	</style>
</head>
<body>
	<header>Yasuyuki Kanazawa</header>
	<main>
		<form method="post" action="/api/site-login">
			<h1>Private<br />Preview</h1>
			<input type="hidden" name="next" value="${escapeHtml(next)}" />
			<label for="password">Password</label>
			<input id="password" name="password" type="password" inputmode="numeric" autocomplete="current-password" required autofocus${disabled} />
			<button type="submit"${disabled}>Enter</button>
			<p class="status${hasError ? ' error' : ''}">${statusText}</p>
		</form>
	</main>
</body>
</html>`, {
		status: configured ? 401 : 503,
		headers: {
			'content-type': 'text/html; charset=utf-8',
			'cache-control': 'no-store',
			'x-robots-tag': 'noindex, nofollow, noarchive',
			'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
		},
	});
}

export async function onRequest({ request, env, next }) {
	const url = new URL(request.url);
	if (OPEN_PATHS.has(url.pathname) || isPublicPath(url.pathname)) return next();
	if (await isSiteAuthenticated(request, env)) return next();

	const acceptsHtml = request.headers.get('accept')?.includes('text/html');
	if ((request.method === 'GET' || request.method === 'HEAD') && acceptsHtml) {
		return loginPage(request, siteAuthIsConfigured(env));
	}

	return new Response(JSON.stringify({ error: 'Site password required.' }), {
		status: 401,
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'cache-control': 'no-store',
			'x-robots-tag': 'noindex, nofollow, noarchive',
		},
	});
}
