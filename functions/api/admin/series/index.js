import { requireAdmin } from '../../../_lib/auth.js';
import { json, sameOrigin } from '../../../_lib/config.js';
import { adminSeries, cleanTags, nextPosition, readManifest, writeManifest } from '../../../_lib/storage.js';

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

	const title = typeof body.title === 'string' ? body.title.trim().slice(0, 120) : '';
	const tags = Array.isArray(body.tags) ? cleanTags(body.tags.map(String)) : [];
	if (!title) return json({ error: '案件名・テーマ名を入力してください。' }, 400);
	if (tags.length === 0) return json({ error: 'カテゴリーを1つ以上選択してください。' }, 400);

	const manifest = await readManifest(env.MEDIA_BUCKET);
	const item = {
		id: crypto.randomUUID(),
		title,
		published: true,
		tags,
		positions: Object.fromEntries(tags.map((tag) => [tag, nextPosition(manifest, tag)])),
		photoIds: [],
		createdAt: new Date().toISOString(),
	};
	manifest.series.push(item);
	await writeManifest(env.MEDIA_BUCKET, manifest);
	return json({ series: adminSeries(item) }, 201);
}
