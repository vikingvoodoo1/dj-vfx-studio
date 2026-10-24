// =========================================================================
// DJ SESSION TRACKER & PERFORMANCE METRICS SERVICE
// Tracks chronological tracklists, timestamps, deck handovers, set duration,
// BPM trends, audio headroom peaks, and session history export.
// =========================================================================

const STORAGE_KEY_HISTORY = 'dj_vfx_session_history';
const STORAGE_KEY_ACTIVE = 'dj_vfx_session_active';

export class SessionTracker {
    constructor() {
        this.isRecording = false;
        this.sessionStartTime = null;
        this.sessionDurationSec = 0;
        this.timerInterval = null;
        this.listeners = new Set();

        this.tracks = [];
        this.events = [];
        this.peakDbFS = -99.0;
        this.handoverCount = 0;
        this.lastTrackPerDeck = { 1: '', 2: '', 3: '', 4: '' };

        this.loadFromStorage();
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

    loadFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed.tracks)) this.tracks = parsed.tracks;
                if (Array.isArray(parsed.events)) this.events = parsed.events;
                if (typeof parsed.peakDbFS === 'number') this.peakDbFS = parsed.peakDbFS;
                if (typeof parsed.handoverCount === 'number') this.handoverCount = parsed.handoverCount;
                if (typeof parsed.sessionDurationSec === 'number') this.sessionDurationSec = parsed.sessionDurationSec;
            }
        } catch (e) {
            console.warn('[SessionTracker] Could not load stored session history:', e);
        }
    }

    saveToStorage() {
        try {
            const payload = {
                tracks: this.tracks,
                events: this.events.slice(-100), // Keep last 100 events
                peakDbFS: this.peakDbFS,
                handoverCount: this.handoverCount,
                sessionDurationSec: this.sessionDurationSec,
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
        if (this.isRecording) return;
        this.isRecording = true;
        this.sessionStartTime = Date.now() - (this.sessionDurationSec * 1000);

        this.logEvent('rec_start', `Session Recording Started at ${this.formatTime()}`);

        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            if (this.isRecording && this.sessionStartTime) {
                this.sessionDurationSec = Math.floor((Date.now() - this.sessionStartTime) / 1000);
                this.notify();
            }
        }, 1000);

        this.notify();
        this.saveToStorage();
    }

    stopRecording() {
        if (!this.isRecording) return;
        this.isRecording = false;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        this.logEvent('rec_stop', `Session Paused / Saved • Total Time: ${this.formatDuration(this.sessionDurationSec)} • ${this.tracks.length} Tracks`);
        this.notify();
        this.saveToStorage();
    }

    toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
            return false;
        } else {
            this.startRecording();
            return true;
        }
    }

    logEvent(type, text) {
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

    recordTrack(deckNum, title, artist, bpm, key, artworkUrl = '', duration = 0) {
        if (!title || title === 'No Track Loaded' || title === '—' || title.toUpperCase() === 'STANDBY' || title.toUpperCase() === 'ARMED - READY') {
            return;
        }

        const d = Number(deckNum) || 1;
        const trackSig = `${title.trim().toLowerCase()}:::${(artist || '').trim().toLowerCase()}`;

        // Prevent duplicate spam of the exact same track consecutively on the same deck
        if (this.lastTrackPerDeck[d] === trackSig) {
            return;
        }
        this.lastTrackPerDeck[d] = trackSig;

        const newTrack = {
            id: `trk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            timestamp: new Date().toISOString(),
            timeStr: this.formatTime(),
            relativeTime: `+${this.formatDuration(this.sessionDurationSec)}`,
            deck: d,
            title: title.trim(),
            artist: (artist || 'Live Performance').trim(),
            bpm: bpm ? Number(bpm).toFixed(1) : '--.-',
            key: key || '—',
            artwork: artworkUrl || '',
            duration: duration || 0
        };

        this.tracks.push(newTrack);
        this.logEvent('track_play', `Deck ${d}: "${newTrack.title}" by ${newTrack.artist} (${newTrack.bpm} BPM, ${newTrack.key})`);

        this.saveToStorage();
        this.notify();
    }

    recordHandover(fromDeck, toDeck, faderPct) {
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
        if (this.isRecording) {
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
            lines.push(`${num}. [${t.timeStr}] [D${t.deck}] ${t.artist} - ${t.title} (${t.bpm} BPM, Key: ${t.key})`);
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
            isRecording: this.isRecording,
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
