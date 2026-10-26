const fs = require('fs');
const vm = require('vm');

const testCode = `
console.log('=== VERIFYING PAC-MAN GAME ENGINE & GHOST AI ===');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
    totalTests++;
    if (!condition) {
        console.error('FAIL:', message);
        throw new Error(message);
    } else {
        passedTests++;
    }
}

// TEST 1: All 16 combinations (4 maps x 4 difficulties)
for (let mapIdx = 0; mapIdx < MAPS.length; mapIdx++) {
    for (let diffIdx = 0; diffIdx < DIFFICULTIES.length; diffIdx++) {
        selectedMapIndex = mapIdx;
        selectedDifficultyIndex = diffIdx;
        currentMap = MAPS[selectedMapIndex];
        startNewGame();

        const diff = DIFFICULTIES[diffIdx];
        assert(ghosts.length === diff.ghostCount, \`Map \${currentMap.id} diff \${diff.name} ghost count \${ghosts.length} === \${diff.ghostCount}\`);
        assert(isScatterPhase === true, \`Game must start in Scatter phase\`);
        assert(currentGhostGlobalMode === GHOST_STATE_SCATTER, \`Initial global mode must be scatter\`);

        // Check initial ghost 0 (Blinky)
        assert(ghosts[0].state === GHOST_STATE_SCATTER, \`Ghost 0 must start directly in scatter mode\`);

        // Other ghosts must be in house
        for (let g = 1; g < ghosts.length; g++) {
            assert(ghosts[g].state === GHOST_STATE_IN_HOUSE, \`Ghost \${g} must start in house\`);
            assert(ghosts[g].houseDelayTimer > 0, \`Ghost \${g} must have positive release delay\`);
        }

        // Simulate 200 frames of gameplay
        let deathCount = 0;
        for (let frame = 0; frame < 200; frame++) {
            let prevLives = lives;
            update();
            if (lives < prevLives) deathCount++;

            // Verify no ghost is stuck in walls
            for (let g = 0; g < ghosts.length; g++) {
                const ghost = ghosts[g];
                if (ghost.state !== GHOST_STATE_IN_HOUSE && ghost.state !== GHOST_STATE_EXITING && ghost.state !== GHOST_STATE_REVIVING) {
                    const gx = Math.round(ghost.x / oneBlockSize);
                    const gy = Math.round(ghost.y / oneBlockSize);
                    if (gy >= 0 && gy < currentMapLayout.length && gx >= 0 && gx < currentMapLayout[0].length) {
                        assert(currentMapLayout[gy][gx] !== 1, \`Ghost \${g} collided with wall at (\${gx}, \${gy}) on map \${currentMap.id}\`);
                    }
                }
            }
        }

        // After 200 frames (~6.6s), ghost 0 and 1 must definitely have exited (if no death reset)
        if (deathCount > 0) {
            console.log(\`Map \${currentMap.id} Diff \${diff.name}: Pacman died \${deathCount} times due to aggressive ghost chase.\`);
        } else {
            assert(ghosts[0].state !== GHOST_STATE_IN_HOUSE, \`Ghost 0 left house\`);
            assert(ghosts[1].state !== GHOST_STATE_IN_HOUSE, \`Ghost 1 left house\`);
        }
    }
}
console.log('Passed 16/16 Map x Difficulty test configurations!');

// TEST 2: Specific "A Arena" Ghost House Exit Test
selectedMapIndex = 1; // Arena
selectedDifficultyIndex = 1; // Normal (4 ghosts)
currentMap = MAPS[1];
startNewGame();

console.log(\`Arena Test: Pacman starts at (\${pacman.getMapX()}, \${pacman.getMapY()})\`);
assert(ghosts[0].getMapY() <= 8, \`Blinky spawns outside at y=\${ghosts[0].getMapY()}\`);

// Run 250 frames while Pacman does NOT move
for (let f = 0; f < 250; f++) {
    update();
}

// Verify that Pinky, Inky, Clyde exited the house EVEN THOUGH Pacman remained far south
for (let i = 0; i < ghosts.length; i++) {
    const g = ghosts[i];
    console.log(\`Ghost \${i} (\${g.spriteKey}): state=\${g.state}, pos=(\${Math.round(g.x/20)}, \${Math.round(g.y/20)})\`);
    assert(g.state !== GHOST_STATE_IN_HOUSE, \`Ghost \${i} exited house in Arena\`);
    assert(g.state !== GHOST_STATE_EXITING, \`Ghost \${i} finished exit animation in Arena\`);
}
console.log('A Arena exit verification PASSED: All ghosts exited smoothly!');

// TEST 3: "adadad" Keypress Rapid Alternation Test
selectedMapIndex = 0; // Classic
selectedDifficultyIndex = 1; // Normal
currentMap = MAPS[0];
startNewGame();

let pinkyTargetJitter = 0;
let lastPinkyTargetX = null;

// Simulate player furiously alternating A and D while stationary against a wall
for (let f = 0; f < 60; f++) {
    pacman.nextDirection = (f % 2 === 0) ? DIRECTION_LEFT : DIRECTION_RIGHT;
    update();

    const pinky = ghosts.find(g => g.spriteKey === 'pinky');
    if (pinky && pinky.target) {
        if (lastPinkyTargetX !== null) {
            const delta = Math.abs(pinky.target.x - lastPinkyTargetX);
            if (delta > 100) {
                pinkyTargetJitter++;
            }
        }
        lastPinkyTargetX = pinky.target.x;
    }
}
console.log(\`Pinky target jitter count during adadad: \${pinkyTargetJitter}\`);
assert(pinkyTargetJitter === 0, 'Pinky target must NOT jitter wildly when player alternates keys in place');
console.log('"adadad" anti-jitter test PASSED!');

// TEST 4: Reviving flow after being eaten
selectedMapIndex = 0;
selectedDifficultyIndex = 1;
currentMap = MAPS[0];
startNewGame();

for (let f = 0; f < 150; f++) update();

const testGhost = ghosts[1];
testGhost.becomeFrightened(7000);
assert(testGhost.state === GHOST_STATE_FRIGHTENED, 'Ghost is frightened');
testGhost.getEaten();
assert(testGhost.state === GHOST_STATE_EATEN, 'Ghost is eaten');

for (let f = 0; f < 300; f++) {
    testGhost.moveProcess();
    if (testGhost.state === GHOST_STATE_REVIVING) {
        break;
    }
}
assert(testGhost.state === GHOST_STATE_REVIVING, 'Ghost reached house and entered REVIVING state');

for (let f = 0; f < 60; f++) {
    testGhost.moveProcess();
}
assert(testGhost.state === GHOST_STATE_EXITING || testGhost.state === GHOST_STATE_CHASE || testGhost.state === GHOST_STATE_SCATTER, 
    \`Ghost exited house after reviving (current state: \${testGhost.state})\`);

console.log('Revival and re-entry/exit flow test PASSED!');
console.log(\`\\nALL TESTS PASSED! (\${passedTests}/\${totalTests} assertions passed)\`);
clearInterval(gameInterval);
process.exit(0);
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
`;

const fullScript = [
    setupCode,
    fs.readFileSync('maps.js', 'utf8').replace(/^(const|let)\s+/gm, 'var '),
    fs.readFileSync('pacman.js', 'utf8').replace(/^(const|let)\s+/gm, 'var '),
    fs.readFileSync('ghost.js', 'utf8').replace(/^(const|let)\s+/gm, 'var '),
    fs.readFileSync('game.js', 'utf8').replace(/^(const|let)\s+/gm, 'var '),
    testCode
].join('\n;\n');

vm.runInThisContext(fullScript);
