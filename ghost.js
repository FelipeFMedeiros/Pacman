const GHOST_STATE_CHASE = 'chase';
const GHOST_STATE_SCATTER = 'scatter';
const GHOST_STATE_FRIGHTENED = 'frightened';
const GHOST_STATE_EATEN = 'eaten';
const GHOST_STATE_REVIVING = 'reviving';
const GHOST_STATE_IN_HOUSE = 'in_house';
const GHOST_STATE_EXITING = 'exiting';

const GHOST_SPRITES = {
    blinky: { x: 0, y: 0 },         // Vermelho
    clyde: { x: 124, y: 0 },        // Laranja
    pinky: { x: 248, y: 0 },        // Rosa
    inky: { x: 372, y: 0 },         // Ciano
    sue: { x: 0, y: 116 },          // Roxo
    funky: { x: 124, y: 116 },      // Verde
    scaredBlue: { x: 248, y: 116 }, // Azul assustado
    scaredWhite: { x: 372, y: 116 },// Branco piscando
    eyesRight: { x: 0, y: 232 },    // Olhos para direita
    eyesUp: { x: 124, y: 232 },     // Olhos para cima
    eyesLeft: { x: 248, y: 232 },   // Olhos para esquerda
    eyesDown: { x: 372, y: 232 }    // Olhos para baixo
};

const OPPOSITE_DIRECTIONS = {
    [DIRECTION_RIGHT]: DIRECTION_LEFT,
    [DIRECTION_LEFT]: DIRECTION_RIGHT,
    [DIRECTION_UP]: DIRECTION_BOTTOM,
    [DIRECTION_BOTTOM]: DIRECTION_UP
};

const DIR_GRID_OFFSETS = {
    [DIRECTION_RIGHT]: { dx: 1, dy: 0 },
    [DIRECTION_LEFT]: { dx: -1, dy: 0 },
    [DIRECTION_UP]: { dx: 0, dy: -1 },
    [DIRECTION_BOTTOM]: { dx: 0, dy: 1 }
};

class Ghost {
    constructor(x, y, width, height, speed, typeIndex, scatterCorner) {
        this.x = x;
        this.y = y;
        this.startX = x;
        this.startY = y;
        this.width = width;
        this.height = height;
        this.baseSpeed = speed;
        this.speed = speed;
        this.direction = DIRECTION_UP;
        this.typeIndex = typeIndex;
        this.scatterCorner = scatterCorner || { x: 1, y: 1 };
        this.state = GHOST_STATE_CHASE;
        this.frightenedDuration = 7000;
        this.frightenedTimer = 0;
        this.flashCounter = 0;
        this.stepCounter = 0;
        this.eatenSafetyTimer = 0;
        this.reviveTimer = 0;
        this.houseDelayTimer = 0;
        this.bounceDir = (typeIndex % 2 === 0) ? -1 : 1;

        const keys = ['blinky', 'clyde', 'pinky', 'inky', 'sue', 'funky'];
        this.spriteKey = keys[typeIndex % keys.length];
        this.imageWidth = 124;
        this.imageHeight = 116;

        this.alignPerpendicularAxis();
        this.decideNextDirection();
    }

    alignPerpendicularAxis() {
        if (this.direction === DIRECTION_LEFT || this.direction === DIRECTION_RIGHT) {
            this.y = Math.round(this.y / oneBlockSize) * oneBlockSize;
        } else {
            this.x = Math.round(this.x / oneBlockSize) * oneBlockSize;
        }
    }

