# Pacman

A classic Pacman clone implemented in vanilla JavaScript using HTML5 Canvas. The game features the original Pacman mechanics: movement, pellet eating, ghost collision, lives, scoring, and win/lose conditions.

## Project Structure

```
Pacman/
├── index.html          # Main HTML file containing the canvas and script includes
├── game.js             # Core game logic: map, rendering, game loop, Pacman & ghost initialization
├── pacman.js           # Pacman class: movement, eating, collision detection, animation
├── ghost.js            # Ghost class: movement, target selection, collision detection, animation
├── assets/
│   ├── animaciones.gif # Sprite sheet for Pacman mouth animation
│   ├── ghost.png       # Sprite sheet for ghost images
│   └── pacman.ico      # Favicon for the browser tab
└── README.md           # This documentation file
```

## File-by-File Documentation

### **1.** [index.html](/index.html)
The entry point of the game. Sets up the webpage, loads necessary assets, and includes the JavaScript files in the correct order.

Key elements:
- **Canvas** (`<canvas id="canvas" width="500" height="500">`): The rendering surface for the game.
- **Hidden divs** containing sprite images (`animaciones.gif` and `ghost.png`) that are preloaded for drawing.
- **Script tags** loading `ghost.js`, `pacman.js`, and `game.js` (order matters as later files depend on earlier ones).

### **2.** [game.js](/game.js)
Contains the global game state, map definition, rendering functions, game loop, and lifecycle management (start, restart, game over, win).

#### Constants & Variables
- `canvas`, `canvasContext`: Reference to the `<canvas>` element and its 2D drawing context.
- `pacmanFrames`, `ghostFrames`: Image objects for sprite sheets.
- Direction constants: `DIRECTION_RIGHT = 4`, `DIRECTION_UP = 3`, `DIRECTION_LEFT = 2`, `DIRECTION_BOTTOM = 1`.
- `ghostLocations`: Starting pixel coordinates for each ghost sprite within the sprite sheet.
- Game settings: `fps = 30`, `oneBlockSize = 20` (size of a maze cell in pixels), colors, scores, lives, etc.
- `map`: 2D array representing the maze layout:
  - `1`: Wall
  - `2`: Empty space with a pellet (food)
  - `0`: Empty tunnel (no pellet, e.g., side exits)
- `randomTargetsForGhosts`: Four corner targets ghosts wander to when not chasing Pacman.
- `gameInterval`: ID of the `setInterval` loop.

#### Functions
- `createRect(x, y, width, height, color)`: Helper to draw a filled rectangle.
- `drawWalls()`: Renders the maze walls based on the `map` array, adding inner highlights for adjacent walls.
- `drawFoods()`: Draws small rectangles for pellets where `map[i][j] == 2`.
- `drawScore()`: Displays the current score in the top‑left corner.
- `drawLives()`: Shows remaining lives as Pacman icons in the bottom‑left.
- `drawGhosts()`: Calls each ghost’s `draw()` method.
- `pacman.draw()`: Draws Pacman (called from `draw()`).
- `draw()`: Master render function called each frame; clears canvas, then draws walls, foods, Pacman, score, ghosts, lives.
- `update()`: Advances game logic each frame:
  - Pacman movement and eating.
  - Ghost movement.
  - Collision checks (Pacman‑ghost, win condition).
- `gameLoop()`: Calls `draw()` then `update()`.
- `restartGame()`: Resets Pacman and ghosts, decrements lives, triggers `gameOver()` if lives reach zero.
- `gameOver()`: Shows "Game Over!" text and stops the loop.
- `drawGameOver()`: Renders the game‑over message.
- `drawWin()`: Shows "Ganhou!" (You won!) after a brief delay when all pellets are eaten.
- `createNewPacman()`: Instantiates the Pacman object at the starting position.
- `createGhosts()`: Instantiates six ghost objects using the four sprite slots (cycling).
- Event listener: Translates keyboard arrow keys (or WASD) into Pacman’s `nextDirection`.

### **3.** [pacman.js](/pacman.js)
Defines the `Pacman` class encapsulating all Pac‑specific behavior.

#### Constructor
`new Pacman(x, y, width, height, speed)`
- Sets position, size, speed.
- Initializes direction to `DIRECTION_RIGHT`.
- Prepares animation frame tracking (`currentFrame`, `frameCount`).
- Starts an interval (`setInterval`) to toggle the mouth open/closed every 100 ms.

#### Methods
- `moveProcess()`: Orchestrates movement:
  1. `changeDirectionPossible()` – attempts to change direction if requested.
  2. `moveForwards()` – moves one step in current direction.
  3. `checkCollision()` – if a wall is hit, `moveBackwards()` to revert.
