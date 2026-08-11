import { requireAdmin } from '../../../_lib/auth.js';
import { json, sameOrigin } from '../../../_lib/config.js';
import { adminPhoto, readManifest, writeManifest } from '../../../_lib/storage.js';

async function getContext(request, env, id) {
	const denied = await requireAdmin(request, env);
	if (denied) return { denied };
	if (!env.MEDIA_BUCKET) return { denied: json({ error: 'Photo storage is not configured.' }, 503) };
	const manifest = await readManifest(env.MEDIA_BUCKET);
	const photo = manifest.photos.find((item) => item.id === id);
	if (!photo) return { denied: json({ error: 'Photo not found.' }, 404) };
	return { manifest, photo };
}

export async function onRequestPatch({ request, env, params }) {
	if (!sameOrigin(request)) return json({ error: 'Invalid request origin.' }, 403);
	const context = await getContext(request, env, params.id);
	if (context.denied) return context.denied;

	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request.' }, 400);
	}

	const { manifest, photo } = context;
	if (typeof body.title === 'string') photo.title = body.title.trim().slice(0, 120);
	if (typeof body.alt === 'string') photo.alt = body.alt.trim().slice(0, 240) || 'Photograph by Yasuyuki Kanazawa';
	if (typeof body.published === 'boolean') photo.published = body.published;
	if (typeof body.seriesId === 'string' && body.seriesId !== photo.seriesId) {
		const destination = manifest.series.find((item) => item.id === body.seriesId);
		if (!destination) return json({ error: '移動先のシリーズが見つかりません。' }, 400);
		const source = manifest.series.find((item) => item.id === photo.seriesId);
		if (source) {
			source.photoIds = source.photoIds.filter((id) => id !== photo.id);
			source.photoIds.forEach((id, index) => {
				const item = manifest.photos.find((candidate) => candidate.id === id);
				if (item) item.sequence = index;
			});
		}
		photo.seriesId = destination.id;
		photo.sequence = destination.photoIds.length;
		destination.photoIds.push(photo.id);
	}

	await writeManifest(env.MEDIA_BUCKET, manifest);
	return json({ photo: adminPhoto(photo) });
}

export async function onRequestDelete({ request, env, params }) {
	if (!sameOrigin(request)) return json({ error: 'Invalid request origin.' }, 403);
	const context = await getContext(request, env, params.id);
	if (context.denied) return context.denied;

	const { manifest, photo } = context;
	manifest.photos = manifest.photos.filter((item) => item.id !== photo.id);
	const series = manifest.series.find((item) => item.id === photo.seriesId);
	if (series) {
		series.photoIds = series.photoIds.filter((id) => id !== photo.id);
		series.photoIds.forEach((id, index) => {
			const item = manifest.photos.find((candidate) => candidate.id === id);
			if (item) item.sequence = index;
		});
	}
	await writeManifest(env.MEDIA_BUCKET, manifest);
	await env.MEDIA_BUCKET.delete(photo.key);
	return json({ ok: true });
}
