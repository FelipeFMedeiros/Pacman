// ==========================================
// PACMAN GAME ENGINE
// ==========================================

const canvas = document.getElementById('canvas');
const canvasContext = canvas.getContext('2d');
const pacmanFrames = document.getElementById('animations');
const ghostFrames = document.getElementById('ghosts');

const FONT_FAMILY = "'Press Start 2P', 'Emulogic', monospace, sans-serif";

// Configurações de dimensão e rendering
const oneBlockSize = 20;
const canvasCols = 21;
const canvasRows = 23;
canvas.width = canvasCols * oneBlockSize;       // 420px
canvas.height = canvasRows * oneBlockSize + 55; // 515px (inclui HUD inferior)

// Estados do Jogo
const STATE_MENU = 'menu';
const STATE_PLAYING = 'playing';
const STATE_PAUSED = 'paused';
const STATE_GAMEOVER = 'gameover';
const STATE_WIN = 'win';
const STATE_HOW_TO_PLAY = 'how_to_play';
const STATE_HIGH_SCORES = 'high_scores';

let gameState = STATE_MENU;

// Dificuldades disponíveis com cores temáticas e descrições
const DIFFICULTIES = [
    {
        id: 'easy',
        name: 'Fácil',
        ghostCount: 3,
        speedMult: 0.50,
        frightenedDuration: 10000,
        scatterDuration: 8000,
        chaseDuration: 15000,
        releaseInterval: 1200,
        blunderRate: 0.35,
        color: '#4CAF50',
        desc: '3 FANTASMAS • RITMO TRANQUILO'
    },
    {
        id: 'normal',
        name: 'Normal',
        ghostCount: 4,
        speedMult: 0.625,
        frightenedDuration: 7000,
        scatterDuration: 7000,
        chaseDuration: 20000,
        releaseInterval: 1000,
        blunderRate: 0.12,
        color: '#2196F3',
        desc: '4 FANTASMAS • ARCADE CLÁSSICO'
    },
    {
        id: 'hard',
        name: 'Difícil',
        ghostCount: 5,
        speedMult: 0.75,
        frightenedDuration: 4500,
        scatterDuration: 4000,
        chaseDuration: 25000,
        releaseInterval: 750,
        blunderRate: 0.04,
        color: '#FF9800',
        desc: '5 FANTASMAS • PERSEGUIÇÃO RÁPIDA'
    },
    {
        id: 'nightmare',
        name: 'Pesadelo',
        ghostCount: 6,
        speedMult: 0.875,
        frightenedDuration: 3000,
        scatterDuration: 2000,
        chaseDuration: 30000,
        releaseInterval: 500,
        blunderRate: 0.00,
        color: '#F44336',
        desc: '6 FANTASMAS • MODO INSANO'
    }
];

let selectedMapIndex = 0;
let selectedDifficultyIndex = 1; // Padrão: Normal

// Variáveis de estado do jogo ativo
let currentMap = MAPS[0];
let currentMapLayout = [];
let pacman = null;
let ghosts = [];
let score = 0;
let lives = 3;
let pelletsRemaining = 0;
let totalPellets = 0;
let fps = 30;

// Temporizadores e estados globais
let currentGhostGlobalMode = GHOST_STATE_CHASE;
let modeCycleTimer = 0;
let isScatterPhase = false;
let powerPelletActive = false;
let powerPelletTimer = 0;
let powerPelletTotalDuration = 7000;
let ghostComboCount = 0;
let floatingScores = [];

// Variáveis do Menu
let menuSelectedIndex = 0;
const MENU_ITEMS = [
    { id: 'play', label: 'JOGAR' },
    { id: 'map', label: 'MAPA' },
    { id: 'diff', label: 'DIFICULDADE' },
    { id: 'audio', label: 'ÁUDIO' },
    { id: 'scores', label: 'RECORDES' },
    { id: 'help', label: 'COMO JOGAR' }
];

let clickZones = [];

// Helper para desenhar retângulos
const createRect = (x, y, width, height, color) => {
    canvasContext.fillStyle = color;
    canvasContext.fillRect(x, y, width, height);
};

// ==========================================
// PERSISTÊNCIA DE RECORDES
// ==========================================
const getHighScores = () => {
    try {
        const data = localStorage.getItem('pacman_high_scores');
        return data ? JSON.parse(data) : {};
    } catch (e) {
        return {};
    }
};

const getHighScoreForCurrent = () => {
    const scores = getHighScores();
    const key = `${currentMap.id}_${DIFFICULTIES[selectedDifficultyIndex].id}`;
    return scores[key] || 0;
};

const saveHighScore = (newScore) => {
    try {
        const scores = getHighScores();
        const key = `${currentMap.id}_${DIFFICULTIES[selectedDifficultyIndex].id}`;
        if (!scores[key] || newScore > scores[key]) {
            scores[key] = newScore;
            localStorage.setItem('pacman_high_scores', JSON.stringify(scores));
            return true;
        }
    } catch (e) {}
    return false;
};

// ==========================================
// INICIALIZAÇÃO DE PARTIDA
// ==========================================
const startNewGame = () => {
    currentMap = MAPS[selectedMapIndex];
    currentMapLayout = currentMap.layout.map(row => row.slice());

    pelletsRemaining = 0;
    for (let r = 0; r < currentMapLayout.length; r++) {
        for (let c = 0; c < currentMapLayout[0].length; c++) {
            if (currentMapLayout[r][c] === 2 || currentMapLayout[r][c] === 4) {
                pelletsRemaining++;
            }
        }
    }
    totalPellets = pelletsRemaining;

    score = 0;
    lives = 3;
    powerPelletActive = false;
    powerPelletTimer = 0;
    ghostComboCount = 0;
    floatingScores = [];
    currentGhostGlobalMode = GHOST_STATE_SCATTER;
    modeCycleTimer = 0;
    isScatterPhase = true;

    audio.stopPowerPelletSiren();
    resetPositions();
    gameState = STATE_PLAYING;
};