    moveProcess() {
        this.stepCounter++;

        // Estado 0: Dentro da jaula aguardando liberação escalonada (Bounce dinâmico clássico do arcade)
        if (this.state === GHOST_STATE_IN_HOUSE) {
            this.houseDelayTimer -= (1000 / fps);

            // Quique vertical ativo de amplitude perceptível (±6px)
            const bounceLimit = 6;
            this.y += this.bounceDir * 1.0;
            if (this.y <= this.startY - bounceLimit) {
                this.y = this.startY - bounceLimit;
                this.bounceDir = 1;
                this.direction = DIRECTION_BOTTOM;
            } else if (this.y >= this.startY + bounceLimit) {
                this.y = this.startY + bounceLimit;
                this.bounceDir = -1;
                this.direction = DIRECTION_UP;
            }

            if (this.houseDelayTimer <= 0) {
                this.state = GHOST_STATE_EXITING;
                this.y = this.startY;
            }
            return;
        }

        // Estado 1: Regenerando na jaula após devorado
        if (this.state === GHOST_STATE_REVIVING) {
            this.reviveTimer--;
            if (this.stepCounter % 16 < 8) {
                this.y += 0.5;
            } else {
                this.y -= 0.5;
            }
            if (this.reviveTimer <= 0) {
                this.exitHouseAfterRevive();
            }
            return;
        }

        // Estado 2: Saindo da jaula de forma suave e garantida
        if (this.state === GHOST_STATE_EXITING) {
            const exitTile = (currentMap && currentMap.ghostExit) ? currentMap.ghostExit : { x: currentMap.ghostHouse.x, y: currentMap.ghostHouse.y - 2 };
            const targetX = exitTile.x * oneBlockSize;
            const targetY = exitTile.y * oneBlockSize;
            const exitSpeed = Math.max(1.2, this.baseSpeed * 0.7);

            // Alinhamento horizontal com a coluna de saída
            if (Math.abs(this.x - targetX) > exitSpeed) {
                if (this.x < targetX) {
                    this.direction = DIRECTION_RIGHT;
                    this.x += exitSpeed;
                } else {
                    this.direction = DIRECTION_LEFT;
                    this.x -= exitSpeed;
                }
                return;
            } else {
                this.x = targetX;
            }

            // Movimento vertical em direção ao corredor externo
            if (this.y > targetY + exitSpeed) {
                this.direction = DIRECTION_UP;
                this.y -= exitSpeed;
                return;
            } else if (this.y < targetY - exitSpeed) {
                this.direction = DIRECTION_BOTTOM;
                this.y += exitSpeed;
                return;
            } else {
                this.y = targetY;
                this.x = targetX;

                // Se houver pastilha especial ativa no momento da saída, o fantasma sai vulnerável (FRIGHTENED)!
                if (typeof powerPelletActive !== 'undefined' && powerPelletActive && typeof powerPelletTimer !== 'undefined' && powerPelletTimer > 0) {
                    this.state = GHOST_STATE_FRIGHTENED;
                    this.frightenedDuration = (typeof powerPelletTotalDuration !== 'undefined') ? powerPelletTotalDuration : powerPelletTimer;
                    this.frightenedTimer = powerPelletTimer;
                } else {
                    this.state = currentGhostGlobalMode || GHOST_STATE_SCATTER;
                }

                this.direction = DIRECTION_LEFT;
                this.alignPerpendicularAxis();
                this.decideNextDirection();
                return;
            }
        }

        // Estado 3: Modo assustado (Frightened)
        if (this.state === GHOST_STATE_FRIGHTENED) {
            // Sincroniza diretamente com o temporizador global da pastilha especial para nunca dessincronizar
            if (typeof powerPelletActive !== 'undefined' && !powerPelletActive) {
                this.returnToNormalState();
            } else {
                if (typeof powerPelletTimer !== 'undefined') {
                    this.frightenedTimer = powerPelletTimer;
                } else {
                    this.frightenedTimer -= (1000 / fps);
                }
                this.flashCounter++;
                if (this.frightenedTimer <= 0) {
                    this.returnToNormalState();
                }
            }
        }

        // Estado 4: Devorado (Olhos voltando à casa)
        if (this.state === GHOST_STATE_EATEN) {
            this.eatenSafetyTimer++;
            let houseX = currentMap.ghostHouse.x * oneBlockSize;
            let houseY = currentMap.ghostHouse.y * oneBlockSize;
            let distToHouse = Math.hypot(this.x - houseX, this.y - houseY);

            // Chegou à casa ou tempo limite de segurança (6 segundos)
            if (distToHouse < oneBlockSize * 1.0 || this.eatenSafetyTimer > 180) {
                this.startReviving();
                return;
            }
        }

        this.updateSpeed();
        this.updateTarget();

        // Estado 4: Movimentação contínua baseada em encruzilhadas (Zero congelamento, Zero travessia de paredes)
        let remainingMove = this.speed;
        let loopLimit = 0;

        while (remainingMove > 0.0001 && loopLimit < 8) {
            loopLimit++;
            this.alignPerpendicularAxis();

            // Distância até o próximo alinhamento/encruzilhada na direção atual
            let distToIntersection = 0;
            if (this.direction === DIRECTION_RIGHT) {
                const rem = this.x % oneBlockSize;
                distToIntersection = rem <= 0.0001 ? oneBlockSize : (oneBlockSize - rem);
            } else if (this.direction === DIRECTION_LEFT) {
                const rem = this.x % oneBlockSize;
                distToIntersection = rem <= 0.0001 ? oneBlockSize : rem;
            } else if (this.direction === DIRECTION_BOTTOM) {
                const rem = this.y % oneBlockSize;
                distToIntersection = rem <= 0.0001 ? oneBlockSize : (oneBlockSize - rem);
            } else if (this.direction === DIRECTION_UP) {
                const rem = this.y % oneBlockSize;
                distToIntersection = rem <= 0.0001 ? oneBlockSize : rem;
            }

            if (remainingMove >= distToIntersection - 0.001) {
                // Chega exatamente ao centro do bloco
                this.advance(distToIntersection);
                this.x = Math.round(this.x / oneBlockSize) * oneBlockSize;
                this.y = Math.round(this.y / oneBlockSize) * oneBlockSize;
                remainingMove -= distToIntersection;

                this.checkTunnelWrap();
                this.decideNextDirection();
            } else {
                this.advance(remainingMove);
                remainingMove = 0;
            }
        }

        this.checkTunnelWrap();
    }

