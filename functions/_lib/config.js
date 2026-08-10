export const TAGS = ['portrait', 'commercial', 'landscape', 'documentary'];
export const MANIFEST_KEY = '_portfolio/manifest.json';
export const MAX_UPLOAD_BYTES = 18 * 1024 * 1024;

export function isTag(value) {
	return typeof value === 'string' && TAGS.includes(value);
}

export function json(data, status = 200, extraHeaders = {}) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'cache-control': 'no-store',
			...extraHeaders,
		},
	});
}

export function sameOrigin(request) {
	const origin = request.headers.get('origin');
	return Boolean(origin && origin === new URL(request.url).origin);
}