const resetPositions = () => {
    const pStart = currentMap.pacmanStart;
    pacman = new Pacman(
        pStart.x * oneBlockSize,
        pStart.y * oneBlockSize,
        oneBlockSize,
        oneBlockSize,
        oneBlockSize / 5 // 4px por frame
    );
    if (pStart.dir) {
        pacman.direction = pStart.dir;
        pacman.nextDirection = pStart.dir;
    }

    currentGhostGlobalMode = GHOST_STATE_SCATTER;
    modeCycleTimer = 0;
    isScatterPhase = true;

    const diff = DIFFICULTIES[selectedDifficultyIndex];
    ghosts = [];
    const corners = currentMap.scatterCorners;

    // Utiliza os pontos seguros de spawn do mapa
    const safeSpawns = currentMap.ghostSpawns || [
        { x: currentMap.ghostHouse.x, y: currentMap.ghostHouse.y }
    ];

    const releaseInterval = diff.releaseInterval || 1800;

    for (let i = 0; i < diff.ghostCount; i++) {
        const spawnPt = safeSpawns[i % safeSpawns.length];
        const corner = corners[i % corners.length];

        const ghost = new Ghost(
            spawnPt.x * oneBlockSize,
            spawnPt.y * oneBlockSize,
            oneBlockSize,
            oneBlockSize,
            pacman.speed * diff.speedMult,
            i,
            corner
        );

        // Blinky (índice 0) já spawna fora da casa e ativo em dispersão
        // Demais fantasmas iniciam na casa com liberação escalonada
        if (i === 0) {
            ghost.state = currentGhostGlobalMode;
            ghost.houseDelayTimer = 0;
            ghost.direction = DIRECTION_LEFT;
            ghost.alignPerpendicularAxis();
            ghost.decideNextDirection();
        } else {
            ghost.state = GHOST_STATE_IN_HOUSE;
            ghost.houseDelayTimer = i * releaseInterval;
        }

        ghosts.push(ghost);
    }
};

// ==========================================
// PASTILHA ESPECIAL (ENERGIZER)
// ==========================================
const triggerPowerPellet = () => {
    const diff = DIFFICULTIES[selectedDifficultyIndex];
    powerPelletActive = true;
    powerPelletTotalDuration = diff.frightenedDuration;
    powerPelletTimer = diff.frightenedDuration;
    ghostComboCount = 0;

    audio.startPowerPelletSiren();

    for (let i = 0; i < ghosts.length; i++) {
        ghosts[i].becomeFrightened(diff.frightenedDuration);
    }
};

// ==========================================
// LOOP PRINCIPAL (UPDATE & DRAW)
// ==========================================
const gameLoop = () => {
    if (gameState === STATE_PLAYING) {
        update();
        draw();
    } else if (gameState === STATE_MENU) {
        drawMenu();
    } else if (gameState === STATE_PAUSED) {
        draw();
        drawPauseOverlay();
    } else if (gameState === STATE_GAMEOVER) {
        draw();
        drawGameOverOverlay();
    } else if (gameState === STATE_WIN) {
        draw();
        drawWinOverlay();
    } else if (gameState === STATE_HOW_TO_PLAY) {
        drawHowToPlay();
    } else if (gameState === STATE_HIGH_SCORES) {
        drawHighScores();
    }
};

const update = () => {
    if (!powerPelletActive) {
        modeCycleTimer += (1000 / fps);
        const diff = DIFFICULTIES[selectedDifficultyIndex];
        const cycleDuration = isScatterPhase ? (diff.scatterDuration || 7000) : (diff.chaseDuration || 20000);
        if (modeCycleTimer >= cycleDuration) {
            modeCycleTimer = 0;
            isScatterPhase = !isScatterPhase;
            currentGhostGlobalMode = isScatterPhase ? GHOST_STATE_SCATTER : GHOST_STATE_CHASE;
            for (let g of ghosts) {
                if (g.state === GHOST_STATE_CHASE || g.state === GHOST_STATE_SCATTER) {
                    g.state = currentGhostGlobalMode;
                    g.reverseDirection(); // Reversão clássica do arcade na transição
                }
            }
        }
    } else {
        powerPelletTimer -= (1000 / fps);
        if (powerPelletTimer <= 0) {
            powerPelletActive = false;
            powerPelletTimer = 0;
            audio.stopPowerPelletSiren();
            for (let g of ghosts) {
                if (g.state === GHOST_STATE_FRIGHTENED) {
                    g.returnToNormalState();
                }
            }
        }
    }

    pacman.moveProcess();
    pacman.eat();

    for (let i = 0; i < ghosts.length; i++) {
        ghosts[i].moveProcess();
    }

    const collidedGhost = pacman.checkGhostCollision();
    if (collidedGhost) {
        // Se o fantasma estiver assustado OU se estiver saindo da casa durante pastilha ativa: Pacman o devora!
        const isVulnerable = collidedGhost.state === GHOST_STATE_FRIGHTENED ||
            (powerPelletActive && collidedGhost.state === GHOST_STATE_EXITING);

        if (isVulnerable) {
            collidedGhost.getEaten();
            ghostComboCount++;
            const points = 200 * Math.pow(2, Math.min(ghostComboCount - 1, 3));
            score += points;
            audio.playEatGhost();

            floatingScores.push({
                text: `+${points}`,
                x: collidedGhost.x,
                y: collidedGhost.y,
                timer: 40
            });
        } else if (
            collidedGhost.state === GHOST_STATE_EATEN ||
            collidedGhost.state === GHOST_STATE_REVIVING ||
            collidedGhost.state === GHOST_STATE_IN_HOUSE ||
            collidedGhost.state === GHOST_STATE_EXITING
        ) {
            // Seguro: olhos, regenerando, na jaula ou em transição de saída
        } else {
            handlePacmanDeath();
            return;
        }
    }

    for (let i = floatingScores.length - 1; i >= 0; i--) {
        floatingScores[i].y -= 0.5;
        floatingScores[i].timer--;
        if (floatingScores[i].timer <= 0) {
            floatingScores.splice(i, 1);
        }
    }

    if (pelletsRemaining <= 0) {
        handleWin();
    }
};

