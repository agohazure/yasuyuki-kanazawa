import { requireAdmin } from '../../../_lib/auth.js';
import { json, sameOrigin } from '../../../_lib/config.js';
import { cleanTags, nextPosition, publicPhoto, readManifest, writeManifest } from '../../../_lib/storage.js';

function adminPhoto(photo) {
	return { ...publicPhoto(photo), filename: photo.filename, published: photo.published, createdAt: photo.createdAt };
}

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

	if (Array.isArray(body.tags)) {
		const tags = cleanTags(body.tags.map(String));
		if (tags.length === 0) return json({ error: 'Choose at least one category.' }, 400);
		const nextPositions = {};
		for (const tag of tags) {
			nextPositions[tag] = photo.tags.includes(tag) ? photo.positions[tag] : nextPosition(manifest, tag);
		}
		photo.tags = tags;
		photo.positions = nextPositions;
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
	await writeManifest(env.MEDIA_BUCKET, manifest);
	await env.MEDIA_BUCKET.delete(photo.key);
	return json({ ok: true });
}
