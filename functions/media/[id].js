import { isAuthenticated } from '../_lib/auth.js';
import { readManifest } from '../_lib/storage.js';

export async function onRequestGet({ request, env, params }) {
	if (!env.MEDIA_BUCKET || typeof params.id !== 'string') return new Response('Not found', { status: 404 });

	const manifest = await readManifest(env.MEDIA_BUCKET);
	const photo = manifest.photos.find((item) => item.id === params.id);
	if (!photo) return new Response('Not found', { status: 404 });
	if (!photo.published && !(await isAuthenticated(request, env))) return new Response('Not found', { status: 404 });

	const object = await env.MEDIA_BUCKET.get(photo.key);
	if (!object) return new Response('Not found', { status: 404 });

	const headers = new Headers();
	if (typeof object.writeHttpMetadata === 'function') object.writeHttpMetadata(headers);
	headers.set('content-type', photo.contentType);
	headers.set('etag', object.httpEtag);
	headers.set('x-content-type-options', 'nosniff');
	headers.set('cache-control', photo.published ? 'public, max-age=86400' : 'private, no-store');
	return new Response(object.body, { headers });
}
