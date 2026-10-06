import { recognizeBytes } from 'shazamio-core';
import crypto from 'crypto';

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
            }
        } else if (Array.isArray(audioInput) || audioInput instanceof Int16Array) {
            const wavBuf = createWavBuffer(16000, 1, 16, audioInput);
            const sigs = recognizeBytes(wavBuf);
            if (sigs && sigs.length > 0) {
                signatureUri = sigs[0].uri;
            }
        }

        if (!signatureUri) {
            return {
                success: false,
                message: 'Could not generate acoustic signature. Please check audio level and retry.'
            };
        }

        const uuid1 = crypto.randomUUID();
        const uuid2 = crypto.randomUUID();
        const url = `https://amp.shazam.com/discovery/v5/en-US/GB/iphone/-/tag/${uuid1}/${uuid2}?sync=true&webv3=true&sampling=true&shazamapiversion=v3&hubv5minorversion=v5.1`;

        const payload = {
            timezone: 'Europe/London',
            signatures: [
                {
                    samplems: 4000,
                    timestamp: Date.now(),
                    uri: signatureUri
                }
            ]
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
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
            const album = data.track.sections?.flatMap(s => s.metadata || []).find(m => m.title?.toLowerCase() === 'album')?.text || '';
            return {
                success: true,
                match: {
                    title: data.track.title || 'Unknown Title',
                    artist: data.track.subtitle || 'Unknown Artist',
                    coverart: data.track.images?.coverart || data.track.images?.background || '',
                    genre: data.track.genres?.primary || '',
                    album: album,
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