    advance(dist) {
        switch (this.direction) {
            case DIRECTION_RIGHT: this.x += dist; break;
            case DIRECTION_LEFT:  this.x -= dist; break;
            case DIRECTION_UP:    this.y -= dist; break;
            case DIRECTION_BOTTOM:this.y += dist; break;
        }
    }

    updateSpeed() {
        if (this.state === GHOST_STATE_FRIGHTENED) {
            this.speed = Math.max(1.4, this.baseSpeed * 0.55);
        } else if (this.state === GHOST_STATE_EATEN) {
            this.speed = 4.0; // Olhos viajam velozes direto para a base
        } else {
            this.speed = this.baseSpeed;
        }
    }

    updateTarget() {
        if (this.state === GHOST_STATE_EATEN) {
            this.target = {
                x: currentMap.ghostHouse.x * oneBlockSize,
                y: currentMap.ghostHouse.y * oneBlockSize
            };
            return;
        }

        if (this.state === GHOST_STATE_FRIGHTENED) {
            return;
        }

        if (this.state === GHOST_STATE_SCATTER) {
            this.target = {
                x: this.scatterCorner.x * oneBlockSize,
                y: this.scatterCorner.y * oneBlockSize
            };
            return;
        }

        // Modo CHASE: Personalidades clássicas refinadas
        const pacX = pacman.getMapX();
        const pacY = pacman.getMapY();
        const pacMoving = pacman.isMoving;
        const pacDir = pacman.lastMovingDirection || pacman.direction;

        switch (this.spriteKey) {
            case 'blinky':
                // Perseguidor implacável: visa a posição atual do Pacman
                this.target = { x: pacman.x, y: pacman.y };
                break;

            case 'pinky': {
                // Emboscador: visa 4 casas à frente do Pacman na direção do deslocamento
                // Se o jogador estiver parado, mira na posição real (elimina jitter ao alternar teclas)
                let aheadX = pacX;
                let aheadY = pacY;
                if (pacMoving) {
                    if (pacDir === DIRECTION_RIGHT) aheadX += 4;
                    else if (pacDir === DIRECTION_LEFT) aheadX -= 4;
                    else if (pacDir === DIRECTION_UP) aheadY -= 4;
                    else if (pacDir === DIRECTION_BOTTOM) aheadY += 4;
                }
                this.target = { x: aheadX * oneBlockSize, y: aheadY * oneBlockSize };
                break;
            }

            case 'inky': {
                // Flanqueador tático: vetor duplo de Blinky através do Pacman
                const blinky = (typeof ghosts !== 'undefined' && ghosts && ghosts[0]) ? ghosts[0] : this;
                const bX = blinky.getMapX();
                const bY = blinky.getMapY();
                let pivotX = pacX;
                let pivotY = pacY;
                if (pacMoving) {
                    if (pacDir === DIRECTION_RIGHT) pivotX += 2;
                    else if (pacDir === DIRECTION_LEFT) pivotX -= 2;
                    else if (pacDir === DIRECTION_UP) pivotY -= 2;
                    else if (pacDir === DIRECTION_BOTTOM) pivotY += 2;
                }
                const targetX = pivotX + (pivotX - bX);
                const targetY = pivotY + (pivotY - bY);
                this.target = { x: targetX * oneBlockSize, y: targetY * oneBlockSize };
                break;
            }

            case 'clyde': {
                // Covarde clássico: persegue se longe (> 8 blocos), recua para o seu canto se perto
                const distToPac = Math.hypot(this.getMapX() - pacX, this.getMapY() - pacY);
                if (distToPac > 8) {
                    this.target = { x: pacman.x, y: pacman.y };
                } else {
                    this.target = {
                        x: this.scatterCorner.x * oneBlockSize,
                        y: this.scatterCorner.y * oneBlockSize
                    };
                }
                break;
            }

            case 'sue': {
                // Guarda de rota: patrulha a faixa central e tenta interceptar fuga
                const dist = Math.hypot(this.getMapX() - pacX, this.getMapY() - pacY);
                if (dist > 7) {
                    this.target = { x: pacman.x, y: pacman.y };
                } else {
                    const flankX = pacX > 10 ? pacX - 3 : pacX + 3;
                    this.target = {
                        x: flankX * oneBlockSize,
                        y: pacY * oneBlockSize
                    };
                }
                break;
            }

            case 'funky':
            default:
                if (this.stepCounter % 90 < 60) {
                    this.target = { x: pacman.x, y: pacman.y };
                } else {
                    this.target = {
                        x: this.scatterCorner.x * oneBlockSize,
                        y: this.scatterCorner.y * oneBlockSize
                    };
                }
                break;
        }
    }

