import { recognizeBytes } from 'shazamio-core';
import crypto from 'crypto';
import { searchAlbumArt } from './artwork-service.js';

/**
 * Creates a standard 16-bit PCM WAV buffer.
 */
export function createWavBuffer(sampleRate, numChannels, bitsPerSample, samples) {
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataLength = samples.length * (bitsPerSample / 8);
    const buffer = Buffer.alloc(44 + dataLength);

    // RIFF chunk
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataLength, 4);
    buffer.write('WAVE', 8);

    // fmt chunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20); // PCM
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitsPerSample, 34);

    // data chunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataLength, 40);

    for (let i = 0; i < samples.length; i++) {
        buffer.writeInt16LE(samples[i], 44 + i * 2);
    }
    return buffer;
}

/**
 * Recognize song metadata from raw audio samples or WAV buffer using Shazam.
 * @param {Buffer|Int16Array|Array|string} audioInput - WAV buffer, PCM samples array, or Shazam signature URI.
 * @returns {Promise<{success: boolean, match?: object, message?: string}>}
 */
export async function recognizeAudio(audioInput) {
    try {
        let signatureUri = null;
        let samplems = 4000;

        if (typeof audioInput === 'string' && audioInput.startsWith('data:audio/vnd.shazam.sig')) {
            signatureUri = audioInput;
        } else if (Buffer.isBuffer(audioInput)) {
            // Check if buffer is WAV or raw PCM
            let wavBuf = audioInput;
            if (audioInput.length > 4 && audioInput.toString('ascii', 0, 4) !== 'RIFF') {
                // Wrap raw 16-bit 16kHz PCM buffer in WAV header
                const int16Samples = new Int16Array(audioInput.buffer, audioInput.byteOffset, audioInput.length / 2);
                wavBuf = createWavBuffer(16000, 1, 16, int16Samples);
            }
            const sigs = recognizeBytes(wavBuf);
            if (sigs && sigs.length > 0) {
                signatureUri = sigs[0].uri;
                samplems = sigs[0].samplems || 4000;
            }
        } else if (Array.isArray(audioInput) || audioInput instanceof Int16Array) {
            const wavBuf = createWavBuffer(16000, 1, 16, audioInput);
            const sigs = recognizeBytes(wavBuf);
            if (sigs && sigs.length > 0) {
                signatureUri = sigs[0].uri;
                samplems = sigs[0].samplems || 4000;
            }
        }

        if (!signatureUri) {
            return {
                success: false,
                message: 'Could not generate acoustic signature. Please check audio level and retry.'
            };
        }

        const uuid1 = crypto.randomUUID().toUpperCase();
        const uuid2 = crypto.randomUUID().toUpperCase();
        const url = `https://amp.shazam.com/discovery/v5/en-US/GB/iphone/-/tag/${uuid1}/${uuid2}?sync=true&webv3=true&sampling=true&connected=&shazamapiversion=v3&sharehub=true&hubv5minorversion=v5.1&hidelb=`;

        const payload = {
            timezone: 'Europe/London',
            signatures: [
                {
                    samplems: Math.round(samplems),
                    timestamp: Date.now(),
                    uri: signatureUri
                }
            ]
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Shazam/15.0.0 (iPhone; iOS 17.0; Scale/3.00)'
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            return {
                success: false,
                message: `Shazam service returned HTTP ${res.status}`
            };
        }

        const data = await res.json();
        if (data.track) {
            const title = data.track.title || 'Unknown Title';
            const artist = data.track.subtitle || 'Unknown Artist';
            let coverart = data.track.images?.coverart || data.track.images?.background || '';
            const genre = data.track.genres?.primary || '';
            const album = data.track.sections?.flatMap(s => s.metadata || []).find(m => m.title?.toLowerCase() === 'album')?.text || '';

            // If Shazam has no album art, automatically query Apple Music / iTunes / Deezer for high-res 600x600 artwork
            if (!coverart && title && artist) {
                try {
                    const artResult = await searchAlbumArt(title, artist);
                    if (artResult && artResult.coverart) {
                        coverart = artResult.coverart;
                    }
                } catch (e) {}
            }

            return {
                success: true,
                match: {
                    title,
                    artist,
                    coverart,
                    genre,
                    album,
                    key: data.track.key || '',
                    shazamUrl: data.track.url || ''
                }
            };
        }

        return {
            success: false,
            message: 'No match found in Shazam database. Try letting the drop or main hook play.'
        };
    } catch (err) {
        console.error('[Shazam Service Error]', err);
        return {
            success: false,
            message: err.message || 'Error communicating with Shazam recognition service.'
        };
    }
}
