class Block {
    constructor() {
        this.name = "Default";
        this.texture = "image/dirt.png";
    }
    tick(tilemap, client, x, y, data) {}
}

class GrassBlock extends Block {
    constructor() {
        super();
        this.name = "Grass Block";
        this.texture = "image/grassblock.png";
    }
    tick(tilemap, client, x, y, data) {
        if(tilemap.grid[x] == undefined) return;

        if(tilemap.grid[x][y-1] === 0 || tilemap.grid[x][y-1] === undefined) return;
        tilemap.grid[x][y] = {type:"Dirt"};
        client.emit("client.blockupdate", x,y, "Dirt");
    }
}

class Dirt extends Block {
    constructor() {
        super();
        this.name = "Dirt";
        this.texture = "image/dirt.png";
    }
    tick(tilemap, client, x, y, data) {}
}

class Stone extends Block {
    constructor() {
        super();
        this.name = "Stone";
        this.texture = "image/stone.png";
    }
    tick(tilemap, client, x, y, data) {}
}

class OakLog extends Block {
    constructor() {
        super();
        this.name = "Oak Log";
        this.texture = "image/oaklog.png";
    }
    tick(tilemap, client, x, y, data) {}
}

class OakPlanks extends Block {
    constructor() {
        super();
        this.name = "Oak Planks";
        this.texture = "image/oakplanks.png";
    }
    tick(tilemap, client, x, y, data) {}
}

class Bricks extends Block {
    constructor() {
        super();
        this.name = "Bricks";
        this.texture = "image/bricks.png";
    }
    tick(tilemap, client, x, y, data) {}
}

class Glass extends Block {
    constructor() {
        super();
        this.name = "Glass";
        this.texture = "image/glass.png";
    }
    tick(tilemap, client, x, y, data) {}
}

class Chest extends Block {
    constructor() {
        super();
        this.name = "Chest";
        this.texture = "image/chest.png";
    }
    tick(tilemap, client, x, y, data) {}
}

Blocks = {
    GrassBlock: new GrassBlock(),
    Dirt: new Dirt(),
    Stone: new Stone(),
    OakLog: new OakLog(),
    OakPlanks: new OakPlanks(),
    Bricks: new Bricks(),
    Glass: new Glass(),
    Chest: new Chest()
}