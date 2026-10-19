import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { recognizeAudio } from './server/shazam-service.js';
import { searchAlbumArt } from './server/artwork-service.js';

function apiHandlerPlugin() {
    return {
        name: 'api-handlers',
        configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
                const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

                // 1. Universal Album Art Lookup Endpoint
                if (url.pathname === '/api/artwork') {
                    if (req.method === 'OPTIONS') {
                        res.setHeader('Access-Control-Allow-Origin', '*');
                        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
                        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
                        res.statusCode = 204;
                        res.end();
                        return;
                    }
                    try {
                        const title = url.searchParams.get('title') || '';
                        const artist = url.searchParams.get('artist') || '';
                        const result = await searchAlbumArt(title, artist);
                        res.setHeader('Content-Type', 'application/json');
                        res.setHeader('Access-Control-Allow-Origin', '*');
                        res.statusCode = 200;
                        res.end(JSON.stringify(result));
                    } catch (err) {
                        console.error('[Artwork API Error]', err);
                        res.setHeader('Content-Type', 'application/json');
                        res.setHeader('Access-Control-Allow-Origin', '*');
                        res.statusCode = 500;
                        res.end(JSON.stringify({ success: false, message: err.message || 'Artwork lookup failed' }));
                    }
                    return;
                }

                // 2. Shazam Live Audio Recognition Endpoint
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

                    // Scan Event Flyers & Promo Graphics (public/images/flyers and images/flyers)
                    const flyerMap = new Map();
                    scanFolder('public/images/flyers', '/images/flyers').forEach(item => flyerMap.set(item.url, item));
                    scanFolder('images/flyers', '/images/flyers').forEach(item => {
                        if (!flyerMap.has(item.url)) flyerMap.set(item.url, item);
                    });

                    const data = {
                        dj_logos: Array.from(djMap.values()),
                        station_logos: Array.from(stationMap.values()),
                        flyers: Array.from(flyerMap.values())
                    };

                    res.setHeader('Content-Type', 'application/json');
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.end(JSON.stringify(data));
                    return;
                }

                // 4. Video Loop Folder Scanning Endpoint
                if (url.pathname === '/api/videos/scan') {
                    if (req.method === 'OPTIONS') {
                        res.setHeader('Access-Control-Allow-Origin', '*');
                        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
                        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
                        res.statusCode = 204;
                        res.end();
                        return;
                    }

                    try {
                        let targetFolder = url.searchParams.get('folder') || 'public/images/videos';
                        if (targetFolder.startsWith('~')) {
                            targetFolder = path.join(os.homedir(), targetFolder.slice(1));
                        }
                        if (!path.isAbsolute(targetFolder)) {
                            targetFolder = path.resolve(process.cwd(), targetFolder);
                        }

                        const videoExts = ['.mp4', '.webm', '.mov', '.m4v', '.mkv', '.ogv'];
                        const videos = [];

                        if (fs.existsSync(targetFolder)) {
                            const files = fs.readdirSync(targetFolder);
                            for (const file of files) {
                                if (file.startsWith('.')) continue;
                                const ext = path.extname(file).toLowerCase();
                                if (videoExts.includes(ext)) {
                                    const fullPath = path.join(targetFolder, file);
                                    try {
                                        const stat = fs.statSync(fullPath);
                                        if (stat.isFile()) {
                                            videos.push({
                                                name: file,
                                                title: path.basename(file, ext).replace(/[-_]/g, ' '),
                                                path: fullPath,
                                                url: `/api/videos/stream?file=${encodeURIComponent(fullPath)}`,
                                                size: stat.size,
                                                mtime: stat.mtimeMs,
                                                included: true
                                            });
                                        }
                                    } catch (err) {}
                                }
                            }
                        }

                        res.setHeader('Content-Type', 'application/json');
                        res.setHeader('Access-Control-Allow-Origin', '*');
                        res.statusCode = 200;
                        res.end(JSON.stringify({
                            success: true,
                            folder: targetFolder,
                            count: videos.length,
                            videos
                        }));
                    } catch (err) {
                        res.setHeader('Content-Type', 'application/json');
                        res.setHeader('Access-Control-Allow-Origin', '*');
                        res.statusCode = 500;
                        res.end(JSON.stringify({ success: false, message: err.message }));
                    }
                    return;
                }

                // 4b. Native macOS Folder Picker via AppleScript
                if (url.pathname === '/api/videos/choose-folder') {
                    if (req.method === 'OPTIONS') {
                        res.setHeader('Access-Control-Allow-Origin', '*');
                        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
                        res.statusCode = 204;
                        res.end();
                        return;
                    }

                    let defaultFolder = url.searchParams.get('defaultPath') || '';
                    if (defaultFolder.startsWith('~')) {
                        defaultFolder = path.join(os.homedir(), defaultFolder.slice(1));
                    }
                    const fallback = path.join(os.homedir(), 'Documents', 'OBS jkmclaren', 'VIDEOWALL', 'LOOP VIDS');
                    const startLoc = (defaultFolder && fs.existsSync(defaultFolder)) ? defaultFolder : (fs.existsSync(fallback) ? fallback : os.homedir());

                    if (process.platform === 'darwin') {
                        const safeLoc = startLoc.replace(/"/g, '\\"');
                        const appleScript = `try\nreturn POSIX path of (choose folder with prompt "Select Video Loop Folder" default location POSIX file "${safeLoc}")\non error number -128\nreturn ""\nend try`;
                        exec(`osascript -e '${appleScript.replace(/'/g, "'\\''")}'`, (err, stdout) => {
                            res.setHeader('Content-Type', 'application/json');
                            res.setHeader('Access-Control-Allow-Origin', '*');
                            if (err) {
                                res.statusCode = 200;
                                res.end(JSON.stringify({ success: false, error: err.message }));
                                return;
                            }
                            const picked = (stdout || '').trim();
                            if (picked) {
                                res.statusCode = 200;
                                res.end(JSON.stringify({ success: true, folder: picked }));
                            } else {
                                res.statusCode = 200;
                                res.end(JSON.stringify({ success: false, cancelled: true }));
                            }
                        });
                    } else {
                        res.setHeader('Content-Type', 'application/json');
                        res.setHeader('Access-Control-Allow-Origin', '*');
                        res.statusCode = 200;
                        res.end(JSON.stringify({ success: false, message: 'Platform not supported' }));
                    }
                    return;
                }

                // 4c. Reveal Folder in macOS Finder
                if (url.pathname === '/api/videos/reveal') {
                    if (req.method === 'OPTIONS') {
                        res.setHeader('Access-Control-Allow-Origin', '*');
                        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
                        res.statusCode = 204;
                        res.end();
                        return;
                    }
                    let targetFolder = url.searchParams.get('folder') || '';
                    if (targetFolder.startsWith('~')) {
                        targetFolder = path.join(os.homedir(), targetFolder.slice(1));
                    }
                    if (targetFolder && fs.existsSync(targetFolder)) {
                        exec(`open "${targetFolder.replace(/"/g, '\\"')}"`);
                        res.setHeader('Content-Type', 'application/json');
                        res.setHeader('Access-Control-Allow-Origin', '*');
                        res.statusCode = 200;
                        res.end(JSON.stringify({ success: true, folder: targetFolder }));
                    } else {
                        res.setHeader('Content-Type', 'application/json');
                        res.setHeader('Access-Control-Allow-Origin', '*');
                        res.statusCode = 404;
                        res.end(JSON.stringify({ success: false, message: 'Folder not found' }));
                    }
                    return;
                }

                // 5. High-Performance Video Partial Range Streaming Endpoint
                if (url.pathname === '/api/videos/stream') {
                    const filePath = url.searchParams.get('file');
                    if (!filePath || !fs.existsSync(filePath)) {
                        res.setHeader('Access-Control-Allow-Origin', '*');
                        res.statusCode = 404;
                        res.end('Video file not found');
                        return;
                    }

                    try {
                        const stat = fs.statSync(filePath);
                        const fileSize = stat.size;
                        const range = req.headers.range;
                        const ext = path.extname(filePath).toLowerCase();
                        const contentType = ext === '.webm' ? 'video/webm' : (ext === '.mov' ? 'video/quicktime' : 'video/mp4');

                        if (range) {
                            const parts = range.replace(/bytes=/, "").split("-");
                            const start = parseInt(parts[0], 10);
                            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                            const chunksize = (end - start) + 1;
                            const fileStream = fs.createReadStream(filePath, { start, end });

                            res.writeHead(206, {
                                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                                'Accept-Ranges': 'bytes',
                                'Content-Length': chunksize,
                                'Content-Type': contentType,
                                'Access-Control-Allow-Origin': '*'
                            });
                            fileStream.pipe(res);
                        } else {
                            res.writeHead(200, {
                                'Content-Length': fileSize,
                                'Content-Type': contentType,
                                'Accept-Ranges': 'bytes',
                                'Access-Control-Allow-Origin': '*'
                            });
                            fs.createReadStream(filePath).pipe(res);
                        }
                    } catch (streamErr) {
                        res.setHeader('Access-Control-Allow-Origin', '*');
                        res.statusCode = 500;
                        res.end('Error streaming video: ' + streamErr.message);
                    }
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
