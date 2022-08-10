class Block {
    constructor() {
        this.name = "Default";
        this.texture = "image/dirt.png";
        this.bakedData = {};
    }
}

/*

    Block base of NFCraft 2D
    To add new blocks, just copy paste any block you want and change its name and tick, click functions etc.
    Note: Ingame ID list will be the same order you give Blocks.
    
    Tick: when a game tick happens. (Note that block's game tick won't happen if the block is out of range)
    Click: when a block is been right-clicked.

*/

/*

    BakedData - Data that is been baked into the model.

    Unbreakable: Nothing can break this model.
    Nocollision: Any collideable object cannot pass through this model.
    Grassfriendly: This model won't turn grass block into dirt when placed onto a grass block.
    Nodrop: Doesn't drop itself when broken.

*/

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
}

class Stone extends Block {
    constructor() {
        super();
        this.name = "Stone";
        this.texture = "image/stone.png";
    }
}

class OakLog extends Block {
    constructor() {
        super();
        this.name = "Oak Log";
        this.texture = "image/oaklog.png";
    }
}

class OakLeaves extends Block {
    constructor() {
        super();
        this.name = "Oak Leaves";
        this.texture = "image/oakleaves.png";
        this.bakedData = {nodrop: true}
    }
}

class OakPlanks extends Block {
    constructor() {
        super();
        this.name = "Oak Planks";
        this.texture = "image/oakplanks.png";
    }
}

class Bricks extends Block {
    constructor() {
        super();
        this.name = "Bricks";
        this.texture = "image/bricks.png";
    }
}

class Glass extends Block {
    constructor() {
        super();
        this.name = "Glass";
        this.texture = "image/glass.png";
    }
}

class Bedrock extends Block {
    constructor() {
        super();
        this.name = "Bedrock";
        this.texture = "image/bedrock.png";
        this.bakedData = {unbreakable: true};
    }
}

class Poppy extends Block {
    constructor() {
        super();
        this.name = "Poppy";
        this.texture = "image/poppy.png";
        this.bakedData = {nocollision:true, grassfriendly:true};
    }
    tick(tilemap, client, x, y, data) {
        if(tilemap.grid[x] == undefined) return;

        if(tilemap.grid[x][y+1] === 0 || tilemap.grid[x][y+1] === undefined) {
            tilemap.grid[x][y] = 0;
            client.emit("client.blockupdate", x,y, 0);
        }
    }
}

class Chest extends Block {
    constructor() {
        super();
        this.name = "Chest";
        this.texture = "image/chest.png";
        this.bakedData = {nocollision:true, grassfriendly:true};
    }
    tick(tilemap, client, x, y, data) {}
    click(tilemap, client, x, y, data, playerInventory) {
        tilemap.grid[x][y] = 0;
        client.emit("client.blockupdate", x, y, 0);
    }
}

Blocks = {
    GrassBlock: new GrassBlock(),
    Dirt: new Dirt(),
    Stone: new Stone(),
    OakLog: new OakLog(),
    OakLeaves: new OakLeaves(),
    OakPlanks: new OakPlanks(),
    Bricks: new Bricks(),
    Glass: new Glass(),
    Bedrock: new Bedrock(),
    Poppy: new Poppy(),
    Chest: new Chest()
}