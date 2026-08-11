const COOKIE_NAME = 'yk_site_session';
const SESSION_SECONDS = 60 * 60 * 24 * 7;
const encoder = new TextEncoder();

function bytesToBase64Url(bytes) {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

async function digest(value) {
	return new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}

function constantTimeEqual(left, right) {
	if (left.length !== right.length) return false;
	let difference = 0;
	for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
	return difference === 0;
}

async function sign(payload, secret) {
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign'],
	);
	return bytesToBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(payload))));
}

function readCookie(request, name) {
	const cookies = request.headers.get('cookie') ?? '';
	for (const cookie of cookies.split(';')) {
		const [key, ...parts] = cookie.trim().split('=');
		if (key === name) return parts.join('=');
	}
	return null;
}

export function siteAuthIsConfigured(env) {
	return Boolean(env.SITE_PASSWORD && env.SESSION_SECRET);
}

export async function verifySitePassword(password, env) {
	if (!siteAuthIsConfigured(env) || typeof password !== 'string') return false;
	const [provided, expected] = await Promise.all([digest(password), digest(env.SITE_PASSWORD)]);
	return constantTimeEqual(provided, expected);
}

export async function createSiteSession(env) {
	const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
	const payload = `site:${expiresAt}`;
	const signature = await sign(payload, env.SESSION_SECRET);
	return `${expiresAt}.${signature}`;
}

export async function isSiteAuthenticated(request, env) {
	if (!siteAuthIsConfigured(env)) return false;
	const token = readCookie(request, COOKIE_NAME);
	if (!token) return false;
	const separator = token.indexOf('.');
	if (separator < 1) return false;
	const expiresAt = Number(token.slice(0, separator));
	const suppliedSignature = token.slice(separator + 1);
	if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false;
	const expectedSignature = await sign(`site:${expiresAt}`, env.SESSION_SECRET);
	return constantTimeEqual(encoder.encode(suppliedSignature), encoder.encode(expectedSignature));
}

export function siteSessionCookie(token, request) {
	const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
	return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${secure}`;
}

export function clearSiteSessionCookie(request) {
	const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
	return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}
