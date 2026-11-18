document.addEventListener('DOMContentLoaded', () => {
    // =========================================================
    // 1. ASSETS & DOM REFERENCES
    // =========================================================
    const assets = {
        bg: {
            male: "1354758.png", // Direct local asset
            female: "https://i.redd.it/crwnrm9q6jl51.jpg"
        }
    };

    const onboardingScreen = document.getElementById('onboarding-screen');
    const studyRoom = document.getElementById('study-room');
    const maleScene = document.getElementById('male-scene');
    const femaleScene = document.getElementById('female-scene');
    const genderRadios = document.querySelectorAll('input[name="gender"]');
    const userNameInput = document.getElementById('user-name');
    const displayName = document.getElementById('display-name');

    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const zenBtn = document.getElementById('zen-btn');
    const profileBtn = document.getElementById('profile-btn');

    const bgMusic = document.getElementById('bg-music');
    const playPauseBtn = document.getElementById('play-pause');
    const prevBtn = document.getElementById('prev-track');
    const nextBtn = document.getElementById('next-track');
    const muteBtn = document.getElementById('mute-btn');
    const trackNameEl = document.getElementById('track-name');
    const trackArtistEl = document.getElementById('track-artist');
    const volumeSlider = document.getElementById('volume-slider');
    const rainToggleBtn = document.getElementById('rain-toggle');
    const rainVolumeSlider = document.getElementById('rain-volume');
    const rainCanvas = document.getElementById('rain-canvas');

    // =========================================================
    // 2. SCENE SWITCHER & ONBOARDING
    // =========================================================
    function setScene(gender) {
        if (gender === 'female') {
            maleScene.classList.remove('active-scene');
            femaleScene.classList.add('active-scene');
        } else {
            femaleScene.classList.remove('active-scene');
            maleScene.classList.add('active-scene');
        }
    }

    function updateOnboardingBg() {
        const selectedGender = document.querySelector('input[name="gender"]:checked').value;
        onboardingScreen.style.backgroundImage = `url('${assets.bg[selectedGender]}')`;
    }

    genderRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            setScene(e.target.value);
            updateOnboardingBg();
        });
    });
    updateOnboardingBg(); // Initialize background immediately

    function enterRoom(name, gender) {
        setScene(gender);
        displayName.textContent = name;
        onboardingScreen.classList.remove('active');
        setTimeout(() => studyRoom.classList.remove('hidden'), 250);
        loadTasks();
        updateTrackDisplay();
    }

    document.getElementById('start-btn').addEventListener('click', () => {
        const name = userNameInput.value.trim();
        const gender = document.querySelector('input[name="gender"]:checked').value;
        if (!name) {
            userNameInput.focus();
            userNameInput.placeholder = "Please enter your name...";
            return;
        }
        localStorage.setItem('focus_userName', name);
        localStorage.setItem('focus_userGender', gender);
        enterRoom(name, gender);
    });

    userNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('start-btn').click();
    });

    profileBtn.addEventListener('click', () => {
        const currentName = localStorage.getItem('focus_userName') || '';
        const currentGender = localStorage.getItem('focus_userGender') || 'male';
        userNameInput.value = currentName;
        const radio = document.querySelector(`input[name="gender"][value="${currentGender}"]`);
        if (radio) radio.checked = true;
        setScene(currentGender);
        updateOnboardingBg();
        studyRoom.classList.add('hidden');
        onboardingScreen.classList.add('active');
    });

    // =========================================================
    // 3. FULLSCREEN & ZEN MODE
    // =========================================================
    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    });

    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
            fullscreenBtn.textContent = '⛶';
            fullscreenBtn.title = "Maximize (Esc to exit)";
        } else {
            fullscreenBtn.textContent = '🗗';
            fullscreenBtn.title = "Exit Fullscreen (or press Esc)";
        }
    });

    let zenMode = false;
    zenBtn.addEventListener('click', () => {
        zenMode = !zenMode;
        document.querySelectorAll('.widget, .nameplate, .floating-tools').forEach(el => {
            // Keep the zen button itself visible so you can exit zen mode
            if (el.classList.contains('floating-tools')) {
                el.children[0].style.opacity = zenMode ? '0' : '1';
                el.children[0].style.pointerEvents = zenMode ? 'none' : 'auto';
                el.children[2].style.opacity = zenMode ? '0' : '1';
                el.children[2].style.pointerEvents = zenMode ? 'none' : 'auto';
                return;
            }
            el.style.opacity = zenMode ? '0' : '1';
            el.style.pointerEvents = zenMode ? 'none' : 'auto';
        });
        zenBtn.textContent = zenMode ? '👁️' : '🧘';
        zenBtn.title = zenMode ? 'Exit Zen Mode' : 'Toggle Zen Mode';
    });

    // =========================================================
    // 4. TABS & LIVE LOCAL CLOCK
    // =========================================================
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active-tab'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.target).classList.add('active-tab');
        });
    });

    function updateClock() {
        const now = new Date();
        document.getElementById('current-time').textContent =
            now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        document.getElementById('current-date').textContent =
            now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
    }
    setInterval(updateClock, 1000);
    updateClock();

    // =========================================================
    // 5. WEB AUDIO ENGINE (CHIMES, SYNTH TRACKS & RAIN)
    // =========================================================
    let audioCtx = null;
    let musicGain = null;
    let synthBus = null;

    function ensureAudioCtx() {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContextClass();

            musicGain = audioCtx.createGain();
            musicGain.gain.value = isMuted ? 0 : parseFloat(volumeSlider.value);
            musicGain.connect(audioCtx.destination);

            synthBus = audioCtx.createGain();
            synthBus.gain.value = 0.85;

            const masterLP = audioCtx.createBiquadFilter();
            masterLP.type = 'lowpass';
            masterLP.frequency.value = 1400;

            const delay = audioCtx.createDelay();
            delay.delayTime.value = 0.36;
            const delayFeedback = audioCtx.createGain();
            delayFeedback.gain.value = 0.28;
            const delayLP = audioCtx.createBiquadFilter();
            delayLP.type = 'lowpass';
            delayLP.frequency.value = 950;
            const wetGain = audioCtx.createGain();
            wetGain.gain.value = 0.35;

            synthBus.connect(masterLP);
            masterLP.connect(musicGain);

            masterLP.connect(delay);
            delay.connect(delayLP);
            delayLP.connect(delayFeedback);
            delayFeedback.connect(delay);
            delayLP.connect(wetGain);
            wetGain.connect(musicGain);
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    function playZenChime() {
        ensureAudioCtx();
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        const now = audioCtx.currentTime;
        notes.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.18);

            gain.gain.setValueAtTime(0.001, now + i * 0.18);
            gain.gain.linearRampToValueAtTime(0.14, now + i * 0.18 + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.0008, now + i * 0.18 + 2.2);

            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now + i * 0.18);
            osc.stop(now + i * 0.18 + 2.3);
        });
    }

    // =========================================================
    // 6. POMODORO & CUSTOM TIMER
    // =========================================================
    let focusMinutes = 25;
    let breakMinutes = 5;
    let isBreakMode = false;
    let pomoTimeLeft = focusMinutes * 60;
    let pomoInterval = null;

    const pomoDisplay = document.getElementById('pomodoro-display');
    const pomoBadge = document.getElementById('pomo-mode-badge');

    function updatePomoUI() {
        const mins = Math.floor(pomoTimeLeft / 60);
        const secs = pomoTimeLeft % 60;
        pomoDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        pomoBadge.textContent = isBreakMode ? 'BREAK TIME' : 'FOCUS SESSION';
        pomoBadge.className = isBreakMode ? 'mode-badge break-badge' : 'mode-badge focus-badge';
    }

    function stopPomo() {
        if (pomoInterval) {
            clearInterval(pomoInterval);
            pomoInterval = null;
        }
    }

    document.getElementById('pomo-start').addEventListener('click', () => {
        ensureAudioCtx();
        stopPomo();
        pomoInterval = setInterval(() => {
            if (pomoTimeLeft > 0) {
                pomoTimeLeft--;
                updatePomoUI();
            } else {
                stopPomo();
                playZenChime();
                isBreakMode = !isBreakMode;
                pomoTimeLeft = (isBreakMode ? breakMinutes : focusMinutes) * 60;
                updatePomoUI();
            }
        }, 1000);
    });

    document.getElementById('pomo-pause').addEventListener('click', stopPomo);

    document.getElementById('pomo-reset').addEventListener('click', () => {
        stopPomo();
        pomoTimeLeft = (isBreakMode ? breakMinutes : focusMinutes) * 60;
        updatePomoUI();
    });

    document.getElementById('pomo-switch-mode').addEventListener('click', () => {
        stopPomo();
        isBreakMode = !isBreakMode;
        pomoTimeLeft = (isBreakMode ? breakMinutes : focusMinutes) * 60;
        updatePomoUI();
    });

    const presetBtns = document.querySelectorAll('.pomo-preset');
    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            stopPomo();
            presetBtns.forEach(b => b.classList.remove('active-preset'));
            btn.classList.add('active-preset');
            focusMinutes = parseInt(btn.dataset.focus, 10);
            breakMinutes = parseInt(btn.dataset.break, 10);
            isBreakMode = false;
            pomoTimeLeft = focusMinutes * 60;
            updatePomoUI();
        });
    });

    document.getElementById('set-custom-time').addEventListener('click', () => {
        const fVal = parseInt(document.getElementById('custom-focus-input').value, 10);
        const bVal = parseInt(document.getElementById('custom-break-input').value, 10);
        if (fVal > 0) {
            stopPomo();
            presetBtns.forEach(b => b.classList.remove('active-preset'));
            focusMinutes = fVal;
            if (bVal > 0) breakMinutes = bVal;
            isBreakMode = false;
            pomoTimeLeft = focusMinutes * 60;
            updatePomoUI();
        }
    });

    // =========================================================
    // 7. STOPWATCH ENGINE
    // =========================================================
    let swInterval = null;
    let swSeconds = 0;
    const swDisplay = document.getElementById('stopwatch-display');

    function updateSwUI() {
        const hrs = Math.floor(swSeconds / 3600);
        const mins = Math.floor((swSeconds % 3600) / 60);
        const secs = swSeconds % 60;
        swDisplay.textContent =
            `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    document.getElementById('sw-start').addEventListener('click', () => {
        if (swInterval) return;
        swInterval = setInterval(() => {
            swSeconds++;
            updateSwUI();
        }, 1000);
    });

    document.getElementById('sw-pause').addEventListener('click', () => {
        clearInterval(swInterval);
        swInterval = null;
    });

    document.getElementById('sw-reset').addEventListener('click', () => {
        clearInterval(swInterval);
        swInterval = null;
        swSeconds = 0;
        updateSwUI();
    });

    // =========================================================
    // 8. TASK MANAGER
    // =========================================================
    const taskInput = document.getElementById('new-task-input');
    const taskList = document.getElementById('task-list');

    function getTasks() {
        try {
            const raw = JSON.parse(localStorage.getItem('focus_tasks')) || [];
            return raw.map(t => (typeof t === 'string' ? { text: t, done: false } : t));
        } catch {
            return [];
        }
    }

    function saveTasks(tasks) {
        localStorage.setItem('focus_tasks', JSON.stringify(tasks));
    }

    function loadTasks() {
        const tasks = getTasks();
        taskList.innerHTML = '';
        tasks.forEach((task, index) => {
            const li = document.createElement('li');
            const span = document.createElement('span');
            span.className = 'task-text' + (task.done ? ' done' : '');
            span.textContent = task.text;
            span.dataset.index = index;

            const delBtn = document.createElement('button');
            delBtn.className = 'task-delete';
            delBtn.textContent = '✖';
            delBtn.dataset.index = index;

            li.appendChild(span);
            li.appendChild(delBtn);
            taskList.appendChild(li);
        });
    }

    function addTask() {
        const text = taskInput.value.trim();
        if (!text) return;
        const tasks = getTasks();
        tasks.push({ text, done: false });
        saveTasks(tasks);
        taskInput.value = '';
        loadTasks();
    }

    document.getElementById('add-task-btn').addEventListener('click', addTask);
    taskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addTask();
    });

    taskList.addEventListener('click', (e) => {
        const idx = e.target.dataset.index;
        if (idx === undefined) return;
        const tasks = getTasks();
        if (e.target.classList.contains('task-delete')) {
            tasks.splice(idx, 1);
            saveTasks(tasks);
            loadTasks();
        } else if (e.target.classList.contains('task-text')) {
            tasks[idx].done = !tasks[idx].done;
            saveTasks(tasks);
            loadTasks();
        }
    });

    // =========================================================
    // 9. HYBRID MUSIC PLAYER
    // =========================================================
    const playlist = [
        {
            name: "Midnight Study",
            artist: "Lofi Beats",
            type: "mp3",
            url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3"
        },
        {
            name: "Tokyo Rainy Keys",
            artist: "Procedural Lofi Rhodes",
            type: "rhodes"
        },
        {
            name: "Starlight Drift",
            artist: "Ambient Synth Pad",
            type: "pad"
        },
        {
            name: "Kyoto Night Bells",
            artist: "Pentatonic Study Plucks",
            type: "bells"
        },
        {
            name: "Deep Focus Waves",
            artist: "Warm Brown Noise",
            type: "brown"
        }
    ];

    let currentTrackIndex = 0;
    let isPlaying = false;
    let isMuted = false;
    let synthInterval = null;
    let activeSynthNodes = [];

    function updateTrackDisplay() {
        const track = playlist[currentTrackIndex];
        trackNameEl.textContent = track.name;
        trackArtistEl.textContent = track.artist;
    }

    function stopSynth() {
        if (synthInterval) {
            clearInterval(synthInterval);
            synthInterval = null;
        }
        activeSynthNodes.forEach(node => {
            try { node.stop(); } catch {}
            try { node.disconnect(); } catch {}
        });
        activeSynthNodes = [];
    }

    function stopAllMusic() {
        bgMusic.pause();
        stopSynth();
    }

    function playSoftTone(freq, duration, peakGain, waveType = 'triangle', attack = 0.05, delayStart = 0) {
        if (!audioCtx || !synthBus) return;
        const start = audioCtx.currentTime + delayStart;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = waveType;
        osc.frequency.setValueAtTime(freq, start);
        osc.detune.setValueAtTime((Math.random() - 0.5) * 8, start);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(peakGain, start + attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

        osc.connect(gain);
        gain.connect(synthBus);
        osc.start(start);
        osc.stop(start + duration + 0.05);
        activeSynthNodes.push(osc);
    }

    function startRhodesTrack() {
        const chords = [
            [146.83, 220.00, 261.63, 329.63, 392.00], 
            [196.00, 246.94, 329.63, 349.23, 440.00], 
            [130.81, 196.00, 246.94, 293.66, 329.63], 
            [110.00, 196.00, 246.94, 261.63, 329.63]  
        ];
        const melody = [523.25, 587.33, 659.25, 783.99, 880.00];
        let step = 0;

        const playBar = () => {
            const chord = chords[step % chords.length];
            chord.forEach((f, idx) => {
                playSoftTone(f, 3.2, 0.09, 'triangle', 0.06, idx * 0.045);
                playSoftTone(f * 2, 1.8, 0.015, 'sine', 0.05, idx * 0.045);
            });
            if (Math.random() > 0.25) {
                const note = melody[Math.floor(Math.random() * melody.length)];
                playSoftTone(note, 1.6, 0.045, 'sine', 0.04, 1.4);
            }
            step++;
        };

        playBar();
        synthInterval = setInterval(playBar, 3200);
    }

    function startPadTrack() {
        const chords = [
            [174.61, 220.00, 261.63, 329.63],
            [130.81, 196.00, 246.94, 329.63], 
            [110.00, 164.81, 220.00, 261.63], 
            [164.81, 196.00, 246.94, 293.66]  
        ];
        let step = 0;

        const playPad = () => {
            const chord = chords[step % chords.length];
            chord.forEach(f => {
                playSoftTone(f, 6.2, 0.065, 'sine', 1.8, 0);
                playSoftTone(f * 1.003, 6.2, 0.035, 'triangle', 2.0, 0);
            });
            step++;
        };

        playPad();
        synthInterval = setInterval(playPad, 5400);
    }

    function startBellsTrack() {
        const scale = [293.66, 349.23, 392.00, 440.00, 523.25, 587.33, 659.25];
        let tick = 0;

        const playPluck = () => {
            if (tick % 4 === 0) {
                playSoftTone(146.83, 5.5, 0.08, 'sine', 1.2, 0); 
                playSoftTone(220.00, 5.5, 0.04, 'sine', 1.4, 0); 
            }
            const note = scale[Math.floor(Math.random() * scale.length)];
            playSoftTone(note, 2.4, 0.07, 'sine', 0.02, 0);
            if (Math.random() > 0.5) {
                const harmony = scale[Math.floor(Math.random() * scale.length)];
                playSoftTone(harmony, 2.0, 0.04, 'triangle', 0.03, 0.45);
            }
            tick++;
        };

        playPluck();
        synthInterval = setInterval(playPluck, 1500);
    }

    function startBrownNoiseTrack() {
        const bufferSize = audioCtx.sampleRate * 4;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (lastOut + 0.02 * white) / 1.02;
            lastOut = data[i];
            data[i] *= 2.8;
        }

        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 380;

        const gain = audioCtx.createGain();
        gain.gain.value = 0.35;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(musicGain);
        noise.start();
        activeSynthNodes.push(noise);
    }

    function applyVolume() {
        const vol = isMuted ? 0 : parseFloat(volumeSlider.value);
        bgMusic.volume = vol;
        if (musicGain && audioCtx) {
            musicGain.gain.setTargetAtTime(vol, audioCtx.currentTime, 0.05);
        }
        muteBtn.textContent = (isMuted || vol === 0) ? '🔇' : '🔊';
    }

    function playCurrentTrack() {
        ensureAudioCtx();
        stopAllMusic();
        updateTrackDisplay();
        applyVolume();

        const track = playlist[currentTrackIndex];
        isPlaying = true;
        playPauseBtn.textContent = '⏸';

        if (track.type === 'mp3') {
            if (bgMusic.src !== track.url) bgMusic.src = track.url;
            bgMusic.loop = true;
            bgMusic.play().catch(() => {
                startRhodesTrack();
            });
        } else if (track.type === 'rhodes') {
            startRhodesTrack();
        } else if (track.type === 'pad') {
            startPadTrack();
        } else if (track.type === 'bells') {
            startBellsTrack();
        } else if (track.type === 'brown') {
            startBrownNoiseTrack();
        }
    }

    function pauseCurrentTrack() {
        stopAllMusic();
        isPlaying = false;
        playPauseBtn.textContent = '▶';
    }

    playPauseBtn.addEventListener('click', () => {
        isPlaying ? pauseCurrentTrack() : playCurrentTrack();
    });

    nextBtn.addEventListener('click', () => {
        currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
        if (isPlaying) playCurrentTrack();
        else updateTrackDisplay();
    });

    prevBtn.addEventListener('click', () => {
        currentTrackIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
        if (isPlaying) playCurrentTrack();
        else updateTrackDisplay();
    });

    volumeSlider.addEventListener('input', () => {
        if (isMuted && parseFloat(volumeSlider.value) > 0) isMuted = false;
        applyVolume();
    });

    muteBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        applyVolume();
    });

    // =========================================================
    // 10. PROCEDURAL RAIN SOUND + VISUAL CANVAS RAIN
    // =========================================================
    let isRainPlaying = false;
    let rainSource = null;
    let rainGain = null;
    let rainAnimId = null;

    function startRainAudio() {
        ensureAudioCtx();
        const bufferSize = audioCtx.sampleRate * 5;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = buffer.getChannelData(0);

        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
            b6 = white * 0.115926;
        }

        rainSource = audioCtx.createBufferSource();
        rainSource.buffer = buffer;
        rainSource.loop = true;

        const lp = audioCtx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 1150;

        const hp = audioCtx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 160;

        rainGain = audioCtx.createGain();
        rainGain.gain.value = parseFloat(rainVolumeSlider.value) * 0.85;

        rainSource.connect(hp);
        hp.connect(lp);
        lp.connect(rainGain);
        rainGain.connect(audioCtx.destination);
        rainSource.start();
    }

    function stopRainAudio() {
        if (rainSource) {
            try { rainSource.stop(); } catch {}
            try { rainSource.disconnect(); } catch {}
            rainSource = null;
        }
    }

    const ctx = rainCanvas.getContext('2d');
    let drops = [];

    function resizeRainCanvas() {
        rainCanvas.width = window.innerWidth;
        rainCanvas.height = window.innerHeight;
        drops = Array.from({ length: 130 }, () => ({
            x: Math.random() * rainCanvas.width,
            y: Math.random() * rainCanvas.height,
            len: 10 + Math.random() * 18,
            speed: 7 + Math.random() * 7,
            opacity: 0.12 + Math.random() * 0.25
        }));
    }
    window.addEventListener('resize', resizeRainCanvas);
    resizeRainCanvas();

    function drawRain() {
        ctx.clearRect(0, 0, rainCanvas.width, rainCanvas.height);
        ctx.lineWidth = 1.2;
        ctx.lineCap = 'round';
        for (const d of drops) {
            ctx.strokeStyle = `rgba(190, 215, 255, ${d.opacity})`;
            ctx.beginPath();
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(d.x - 2.5, d.y + d.len);
            ctx.stroke();

            d.x -= 1.2;
            d.y += d.speed;
            if (d.y > rainCanvas.height) {
                d.y = -d.len;
                d.x = Math.random() * (rainCanvas.width + 60);
            }
        }
        rainAnimId = requestAnimationFrame(drawRain);
    }

    rainToggleBtn.addEventListener('click', () => {
        isRainPlaying = !isRainPlaying;
        if (isRainPlaying) {
            startRainAudio();
            rainCanvas.classList.add('raining');
            if (!rainAnimId) drawRain();
            rainToggleBtn.textContent = '🌧️ Rain: ON';
            rainToggleBtn.classList.add('active');
        } else {
            stopRainAudio();
            rainCanvas.classList.remove('raining');
            if (rainAnimId) {
                cancelAnimationFrame(rainAnimId);
                rainAnimId = null;
                ctx.clearRect(0, 0, rainCanvas.width, rainCanvas.height);
            }
            rainToggleBtn.textContent = '🌧️ Rain: OFF';
            rainToggleBtn.classList.remove('active');
        }
    });

    rainVolumeSlider.addEventListener('input', (e) => {
        if (rainGain && audioCtx) {
            rainGain.gain.setTargetAtTime(parseFloat(e.target.value) * 0.85, audioCtx.currentTime, 0.05);
        }
    });

    // =========================================================
    // 11. BOOT SEQUENCE (WITH AUTO-MIGRATION FOR OLD STORAGE)
    // =========================================================
    const savedName = localStorage.getItem('focus_userName');
    let savedGender = localStorage.getItem('focus_userGender');

    if (savedGender === 'boy') {
        savedGender = 'male';
        localStorage.setItem('focus_userGender', 'male');
    } else if (savedGender === 'girl') {
        savedGender = 'female';
        localStorage.setItem('focus_userGender', 'female');
    }

    if (savedName && (savedGender === 'male' || savedGender === 'female')) {
        enterRoom(savedName, savedGender);
    } else {
        setScene('male');
    }
});
