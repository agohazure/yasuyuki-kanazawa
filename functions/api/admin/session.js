import { authIsConfigured, isAuthenticated } from '../../_lib/auth.js';
import { json } from '../../_lib/config.js';

export async function onRequestGet({ request, env }) {
	return json({
		authenticated: await isAuthenticated(request, env),
		authConfigured: authIsConfigured(env),
		storageConfigured: Boolean(env.MEDIA_BUCKET),
	});
}
