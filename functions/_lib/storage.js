import { MANIFEST_KEY, TAGS, isTag } from './config.js';

function emptyManifest() {
	return {
		version: 2,
		updatedAt: new Date().toISOString(),
		settings: { hiddenFallbacks: [] },
		series: [],
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
		seriesId: typeof photo.seriesId === 'string' ? photo.seriesId : '',
		sequence: Number.isFinite(Number(photo.sequence)) ? Number(photo.sequence) : Number.MAX_SAFE_INTEGER,
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

function normalizeSeries(series) {
	if (!series || typeof series !== 'object' || typeof series.id !== 'string') return null;
	const tags = Array.isArray(series.tags) ? [...new Set(series.tags.filter(isTag))] : [];
	const positions = {};
	for (const tag of tags) {
		const position = Number(series.positions?.[tag]);
		positions[tag] = Number.isFinite(position) ? position : Number.MAX_SAFE_INTEGER;
	}

	return {
		id: series.id,
		title: typeof series.title === 'string' ? series.title : '',
		published: series.published !== false,
		tags,
		positions,
		photoIds: Array.isArray(series.photoIds) ? [...new Set(series.photoIds.map(String))] : [],
		createdAt: typeof series.createdAt === 'string' ? series.createdAt : new Date().toISOString(),
	};
}

function upgradeManifest(parsed) {
	const photos = Array.isArray(parsed.photos) ? parsed.photos.map(normalizePhoto).filter(Boolean) : [];
	const series = Array.isArray(parsed.series) ? parsed.series.map(normalizeSeries).filter(Boolean) : [];
	const photosById = new Map(photos.map((photo) => [photo.id, photo]));
	const seriesById = new Map(series.map((item) => [item.id, item]));

	for (const photo of photos) {
		let parent = photo.seriesId ? seriesById.get(photo.seriesId) : null;
		if (!parent) {
			const id = `series-${photo.id}`;
			parent = {
				id,
				title: photo.title,
				published: photo.published,
				tags: [...photo.tags],
				positions: { ...photo.positions },
				photoIds: [photo.id],
				createdAt: photo.createdAt,
			};
			series.push(parent);
			seriesById.set(id, parent);
		}
		photo.seriesId = parent.id;
		if (!parent.photoIds.includes(photo.id)) parent.photoIds.push(photo.id);
	}

	for (const parent of series) {
		parent.photoIds = parent.photoIds.filter((id) => photosById.get(id)?.seriesId === parent.id);
		parent.photoIds.forEach((id, index) => {
			const photo = photosById.get(id);
			if (photo) photo.sequence = index;
		});
	}

	return {
		version: 2,
		updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
		settings: {
			hiddenFallbacks: Array.isArray(parsed.settings?.hiddenFallbacks)
				? [...new Set(parsed.settings.hiddenFallbacks.filter(isTag))]
				: [],
		},
		series,
		photos,
	};
}

export async function readManifest(bucket) {
	const object = await bucket.get(MANIFEST_KEY);
	if (!object) return emptyManifest();

	try {
		return upgradeManifest(JSON.parse(await object.text()));
	} catch {
		throw new Error('The portfolio manifest could not be read.');
	}
}

export async function writeManifest(bucket, manifest) {
	manifest.version = 2;
	manifest.updatedAt = new Date().toISOString();
	await bucket.put(MANIFEST_KEY, JSON.stringify(manifest), {
		httpMetadata: { contentType: 'application/json; charset=utf-8' },
	});
	return manifest;
}

export function nextPosition(manifest, tag) {
	let highest = -1;
	for (const item of manifest.series) {
		if (item.tags.includes(tag)) highest = Math.max(highest, Number(item.positions[tag]) || 0);
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
	};
}

export function adminPhoto(photo) {
	return {
		...publicPhoto(photo),
		seriesId: photo.seriesId,
		sequence: photo.sequence,
		filename: photo.filename,
		published: photo.published,
		createdAt: photo.createdAt,
	};
}

export function publicSeries(item, manifest) {
	const photosById = new Map(manifest.photos.map((photo) => [photo.id, photo]));
	return {
		id: item.id,
		title: item.title,
		tags: item.tags,
		positions: item.positions,
		photos: item.photoIds.map((id) => photosById.get(id)).filter((photo) => photo?.published).map(publicPhoto),
	};
}

export function adminSeries(item) {
	return {
		id: item.id,
		title: item.title,
		published: item.published,
		tags: item.tags,
		positions: item.positions,
		photoIds: item.photoIds,
		createdAt: item.createdAt,
	};
}

export function sortByTag(items, tag) {
	return [...items].sort((left, right) => {
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
