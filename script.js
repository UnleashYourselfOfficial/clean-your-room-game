const gameContainer = document.getElementById('game-container');
const backgroundLayer = document.getElementById('background-layer');
const timerUi = document.getElementById('timer-ui');
const timerText = document.getElementById('timer-text');
const objectsContainer = document.getElementById('objects-container');
const sparklesContainer = document.getElementById('sparkles-container');
const overlayStart = document.getElementById('overlay-start');
const overlaySuccess = document.getElementById('overlay-success');
const overlayPartial = document.getElementById('overlay-partial');
const successGlow = document.getElementById('success-glow');
const startButton = document.getElementById('start-button');

const sounds = {
    bg: new Audio('assets/bg.mp3'),
    start: new Audio('assets/start.mp3'),
    success: new Audio('assets/result.mp3'),
    knock: new Audio('assets/door-knock.mp3'),
    tap: new Audio('assets/tap.mp3') // optional if you have it
};

// setup
sounds.bg.loop = true;
sounds.start.volume = 0.1;
sounds.bg.volume = 0.2;
sounds.success.volume = 0.04;

Object.values(sounds).forEach(sound => {
    sound.preload = 'auto';
});

let gameState = 'START';
let timeLeft = 20;
let cleanedCount = 0;
let timerInterval = null;
let objects = [
    { id: '1', type: 'clothes', x: '70%', y: '46%', cleaned: false, animating: false, folded: false },
    { id: '2', type: 'books', x: '20%', y: '48%', cleaned: false, animating: false, stacked: false },
    { id: '3', type: 'toys', x: '25%', y: '72%', cleaned: false, animating: false, stored: false },
    { id: '4', type: 'wrappers', x: '90%', y: '70%', cleaned: false, animating: false },
];
const totalObjects = objects.length;


function init() {
    updateBackground();
    startAmbientSparkles();
    // renderObjects();
    objectsContainer.innerHTML = '';
    startButton.addEventListener('click', startGame);
}

function startAmbientSparkles() {
    setInterval(() => {
        if (gameState !== 'START') return;

        const rect = gameContainer.getBoundingClientRect();

        const x = Math.random() * rect.width;
        const y = Math.random() * rect.height;

        for (let i = 0; i < 3; i++) {
            createSparkle(x, y);
        }
    }, 500);
}

function updateBackground() {
    let bgUrl = '';
    switch (gameState) {
        case 'START':
            bgUrl = "url('assets/start-bg.png')";
            backgroundLayer.style.filter = 'none';
            backgroundLayer.style.backdropFilter = 'blur(3px)';
            break;
        case 'SUCCESS':
            bgUrl = "url('assets/end-bg.png')";
            backgroundLayer.style.filter = 'none';
            break;
        case 'PARTIAL':
            bgUrl = "url('assets/room-bg.png')";
            backgroundLayer.style.filter = 'brightness(0.5) grayscale(0.5)';
            break;
        default:
            bgUrl = "url('assets/room-bg.png')";
            backgroundLayer.style.filter = 'none';
    }
    backgroundLayer.style.backgroundImage = bgUrl;
}

function renderObjects() {
    objectsContainer.innerHTML = '';
    objects.forEach(obj => {
        if (!obj.cleaned) {
            const el = document.createElement('div');
            if (obj.type === 'clothes' && obj.folded) {
                el.className = 'game-object folded-clothes';

            } else if (obj.type === 'books' && obj.stacked) {
                el.className = 'game-object stacked-books';

            } else if (obj.type === 'toys' && obj.stored) {
                el.className = 'game-object cleaned-toys';
            } else {
                el.className = `game-object ${obj.animating ? getAnimationClass(obj.type) : 'animate-float'}`;

                // ✅ NOW add start size AFTER className
                if (obj.type === 'books' && !obj.stacked) {
                    el.classList.add('books-start');
                }
            }
            el.style.left = obj.x;
            el.style.top = obj.y;

            const img = document.createElement('img');
            if (obj.type === 'clothes' && obj.folded) {
                img.src = 'assets/clothes-fold-4.png';

            } else if (obj.type === 'books' && obj.stacked) {
                img.src = 'assets/books-clean-5.png';

            } else if (obj.type === 'toys' && obj.stored) {
                img.src = 'assets/toys-clean-6.png';
            }
            else {
                img.src = `assets/${obj.type}-messy.png`;
            }
            img.alt = obj.type;
            img.onerror = () => { img.src = 'https://picsum.photos/seed/toy/200'; };

            el.appendChild(img);

            // Only clickable if NOT folded clothes
            if (
                !(obj.type === 'clothes' && obj.folded) &&
                !(obj.type === 'books' && (obj.animating || obj.stacked)) &&
                !(obj.type === 'toys' && obj.stored)
            ) {
                el.addEventListener('mousedown', (e) => handleTap(obj.id, e));
                el.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    handleTap(obj.id, e);
                });
            }

            objectsContainer.appendChild(el);
        }
    });
}

function getAnimationClass(type) {
    switch (type) {
        case 'clothes': return 'animate-clothes-fold';
        case 'books': return 'animate-book-shuffle';
        case 'toys': return 'animate-toy-jump';
        case 'wrappers': return 'animate-wrapper-crumple';
        default: return '';
    }
}

