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
     * Generate a crisp rectangular Denon Engine OS 3-Band Waveform + Beat Grid data URL
     * Colors: Blue (Bass/Low), Green (Mid), White (High/Treble) + Beat Grid ticks
     */
    generateDenonWaveformDataUrl(samples = null, bpm = 126, durationSec = 240, titleSeed = '') {
        try {
            if (typeof document === 'undefined') return '';
            const width = 148;
            const height = 34;
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return '';

            // 1. Matte dark Denon Engine OS waveform background
            ctx.fillStyle = '#07090e';
            ctx.fillRect(0, 0, width, height);

            // 2. Beat Grid & Phrase Grid Lines (every bar / 4 beats, brighter every 16-bar phrase)
            const validBpm = (Number(bpm) > 40 && Number(bpm) < 240) ? Number(bpm) : 126;
            const validDur = (Number(durationSec) > 15) ? Number(durationSec) : 210;
            const totalBeats = Math.max(16, (validDur / 60) * validBpm);
            const totalBars = Math.max(4, Math.floor(totalBeats / 4));
            const barStep = Math.max(1, Math.floor(totalBars / 18));

            for (let bar = 0; bar <= totalBars; bar += barStep) {
                const x = Math.round((bar / totalBars) * (width - 4)) + 2;
                const isPhrase = (bar % (barStep * 4) === 0);
                ctx.fillStyle = isPhrase ? 'rgba(255, 255, 255, 0.26)' : 'rgba(255, 255, 255, 0.09)';
                ctx.fillRect(x, 0, 1, height);
                if (isPhrase) {
                    // Red/white downbeat tick marker at top & bottom like Denon Engine OS beat grid
                    ctx.fillStyle = bar === 0 ? '#ff3355' : 'rgba(255, 255, 255, 0.55)';
                    ctx.fillRect(x, 0, 2, 3);
                    ctx.fillRect(x, height - 3, 2, 3);
                }
            }

            // Center zero-crossing axis line
            const midY = Math.floor(height / 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
            ctx.fillRect(0, midY, width, 1);

            // 3. Render 3-Band Denon Waveform Columns (Blue = Low, Green = Mid, White = High)
            const hasRealSamples = samples && samples.length >= 60;
            const numSlices = hasRealSamples ? Math.floor(samples.length / 3) : 0;

            // Deterministic hash seed for clean fallback when pre-analyzed DB samples haven't arrived yet
            let hash = 2166136261;
            const seedStr = String(titleSeed || 'denon_track');
            for (let i = 0; i < seedStr.length; i++) {
                hash ^= seedStr.charCodeAt(i);
                hash = Math.imul(hash, 16777619);
            }

            const maxHalfH = (height / 2) - 2;

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
                    // Structured DJ arrangement envelope (intro -> body -> breakdown -> drop -> outro)
                    let env = 0.82;
                    if (normX < 0.08) env = 0.25 + (normX / 0.08) * 0.55;
                    else if (normX > 0.42 && normX < 0.56) env = 0.32 + Math.sin(((normX - 0.42) / 0.14) * Math.PI) * 0.18;
                    else if (normX > 0.88) env = Math.max(0.18, 1.0 - ((normX - 0.88) / 0.12) * 0.75);

                    const p1 = Math.sin(normX * 47.0 + (hash & 0xff)) * 0.5 + 0.5;
                    const p2 = Math.cos(normX * 113.0 + ((hash >> 8) & 0xff)) * 0.5 + 0.5;
                    const p3 = Math.sin(normX * 29.0 + ((hash >> 16) & 0xff)) * 0.5 + 0.5;

                    low = Math.min(1.0, (0.48 + p1 * 0.48) * env);
                    mid = Math.min(1.0, (0.32 + p2 * 0.45) * env);
                    high = Math.min(1.0, (0.16 + p3 * 0.38) * env);
                }

                const hLow = Math.max(1, Math.round(Math.max(low, mid * 0.85, high * 0.7) * maxHalfH));
                const hMid = Math.max(1, Math.round(Math.min(hLow, Math.max(mid, high * 0.75) * maxHalfH * 0.74)));
                const hHigh = Math.max(1, Math.round(Math.min(hMid, high * maxHalfH * 0.45)));

                // Outer layer: Denon Deep/Electric Blue (Bass / Lows)
                ctx.fillStyle = '#0068ff';
                ctx.fillRect(x, midY - hLow, 1, hLow * 2);

                // Middle layer: Denon Emerald Green (Mids)
                if (hMid > 0) {
                    ctx.fillStyle = '#00e676';
                    ctx.fillRect(x, midY - hMid, 1, hMid * 2);
                }

                // Inner core: Denon Crisp White (Highs / Transients)
                if (hHigh > 0) {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(x, midY - hHigh, 1, hHigh * 2);
                }
            }

            // Subtle outer border
            ctx.strokeStyle = 'rgba(0, 140, 255, 0.35)';
            ctx.lineWidth = 1;
            ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

            return canvas.toDataURL('image/png');
        } catch (e) {
            return '';
        }
    }

    formatTrackLength(seconds) {
        const s = Math.round(Number(seconds) || 0);
        if (s <= 0) return '—:—';
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
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
                if (trk.waveformThumb && (!matchTarget.waveformThumb || trk.hasRealWaveform)) {
                    matchTarget.waveformThumb = trk.waveformThumb;
                    matchTarget.hasRealWaveform = Boolean(trk.hasRealWaveform);
                }
            } else {
                if (!trk.waveformThumb) {
                    trk.waveformThumb = this.generateDenonWaveformDataUrl(null, trk.bpm, trk.duration, `${trk.artist}_${trk.title}`);
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
            hasRealWaveform: hasRealSamples
        };

        this.tracks.push(newTrack);
        this.logEvent('track_play', `Deck ${d}: "${newTrack.title}" by ${newTrack.artist} (${newTrack.bpm} BPM, Key: ${newTrack.key})`);

        this.saveToStorage();
        this.notify();
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
