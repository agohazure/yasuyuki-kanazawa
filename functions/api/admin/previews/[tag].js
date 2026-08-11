import { requireAdmin } from '../../../_lib/auth.js';
import { isTag, json, sameOrigin } from '../../../_lib/config.js';
import { readManifest, writeManifest } from '../../../_lib/storage.js';

export async function onRequestDelete({ request, env, params }) {
	if (!sameOrigin(request)) return json({ error: 'Invalid request origin.' }, 403);
	const denied = await requireAdmin(request, env);
	if (denied) return denied;
	if (!env.MEDIA_BUCKET) return json({ error: 'Photo storage is not configured.' }, 503);
	if (!isTag(params.tag)) return json({ error: 'Preview series not found.' }, 404);

	const manifest = await readManifest(env.MEDIA_BUCKET);
	manifest.settings.hiddenFallbacks = [...new Set([...manifest.settings.hiddenFallbacks, params.tag])];
	await writeManifest(env.MEDIA_BUCKET, manifest);
	return json({ ok: true });
}