function startGame() {
    gameState = 'PLAYING';
    playSound('start');   // ✅ new
    sounds.bg.play();     // ✅ background music
    overlayStart.classList.add('hidden');
    timerUi.classList.remove('hidden');
    updateBackground();
    renderObjects();
    startTimer();
}

function startTimer() {
    timeLeft = 10;
    updateTimerText();
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerText();
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            checkGameOver();
        }
    }, 1000);
}

function updateTimerText() {
    timerText.innerText = `⏱️ ${timeLeft}s`;
}

function handleTap(id, e) {
    if (gameState !== 'PLAYING') return;

    const obj = objects.find(o => o.id === id);
    if (!obj || obj.cleaned || obj.animating) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    createSparkle(clientX, clientY);
    playSound('tap');

    obj.animating = true;
    // cleanedCount++;
    renderObjects();

    // 🔥 SPRITE SWAP LOGIC (clothes + books)
    if (obj.type === 'clothes' || obj.type === 'books' || obj.type === 'toys') {
        const el = objectsContainer.querySelector(`[style*="${obj.x}"][style*="${obj.y}"] img`);

        if (el) {
            let frames = [];

            if (obj.type === 'clothes') {
                frames = [
                    'assets/clothes-fold-1.png',
                    'assets/clothes-fold-2.png',
                    'assets/clothes-fold-3.png',
                    'assets/clothes-fold-4.png'
                ];
            }

            if (obj.type === 'books') {
                frames = [
                    'assets/books-clean-1.png',
                    'assets/books-clean-2.png',
                    'assets/books-clean-3.png',
                    'assets/books-clean-4.png',
                    'assets/books-clean-5.png'
                ];
            }

            if (obj.type === 'toys') {
                frames = [
                    'assets/toys-clean-1.png',
                    'assets/toys-clean-2.png',
                    'assets/toys-clean-3.png',
                    'assets/toys-clean-4.png',
                    'assets/toys-clean-5.png',
                    'assets/toys-clean-6.png'
                ];
            }

            let i = 0;
            const interval = setInterval(() => {
                el.src = frames[i];
                i++;
                if (i >= frames.length) {
                    clearInterval(interval);
                }
            }, 120); // slightly faster than clothes = feels snappy
        }
    }

    setTimeout(() => {
        if (obj.type === 'clothes') {
            obj.animating = false;
            obj.folded = true;

            obj.x = '72%';
            obj.y = '52%';

            // keep final folded frame
            const el = objectsContainer.querySelector(`[style*="${obj.x}"][style*="${obj.y}"] img`);
            if (el) {
                el.src = 'assets/clothes-fold-4.png';
            }

        }

        else if (obj.type === 'books') {
            obj.animating = false;
            obj.stacked = true;

            obj.x = '25%';
            obj.y = '50%';
        }

        else if (obj.type === 'toys') {
            obj.animating = false;

            // move into box position (tweak if needed)
            obj.x = '32%';
            obj.y = '68%';

            obj.stored = true;

            // keep final frame
            const el = objectsContainer.querySelector(`[style*="${obj.x}"][style*="${obj.y}"] img`);
            if (el) {
                el.src = 'assets/toys-clean-6.png';
            }
        }
        else {
            obj.cleaned = true;
        }

         cleanedCount++;

        renderObjects();

        if (cleanedCount === totalObjects) {
            clearInterval(timerInterval);
            setTimeout(() => setGameState('SUCCESS'), 600);
        }
    }, 800);
}

function setGameState(state) {
    gameState = state;

    // ✅ ALWAYS hide timer on end
    timerUi.classList.add('hidden');


    updateBackground();

    if (state === 'SUCCESS') {
        sounds.bg.pause();   // ✅ add this
        objectsContainer.innerHTML = ''; // 🔥 CLEAR ALL OBJECTS
        overlaySuccess.classList.remove('hidden');
        successGlow.classList.remove('hidden');
        playSound('success');
        
    } else if (state === 'PARTIAL') {
        sounds.bg.pause();
        objectsContainer.innerHTML = ''; // 🔥 CLEAR HERE TOO
        overlayPartial.classList.remove('hidden');
        playSound('knock');
    }
}

function checkGameOver() {
    if (objects.every(o => o.cleaned)) {
        setGameState('SUCCESS');
    } else {
        setGameState('PARTIAL');
    }
}

function createSparkle(x, y) {
    const sparkle = document.createElement('div');
    sparkle.className = 'sparkle';

    // random spread
    const offsetX = (Math.random() - 0.5) * 30;
    const offsetY = (Math.random() - 0.5) * 20;

    sparkle.style.left = `${x + offsetX}px`;
    sparkle.style.top = `${y + offsetY}px`;

    sparkle.style.setProperty('--rand-x', Math.random());

    // random size
    const size = 8 + Math.random() * 8;
    sparkle.style.width = `${size}px`;
    sparkle.style.height = `${size}px`;

    // random duration
    sparkle.style.animationDuration = `${0.8 + Math.random() * 0.6}s`;

    sparklesContainer.appendChild(sparkle);

    setTimeout(() => {
        sparkle.remove();
    }, 1200);
}

function playSound(type) {
    if (!sounds[type]) return;

    sounds[type].currentTime = 0;
    sounds[type].play().catch(() => {});
}
init();