const handlePacmanDeath = () => {
    audio.playDeath();
    lives--;
    if (lives <= 0) {
        saveHighScore(score);
        gameState = STATE_GAMEOVER;
    } else {
        resetPositions();
    }
};

const handleWin = () => {
    audio.playVictory();
    const diffBonus = (selectedDifficultyIndex + 1) * 1000;
    score += diffBonus;
    saveHighScore(score);
    gameState = STATE_WIN;
};

// ==========================================
// RENDERIZAÇÃO EM JOGO
// ==========================================
const draw = () => {
    createRect(0, 0, canvas.width, canvas.height, 'black');
    drawWalls();
    drawPellets();
    pacman.draw();
    drawGhosts();
    drawFloatingScores();
    drawHUD();
};

const drawWalls = () => {
    const wallColor = currentMap.wallColor || '#342DCA';
    const wallInnerColor = currentMap.wallInnerColor || 'black';
    const wallSpaceWidth = oneBlockSize / 1.6;
    const wallOffSet = (oneBlockSize - wallSpaceWidth) / 2;

    for (let i = 0; i < currentMapLayout.length; i++) {
        for (let j = 0; j < currentMapLayout[0].length; j++) {
            if (currentMapLayout[i][j] === 1) {
                createRect(j * oneBlockSize, i * oneBlockSize, oneBlockSize, oneBlockSize, wallColor);
                if (j > 0 && currentMapLayout[i][j - 1] === 1) {
                    createRect(
                        j * oneBlockSize,
                        i * oneBlockSize + wallOffSet,
                        wallSpaceWidth + wallOffSet,
                        wallSpaceWidth,
                        wallInnerColor
                    );
                }
                if (j < currentMapLayout[0].length - 1 && currentMapLayout[i][j + 1] === 1) {
                    createRect(
                        j * oneBlockSize + wallOffSet,
                        i * oneBlockSize + wallOffSet,
                        wallSpaceWidth + wallOffSet,
                        wallSpaceWidth,
                        wallInnerColor
                    );
                }
                if (i > 0 && currentMapLayout[i - 1][j] === 1) {
                    createRect(
                        j * oneBlockSize + wallOffSet,
                        i * oneBlockSize,
                        wallSpaceWidth,
                        wallSpaceWidth + wallOffSet,
                        wallInnerColor
                    );
                }
                if (i < currentMapLayout.length - 1 && currentMapLayout[i + 1][j] === 1) {
                    createRect(
                        j * oneBlockSize + wallOffSet,
                        i * oneBlockSize + wallOffSet,
                        wallSpaceWidth,
                        wallSpaceWidth + wallOffSet,
                        wallInnerColor
                    );
                }
            }
        }
    }
};

const drawPellets = () => {
    const foodColor = currentMap.foodColor || '#FEB897';
    const time = Date.now();

    for (let i = 0; i < currentMapLayout.length; i++) {
        for (let j = 0; j < currentMapLayout[0].length; j++) {
            const tile = currentMapLayout[i][j];

            if (tile === 2) {
                createRect(
                    j * oneBlockSize + oneBlockSize / 3,
                    i * oneBlockSize + oneBlockSize / 3,
                    oneBlockSize / 3,
                    oneBlockSize / 3,
                    foodColor
                );
            } else if (tile === 4) {
                const pulse = Math.sin(time / 140) * 1.5;
                const radius = (oneBlockSize / 2.8) + pulse;

                canvasContext.save();
                canvasContext.beginPath();
                canvasContext.arc(
                    j * oneBlockSize + oneBlockSize / 2,
                    i * oneBlockSize + oneBlockSize / 2,
                    Math.max(3, radius),
                    0,
                    2 * Math.PI
                );
                canvasContext.fillStyle = '#FFFFFF';
                canvasContext.fill();
                canvasContext.restore();
            }
        }
    }
};

const drawGhosts = () => {
    for (let i = 0; i < ghosts.length; i++) {
        ghosts[i].draw();
    }
};

const drawFloatingScores = () => {
    canvasContext.save();
    canvasContext.font = `12px ${FONT_FAMILY}`;
    canvasContext.fillStyle = '#00FFFF';
    canvasContext.textAlign = 'center';

    for (let fs of floatingScores) {
        canvasContext.fillText(fs.text, fs.x + oneBlockSize / 2, fs.y);
    }
    canvasContext.restore();
};

