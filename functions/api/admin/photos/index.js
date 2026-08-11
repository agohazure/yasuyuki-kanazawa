import { requireAdmin } from '../../../_lib/auth.js';
import { MAX_UPLOAD_BYTES, json, sameOrigin } from '../../../_lib/config.js';
import {
	TAGS,
	adminPhoto,
	adminSeries,
	aspectFromDimensions,
	readManifest,
	writeManifest,
} from '../../../_lib/storage.js';

const CONTENT_TYPES = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
	'image/avif': 'avif',
};

export async function onRequestGet({ request, env }) {
	const denied = await requireAdmin(request, env);
	if (denied) return denied;
	if (!env.MEDIA_BUCKET) return json({ error: 'Photo storage is not configured.' }, 503);

	const manifest = await readManifest(env.MEDIA_BUCKET);
	const hiddenFallbacks = new Set(manifest.settings.hiddenFallbacks);
	const previews = TAGS.filter((tag) => !hiddenFallbacks.has(tag)).map((tag) => ({
		id: `preview-${tag}`,
		title: `${tag[0].toUpperCase()}${tag.slice(1)} Preview series`,
		tag,
		photoCount: 3,
	}));
	return json({ photos: manifest.photos.map(adminPhoto), series: manifest.series.map(adminSeries), previews });
}

export async function onRequestPost({ request, env }) {
	if (!sameOrigin(request)) return json({ error: 'Invalid request origin.' }, 403);
	const denied = await requireAdmin(request, env);
	if (denied) return denied;
	if (!env.MEDIA_BUCKET) return json({ error: 'Photo storage is not configured.' }, 503);

	let form;
	try {
		form = await request.formData();
	} catch {
		return json({ error: 'Could not read the upload.' }, 400);
	}

	const file = form.get('file');
	if (!file || typeof file.arrayBuffer !== 'function') return json({ error: 'Choose an image file.' }, 400);
	if (!CONTENT_TYPES[file.type]) return json({ error: 'Use JPEG, PNG, WebP, or AVIF.' }, 415);
	if (file.size > MAX_UPLOAD_BYTES) return json({ error: 'The optimized image is too large.' }, 413);

	const seriesId = String(form.get('seriesId') || '');
	const manifest = await readManifest(env.MEDIA_BUCKET);
	const series = manifest.series.find((item) => item.id === seriesId);
	if (!series) return json({ error: 'Choose a valid series.' }, 400);

	const width = Math.max(1, Number(form.get('width')) || 1);
	const height = Math.max(1, Number(form.get('height')) || 1);
	const id = crypto.randomUUID();
	const key = `photos/${id}.${CONTENT_TYPES[file.type]}`;
	const category = series.tags[0] || 'portfolio';
	const defaultAlt = `${category[0].toUpperCase()}${category.slice(1)} photograph by Yasuyuki Kanazawa`;
	const photo = {
		id,
		key,
		seriesId: series.id,
		sequence: series.photoIds.length,
		filename: String(form.get('filename') || file.name || ''),
		title: '',
		alt: defaultAlt,
		contentType: file.type,
		width,
		height,
		aspect: aspectFromDimensions(width, height),
		published: true,
		tags: [],
		positions: {},
		createdAt: new Date().toISOString(),
	};

	await env.MEDIA_BUCKET.put(key, await file.arrayBuffer(), {
		httpMetadata: { contentType: file.type },
	});

	try {
		manifest.photos.push(photo);
		series.photoIds.push(photo.id);
		await writeManifest(env.MEDIA_BUCKET, manifest);
	} catch (error) {
		await env.MEDIA_BUCKET.delete(key);
		throw error;
	}

	return json({ photo: adminPhoto(photo), series: adminSeries(series) }, 201);
}
