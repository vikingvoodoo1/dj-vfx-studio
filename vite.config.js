import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';
import { recognizeAudio } from './server/shazam-service.js';

function apiHandlerPlugin() {
    return {
        name: 'api-handlers',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

                // 1. Shazam Live Audio Recognition Endpoint
                if (url.pathname === '/api/shazam') {
                    if (req.method === 'OPTIONS') {
                        res.setHeader('Access-Control-Allow-Origin', '*');
                        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
                        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
                        res.statusCode = 204;
                        res.end();
                        return;
                    }
                    if (req.method === 'POST') {
                        const chunks = [];
                        req.on('data', chunk => chunks.push(chunk));
                        req.on('end', async () => {
                            try {
                                const bodyBuf = Buffer.concat(chunks);
                                const contentType = req.headers['content-type'] || '';
                                let audioInput = null;

                                if (contentType.includes('application/json')) {
                                    const json = JSON.parse(bodyBuf.toString('utf8'));
                                    if (json.audioBase64) {
                                        audioInput = Buffer.from(json.audioBase64, 'base64');
                                    } else if (json.signatureUri) {
                                        audioInput = json.signatureUri;
                                    } else if (json.samples && Array.isArray(json.samples)) {
                                        audioInput = json.samples;
                                    }
                                } else {
                                    audioInput = bodyBuf;
                                }

                                const result = await recognizeAudio(audioInput);
                                res.setHeader('Content-Type', 'application/json');
                                res.setHeader('Access-Control-Allow-Origin', '*');
                                res.statusCode = 200;
                                res.end(JSON.stringify(result));
                            } catch (err) {
                                console.error('[Shazam API Error]', err);
                                res.setHeader('Content-Type', 'application/json');
                                res.setHeader('Access-Control-Allow-Origin', '*');
                                res.statusCode = 500;
                                res.end(JSON.stringify({ success: false, message: err.message || 'Internal Server Error' }));
                            }
                        });
                        return;
                    }
                }

                // 2. Media List Scanner Endpoint
                if (url.pathname === '/api/media-list') {
                    const root = process.cwd();
                    const validExtensions = ['.mp4', '.webm', '.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp'];
                    const excludeFiles = ['.ds_store', 'philipshuelogo.png', 'engine-dj-logo.png'];

                    function scanFolder(folderRelPath, urlPrefix) {
                        const fullPath = path.resolve(root, folderRelPath);
                        const results = [];
                        if (fs.existsSync(fullPath)) {
                            try {
                                const files = fs.readdirSync(fullPath);
                                for (const file of files) {
                                    if (file.startsWith('.') || excludeFiles.includes(file.toLowerCase())) continue;
                                    const ext = path.extname(file).toLowerCase();
                                    if (!validExtensions.includes(ext)) continue;
                                    const isVideo = ext === '.mp4' || ext === '.webm';
                                    const title = path.basename(file, ext);
                                    results.push({
                                        url: `${urlPrefix}/${file}`,
                                        title: title,
                                        isVideo: isVideo,
                                        filename: file,
                                        sub: isVideo ? 'Video' : 'Logo'
                                    });
                                }
                            } catch (e) {
                                console.error('[Media Scanner Error]', e);
                            }
                        }
                        return results;
                    }

                    // Scan DJ logos (public/images/logo and images/logo)
                    const djMap = new Map();
                    scanFolder('public/images/logo', '/images/logo').forEach(item => djMap.set(item.url, item));
                    scanFolder('images/logo', '/images/logo').forEach(item => {
                        if (!djMap.has(item.url)) djMap.set(item.url, item);
                    });

                    // Scan Station logos (public/images/station_logos and images/station logos)
                    const stationMap = new Map();
                    scanFolder('public/images/station_logos', '/images/station_logos').forEach(item => stationMap.set(item.url, item));
                    scanFolder('images/station logos', '/images/station_logos').forEach(item => {
                        if (!stationMap.has(item.url)) stationMap.set(item.url, item);
                    });

                    const data = {
                        dj_logos: Array.from(djMap.values()),
                        station_logos: Array.from(stationMap.values())
                    };

                    res.setHeader('Content-Type', 'application/json');
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.end(JSON.stringify(data));
                    return;
                }
                next();
            });
        }
    };
}

export default defineConfig({
    plugins: [apiHandlerPlugin()],
    server: {
        port: 5173,
        host: true
    }
});
