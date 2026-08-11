import { json } from '../_lib/config.js';
import { publicPhoto, publicSeries, readManifest } from '../_lib/storage.js';

export async function onRequestGet({ env }) {
	if (!env.MEDIA_BUCKET) return json({ configured: false, photos: [] });

	const manifest = await readManifest(env.MEDIA_BUCKET);
	const series = manifest.series
		.filter((item) => item.published)
		.map((item) => publicSeries(item, manifest))
		.filter((item) => item.photos.length > 0);
	return json({
		configured: true,
		updatedAt: manifest.updatedAt,
		series,
		photos: manifest.photos.filter((photo) => photo.published).map(publicPhoto),
	});
}