const drawHUD = () => {
    const hudY = currentMapLayout.length * oneBlockSize + 10;
    const diff = DIFFICULTIES[selectedDifficultyIndex];

    canvasContext.strokeStyle = '#333333';
    canvasContext.lineWidth = 1;
    canvasContext.beginPath();
    canvasContext.moveTo(0, hudY);
    canvasContext.lineTo(canvas.width, hudY);
    canvasContext.stroke();

    canvasContext.font = `10px ${FONT_FAMILY}`;
    canvasContext.fillStyle = '#FFFFFF';
    canvasContext.textAlign = 'left';
    canvasContext.fillText(`SCORE: ${score}`, 10, hudY + 20);

    const highScore = getHighScoreForCurrent();
    canvasContext.fillStyle = '#FFD700';
    canvasContext.textAlign = 'right';
    canvasContext.fillText(`RECORD: ${highScore}`, canvas.width - 10, hudY + 20);

    canvasContext.fillStyle = '#FFFFFF';
    canvasContext.textAlign = 'left';
    canvasContext.fillText('VIDAS:', 10, hudY + 40);

    for (let i = 0; i < lives; i++) {
        canvasContext.drawImage(
            pacmanFrames,
            2 * oneBlockSize,
            0,
            oneBlockSize,
            oneBlockSize,
            85 + i * 22,
            hudY + 27,
            16,
            16
        );
    }

    if (powerPelletActive) {
        const barWidth = 100;
        const barHeight = 8;
        const progress = Math.max(0, powerPelletTimer / powerPelletTotalDuration);
        const barX = 175;
        const barY = hudY + 31;

        canvasContext.fillStyle = '#222222';
        canvasContext.fillRect(barX, barY, barWidth, barHeight);
        canvasContext.fillStyle = powerPelletTimer < 2500 ? '#FF3333' : '#00E5FF';
        canvasContext.fillRect(barX, barY, barWidth * progress, barHeight);
        canvasContext.strokeStyle = '#FFFFFF';
        canvasContext.strokeRect(barX, barY, barWidth, barHeight);
    }

    canvasContext.font = `8px ${FONT_FAMILY}`;
    canvasContext.fillStyle = diff.color;
    canvasContext.textAlign = 'right';
    canvasContext.fillText(diff.name.toUpperCase(), canvas.width - 10, hudY + 40);

    canvasContext.fillStyle = audio.isMuted ? '#888888' : '#4CAF50';
    canvasContext.fillText(audio.isMuted ? '[M] MUDO' : '[M] SOM', canvas.width - 95, hudY + 40);
};

// ==========================================
// TELAS DO MENU, OVERLAYS E MINI-PREVIEW
// ==========================================
const drawMenu = () => {
    const diff = DIFFICULTIES[selectedDifficultyIndex];

    // Fundo arcade escuro de alto contraste (sem névoa central clara)
    createRect(0, 0, canvas.width, canvas.height, '#070712');

    // Moldura neon com a cor da dificuldade
    canvasContext.save();
    canvasContext.strokeStyle = diff.color;
    canvasContext.lineWidth = 2.5;
    canvasContext.shadowColor = diff.color;
    canvasContext.shadowBlur = 10;
    canvasContext.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
    canvasContext.restore();

    clickZones = [];

    // Título retrô com brilho arcade
    canvasContext.save();
    canvasContext.textAlign = 'center';
    canvasContext.font = `20px ${FONT_FAMILY}`;
    canvasContext.fillStyle = '#FFFF00';
    canvasContext.shadowColor = '#FF8C00';
    canvasContext.shadowBlur = 10;
    canvasContext.fillText('P A C - M A N', canvas.width / 2, 35);
    canvasContext.restore();

    // Mini preview do mapa selecionado (80x80)
    const mapPreviewX = canvas.width / 2 - 40;
    const mapPreviewY = 48;
    drawMiniMapPreview(mapPreviewX, mapPreviewY, 80, 80);

    // Linha de apresentação dos fantasmas ativos na dificuldade
    drawGhostLineup(mapPreviewY + 86);

    // Itens do menu com espaçamento generoso e equilibrado
    const startY = 190;
    const itemGap = 42;

    MENU_ITEMS.forEach((item, idx) => {
        const y = startY + idx * itemGap;
        let text = item.label;

        if (item.id === 'map') {
            text = `MAPA: < ${currentMap.name} >`;
        } else if (item.id === 'diff') {
            text = `DIFICULDADE: < ${diff.name} >`;
        } else if (item.id === 'audio') {
            text = `ÁUDIO: < ${audio.isMuted ? 'DESLIGADO' : 'LIGADO'} >`;
        }

        const isSelected = idx === menuSelectedIndex;
        const btnWidth = 340;
        const btnHeight = 30;
        const btnX = canvas.width / 2 - btnWidth / 2;
        const btnY = y - 20;

        clickZones.push({
            id: item.id,
            index: idx,
            x: btnX,
            y: btnY,
            w: btnWidth,
            h: btnHeight
        });

        // Fundo do botão com contraste nítido
        if (isSelected) {
            canvasContext.fillStyle = 'rgba(255, 255, 255, 0.16)';
            canvasContext.fillRect(btnX, btnY, btnWidth, btnHeight);
            canvasContext.strokeStyle = '#FFFF00';
            canvasContext.lineWidth = 1.5;
            canvasContext.strokeRect(btnX, btnY, btnWidth, btnHeight);
        } else {
            canvasContext.fillStyle = 'rgba(15, 15, 28, 0.6)';
            canvasContext.fillRect(btnX, btnY, btnWidth, btnHeight);
            canvasContext.strokeStyle = '#22223a';
            canvasContext.lineWidth = 1;
            canvasContext.strokeRect(btnX, btnY, btnWidth, btnHeight);
        }

        // Fonte nítida e legível em qualquer dificuldade
        canvasContext.font = isSelected ? `9.5px ${FONT_FAMILY}` : `8.5px ${FONT_FAMILY}`;
        canvasContext.fillStyle = isSelected ? '#FFFF00' : '#E0E0E0';
        canvasContext.textAlign = 'center';
        canvasContext.fillText(isSelected ? `▶ ${text} ◀` : text, canvas.width / 2, y);
    });

    // Rodapé de instruções
    canvasContext.font = `7px ${FONT_FAMILY}`;
    canvasContext.fillStyle = '#777799';
    canvasContext.textAlign = 'center';
    canvasContext.fillText('SETAS / WASD OU CLIQUE NO MOUSE', canvas.width / 2, canvas.height - 32);
    canvasContext.fillText('ENTER / ESPAÇO: CONFIRMAR', canvas.width / 2, canvas.height - 18);
};

