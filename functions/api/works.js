import { json } from '../_lib/config.js';
import { publicPhoto, readManifest } from '../_lib/storage.js';

export async function onRequestGet({ env }) {
	if (!env.MEDIA_BUCKET) return json({ configured: false, photos: [] });

	const manifest = await readManifest(env.MEDIA_BUCKET);
	return json({
		configured: true,
		updatedAt: manifest.updatedAt,
		photos: manifest.photos.filter((photo) => photo.published).map(publicPhoto),
	});
}
