import { MANIFEST_KEY, TAGS, isTag } from './config.js';

function emptyManifest() {
	return {
		version: 1,
		updatedAt: new Date().toISOString(),
		photos: [],
	};
}

function normalizePhoto(photo) {
	if (!photo || typeof photo !== 'object' || typeof photo.id !== 'string' || typeof photo.key !== 'string') return null;
	const tags = Array.isArray(photo.tags) ? [...new Set(photo.tags.filter(isTag))] : [];
	const positions = {};
	for (const tag of tags) {
		const position = Number(photo.positions?.[tag]);
		positions[tag] = Number.isFinite(position) ? position : Number.MAX_SAFE_INTEGER;
	}

	return {
		id: photo.id,
		key: photo.key,
		filename: typeof photo.filename === 'string' ? photo.filename : '',
		title: typeof photo.title === 'string' ? photo.title : '',
		alt: typeof photo.alt === 'string' ? photo.alt : 'Photograph by Yasuyuki Kanazawa',
		contentType: typeof photo.contentType === 'string' ? photo.contentType : 'image/webp',
		width: Number(photo.width) || 1,
		height: Number(photo.height) || 1,
		aspect: ['portrait', 'landscape', 'square'].includes(photo.aspect) ? photo.aspect : 'landscape',
		published: photo.published !== false,
		tags,
		positions,
		createdAt: typeof photo.createdAt === 'string' ? photo.createdAt : new Date().toISOString(),
	};
}

export async function readManifest(bucket) {
	const object = await bucket.get(MANIFEST_KEY);
	if (!object) return emptyManifest();

	try {
		const parsed = JSON.parse(await object.text());
		return {
			version: 1,
			updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
			photos: Array.isArray(parsed.photos) ? parsed.photos.map(normalizePhoto).filter(Boolean) : [],
		};
	} catch {
		throw new Error('The portfolio manifest could not be read.');
	}
}

export async function writeManifest(bucket, manifest) {
	manifest.updatedAt = new Date().toISOString();
	await bucket.put(MANIFEST_KEY, JSON.stringify(manifest), {
		httpMetadata: { contentType: 'application/json; charset=utf-8' },
	});
	return manifest;
}

export function nextPosition(manifest, tag) {
	let highest = -1;
	for (const photo of manifest.photos) {
		if (photo.tags.includes(tag)) highest = Math.max(highest, Number(photo.positions[tag]) || 0);
	}
	return highest + 1;
}

export function cleanTags(values) {
	return [...new Set(values.filter(isTag))];
}

export function publicPhoto(photo) {
	return {
		id: photo.id,
		title: photo.title,
		alt: photo.alt,
		image: `/media/${photo.id}`,
		width: photo.width,
		height: photo.height,
		aspect: photo.aspect,
		tags: photo.tags,
		positions: photo.positions,
	};
}

export function sortByTag(photos, tag) {
	return [...photos].sort((left, right) => {
		const positionDifference = (left.positions[tag] ?? Number.MAX_SAFE_INTEGER) - (right.positions[tag] ?? Number.MAX_SAFE_INTEGER);
		if (positionDifference !== 0) return positionDifference;
		return left.createdAt.localeCompare(right.createdAt);
	});
}

export function aspectFromDimensions(width, height) {
	const ratio = width / height;
	if (ratio > 1.08) return 'landscape';
	if (ratio < 0.92) return 'portrait';
	return 'square';
}

export { TAGS };