    isInsideGhostHouse(x, y) {
        if (typeof currentMap === 'undefined' || !currentMap || !currentMap.ghostHouse) return false;
        const hX = currentMap.ghostHouse.x;
        const hY = currentMap.ghostHouse.y;
        if (currentMap.id === 'arena') {
            return Math.abs(x - hX) <= 2 && Math.abs(y - hY) <= 2;
        }
        return Math.abs(x - hX) <= 1 && (y >= hY - 1 && y <= hY + 1);
    }

    // ALGORITMO ARCADE CLÁSSICO DE DECISÃO EM ENCRUZILHADAS
    // Elimina loops, oscilações de 180° e travamentos contra paredes
    decideNextDirection() {
        const curX = Math.round(this.x / oneBlockSize);
        const curY = Math.round(this.y / oneBlockSize);
        const numCols = currentMapLayout[0].length;
        const numRows = currentMapLayout.length;

        // Prioridade clássica: Cima, Esquerda, Baixo, Direita
        const testDirs = [DIRECTION_UP, DIRECTION_LEFT, DIRECTION_BOTTOM, DIRECTION_RIGHT];
        const validMoves = [];

        for (let d of testDirs) {
            // REGRA FUNDAMENTAL DO PACMAN: Fantasmas NUNCA viram 180° voluntariamente
            if (d === OPPOSITE_DIRECTIONS[this.direction]) {
                continue;
            }

            const off = DIR_GRID_OFFSETS[d];
            let nx = curX + off.dx;
            let ny = curY + off.dy;

            // Suporte a túneis wrap-around
            if (nx < 0) {
                if (currentMapLayout[curY][0] !== 0) continue;
                nx = numCols - 1;
            }
            if (nx >= numCols) {
                if (currentMapLayout[curY][numCols - 1] !== 0) continue;
                nx = 0;
            }
            if (ny < 0) {
                if (currentMapLayout[0][curX] !== 0) continue;
                ny = numRows - 1;
            }
            if (ny >= numRows) {
                if (currentMapLayout[numRows - 1][curX] !== 0) continue;
                ny = 0;
            }

            // REGRA CLÁSSICA DO ARCADE: A porta da casa dos fantasmas é mão única (apenas saída).
            // Fantasmas vivos NÃO entram de volta na casa. Apenas olhos devorados (EATEN) podem entrar.
            if (this.state !== GHOST_STATE_EATEN) {
                if (!this.isInsideGhostHouse(curX, curY) && this.isInsideGhostHouse(nx, ny)) {
                    continue;
                }
            }

            if (currentMapLayout[ny][nx] !== 1) {
                let dist = 0;
                if (this.target) {
                    const destTileX = Math.floor(this.target.x / oneBlockSize);
                    const destTileY = Math.floor(this.target.y / oneBlockSize);
                    dist = Math.hypot(nx - destTileX, ny - destTileY);
                }
                validMoves.push({ dir: d, dist });
            }
        }

        // Beco sem saída: única opção é inverter
        if (validMoves.length === 0) {
            this.direction = OPPOSITE_DIRECTIONS[this.direction] || DIRECTION_UP;
            return;
        }

        // Modo Assustado: escolhe aleatoriamente entre as opções válidas não-reversas
        if (this.state === GHOST_STATE_FRIGHTENED) {
            const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
            this.direction = randomMove.dir;
            return;
        }

        // Ordena por menor distância até o alvo
        validMoves.sort((a, b) => a.dist - b.dist);

        // Se estiver devorado (olhos): sempre pega a rota ideal direta
        if (this.state === GHOST_STATE_EATEN) {
            this.direction = validMoves[0].dir;
            return;
        }

        // Dificuldade dinâmica: taxa de erro calculada para quebrar filas indianas e conferir personalidade
        const diff = (typeof DIFFICULTIES !== 'undefined' && typeof selectedDifficultyIndex !== 'undefined' && DIFFICULTIES[selectedDifficultyIndex])
            ? DIFFICULTIES[selectedDifficultyIndex]
            : null;
        const blunderRate = diff ? (diff.blunderRate ?? 0.12) : 0.12;

        if (validMoves.length > 1 && Math.random() < blunderRate) {
            const blunderIdx = 1 + Math.floor(Math.random() * (validMoves.length - 1));
            this.direction = validMoves[blunderIdx].dir;
        } else {
            this.direction = validMoves[0].dir;
        }
    }

