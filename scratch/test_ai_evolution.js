const fs = require('fs');
const vm = require('vm');

global.window = global;
global.document = {
    getElementById: () => ({
        getContext: () => ({
            save: () => {},
            restore: () => {},
            drawImage: () => {},
            fillRect: () => {},
            strokeRect: () => {},
            fillText: () => {},
            measureText: () => ({ width: 50 })
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
global.DIRECTION_RIGHT = 4;
global.DIRECTION_UP = 3;
global.DIRECTION_LEFT = 2;
global.DIRECTION_BOTTOM = 1;
global.oneBlockSize = 20;
global.fps = 30;

vm.runInThisContext(fs.readFileSync('maps.js', 'utf8'));

console.log('Available maps:', MAPS.map(m => m.id));
console.log('Arena spawns:', MAPS.find(m => m.id === 'arena').ghostSpawns);