- `eat()`: Scans the map; if Pacman occupies a cell with a pellet (`2`), sets it to `3` (eaten) and increments `score` after a short delay.
- `moveBackwards()` / `moveForwards()`: Adjust `x`/`y` based on `direction` and `speed`.
- `checkCollision()`: Returns `true` if any of Pacman’s four corner points (center, right‑side, bottom‑side, opposite corner) touches a wall (`map == 1`).
- `checkGhostCollision()`: Returns `true` if any ghost shares Pacman’s exact grid cell.
- `changeDirectionPossible()`: Implements direction‑change buffering:
  - If the requested `nextDirection` equals current direction, do nothing.
  - Otherwise, try to move in the new direction; if blocked, revert to original direction.
- `changeAnimation()`: Cycles `currentFrame` between 1 and `frameCount` to animate mouth opening/closing.
- `draw()`: Saves canvas state, translates/rotates to align Pacman’s sprite with its direction, draws the appropriate frame from `pacmanFrames`, then restores state.
- `getMapX()`, `getMapY()`: Return the grid column/row index of Pacman’s position.
- `getMapXRightSide()`, `getMapYRightSide()`: Return the grid index of the right/bottom edge (used for collision detection).

### **4.** [ghost.js](/ghost.js)
Defines the `Ghost` class controlling each enemy’s AI and rendering.

#### Constructor
`new Ghost(x, y, width, height, speed, imageX, imageY, imageWidth, imageHeight, range)`
- Sets visual properties, speed, and starting direction.
- Picks a random initial target index from `randomTargetsForGhosts`.
- Starts an interval (`setInterval`) to pick a new random target every 10 seconds.

#### Methods
- `changeRandomDirection()`: Advances `randomTargetIndex` by a random amount (mod 4) to wander.
- `moveProcess()`: Core AI loop each frame:
  1. If Pacman is within `range` (Euclidean distance in grid cells), set `target = pacman` (chase mode).
  2. Else, `target = randomTargetsForGhosts[randomTargetIndex]` (scatter/wander mode).
  3. Call `changeDirectionPossible()` to orient toward target.
  4. Move forward; handle wall collision via `moveBackwards()`.
- `moveBackwards()` / `moveForwards()`: Same logic as Pacman’s, based on `direction`.
- `checkCollision()`: Identical to Pacman’s wall‑collision test.
- `isInRangeOfPacman()`: Computes grid‑cell distance between ghost and Pacman; returns `true` if distance ≤ `range`.
- `changeDirectionPossible()`: Uses a breadth‑first search (BFS) to find the shortest path to the target:
  1. Copy the `map` into a mutable array `mp`.
  2. Initialize a queue with the ghost’s current location and an empty move list.
  3. Dequeue positions; if the destination is reached, return the first move that led there.
  4. Otherwise, mark the current cell as a wall (`mp[y][x] = 1`) and enqueue all non‑wall neighbors (up, down, left, right) with the path so far.
  5. If the queue empties (should not happen in a solvable maze), default to `DIRECTION_UP`.
- `addNeighbors(poped, mp)`: Helper that returns valid adjacent cells (within bounds and not a wall) for BFS, appending the taken direction to the path.
- `draw()`: Renders the ghost sprite from `ghostFrames` using its stored `imageX/Y` offset; also draws a red debug circle showing detection range (commented out).
- `getMapX()`, `getMapY()`, `getMapXRightSide()`, `getMapYRightSame`: Same utility methods as in Pacman for grid‑based positioning.

## How to Run
1. Clone or download this repository: 
```bash
git clone https://github.com/FelipeFMedeiros/Pacman.git
```
2. Open `index.html` in a modern web browser (Chrome, Firefox, Edge, Safari).
3. The game starts automatically. Use arrow keys **← ↑ → ↓** or **W A S D** to move Pacman.
4. Eat all pellets to win; avoid ghosts. You have three lives.

## Design Notes
- **Rendering**: All drawing is done with the Canvas 2D API; sprite sheets provide animation frames.
- **Collision**: Uses a grid‑based map; Pacman and ghosts are considered to occupy a single cell for collision, with extra checks for the sprite’s edges to prevent tunneling into walls.
- **Ghost AI**: Implements a simple scatter/chase behavior with BFS pathfinding when in range; otherwise, ghosts wander to fixed corner targets.
- **Extensibility**: To modify maze layout, edit the `map` array in `game.js`. Adjust `oneBlockSize` to scale the game size.

## Credits
This game was created by Felipe Medeiros as a learning project. Sprite assets are placeholders; replace them with your own for a custom look.