// Desenha miniatura dos fantasmas ativos na dificuldade selecionada
const drawGhostLineup = (y) => {
    const diff = DIFFICULTIES[selectedDifficultyIndex];
    const ghostKeys = ['blinky', 'clyde', 'pinky', 'inky', 'sue', 'funky'];
    const activeCount = diff.ghostCount;
    const spriteSize = 16;
    const spacing = 22;
    const totalW = activeCount * spacing;
    const startX = canvas.width / 2 - totalW / 2 + 3;

    for (let i = 0; i < activeCount; i++) {
        const key = ghostKeys[i];
        const s = GHOST_SPRITES[key];
        canvasContext.drawImage(
            ghostFrames,
            s.x,
            s.y,
            124,
            116,
            startX + i * spacing,
            y,
            spriteSize,
            spriteSize
        );
    }

    // Texto descritivo da dificuldade com alto contraste
    canvasContext.font = `7px ${FONT_FAMILY}`;
    canvasContext.fillStyle = diff.color;
    canvasContext.textAlign = 'center';
    canvasContext.fillText(diff.desc, canvas.width / 2, y + 26);
};

// Mini preview do mapa
const drawMiniMapPreview = (x, y, w, h) => {
    const previewMap = MAPS[selectedMapIndex];
    const layout = previewMap.layout;
    const rows = layout.length;
    const cols = layout[0].length;
    const cellW = w / cols;
    const cellH = h / rows;

    createRect(x - 3, y - 3, w + 6, h + 6, '#181828');
    createRect(x, y, w, h, '#000000');

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const tile = layout[r][c];
            if (tile === 1) {
                createRect(x + c * cellW, y + r * cellH, cellW, cellH, previewMap.wallColor);
            } else if (tile === 4) {
                createRect(x + c * cellW + 1, y + r * cellH + 1, cellW, cellH, '#FFFFFF');
            }
        }
    }

    canvasContext.strokeStyle = previewMap.wallColor;
    canvasContext.lineWidth = 1;
    canvasContext.strokeRect(x - 3, y - 3, w + 6, h + 6);
};

// ==========================================
// OVERLAY DE PAUSA (REDESENHADO COM CORES NAS TECLAS)
// ==========================================
const drawPauseOverlay = () => {
    clickZones = [];

    // Fundo escurecido semi-transparente
    canvasContext.fillStyle = 'rgba(0, 0, 0, 0.85)';
    canvasContext.fillRect(0, 0, canvas.width, canvas.height);

    const cardX = 24;
    const cardY = 55;
    const cardW = canvas.width - 48;
    const cardH = 390;

    createRect(cardX, cardY, cardW, cardH, 'rgba(10, 10, 24, 0.96)');
    canvasContext.strokeStyle = '#FFFF00';
    canvasContext.lineWidth = 2;
    canvasContext.strokeRect(cardX, cardY, cardW, cardH);

    // Título
    canvasContext.save();
    canvasContext.textAlign = 'center';
    canvasContext.font = `20px ${FONT_FAMILY}`;
    canvasContext.fillStyle = '#FFFF00';
    canvasContext.shadowColor = '#FF8C00';
    canvasContext.shadowBlur = 10;
    canvasContext.fillText('PAUSADO', canvas.width / 2, cardY + 45);
    canvasContext.restore();

    // Opções com teclas coloridas e botões clicáveis
    const pauseOptions = [
        { id: 'resume', key: '[ P / ESC ]', keyColor: '#FFFF00', action: 'CONTINUAR JOGO', y: cardY + 105 },
        { id: 'restart', key: '[    R    ]', keyColor: '#00E5FF', action: 'REINICIAR PARTIDA', y: cardY + 165 },
        { id: 'audio', key: '[    M    ]', keyColor: '#76FF03', action: audio.isMuted ? 'ÁUDIO: DESLIGADO' : 'ÁUDIO: LIGADO', y: cardY + 225 },
        { id: 'menu', key: '[    Q    ]', keyColor: '#FF5252', action: 'VOLTAR AO MENU', y: cardY + 285 }
    ];

    pauseOptions.forEach(opt => {
        const btnW = cardW - 36;
        const btnH = 46;
        const btnX = canvas.width / 2 - btnW / 2;
        const btnY = opt.y - 18;

        clickZones.push({
            id: opt.id,
            index: 0,
            x: btnX,
            y: btnY,
            w: btnW,
            h: btnH
        });

        // Fundo do botão
        canvasContext.fillStyle = 'rgba(255, 255, 255, 0.08)';
        canvasContext.fillRect(btnX, btnY, btnW, btnH);
        canvasContext.strokeStyle = opt.keyColor;
        canvasContext.lineWidth = 1;
        canvasContext.strokeRect(btnX, btnY, btnW, btnH);

        // Tecla em destaque
        canvasContext.font = `10.5px ${FONT_FAMILY}`;
        canvasContext.fillStyle = opt.keyColor;
        canvasContext.textAlign = 'center';
        canvasContext.fillText(opt.key, canvas.width / 2, opt.y);

        // Ação abaixo da tecla
        canvasContext.font = `7.5px ${FONT_FAMILY}`;
        canvasContext.fillStyle = '#FFFFFF';
        canvasContext.fillText(opt.action, canvas.width / 2, opt.y + 18);
    });

    // Rodapé
    canvasContext.font = `7px ${FONT_FAMILY}`;
    canvasContext.fillStyle = '#8888AA';
    canvasContext.textAlign = 'center';
    canvasContext.fillText('CLIQUE OU PRESSIONE A TECLA', canvas.width / 2, cardY + cardH - 18);
};