    pickEmergencyDirection() {
        const testDirs = [DIRECTION_UP, DIRECTION_LEFT, DIRECTION_BOTTOM, DIRECTION_RIGHT];
        testDirs.sort(() => Math.random() - 0.5);

        for (let d of testDirs) {
            this.direction = d;
            this.moveForwards();
            if (!this.checkCollision()) {
                this.moveBackwards();
                return;
            }
            this.moveBackwards();
        }
        this.reverseDirection();
    }

    alignToGrid() {
        this.x = Math.round(this.x / oneBlockSize) * oneBlockSize;
        this.y = Math.round(this.y / oneBlockSize) * oneBlockSize;
    }

    becomeFrightened(durationMs) {
        // Se estiver como olhos retornando para casa, não pode ser assustado
        if (this.state === GHOST_STATE_EATEN) return;

        // Se estiver dentro da casa (aguardando liberação ou regenerando) ou no meio da porta (saindo):
        // NÃO interrompe a transição física na jaula (para não quebrar a navegação),
        // mas registra a duração para que saia assustado assim que passar da porta.
        if (this.state === GHOST_STATE_IN_HOUSE || this.state === GHOST_STATE_REVIVING || this.state === GHOST_STATE_EXITING) {
            this.frightenedDuration = durationMs;
            this.frightenedTimer = durationMs;
            return;
        }

        this.state = GHOST_STATE_FRIGHTENED;
        this.frightenedDuration = durationMs;
        this.frightenedTimer = durationMs;
        this.reverseDirection();
    }

    reverseDirection() {
        if (OPPOSITE_DIRECTIONS[this.direction]) {
            this.direction = OPPOSITE_DIRECTIONS[this.direction];
        }
    }

    returnToNormalState() {
        // Nunca retorna ao normal enquanto uma pastilha especial ainda estiver ativa e com tempo!
        if (typeof powerPelletActive !== 'undefined' && powerPelletActive && typeof powerPelletTimer !== 'undefined' && powerPelletTimer > 0) {
            return;
        }
        if (this.state === GHOST_STATE_FRIGHTENED) {
            this.state = currentGhostGlobalMode || GHOST_STATE_CHASE;
        }
    }

    getEaten() {
        this.state = GHOST_STATE_EATEN;
        this.eatenSafetyTimer = 0;
    }

    startReviving() {
        this.state = GHOST_STATE_REVIVING;
        this.reviveTimer = 45; // ~1.5 segundos regenerando na jaula
        this.x = currentMap.ghostHouse.x * oneBlockSize;
        this.y = currentMap.ghostHouse.y * oneBlockSize;
        this.startY = this.y;
        this.direction = DIRECTION_UP;
    }

    exitHouseAfterRevive() {
        this.state = GHOST_STATE_EXITING;
    }

    checkTunnelWrap() {
        const numCols = currentMapLayout[0].length;
        const numRows = currentMapLayout.length;
        const totalW = numCols * oneBlockSize;
        const totalH = numRows * oneBlockSize;

        if (this.x < -this.width / 2) {
            this.x += totalW;
        } else if (this.x > totalW - this.width / 2) {
            this.x -= totalW;
        }

        if (this.y < -this.height / 2) {
            this.y += totalH;
        } else if (this.y > totalH - this.height / 2) {
            this.y -= totalH;
        }
    }

