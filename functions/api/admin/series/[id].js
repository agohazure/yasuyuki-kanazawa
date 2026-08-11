import { requireAdmin } from '../../../_lib/auth.js';
import { json, sameOrigin } from '../../../_lib/config.js';
import { adminSeries, cleanTags, nextPosition, readManifest, writeManifest } from '../../../_lib/storage.js';

async function getContext(request, env, id) {
	const denied = await requireAdmin(request, env);
	if (denied) return { denied };
	if (!env.MEDIA_BUCKET) return { denied: json({ error: 'Photo storage is not configured.' }, 503) };
	const manifest = await readManifest(env.MEDIA_BUCKET);
	const series = manifest.series.find((item) => item.id === id);
	if (!series) return { denied: json({ error: 'Series not found.' }, 404) };
	return { manifest, series };
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

	const { manifest, series } = context;
	if (typeof body.title === 'string') {
		const title = body.title.trim().slice(0, 120);
		if (!title) return json({ error: '案件名・テーマ名を入力してください。' }, 400);
		series.title = title;
	}
	if (typeof body.published === 'boolean') series.published = body.published;

	if (Array.isArray(body.tags)) {
		const tags = cleanTags(body.tags.map(String));
		if (tags.length === 0) return json({ error: 'カテゴリーを1つ以上選択してください。' }, 400);
		const positions = {};
		for (const tag of tags) positions[tag] = series.tags.includes(tag) ? series.positions[tag] : nextPosition(manifest, tag);
		series.tags = tags;
		series.positions = positions;
	}

	if (Array.isArray(body.photoIds)) {
		const validIds = new Set(manifest.photos.filter((photo) => photo.seriesId === series.id).map((photo) => photo.id));
		const photoIds = [...new Set(body.photoIds.map(String).filter((id) => validIds.has(id)))];
		for (const id of validIds) if (!photoIds.includes(id)) photoIds.push(id);
		series.photoIds = photoIds;
		series.photoIds.forEach((id, index) => {
			const photo = manifest.photos.find((item) => item.id === id);
			if (photo) photo.sequence = index;
		});
	}

	await writeManifest(env.MEDIA_BUCKET, manifest);
	return json({ series: adminSeries(series) });
}

export async function onRequestDelete({ request, env, params }) {
	if (!sameOrigin(request)) return json({ error: 'Invalid request origin.' }, 403);
	const context = await getContext(request, env, params.id);
	if (context.denied) return context.denied;

	const { manifest, series } = context;
	const photos = manifest.photos.filter((photo) => photo.seriesId === series.id);
	manifest.series = manifest.series.filter((item) => item.id !== series.id);
	manifest.photos = manifest.photos.filter((photo) => photo.seriesId !== series.id);
	await writeManifest(env.MEDIA_BUCKET, manifest);
	if (photos.length > 0) await env.MEDIA_BUCKET.delete(photos.map((photo) => photo.key));
	return json({ ok: true });
}
