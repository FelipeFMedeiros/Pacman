class Pacman {
    constructor(x, y, width, height, speed) {
        this.x = x;
        this.y = y;
        this.startX = x;
        this.startY = y;
        this.width = width;
        this.height = height;
        this.speed = speed;
        this.baseSpeed = speed;
        this.direction = DIRECTION_RIGHT;
        this.nextDirection = this.direction;
        this.lastMovingDirection = this.direction;
        this.isMoving = false;
        this.currentFrame = 5;
        this.frameCount = 7;
        this.animCounter = 0;
        this.isDead = false;
    }

    // Movimentação por frame
    moveProcess() {
        if (this.isDead) return;

        this.animCounter++;
        if (this.animCounter % 3 === 0) {
            this.changeAnimation();
        }

        const prevX = this.x;
        const prevY = this.y;

        this.changeDirectionPossible();
        this.moveForwards();
        if (this.checkCollision()) {
            this.moveBackwards();
        }

        this.checkTunnelWrap();

        this.isMoving = (Math.abs(this.x - prevX) > 0.001 || Math.abs(this.y - prevY) > 0.001);
        if (this.isMoving) {
            this.lastMovingDirection = this.direction;
        }
    }

    // Teletransporte nas pontas dos túneis (Wrap-around suave com conservação de deslocamento)
    checkTunnelWrap() {
        const numCols = currentMapLayout[0].length;
        const numRows = currentMapLayout.length;
        const totalW = numCols * oneBlockSize;
        const totalH = numRows * oneBlockSize;

        // Túnel horizontal
        if (this.x < -this.width / 2) {
            this.x += totalW;
        } else if (this.x > totalW - this.width / 2) {
            this.x -= totalW;
        }

        // Túnel vertical
        if (this.y < -this.height / 2) {
            this.y += totalH;
        } else if (this.y > totalH - this.height / 2) {
            this.y -= totalH;
        }
    }

    // Função de comer pastilhas normais e pastilhas especiais
    eat() {
        if (this.isDead) return;

        let curX = this.getMapX();
        let curY = this.getMapY();

        if (curY >= 0 && curY < currentMapLayout.length && curX >= 0 && curX < currentMapLayout[0].length) {
            let tile = currentMapLayout[curY][curX];

            // 2 = Pastilha normal (comida)
            if (tile === 2) {
                currentMapLayout[curY][curX] = 3;
                score += 10;
                pelletsRemaining--;
                audio.playWaka();
            }
            // 4 = Pastilha Especial (Energizer)
            else if (tile === 4) {
                currentMapLayout[curY][curX] = 3;
                score += 50;
                pelletsRemaining--;
                audio.playWaka();
                triggerPowerPellet(); // Ativa modo vulnerável dos fantasmas!
            }
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

    // Checar colisão com paredes do mapa
    checkCollision() {
        const numCols = currentMapLayout[0].length;
        const numRows = currentMapLayout.length;

        let x1 = this.getMapX();
        let y1 = this.getMapY();
        let x2 = this.getMapXRightSide();
        let y2 = this.getMapYRightSide();

        // Checagem de túnel horizontal nas bordas do mapa
        if (x1 < 0 || x2 >= numCols) {
            // Só permite travessia se for uma linha de túnel aberta
            if (y1 >= 0 && y1 < numRows && (currentMapLayout[y1][0] === 0 || currentMapLayout[y1][numCols - 1] === 0)) {
                return false;
            }
            return true; // Bloqueia com parede
        }

        // Checagem de túnel vertical nas bordas do mapa
        if (y1 < 0 || y2 >= numRows) {
            if (x1 >= 0 && x1 < numCols && (currentMapLayout[0][x1] === 0 || currentMapLayout[numRows - 1][x1] === 0)) {
                return false;
            }
            return true; // Bloqueia com parede
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

    // Colisão precisa com fantasmas (retorna o fantasma colidido ou null)
    checkGhostCollision() {
        const myCenterX = this.x + this.width / 2;
        const myCenterY = this.y + this.height / 2;
        const hitRadius = oneBlockSize * 0.72;

        for (let i = 0; i < ghosts.length; i++) {
            let ghost = ghosts[i];
            if (typeof GHOST_STATE_IN_HOUSE !== 'undefined' && ghost.state === GHOST_STATE_IN_HOUSE) continue;
            if (typeof GHOST_STATE_REVIVING !== 'undefined' && ghost.state === GHOST_STATE_REVIVING) continue;

            let ghostCenterX = ghost.x + ghost.width / 2;
            let ghostCenterY = ghost.y + ghost.height / 2;

            let dist = Math.hypot(myCenterX - ghostCenterX, myCenterY - ghostCenterY);
            if (dist < hitRadius) {
                return ghost;
            }
        }
        return null;
    }

    // Mudar de direção com alinhamento suave às encruzilhadas (Cornering clássico)
    changeDirectionPossible() {
        if (this.direction === this.nextDirection) return;

        let tempDirection = this.direction;
        let tempX = this.x;
        let tempY = this.y;

        // Alinhamento ao eixo ao virar
        if (
            (this.nextDirection === DIRECTION_UP || this.nextDirection === DIRECTION_BOTTOM) &&
            (this.direction === DIRECTION_LEFT || this.direction === DIRECTION_RIGHT)
        ) {
            let rem = this.x % oneBlockSize;
            if (rem < this.speed || rem > oneBlockSize - this.speed) {
                this.x = Math.round(this.x / oneBlockSize) * oneBlockSize;
            }
        } else if (
            (this.nextDirection === DIRECTION_LEFT || this.nextDirection === DIRECTION_RIGHT) &&
            (this.direction === DIRECTION_UP || this.direction === DIRECTION_BOTTOM)
        ) {
            let rem = this.y % oneBlockSize;
            if (rem < this.speed || rem > oneBlockSize - this.speed) {
                this.y = Math.round(this.y / oneBlockSize) * oneBlockSize;
            }
        }

        this.direction = this.nextDirection;
        this.moveForwards();
        if (this.checkCollision()) {
            this.moveBackwards();
            this.direction = tempDirection;
            this.x = tempX;
            this.y = tempY;
        } else {
            this.moveBackwards();
        }
    }

    changeAnimation() {
        this.currentFrame = this.currentFrame === this.frameCount ? 1 : this.currentFrame + 1;
    }

    draw() {
        canvasContext.save();
        canvasContext.translate(this.x + oneBlockSize / 2, this.y + oneBlockSize / 2);

        let angle = 0;
        if (this.direction === DIRECTION_RIGHT) angle = 0;
        else if (this.direction === DIRECTION_BOTTOM) angle = Math.PI / 2;
        else if (this.direction === DIRECTION_LEFT) angle = Math.PI;
        else if (this.direction === DIRECTION_UP) angle = (3 * Math.PI) / 2;

        canvasContext.rotate(angle);
        canvasContext.translate(-this.x - oneBlockSize / 2, -this.y - oneBlockSize / 2);

        canvasContext.drawImage(
            pacmanFrames,
            (this.currentFrame - 1) * oneBlockSize,
            0,
            oneBlockSize,
            oneBlockSize,
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
