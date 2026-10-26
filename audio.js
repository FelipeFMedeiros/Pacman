// Audio Manager utilizando Web Audio API (100% nativo, sem arquivos externos)
class AudioManager {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.wakaAlt = false;
        this.lastWakaTime = 0;
        this.sirenOsc = null;
        this.sirenGain = null;
        this.sirenTimer = null;
    }

    // Inicializa o contexto de áudio após interação do usuário (exigência dos navegadores)
    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.stopPowerPelletSiren();
        }
        return this.isMuted;
    }

    // Som clássico de mastigar pastilha (Waka-waka)
    playWaka() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        if (now - this.lastWakaTime < 0.12) return;
        this.lastWakaTime = now;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        const freq = this.wakaAlt ? 330 : 250;
        this.wakaAlt = !this.wakaAlt;

        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + 0.1);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.1);
    }

    // Sirene / pulso de pastilha especial ativa
    startPowerPelletSiren() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx || this.sirenTimer) return;

        let high = false;
        this.sirenTimer = setInterval(() => {
            if (this.isMuted || !this.ctx) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            const f = high ? 240 : 180;
            high = !high;

            osc.frequency.setValueAtTime(f, now);
            osc.frequency.linearRampToValueAtTime(f + 30, now + 0.14);

            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.005, now + 0.14);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.14);
        }, 160);
    }

    stopPowerPelletSiren() {
        if (this.sirenTimer) {
            clearInterval(this.sirenTimer);
            this.sirenTimer = null;
        }
    }

    // Som de devorar um fantasma
    playEatGhost() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const freqs = [350, 480, 650, 880];
        freqs.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const t = now + idx * 0.06;

            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, t);

            gain.gain.setValueAtTime(0.18, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(t);
            osc.stop(t + 0.08);
        });
    }

    // Som de derrota / morte do Pacman
    playDeath() {
        if (this.isMuted) return;
        this.stopPowerPelletSiren();
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [
            440, 415, 392, 370,
            349, 330, 311, 293,
            277, 261, 246, 220, 196
        ];

        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const t = now + idx * 0.07;

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t);

            gain.gain.setValueAtTime(0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.065);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(t);
            osc.stop(t + 0.065);
        });
    }

    // Fanfarra de vitória
    playVictory() {
        if (this.isMuted) return;
        this.stopPowerPelletSiren();
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const melody = [
            { f: 261.63, d: 0.12 }, // C4
            { f: 329.63, d: 0.12 }, // E4
            { f: 392.00, d: 0.12 }, // G4
            { f: 523.25, d: 0.25 }, // C5
            { f: 392.00, d: 0.12 }, // G4
            { f: 523.25, d: 0.40 }  // C5
        ];

        let offset = 0;
        melody.forEach(note => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const t = now + offset;

            osc.type = 'square';
            osc.frequency.setValueAtTime(note.f, t);

            gain.gain.setValueAtTime(0.18, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + note.d);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(t);
            osc.stop(t + note.d);

            offset += note.d + 0.03;
        });
    }

    // Som de navegação no menu
    playMenuMove() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(480, now);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.04);
    }

    // Som de seleção / confirmação
    playMenuSelect() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.09);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.09);
    }
}

const audio = new AudioManager();