// Overlay de Game Over
const drawGameOverOverlay = () => {
    canvasContext.fillStyle = 'rgba(0, 0, 0, 0.85)';
    canvasContext.fillRect(0, 0, canvas.width, canvas.height);

    canvasContext.font = `20px ${FONT_FAMILY}`;
    canvasContext.fillStyle = '#FF3333';
    canvasContext.textAlign = 'center';
    canvasContext.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 50);

    canvasContext.font = `11px ${FONT_FAMILY}`;
    canvasContext.fillStyle = '#FFFFFF';
    canvasContext.fillText(`SCORE FINAL: ${score}`, canvas.width / 2, canvas.height / 2);

    const highScore = getHighScoreForCurrent();
    canvasContext.fillStyle = score >= highScore ? '#FFD700' : '#AAAAAA';
    canvasContext.fillText(`RECORD: ${highScore}`, canvas.width / 2, canvas.height / 2 + 25);

    canvasContext.font = `9px ${FONT_FAMILY}`;
    canvasContext.fillStyle = '#FFFF00';
    canvasContext.fillText('PRESSIONE [ENTER] OU CLIQUE', canvas.width / 2, canvas.height / 2 + 75);
    canvasContext.fillText('PARA JOGAR NOVAMENTE', canvas.width / 2, canvas.height / 2 + 95);
    canvasContext.fillText('PRESSIONE [Q] PARA MENU PRINCIPAL', canvas.width / 2, canvas.height / 2 + 120);
};

// Overlay de Vitória
const drawWinOverlay = () => {
    canvasContext.fillStyle = 'rgba(0, 0, 0, 0.85)';
    canvasContext.fillRect(0, 0, canvas.width, canvas.height);

    canvasContext.font = `18px ${FONT_FAMILY}`;
    canvasContext.fillStyle = '#00FF66';
    canvasContext.textAlign = 'center';
    canvasContext.fillText('VOCÊ VENCEU!', canvas.width / 2, canvas.height / 2 - 50);

    canvasContext.font = `10px ${FONT_FAMILY}`;
    canvasContext.fillStyle = '#FFFFFF';
    canvasContext.fillText(`SCORE TOTAL: ${score}`, canvas.width / 2, canvas.height / 2);
    canvasContext.fillText(`MAPA: ${currentMap.name}`, canvas.width / 2, canvas.height / 2 + 25);

    canvasContext.font = `9px ${FONT_FAMILY}`;
    canvasContext.fillStyle = '#FFFF00';
    canvasContext.fillText('PRESSIONE [ENTER] OU CLIQUE', canvas.width / 2, canvas.height / 2 + 75);
    canvasContext.fillText('PARA PRÓXIMO MAPA', canvas.width / 2, canvas.height / 2 + 95);
    canvasContext.fillText('PRESSIONE [Q] PARA MENU PRINCIPAL', canvas.width / 2, canvas.height / 2 + 120);
};

// Tela de Como Jogar
const drawHowToPlay = () => {
    clickZones = [];

    createRect(0, 0, canvas.width, canvas.height, '#060610');

    const cardX = 16;
    const cardY = 16;
    const cardW = canvas.width - 32;
    const cardH = canvas.height - 32;

    createRect(cardX, cardY, cardW, cardH, 'rgba(15, 15, 30, 0.95)');
    canvasContext.strokeStyle = '#FFFF00';
    canvasContext.lineWidth = 2;
    canvasContext.strokeRect(cardX, cardY, cardW, cardH);

    canvasContext.save();
    canvasContext.textAlign = 'center';
    canvasContext.font = `16px ${FONT_FAMILY}`;
    canvasContext.fillStyle = '#FFFF00';
    canvasContext.shadowColor = '#FF8C00';
    canvasContext.shadowBlur = 8;
    canvasContext.fillText('COMO JOGAR', canvas.width / 2, cardY + 30);
    canvasContext.restore();

    let curY = cardY + 60;
    const leftMargin = cardX + 18;

    canvasContext.font = `9px ${FONT_FAMILY}`;
    canvasContext.fillStyle = '#00E5FF';
    canvasContext.textAlign = 'left';
    canvasContext.fillText('► OBJETIVO', leftMargin, curY);
    curY += 16;

    canvasContext.font = `7.5px ${FONT_FAMILY}`;
    canvasContext.fillStyle = '#DDDDDD';
    canvasContext.fillText('• Coma todas as pastilhas.', leftMargin + 6, curY); curY += 13;
    canvasContext.fillText('• Fuja dos fantasmas coloridos!', leftMargin + 6, curY); curY += 24;

    canvasContext.font = `9px ${FONT_FAMILY}`;
    canvasContext.fillStyle = '#FFD700';
    canvasContext.fillText('► PASTILHAS ESPECIAIS', leftMargin, curY);
    curY += 16;

    canvasContext.font = `7.5px ${FONT_FAMILY}`;
    canvasContext.fillStyle = '#DDDDDD';
    canvasContext.fillText('• Grandes e nos 4 cantos.', leftMargin + 6, curY); curY += 13;
    canvasContext.fillText('• Fantasmas ficam azuis!', leftMargin + 6, curY); curY += 13;
    canvasContext.fillText('• Coma-os para combo de pontos:', leftMargin + 6, curY); curY += 13;
    canvasContext.fillStyle = '#00FFFF';
    canvasContext.fillText('  200 → 400 → 800 → 1600 pts', leftMargin + 6, curY); curY += 13;
    canvasContext.fillStyle = '#FF8888';
    canvasContext.fillText('• Se piscarem: tempo acabando!', leftMargin + 6, curY); curY += 24;

    canvasContext.font = `9px ${FONT_FAMILY}`;
    canvasContext.fillStyle = '#E040FB';
    canvasContext.fillText('► TÚNEIS DE FUGA', leftMargin, curY);
    curY += 16;

    canvasContext.font = `7.5px ${FONT_FAMILY}`;
    canvasContext.fillStyle = '#DDDDDD';
    canvasContext.fillText('• Passe pelas bordas do mapa', leftMargin + 6, curY); curY += 13;
    canvasContext.fillText('  para se teletransportar.', leftMargin + 6, curY); curY += 24;

    canvasContext.font = `9px ${FONT_FAMILY}`;
    canvasContext.fillStyle = '#76FF03';
    canvasContext.fillText('► CONTROLES', leftMargin, curY);
    curY += 16;

    canvasContext.font = `7.5px ${FONT_FAMILY}`;
    canvasContext.fillStyle = '#DDDDDD';
    canvasContext.fillText('• SETAS / WASD: Mover Pacman', leftMargin + 6, curY); curY += 13;
    canvasContext.fillText('• [P] ou [ESC]: Pausar jogo', leftMargin + 6, curY); curY += 13;
    canvasContext.fillText('• [M]: Alternar Áudio on/off', leftMargin + 6, curY); curY += 32;

    const btnW = 280;
    const btnH = 26;
    const btnX = canvas.width / 2 - btnW / 2;
    const btnY = cardY + cardH - 42;

    clickZones.push({
        id: 'back_to_menu',
        index: 0,
        x: btnX,
        y: btnY,
        w: btnW,
        h: btnH
    });

    canvasContext.fillStyle = 'rgba(255, 255, 0, 0.15)';
    canvasContext.fillRect(btnX, btnY, btnW, btnH);
    canvasContext.strokeStyle = '#FFFF00';
    canvasContext.lineWidth = 1;
    canvasContext.strokeRect(btnX, btnY, btnW, btnH);

    canvasContext.font = `8.5px ${FONT_FAMILY}`;
    canvasContext.fillStyle = '#FFFF00';
    canvasContext.textAlign = 'center';
    canvasContext.fillText('VOLTAR AO MENU [ENTER/ESC]', canvas.width / 2, btnY + 17);
};

