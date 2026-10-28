// =========================================================================
// DJ SESSION TRACKER & PERFORMANCE METRICS SERVICE
// Tracks chronological tracklists, timestamps, deck handovers, set duration,
// BPM trends, audio headroom peaks, Denon 3-band beat-grid waveforms,
// configurable idle auto-standby (default 15m), and session history export.
// =========================================================================

const STORAGE_KEY_HISTORY = 'dj_vfx_session_history';
const STORAGE_KEY_CONFIG = 'dj_vfx_session_config';

export class SessionTracker {
    constructor() {
        this.isRecording = false;
        this.isPaused = false;
        this.standbyReason = '';
        this.sessionStartTime = null;
        this.sessionDurationSec = 0;
        this.timerInterval = null;
        this.listeners = new Set();

        this.autoStandbyMinutes = 15; // Default 15 minutes inactivity standby
        this.lastActivityTimestamp = Date.now();

        this.tracks = [];
        this.events = [];
        this.peakDbFS = -99.0;
        this.handoverCount = 0;
        this.lastTrackPerDeck = { 1: '', 2: '', 3: '', 4: '' };

        this.loadFromStorage();
        this.startWatchdogLoop();
        setTimeout(() => this.enrichMissingTrackMetadata(), 1200);
    }

    async enrichMissingTrackMetadata() {
        if (!Array.isArray(this.tracks) || this.tracks.length === 0) return;
        let updatedAny = false;
        for (const trk of this.tracks) {
            if (!trk || !trk.title || (trk.album && trk.duration > 0 && trk.artwork)) continue;
            if (trk._enrichedAttempted) continue;
            trk._enrichedAttempted = true;
            try {
                const cleanTitle = trk.title.replace(/\(.*?\)|\[.*?\]/g, '').trim();
                const cleanArtist = (trk.artist || '').replace(/\(.*?\)|\[.*?\]/g, '').trim();
                const query = encodeURIComponent(`${cleanArtist} ${cleanTitle}`.trim());
                const resp = await fetch(`https://itunes.apple.com/search?term=${query}&entity=song&limit=1`);
                if (resp.ok) {
                    const data = await resp.json();
                    const hit = data && data.results && data.results[0];
                    if (hit) {
                        if (!trk.album && hit.collectionName) {
                            trk.album = hit.collectionName;
                            updatedAny = true;
                        }
                        if (!trk.genre && hit.primaryGenreName) {
                            trk.genre = hit.primaryGenreName;
                            updatedAny = true;
                        }
                        if ((!trk.duration || trk.duration <= 0) && hit.trackTimeMillis) {
                            trk.duration = Math.round(hit.trackTimeMillis / 1000);
                            updatedAny = true;
                        }
                        if (!trk.artwork && hit.artworkUrl100) {
                            trk.artwork = hit.artworkUrl100.replace('100x100bb', '600x600bb');
                            updatedAny = true;
                        }
                    }
                }
            } catch (e) {
                // Ignore network errors
            }
        }
        if (updatedAny) {
            this.saveToStorage();
            this.notify();
        }
    }

    addListener(cb) {
        if (typeof cb === 'function') this.listeners.add(cb);
    }

    removeListener(cb) {
        this.listeners.delete(cb);
    }

    notify() {
        const snapshot = this.getMetrics();
        this.listeners.forEach(cb => {
            try { cb(snapshot); } catch (e) { console.error('[SessionTracker] Listener error:', e); }
        });
    }

    touchActivity() {
        this.lastActivityTimestamp = Date.now();
    }

