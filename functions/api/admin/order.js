import { requireAdmin } from '../../_lib/auth.js';
import { isTag, json, sameOrigin } from '../../_lib/config.js';
import { readManifest, writeManifest } from '../../_lib/storage.js';

export async function onRequestPost({ request, env }) {
	if (!sameOrigin(request)) return json({ error: 'Invalid request origin.' }, 403);
	const denied = await requireAdmin(request, env);
	if (denied) return denied;
	if (!env.MEDIA_BUCKET) return json({ error: 'Photo storage is not configured.' }, 503);

	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request.' }, 400);
	}

	if (!isTag(body.tag) || !Array.isArray(body.ids)) return json({ error: 'Invalid order.' }, 400);
	const manifest = await readManifest(env.MEDIA_BUCKET);
	const photos = manifest.photos.filter((photo) => photo.tags.includes(body.tag));
	const validIds = new Set(photos.map((photo) => photo.id));
	const orderedIds = [...new Set(body.ids.map(String).filter((id) => validIds.has(id)))];
	for (const photo of photos) {
		if (!orderedIds.includes(photo.id)) orderedIds.push(photo.id);
	}
	orderedIds.forEach((id, index) => {
		const photo = manifest.photos.find((item) => item.id === id);
		if (photo) photo.positions[body.tag] = index;
	});

	await writeManifest(env.MEDIA_BUCKET, manifest);
	return json({ ok: true });
}