// Tela de Recordes
const drawHighScores = () => {
    clickZones = [];
    createRect(0, 0, canvas.width, canvas.height, '#060610');

    const cardX = 16;
    const cardY = 16;
    const cardW = canvas.width - 32;
    const cardH = canvas.height - 32;

    createRect(cardX, cardY, cardW, cardH, 'rgba(15, 15, 30, 0.95)');
    canvasContext.strokeStyle = '#FFD700';
    canvasContext.lineWidth = 2;
    canvasContext.strokeRect(cardX, cardY, cardW, cardH);

    canvasContext.font = `14px ${FONT_FAMILY}`;
    canvasContext.fillStyle = '#FFD700';
    canvasContext.textAlign = 'center';
    canvasContext.fillText('TABELA DE RECORDES', canvas.width / 2, cardY + 32);

    const scores = getHighScores();
    let startY = cardY + 60;

    MAPS.forEach(m => {
        canvasContext.font = `9.5px ${FONT_FAMILY}`;
        canvasContext.fillStyle = m.wallColor;
        canvasContext.textAlign = 'left';
        canvasContext.fillText(`[ ${m.name.toUpperCase()} ]`, cardX + 20, startY);
        startY += 18;

        DIFFICULTIES.forEach(d => {
            const key = `${m.id}_${d.id}`;
            const s = scores[key] || 0;
            canvasContext.font = `7.5px ${FONT_FAMILY}`;
            canvasContext.fillStyle = '#CCCCCC';
            canvasContext.fillText(`  ${d.name}:`, cardX + 25, startY);
            canvasContext.fillStyle = '#FFD700';
            canvasContext.textAlign = 'right';
            canvasContext.fillText(`${s} PTS`, cardX + cardW - 25, startY);
            canvasContext.textAlign = 'left';
            startY += 14;
        });

        startY += 8;
    });

    const btnW = 280;
    const btnH = 26;
    const btnX = canvas.width / 2 - btnW / 2;
    const btnY = cardY + cardH - 40;

    clickZones.push({
        id: 'back_to_menu',
        index: 0,
        x: btnX,
        y: btnY,
        w: btnW,
        h: btnH
    });

    canvasContext.fillStyle = 'rgba(255, 215, 0, 0.15)';
    canvasContext.fillRect(btnX, btnY, btnW, btnH);
    canvasContext.strokeStyle = '#FFD700';
    canvasContext.lineWidth = 1;
    canvasContext.strokeRect(btnX, btnY, btnW, btnH);

    canvasContext.font = `8.5px ${FONT_FAMILY}`;
    canvasContext.fillStyle = '#FFD700';
    canvasContext.textAlign = 'center';
    canvasContext.fillText('VOLTAR AO MENU [ENTER/ESC]', canvas.width / 2, btnY + 17);
};

