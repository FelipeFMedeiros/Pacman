class Pacman {
    constructor(x, y, width, height, speed) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = speed;
        this.direction = DIRECTION_RIGHT;
        this.nextDirection = this.direction;
        this.currentFrame = 5;
        this.frameCount = 7;

        // Intervalo para abrir e fechar a boca
        setInterval(() => {
            this.changeAnimation();
        }, 100);
    }

    // Movimentação
    moveProcess() {
        this.changeDirectionPossible();
        this.moveForwards();
        if (this.checkCollision()) {
            this.moveBackwards();
        }
    }

    // Função de comer as comidas
    eat() {
        for (let i = 0; i < map.length; i++) {
            for (let j = 0; j < map[0].length; j++) {
                if (map[i][j] == 2 && this.getMapX() == j && this.getMapY() == i) {
                    map[i][j] = 3;
                    setTimeout(() => {
                        score++;
                    }, 100);
                }
            }
        }
    }

    // Backwards
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

    // Forwards
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

    // Checar colisão
    checkCollision() {
        let isCollided = false;
        if (
            map[this.getMapY()][this.getMapX()] == 1 ||
            map[this.getMapYRightSide()][this.getMapX()] == 1 ||
            map[this.getMapY()][this.getMapXRightSide()] == 1 ||
            map[this.getMapYRightSide()][this.getMapXRightSide()] == 1
        ) {
            return true; // Para ao encostar em uma parede
        }
        return false;
    }

    // Checar colisão dos fantasmas
    checkGhostCollision() {
        for (let i = 0; i < ghosts.length; i++) {
            let ghost = ghosts[i];
            if (ghost.getMapX() == this.getMapX() && ghost.getMapY() == this.getMapY()) {
                return true;
            }
        }
        return false;
    }

    // Mudar a direção
    changeDirectionPossible() {
        if (this.direction == this.nextDirection) return;

        let tempDirection = this.direction;
        this.direction = this.nextDirection;
        this.moveForwards();
        if (this.checkCollision()) {
            this.moveBackwards();
            this.direction = tempDirection;
        } else {
            this.moveBackwards(); // Não mover para a parede e ficar parado
        }
    }

    // Mudar animação
    changeAnimation() {
        // Animação de abrir e fechar a boca
        this.currentFrame = this.currentFrame == this.frameCount ? 1 : this.currentFrame + 1;
    }

    // Draw
    draw() {
        canvasContext.save();
        canvasContext.translate(this.x + oneBlockSize / 2, this.y + oneBlockSize / 2);
        // Direção em que o pacman vai apontar
        canvasContext.rotate((this.direction * 90 * Math.PI) / 180);

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
            this.height,
        );

        canvasContext.restore();
    }

    // GetMap - Quando o Pacman vai parar
    getMapX() {
        return parseInt(this.x / oneBlockSize);
    }
    getMapY() {
        return parseInt(this.y / oneBlockSize);
    }
    getMapXRightSide() {
        return parseInt((this.x + 0.9999 * oneBlockSize) / oneBlockSize);
    }
    getMapYRightSide() {
        return parseInt((this.y + 0.9999 * oneBlockSize) / oneBlockSize);
    }
}
