const fs = require('fs');
const vm = require('vm');

const testCode = `
console.log('=== TEST: COMPREHENSIVE POWER PELLET CHAIN & TIMING RE-ENTRY ===');

selectedMapIndex = 0; // Classic
selectedDifficultyIndex = 1; // Normal
startNewGame();

// Run until ghosts leave the house
for (let f = 0; f < 100; f++) update();

// SCENARIO 1: Eating Pellet #2 while Ghost 0 is REVIVING
console.log('1. Testing Pellet #2 eaten while Ghost 0 is REVIVING...');
triggerPowerPellet();
assert(powerPelletActive === true, 'Power Pellet 1 active');

const g0 = ghosts[0];
assert(g0.state === GHOST_STATE_FRIGHTENED, 'Ghost 0 is frightened');
g0.getEaten();
assert(g0.state === GHOST_STATE_EATEN, 'Ghost 0 is eaten');

// Ghost 0 returns to house and enters REVIVING
for (let f = 0; f < 200; f++) {
    g0.moveProcess();
    if (g0.state === GHOST_STATE_REVIVING) break;
}
assert(g0.state === GHOST_STATE_REVIVING, 'Ghost 0 reached house and is reviving');

// Trigger second pellet
triggerPowerPellet();
assert(powerPelletTimer === 7000, 'Power Pellet 2 timer reset to 7000ms');

// Ghost 0 completes reviving and exits
for (let f = 0; f < 100; f++) {
    g0.moveProcess();
    if (g0.state !== GHOST_STATE_REVIVING && g0.state !== GHOST_STATE_EXITING) break;
}
assert(g0.state === GHOST_STATE_FRIGHTENED, 'Ghost 0 must be FRIGHTENED upon exit during active Pellet 2');
console.log('Scenario 1 PASSED: Reviving ghost emerged as FRIGHTENED!');

// SCENARIO 2: Collision with EXITING ghost while Power Pellet is active
console.log('2. Testing collision with EXITING ghost while Power Pellet active...');
const g1 = ghosts[1];
g1.state = GHOST_STATE_EXITING;
g1.x = pacman.x;
g1.y = pacman.y;

const prevScore = score;
const collided = pacman.checkGhostCollision();
assert(collided === g1, 'Pacman collided with ghost 1 in EXITING state');

update(); // Should eat ghost 1 instead of killing Pacman
assert(lives === 3, 'Pacman must NOT lose life when touching ghost during active pellet');
assert(score > prevScore, 'Score must increase from eating ghost');
assert(g1.state === GHOST_STATE_EATEN, 'Ghost 1 must transition to EATEN state');
console.log('Scenario 2 PASSED: Exiting ghost successfully eaten by Pacman!');

// SCENARIO 3: Pellet expires, then immediate new pellet
console.log('3. Testing expiration and immediate re-trigger...');
// Advance until powerPelletTimer expires
for (let f = 0; f < 300; f++) {
    update();
    if (!powerPelletActive) break;
}
assert(powerPelletActive === false, 'Power pellet must expire');
for (let g of ghosts) {
    if (g.state !== GHOST_STATE_EATEN && g.state !== GHOST_STATE_REVIVING && g.state !== GHOST_STATE_IN_HOUSE && g.state !== GHOST_STATE_EXITING) {
        assert(g.state !== GHOST_STATE_FRIGHTENED, 'All roaming ghosts must return to normal when timer expires');
    }
}

// Immediate new pellet
triggerPowerPellet();
assert(powerPelletActive === true, 'Pellet reactivated');
for (let g of ghosts) {
    if (g.state !== GHOST_STATE_EATEN && g.state !== GHOST_STATE_REVIVING && g.state !== GHOST_STATE_IN_HOUSE && g.state !== GHOST_STATE_EXITING) {
        assert(g.state === GHOST_STATE_FRIGHTENED, 'All roaming ghosts must be FRIGHTENED when pellet reactivates');
    }
}
console.log('Scenario 3 PASSED: Expiration and immediate re-trigger synchronized flawlessly!');

console.log('ALL POWER PELLET CHAIN SCENARIOS PASSED!');
`;

const setupCode = `
global.window = {
    addEventListener: () => {},
    removeEventListener: () => {}
};
global.addEventListener = global.window.addEventListener;
global.document = {
    getElementById: (id) => ({
        getContext: () => ({
            save: () => {},
            restore: () => {},
            translate: () => {},
            rotate: () => {},
            drawImage: () => {},
            fillRect: () => {},
            strokeRect: () => {},
            fillText: () => {},
            beginPath: () => {},
            arc: () => {},
            fill: () => {},
            stroke: () => {},
            measureText: () => ({ width: 60 })
        }),
        addEventListener: () => {}
    })
};
global.Image = class { constructor() {} };
global.Audio = class {
    constructor() { this.volume = 1; }
    play() { return Promise.resolve(); }
    pause() {}
};
global.audio = {
    stopPowerPelletSiren: () => {},
    startPowerPelletSiren: () => {},
    playWaka: () => {},
    playDeath: () => {},
    playEatGhost: () => {}
};
global.localStorage = {
    getItem: () => null,
    setItem: () => {}
};
function assert(cond, msg) {
    if (!cond) {
        console.error('ASSERTION FAILED:', msg);
        process.exit(1);
    }
}
`;

const fullScript = [
    setupCode,
    fs.readFileSync('maps.js', 'utf8').replace(/^(const|let)\s+/gm, 'var '),
    fs.readFileSync('pacman.js', 'utf8').replace(/^(const|let)\s+/gm, 'var '),
    fs.readFileSync('ghost.js', 'utf8').replace(/^(const|let)\s+/gm, 'var '),
    fs.readFileSync('game.js', 'utf8').replace(/^(const|let)\s+/gm, 'var '),
    testCode,
    'clearInterval(gameInterval); process.exit(0);'
].join('\n;\n');

vm.runInThisContext(fullScript);