    moveBackwards() {
        switch (this.direction) {
            case DIRECTION_RIGHT:
                this.x -= this.speed;
                break;
            case DIRECTION_UP:
                this.y += this.speed;
                break;
            case DIRECTION_LEFT:
                this.x += this.speed;
                break;
            case DIRECTION_BOTTOM:
                this.y -= this.speed;
                break;
        }
    }

    moveForwards() {
        switch (this.direction) {
            case DIRECTION_RIGHT:
                this.x += this.speed;
                break;
            case DIRECTION_UP:
                this.y -= this.speed;
                break;
            case DIRECTION_LEFT:
                this.x -= this.speed;
                break;
            case DIRECTION_BOTTOM:
                this.y += this.speed;
                break;
        }
    }

    checkCollision() {
        const numCols = currentMapLayout[0].length;
        const numRows = currentMapLayout.length;

        let x1 = this.getMapX();
        let y1 = this.getMapY();
        let x2 = this.getMapXRightSide();
        let y2 = this.getMapYRightSide();

        // Checagem segura de túnel horizontal
        if (x1 < 0 || x2 >= numCols) {
            if (y1 >= 0 && y1 < numRows && (currentMapLayout[y1][0] === 0 || currentMapLayout[y1][numCols - 1] === 0)) {
                return false;
            }
            return true;
        }

        // Checagem segura de túnel vertical
        if (y1 < 0 || y2 >= numRows) {
            if (x1 >= 0 && x1 < numCols && (currentMapLayout[0][x1] === 0 || currentMapLayout[numRows - 1][x1] === 0)) {
                return false;
            }
            return true;
        }

        if (
            currentMapLayout[y1][x1] === 1 ||
            currentMapLayout[y2][x1] === 1 ||
            currentMapLayout[y1][x2] === 1 ||
            currentMapLayout[y2][x2] === 1
        ) {
            return true;
        }
        return false;
    }

    draw() {
        let sprite = GHOST_SPRITES[this.spriteKey] || GHOST_SPRITES.blinky;

        // Se estiver regenerando na casa: pisca o corpo normal mostrando revitalização
        if (this.state === GHOST_STATE_REVIVING) {
            if (Math.floor(this.reviveTimer / 6) % 2 === 0) {
                sprite = GHOST_SPRITES[this.spriteKey];
            } else {
                sprite = GHOST_SPRITES.scaredWhite;
            }
        }
        // Se estiver em modo assustado (Frightened) ou saindo da casa durante pastilha ativa
        else if (this.state === GHOST_STATE_FRIGHTENED || (this.state === GHOST_STATE_EXITING && typeof powerPelletActive !== 'undefined' && powerPelletActive)) {
            const timer = (typeof powerPelletTimer !== 'undefined') ? powerPelletTimer : this.frightenedTimer;
            if (timer < 2500 && Math.floor(this.flashCounter / 6) % 2 === 0) {
                sprite = GHOST_SPRITES.scaredWhite;
            } else {
                sprite = GHOST_SPRITES.scaredBlue;
            }
        }
        // Se estiver devorado (Eaten): apenas os olhos na direção do movimento
        else if (this.state === GHOST_STATE_EATEN) {
            if (this.direction === DIRECTION_RIGHT) sprite = GHOST_SPRITES.eyesRight;
            else if (this.direction === DIRECTION_UP) sprite = GHOST_SPRITES.eyesUp;
            else if (this.direction === DIRECTION_LEFT) sprite = GHOST_SPRITES.eyesLeft;
            else if (this.direction === DIRECTION_BOTTOM) sprite = GHOST_SPRITES.eyesDown;
        }

        canvasContext.save();
        canvasContext.drawImage(
            ghostFrames,
            sprite.x,
            sprite.y,
            this.imageWidth,
            this.imageHeight,
            this.x,
            this.y,
            this.width,
            this.height
        );
        canvasContext.restore();
    }

    getMapX() {
        return Math.floor(this.x / oneBlockSize);
    }

    getMapY() {
        return Math.floor(this.y / oneBlockSize);
    }

    getMapXRightSide() {
        return Math.floor((this.x + 0.999 * oneBlockSize) / oneBlockSize);
    }

    getMapYRightSide() {
        return Math.floor((this.y + 0.999 * oneBlockSize) / oneBlockSize);
    }
}