// ==========================================
// CONTROLES DE TECLADO E EVENTOS
// ==========================================
window.addEventListener('keydown', (event) => {
    const k = event.keyCode;
    audio.init();

    if (k === 77) {
        audio.toggleMute();
        return;
    }

    if (gameState === STATE_MENU) {
        if (k === 38 || k === 87) {
            menuSelectedIndex = (menuSelectedIndex - 1 + MENU_ITEMS.length) % MENU_ITEMS.length;
            audio.playMenuMove();
        } else if (k === 40 || k === 83) {
            menuSelectedIndex = (menuSelectedIndex + 1) % MENU_ITEMS.length;
            audio.playMenuMove();
        } else if (k === 37 || k === 65) {
            handleMenuHorizontal(-1);
        } else if (k === 39 || k === 68) {
            handleMenuHorizontal(1);
        } else if (k === 13 || k === 32) {
            handleMenuSelect();
        }
    } else if (gameState === STATE_PLAYING) {
        if (k === 37 || k === 65) {
            pacman.nextDirection = DIRECTION_LEFT;
        } else if (k === 38 || k === 87) {
            pacman.nextDirection = DIRECTION_UP;
        } else if (k === 39 || k === 68) {
            pacman.nextDirection = DIRECTION_RIGHT;
        } else if (k === 40 || k === 83) {
            pacman.nextDirection = DIRECTION_BOTTOM;
        } else if (k === 80 || k === 27) {
            gameState = STATE_PAUSED;
            audio.stopPowerPelletSiren();
        }
    } else if (gameState === STATE_PAUSED) {
        if (k === 80 || k === 27) {
            gameState = STATE_PLAYING;
            if (powerPelletActive) audio.startPowerPelletSiren();
        } else if (k === 82) {
            startNewGame();
        } else if (k === 81) {
            gameState = STATE_MENU;
        }
    } else if (gameState === STATE_GAMEOVER) {
        if (k === 13 || k === 32) {
            startNewGame();
        } else if (k === 81 || k === 27) {
            gameState = STATE_MENU;
        }
    } else if (gameState === STATE_WIN) {
        if (k === 13 || k === 32) {
            selectedMapIndex = (selectedMapIndex + 1) % MAPS.length;
            startNewGame();
        } else if (k === 81 || k === 27) {
            gameState = STATE_MENU;
        }
    } else if (gameState === STATE_HOW_TO_PLAY || gameState === STATE_HIGH_SCORES) {
        if (k === 13 || k === 27 || k === 32) {
            gameState = STATE_MENU;
            audio.playMenuSelect();
        }
    }
});

const handleMenuHorizontal = (dir) => {
    const item = MENU_ITEMS[menuSelectedIndex];
    if (item.id === 'map') {
        selectedMapIndex = (selectedMapIndex + dir + MAPS.length) % MAPS.length;
        currentMap = MAPS[selectedMapIndex];
        audio.playMenuMove();
    } else if (item.id === 'diff') {
        selectedDifficultyIndex = (selectedDifficultyIndex + dir + DIFFICULTIES.length) % DIFFICULTIES.length;
        audio.playMenuMove();
    } else if (item.id === 'audio') {
        audio.toggleMute();
        audio.playMenuSelect();
    }
};

const handleMenuSelect = () => {
    const item = MENU_ITEMS[menuSelectedIndex];
    audio.playMenuSelect();

    if (item.id === 'play') {
        startNewGame();
    } else if (item.id === 'map') {
        handleMenuHorizontal(1);
    } else if (item.id === 'diff') {
        handleMenuHorizontal(1);
    } else if (item.id === 'audio') {
        audio.toggleMute();
    } else if (item.id === 'scores') {
        gameState = STATE_HIGH_SCORES;
    } else if (item.id === 'help') {
        gameState = STATE_HOW_TO_PLAY;
    }
};

// ==========================================
// SUPORTE A MOUSE
// ==========================================
canvas.addEventListener('click', (event) => {
    audio.init();

    const rect = canvas.getBoundingClientRect();
    const mouseX = (event.clientX - rect.left) * (canvas.width / rect.width);
    const mouseY = (event.clientY - rect.top) * (canvas.height / rect.height);

    if (gameState === STATE_MENU) {
        for (let zone of clickZones) {
            if (
                mouseX >= zone.x &&
                mouseX <= zone.x + zone.w &&
                mouseY >= zone.y &&
                mouseY <= zone.y + zone.h
            ) {
                menuSelectedIndex = zone.index;
                handleMenuSelect();
                return;
            }
        }
    } else if (gameState === STATE_PAUSED) {
        for (let zone of clickZones) {
            if (
                mouseX >= zone.x &&
                mouseX <= zone.x + zone.w &&
                mouseY >= zone.y &&
                mouseY <= zone.y + zone.h
            ) {
                if (zone.id === 'resume') {
                    gameState = STATE_PLAYING;
                    if (powerPelletActive) audio.startPowerPelletSiren();
                } else if (zone.id === 'restart') {
                    startNewGame();
                } else if (zone.id === 'audio') {
                    audio.toggleMute();
                } else if (zone.id === 'menu') {
                    gameState = STATE_MENU;
                }
                return;
            }
        }
    } else if (gameState === STATE_GAMEOVER) {
        startNewGame();
    } else if (gameState === STATE_WIN) {
        selectedMapIndex = (selectedMapIndex + 1) % MAPS.length;
        startNewGame();
    } else if (gameState === STATE_HOW_TO_PLAY || gameState === STATE_HIGH_SCORES) {
        gameState = STATE_MENU;
        audio.playMenuSelect();
    }
});

canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = (event.clientX - rect.left) * (canvas.width / rect.width);
    const mouseY = (event.clientY - rect.top) * (canvas.height / rect.height);

    if (gameState === STATE_MENU || gameState === STATE_PAUSED || gameState === STATE_HOW_TO_PLAY || gameState === STATE_HIGH_SCORES) {
        let hovered = false;
        for (let zone of clickZones) {
            if (
                mouseX >= zone.x &&
                mouseX <= zone.x + zone.w &&
                mouseY >= zone.y &&
                mouseY <= zone.y + zone.h
            ) {
                if (gameState === STATE_MENU && menuSelectedIndex !== zone.index) {
                    menuSelectedIndex = zone.index;
                    audio.playMenuMove();
                }
                hovered = true;
                break;
            }
        }
        canvas.style.cursor = hovered ? 'pointer' : 'default';
    } else {
        canvas.style.cursor = 'default';
    }
});

// ==========================================
// INICIALIZAÇÃO DO JOGO
// ==========================================
let gameInterval = setInterval(gameLoop, 1000 / fps);
