import { json } from './config.js';

const COOKIE_NAME = 'yk_admin_session';
const SESSION_SECONDS = 60 * 60 * 12;
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

export function authIsConfigured(env) {
	return Boolean(env.ADMIN_PASSWORD && env.SESSION_SECRET);
}

export async function verifyPassword(password, env) {
	if (!authIsConfigured(env) || typeof password !== 'string') return false;
	const [provided, expected] = await Promise.all([digest(password), digest(env.ADMIN_PASSWORD)]);
	return constantTimeEqual(provided, expected);
}

export async function createSession(env) {
	const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
	const payload = String(expiresAt);
	const signature = await sign(payload, env.SESSION_SECRET);
	return `${payload}.${signature}`;
}

export async function isAuthenticated(request, env) {
	if (!authIsConfigured(env)) return false;
	const token = readCookie(request, COOKIE_NAME);
	if (!token) return false;
	const separator = token.indexOf('.');
	if (separator < 1) return false;
	const payload = token.slice(0, separator);
	const suppliedSignature = token.slice(separator + 1);
	const expiresAt = Number(payload);
	if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false;
	const expectedSignature = await sign(payload, env.SESSION_SECRET);
	return constantTimeEqual(encoder.encode(suppliedSignature), encoder.encode(expectedSignature));
}

export function sessionCookie(token, request) {
	const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
	return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${secure}`;
}

export function clearSessionCookie(request) {
	const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
	return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

export async function requireAdmin(request, env) {
	if (!authIsConfigured(env)) return json({ error: 'Admin login is not configured.' }, 503);
	if (!(await isAuthenticated(request, env))) return json({ error: 'Authentication required.' }, 401);
	return null;
}
