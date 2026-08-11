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
	const series = manifest.series.filter((item) => item.tags.includes(body.tag));
	const validIds = new Set(series.map((item) => item.id));
	const orderedIds = [...new Set(body.ids.map(String).filter((id) => validIds.has(id)))];
	for (const item of series) {
		if (!orderedIds.includes(item.id)) orderedIds.push(item.id);
	}
	orderedIds.forEach((id, index) => {
		const item = manifest.series.find((candidate) => candidate.id === id);
		if (item) item.positions[body.tag] = index;
	});

	await writeManifest(env.MEDIA_BUCKET, manifest);
	return json({ ok: true });
}
