import net from 'net';
import { EventEmitter } from 'events';

/**
 * Universal BUTT (Broadcast Using This Tool) Detection & Telemetry Service
 * Monitors local BUTT streaming encoder via TCP control port 1256.
 */
export class BUTTService extends EventEmitter {
    constructor(options = {}) {
        super();
        this.port = options.port || 1256;
        this.host = options.host || '127.0.0.1';
        this.isOnline = false;
        this.checkInterval = options.checkInterval || 5000;
        this.timer = null;
        this.isStarted = false;
        this.consecutiveFailures = 0;
    }

    start() {
        if (this.isStarted) return;
        this.isStarted = true;
        this.check();
        this.timer = setInterval(() => this.check(), this.checkInterval);
    }

    check() {
        if (!this.isStarted) return;
        const socket = new net.Socket();
        socket.setTimeout(2000);

        let isEnded = false;
        const safeClose = () => {
            if (isEnded) return;
            isEnded = true;
            try { socket.end(); } catch (e) {}
            setTimeout(() => {
                try { socket.destroy(); } catch (e) {}
            }, 500);
        };

        socket.on('connect', () => {
            this.consecutiveFailures = 0;
            if (!this.isOnline) {
                this.isOnline = true;
                console.log(`[BUTT Service] 📻 Connected to BUTT Broadcast Tool on port ${this.port}`);
                this.emit('status', this.getStatus());
            }
            safeClose();
        });

        socket.on('timeout', () => {
            safeClose();
            this.handleOffline();
        });

        socket.on('error', () => {
            safeClose();
            this.handleOffline();
        });

        try {
            socket.connect(this.port, this.host);
        } catch (err) {
            safeClose();
            this.handleOffline();
        }
    }

    handleOffline() {
        this.consecutiveFailures++;
        if (this.consecutiveFailures >= 3 && this.isOnline) {
            this.isOnline = false;
            console.log('[BUTT Service] 🔌 BUTT disconnected');
            this.emit('status', this.getStatus());
        }
    }

    getStatus() {
        return {
            online: this.isOnline,
            connected: this.isOnline,
            port: this.port,
            version: this.isOnline ? 'BUTT Broadcast Tool (Active)' : 'Offline'
        };
    }

    stop() {
        this.isStarted = false;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.isOnline = false;
    }
}