    startWatchdogLoop() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            if (this.isRecording && !this.isPaused && this.sessionStartTime) {
                this.sessionDurationSec = Math.floor((Date.now() - this.sessionStartTime) / 1000);

                // Check configurable inactivity timeout (default 15 minutes)
                if (this.autoStandbyMinutes > 0) {
                    const idleMs = Date.now() - this.lastActivityTimestamp;
                    if (idleMs >= this.autoStandbyMinutes * 60 * 1000) {
                        this.pauseRecording(`Auto-Standby: No deck activity for ${this.autoStandbyMinutes} min`);
                        return;
                    }
                }
                this.notify();
            }
        }, 1000);
    }

    setAutoStandbyMinutes(mins) {
        const val = Number(mins);
        this.autoStandbyMinutes = isNaN(val) ? 15 : Math.max(0, Math.min(240, val));
        this.saveToStorage();
        this.notify();
    }

    getAutoStandbyMinutes() {
        return this.autoStandbyMinutes;
    }

    /**
     * Generate an authentic Denon Engine DJ Tracklist Preview Waveform + Beat Grid data URL
     * Matches the Denon Engine DJ desktop/hardware Tracklist Preview column:
     * - Bottom-anchored rising half-waveform silhouette (no fire/smoke effects)
     * - 3-Band Denon colors layered from bottom baseline up:
     *   - Bottom foundation: Denon Blue (#0062ff) + Cyan-Blue transition (#00b8ff)
     *   - Middle body: Denon Emerald/Vibrant Green (#00e050)
     *   - Upper peaks/crests: Denon Crisp White (#ffffff)
     * - Subtle 4/4 beat-grid / phrase ticks + Hot-Cue triangles (▲) along the bottom baseline
     */
    generateDenonWaveformDataUrl(samples = null, bpm = 126, durationSec = 240, titleSeed = '') {
        try {
            if (typeof document === 'undefined') return '';
            const width = 142;
            const height = 28;
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return '';

            // 1. Clean dark Denon Engine DJ row background
            ctx.fillStyle = '#14161c';
            ctx.fillRect(0, 0, width, height);

            const baseY = height - 2;
            const maxWaveH = height - 4;

            // 2. Subtle Beat-Grid & 16-Bar Phrase Grid lines behind waveform
            const validBpm = (Number(bpm) > 40 && Number(bpm) < 240) ? Number(bpm) : 126;
            const validDur = (Number(durationSec) > 15) ? Number(durationSec) : 210;
            const totalBeats = Math.max(16, (validDur / 60) * validBpm);
            const totalBars = Math.max(4, Math.floor(totalBeats / 4));
            const barStep = Math.max(1, Math.floor(totalBars / 16));

            for (let bar = 0; bar <= totalBars; bar += barStep) {
                const x = Math.round((bar / totalBars) * (width - 6)) + 3;
                const isPhrase = (bar % (barStep * 4) === 0);
                ctx.fillStyle = isPhrase ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.06)';
                ctx.fillRect(x, 1, 1, baseY - 1);
            }

            // 3. Render Bottom-Anchored 3-Band Denon Preview Waveform (Blue base -> Green mid -> White peaks)
            const hasRealSamples = samples && samples.length >= 60;
            const numSlices = hasRealSamples ? Math.floor(samples.length / 3) : 0;

            // Deterministic hash seed per track for realistic club arrangement envelope when awaiting DB samples
            let hash = 2166136261;
            const seedStr = String(titleSeed || 'denon_track');
            for (let i = 0; i < seedStr.length; i++) {
                hash ^= seedStr.charCodeAt(i);
                hash = Math.imul(hash, 16777619);
            }

            const introDropX = 0.11 + ((hash & 0x0f) / 15) * 0.07;
            const breakdownStart = 0.44 + (((hash >> 4) & 0x0f) / 15) * 0.08;
            const breakdownEnd = breakdownStart + 0.13;
            const outroStart = 0.85 + (((hash >> 8) & 0x0f) / 15) * 0.06;

            for (let x = 2; x < width - 2; x++) {
                const normX = (x - 2) / (width - 4);
                let low = 0;
                let mid = 0;
                let high = 0;

                if (hasRealSamples) {
                    const sliceIdx = Math.min(numSlices - 1, Math.floor(normX * numSlices)) * 3;
                    low = (samples[sliceIdx] || 0) / 255;
                    mid = (samples[sliceIdx + 1] || 0) / 255;
                    high = (samples[sliceIdx + 2] || 0) / 255;
                } else {
                    // Authentic House/Club track structure matching Denon Engine DJ preview silhouettes
                    let env = 0.84;
                    if (normX < introDropX) {
                        env = 0.26 + (normX / introDropX) * 0.22;
                    } else if (normX > breakdownStart && normX < breakdownEnd) {
                        const bNorm = (normX - breakdownStart) / (breakdownEnd - breakdownStart);
                        env = 0.34 + Math.sin(bNorm * Math.PI) * 0.22;
                    } else if (normX > outroStart) {
                        env = Math.max(0.16, 0.80 * (1.0 - ((normX - outroStart) / (1.0 - outroStart)) * 0.78));
                    }

                    const p1 = Math.sin(normX * 61.0 + (hash & 0xff)) * 0.5 + 0.5;
                    const p2 = Math.cos(normX * 137.0 + ((hash >> 8) & 0xff)) * 0.5 + 0.5;
                    const p3 = Math.sin(normX * 223.0 + ((hash >> 16) & 0xff)) * 0.5 + 0.5;

                    low = Math.min(1.0, (0.45 + p1 * 0.52) * env);
                    mid = Math.min(1.0, (0.38 + p2 * 0.50) * env);
                    high = Math.min(1.0, (0.25 + p3 * 0.65) * env);
                }

                // Total silhouette height from bottom baseline (baseY) upward
                const peakAmp = Math.min(1.0, Math.max(low * 0.95, mid * 0.92, high * 0.90));
                const hWhite = Math.max(2, Math.round(peakAmp * maxWaveH));
                const hGreen = Math.max(1, Math.min(hWhite - 1, Math.round(Math.max(low * 0.78, mid * 0.82) * maxWaveH * 0.78)));
                const hBlue = Math.max(1, Math.min(hGreen - 1, Math.round(low * maxWaveH * 0.42)));

                // 1) Upper Peak Silhouette: Denon Crisp White (#ffffff)
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(x, baseY - hWhite, 1, hWhite);

                // 2) Mid-Frequency Body: Denon Vibrant Green (#00e050)
                if (hGreen > 0) {
                    ctx.fillStyle = '#00e050';
                    ctx.fillRect(x, baseY - hGreen, 1, hGreen);
                }

                // 3) Cyan-Blue Blend Transition Line (#00b4ff)
                if (hBlue > 0) {
                    ctx.fillStyle = '#00b4ff';
                    ctx.fillRect(x, baseY - hBlue - 1, 1, 1);

                    // 4) Low-Frequency Foundation: Denon Deep Blue (#0058ff)
                    ctx.fillStyle = '#0058ff';
                    ctx.fillRect(x, baseY - hBlue, 1, hBlue);
                }
            }

            // 4. Crisp horizontal bottom baseline + Denon Hot-Cue triangles (▲) on baseline
            ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
            ctx.fillRect(1, baseY, width - 2, 1);

            const drawCueTriangle = (normPos, color) => {
                const cx = Math.round(3 + normPos * (width - 8));
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.moveTo(cx, baseY - 4);
                ctx.lineTo(cx - 3, baseY + 1);
                ctx.lineTo(cx + 3, baseY + 1);
                ctx.closePath();
                ctx.fill();
            };

            // Intro cue marker (Orange ▲) and Drop cue marker (Crimson/Pink ▲) just like Denon Engine DJ
            drawCueTriangle(0.03, '#ff8c1a');
            drawCueTriangle(introDropX, '#ff2a6d');

            return canvas.toDataURL('image/png');
        } catch (e) {
            return '';
        }
    }

    /**
     * Authentic Denon Engine DJ Camelot Key Color Lookup (matches Engine OS key colors)
     */
    getCamelotKeyColor(keyStr) {
        const k = String(keyStr || '').trim().toUpperCase();
        const match = k.match(/^(\d{1,2}[AB])/);
        const code = match ? match[1] : k;
        const map = {
            '1A': '#00d4b2', '1B': '#00e0c0',
            '2A': '#6be030', '2B': '#7ce840',
            '3A': '#2ecc71', '3B': '#40d880',
            '4A': '#e2c038', '4B': '#ebd048',
            '5A': '#f08c38', '5B': '#f59c48',
            '6A': '#ec6677', '6B': '#f27888',
            '7A': '#e05568', '7B': '#ea687a',
            '8A': '#d858a8', '8B': '#e268b8',
            '9A': '#9c6eff', '9B': '#ad82ff',
            '10A': '#5b8cff', '10B': '#709eff',
            '11A': '#38b6ff', '11B': '#50c2ff',
            '12A': '#2dd4bf', '12B': '#45e0cc'
        };
        return map[code] || '#9c6eff';
    }

    formatTrackLength(seconds) {
        const s = Math.round(Number(seconds) || 0);
        if (s <= 0) return '00:00';
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    getTrackSignature(title, artist) {
        return `${(title || '').trim().toLowerCase()}:::${(artist || '').trim().toLowerCase()}`;
    }

    /**
     * Deduplicate consecutive or repeated reload tracks & events and restore lastTrackPerDeck
     */
    deduplicateHistory() {
        // 1. Deduplicate tracks that have the same title + artist (merging rich metadata)
        const dedupedTracks = [];
        for (const trk of this.tracks) {
            if (!trk || !trk.title) continue;
            const sig = this.getTrackSignature(trk.title, trk.artist);
            const prev = dedupedTracks.length > 0 ? dedupedTracks[dedupedTracks.length - 1] : null;
            const prev2 = dedupedTracks.length > 1 ? dedupedTracks[dedupedTracks.length - 2] : null;

            const matchTarget = (prev && this.getTrackSignature(prev.title, prev.artist) === sig)
                ? prev
                : ((prev2 && this.getTrackSignature(prev2.title, prev2.artist) === sig) ? prev2 : null);

            if (matchTarget) {
                // Merge any richer metadata into the existing track entry
                if (trk.artwork && !matchTarget.artwork) matchTarget.artwork = trk.artwork;
                if (trk.duration && !matchTarget.duration) matchTarget.duration = trk.duration;
                if (trk.album && !matchTarget.album) matchTarget.album = trk.album;
                if (trk.genre && !matchTarget.genre) matchTarget.genre = trk.genre;
                if (trk.key && trk.key !== '—' && (!matchTarget.key || matchTarget.key === '—')) matchTarget.key = trk.key;
                if (trk.bpm && trk.bpm !== '--.-' && (!matchTarget.bpm || matchTarget.bpm === '--.-')) matchTarget.bpm = trk.bpm;
                if (trk.waveformThumb && trk.waveformVersion === 2 && (!matchTarget.waveformThumb || trk.hasRealWaveform)) {
                    matchTarget.waveformThumb = trk.waveformThumb;
                    matchTarget.waveformVersion = 2;
                    matchTarget.hasRealWaveform = Boolean(trk.hasRealWaveform);
                }
            } else {
                if (!trk.waveformThumb || trk.waveformVersion !== 2) {
                    trk.waveformThumb = this.generateDenonWaveformDataUrl(null, trk.bpm, trk.duration, `${trk.artist}_${trk.title}`);
                    trk.waveformVersion = 2;
                }
                dedupedTracks.push(trk);
            }
        }
        this.tracks = dedupedTracks;

        // Restore lastTrackPerDeck from deduplicated tracks so page reload never re-logs active deck tracks
        this.lastTrackPerDeck = { 1: '', 2: '', 3: '', 4: '' };
        for (const trk of this.tracks) {
            const d = Number(trk.deck) || 1;
            this.lastTrackPerDeck[d] = this.getTrackSignature(trk.title, trk.artist);
        }

        // 2. Deduplicate consecutive identical event texts (e.g. from reloads)
        const dedupedEvents = [];
        for (const evt of this.events) {
            if (!evt || !evt.text) continue;
            const prevEvt = dedupedEvents.length > 0 ? dedupedEvents[dedupedEvents.length - 1] : null;
            const prevEvt2 = dedupedEvents.length > 1 ? dedupedEvents[dedupedEvents.length - 2] : null;
            if ((prevEvt && prevEvt.text === evt.text) || (prevEvt2 && prevEvt2.text === evt.text && evt.type === 'track_play')) {
                continue;
            }
            dedupedEvents.push(evt);
        }
        this.events = dedupedEvents;
    }

    loadFromStorage() {
        try {
            const rawCfg = localStorage.getItem(STORAGE_KEY_CONFIG);
            if (rawCfg) {
                const cfg = JSON.parse(rawCfg);
                if (typeof cfg.autoStandbyMinutes === 'number') {
                    this.autoStandbyMinutes = cfg.autoStandbyMinutes;
                }
            }
            const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed.tracks)) this.tracks = parsed.tracks;
                if (Array.isArray(parsed.events)) this.events = parsed.events;
                if (typeof parsed.peakDbFS === 'number') this.peakDbFS = parsed.peakDbFS;
                if (typeof parsed.handoverCount === 'number') this.handoverCount = parsed.handoverCount;
                if (typeof parsed.sessionDurationSec === 'number') this.sessionDurationSec = parsed.sessionDurationSec;
                if (parsed.lastTrackPerDeck && typeof parsed.lastTrackPerDeck === 'object') {
                    this.lastTrackPerDeck = { ...this.lastTrackPerDeck, ...parsed.lastTrackPerDeck };
                }
                this.deduplicateHistory();
            }
        } catch (e) {
            console.warn('[SessionTracker] Could not load stored session history:', e);
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify({
                autoStandbyMinutes: this.autoStandbyMinutes
            }));
            const payload = {
                tracks: this.tracks,
                events: this.events.slice(-100),
                peakDbFS: this.peakDbFS,
                handoverCount: this.handoverCount,
                sessionDurationSec: this.sessionDurationSec,
                lastTrackPerDeck: this.lastTrackPerDeck,
                savedAt: new Date().toISOString()
            };
            localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(payload));
        } catch (e) {
            console.warn('[SessionTracker] Could not save session history:', e);
        }
    }

    formatTime(date = new Date()) {
        const h = date.getHours().toString().padStart(2, '0');
        const m = date.getMinutes().toString().padStart(2, '0');
        const s = date.getSeconds().toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    }

    formatDuration(seconds) {
        const s = Math.floor(seconds || 0);
        const hrs = Math.floor(s / 3600);
        const mins = Math.floor((s % 3600) / 60);
        const secs = s % 60;
        if (hrs > 0) {
            return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    startRecording() {
        this.touchActivity();
        if (this.isRecording && !this.isPaused) return;
        const wasPaused = this.isPaused;
        this.isRecording = true;
        this.isPaused = false;
        this.standbyReason = '';
        this.sessionStartTime = Date.now() - (this.sessionDurationSec * 1000);

        this.logEvent('rec_start', wasPaused
            ? `▶ Session Recording Resumed at ${this.formatTime()}`
            : `⏺ Session Recording Started at ${this.formatTime()}`
        );

        this.notify();
        this.saveToStorage();
    }

    pauseRecording(reason = 'Paused by User') {
        if (!this.isRecording || this.isPaused) return;
        this.isPaused = true;
        this.standbyReason = reason || 'Paused';
        this.logEvent('rec_pause', `⏸ ${this.standbyReason} • Elapsed: ${this.formatDuration(this.sessionDurationSec)}`);
        this.notify();
        this.saveToStorage();
    }

    stopRecording() {
        if (!this.isRecording && !this.isPaused) return;
        this.isRecording = false;
        this.isPaused = false;
        this.standbyReason = '';

        this.logEvent('rec_stop', `⏹ Session Stopped & Saved • Total Time: ${this.formatDuration(this.sessionDurationSec)} • ${this.tracks.length} Tracks`);
        this.notify();
        this.saveToStorage();
    }

    notifyDecksOffline() {
        if (this.isRecording && !this.isPaused) {
            this.pauseRecording('Standby: Hardware Decks Offline');
        }
    }

    toggleRecording() {
        if (this.isRecording && !this.isPaused) {
            this.stopRecording();
            return false;
        } else {
            this.startRecording();
            return true;
        }
    }

    logEvent(type, text) {
        // Prevent consecutive identical event entries
        const lastEvt = this.events.length > 0 ? this.events[this.events.length - 1] : null;
        if (lastEvt && lastEvt.text === text) {
            return;
        }
        const entry = {
            id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            timestamp: new Date().toISOString(),
            timeStr: this.formatTime(),
            relativeTime: `+${this.formatDuration(this.sessionDurationSec)}`,
            type,
            text
        };
        this.events.push(entry);
        if (this.events.length > 200) this.events.shift();
    }

    recordTrack(deckNum, title, artist, bpm, key, artworkUrl = '', duration = 0, extra = {}) {
        if (!title || title === 'No Track Loaded' || title === '—' || title.toUpperCase() === 'STANDBY' || title.toUpperCase() === 'ARMED - READY') {
            return;
        }

        this.touchActivity();
        const d = Number(deckNum) || 1;
        const trackSig = this.getTrackSignature(title, artist);

        // Check if this track is already the latest on this deck OR in the last 2 recorded tracks (e.g. page reload or async art/waveform enrichment)
        const existingMatch = [...this.tracks].reverse().find((t, idx) =>
            idx < 3 && this.getTrackSignature(t.title, t.artist) === trackSig
        );

        if (existingMatch) {
            let changed = false;
            if (artworkUrl && existingMatch.artwork !== artworkUrl) {
                existingMatch.artwork = artworkUrl;
                changed = true;
            }
            if (duration && Number(duration) > 0 && existingMatch.duration !== Number(duration)) {
                existingMatch.duration = Number(duration);
                changed = true;
            }
            if (key && key !== '—' && (!existingMatch.key || existingMatch.key === '—')) {
                existingMatch.key = key;
                changed = true;
            }
            if (bpm && Number(bpm) > 40 && (!existingMatch.bpm || existingMatch.bpm === '--.-')) {
                existingMatch.bpm = Number(bpm).toFixed(1);
                changed = true;
            }
            if (extra.album && !existingMatch.album) {
                existingMatch.album = extra.album;
                changed = true;
            }
            if (extra.genre && !existingMatch.genre) {
                existingMatch.genre = extra.genre;
                changed = true;
            }
            if (extra.samples && extra.samples.length >= 60 && !existingMatch.hasRealWaveform) {
                existingMatch.waveformThumb = this.generateDenonWaveformDataUrl(
                    extra.samples,
                    existingMatch.bpm,
                    existingMatch.duration || duration,
                    `${artist}_${title}`
                );
                existingMatch.waveformVersion = 2;
                existingMatch.hasRealWaveform = true;
                changed = true;
            }
            this.lastTrackPerDeck[d] = trackSig;
            if (changed) {
                this.saveToStorage();
                this.notify();
            }
            return;
        }

        // If recording is in standby/paused or stopped, remember deck signature so we don't spam events when idle,
        // or if auto-resume on new track play is desired while paused due to idle, resume cleanly:
        if (this.isPaused) {
            // Do not flag new events while paused/standby
            return;
        }

        if (this.lastTrackPerDeck[d] === trackSig) {
            return;
        }
        this.lastTrackPerDeck[d] = trackSig;

        const hasRealSamples = Boolean(extra.samples && extra.samples.length >= 60);
        const waveformThumb = this.generateDenonWaveformDataUrl(
            hasRealSamples ? extra.samples : null,
            bpm,
            duration,
            `${artist}_${title}`
        );

        const newTrack = {
            id: `trk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            timestamp: new Date().toISOString(),
            timeStr: this.formatTime(),
            relativeTime: `+${this.formatDuration(this.sessionDurationSec)}`,
            deck: d,
            title: title.trim(),
            artist: (artist || 'Live Performance').trim(),
            album: (extra.album || '').trim(),
            genre: (extra.genre || '').trim(),
            bpm: bpm ? Number(bpm).toFixed(1) : '--.-',
            key: key || '—',
            artwork: artworkUrl || '',
            duration: Number(duration) || 0,
            waveformThumb,
            waveformVersion: 2,
            hasRealWaveform: hasRealSamples
        };

        this.tracks.push(newTrack);
        this.logEvent('track_play', `Deck ${d}: "${newTrack.title}" by ${newTrack.artist} (${newTrack.bpm} BPM, Key: ${newTrack.key})`);

        this.saveToStorage();
        this.notify();
        if (!newTrack.album || !newTrack.duration) {
            setTimeout(() => this.enrichMissingTrackMetadata(), 400);
        }
    }

    recordHandover(fromDeck, toDeck, faderPct) {
        if (!fromDeck || !toDeck || fromDeck === toDeck) return;
        if (this.isPaused) return;
        this.touchActivity();
        const now = Date.now();
        if (this._lastHandoverTime && (now - this._lastHandoverTime < 3500) && this._lastHandoverFrom === fromDeck && this._lastHandoverTo === toDeck) {
            return;
        }
        this._lastHandoverTime = now;
        this._lastHandoverFrom = fromDeck;
        this._lastHandoverTo = toDeck;
        this.handoverCount++;
        const pct = Math.round((Number(faderPct) || 0) * 100);
        this.logEvent('handover', `🎚️ Deck Handover: D${fromDeck} ➔ D${toDeck} (Fader: ${pct}%)`);
        this.saveToStorage();
        this.notify();
    }

    recordAudioPeak(dbVal) {
        const val = Number(dbVal);
        if (!isNaN(val) && val > this.peakDbFS) {
            this.peakDbFS = Math.min(3.0, Math.max(-60.0, val));
        }
    }

    clearHistory() {
        this.tracks = [];
        this.events = [];
        this.handoverCount = 0;
        this.peakDbFS = -99.0;
        this.sessionDurationSec = 0;
        if (this.isRecording && !this.isPaused) {
            this.sessionStartTime = Date.now();
        } else {
            this.sessionStartTime = null;
        }
        this.lastTrackPerDeck = { 1: '', 2: '', 3: '', 4: '' };

        try {
            localStorage.removeItem(STORAGE_KEY_HISTORY);
        } catch (e) {}

        this.logEvent('clear', 'Session tracklist and event history cleared.');
        this.notify();
    }

    exportTracklistText() {
        if (this.tracks.length === 0) {
            return 'No tracks recorded in session yet.';
        }
        const lines = [
            `=========================================`,
            `🎧 DJ VFX STUDIO — LIVE SESSION TRACKLIST`,
            `Session Duration: ${this.formatDuration(this.sessionDurationSec)}`,
            `Total Tracks: ${this.tracks.length} | Handovers: ${this.handoverCount}`,
            `Avg BPM: ${this.calculateAvgBpm()} | Headroom Peak: ${this.peakDbFS > -90 ? this.peakDbFS.toFixed(1) + ' dBFS' : 'Safe'}`,
            `=========================================`,
            ``
        ];

        this.tracks.forEach((t, i) => {
            const num = (i + 1).toString().padStart(2, '0');
            const lenStr = this.formatTrackLength(t.duration);
            const albumPart = t.album ? ` | Album: ${t.album}` : '';
            const genrePart = t.genre ? ` | Genre: ${t.genre}` : '';
            lines.push(`${num}. [${t.timeStr}] [D${t.deck}] ${t.artist} - ${t.title} (${t.bpm} BPM | Key: ${t.key} | Len: ${lenStr}${albumPart}${genrePart})`);
        });

        return lines.join('\n');
    }

    calculateAvgBpm() {
        const validBpms = this.tracks
            .map(t => parseFloat(t.bpm))
            .filter(b => !isNaN(b) && b > 40 && b < 220);
        if (validBpms.length === 0) return '--.-';
        const sum = validBpms.reduce((a, b) => a + b, 0);
        return (sum / validBpms.length).toFixed(1);
    }

    getMetrics() {
        return {
            isRecording: this.isRecording && !this.isPaused,
            isPaused: this.isPaused,
            recState: this.isPaused ? 'paused' : (this.isRecording ? 'recording' : 'stopped'),
            standbyReason: this.standbyReason,
            autoStandbyMinutes: this.autoStandbyMinutes,
            sessionDurationSec: this.sessionDurationSec,
            durationFormatted: this.formatDuration(this.sessionDurationSec),
            totalTracks: this.tracks.length,
            avgBpm: this.calculateAvgBpm(),
            peakDbFS: this.peakDbFS,
            handoverCount: this.handoverCount,
            tracks: [...this.tracks],
            events: [...this.events]
        };
    }
}

export const sessionTracker = new SessionTracker();
