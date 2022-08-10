let canvas = document.querySelector("#tileMap");
let ctx = canvas.getContext("2d");
let keys = {};

MAXIMUM_SLOT = 64;

let socket = io();
let clients = [];

let textures = [];
Object.entries(Blocks).forEach(block => {
	textures.push([block[1].name, block[1].texture, block[1].bakedData,block[1].tick, block[1].click]);
});

let tilemap = new NFTiles(canvas, {
	gridWidth:32,
	gridHeight:32,
	background:"rgb(150,150,255)",
	renderDistance: 420 // :)
});

let playerTextureL = loadImage(32,32,"image/steveleft.png");
let playerTextureR = loadImage(32,32,"image/steveright.png");
let playerItem = "Grass Block";
let inventoryStatus = false;
let playerInventory = [];
for(let i=0;i<36;i++) {
	playerInventory[i] = [-1, 0];
}
playerInventory[0] = [0, 1];
let playerItemWheel = 0;
let mouseItem = "";
let mouseItemCount = 0;

textures.forEach(texture => {
	let image = loadImage(tilemap.gridWidth, tilemap.gridHeight, texture[1]);
	texture.push(image);
});

let types = [];
textures.forEach(texture => {
	types.push({name:texture[0],bakedData:texture[2],data:{tick:texture[3] ?? null,click:texture[4] ?? null},draw(ctx,xaxis,yaxis) {ctx.drawImage(texture[5], xaxis, yaxis, tilemap.gridWidth, tilemap.gridHeight)}})
})

tilemap.updateTypes(types);

let friction = 0.95;
class Player {
	constructor(x,y,w,h) {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
		this.velocity = {x:0,y:0};
		this.grounded = false;
		this.leftcol = false;
		this.rightcol = false;
		this.tobject = new NFTiles.TranslatedObject(tilemap, () => {
			let playerTexture = this.velocity.x > 0 ? playerTextureR : playerTextureL;
			ctx.drawImage(playerTexture, this.x, this.y, tilemap.gridWidth, tilemap.gridHeight);
		})
	}
	draw() {
		this.velocity.x *= friction;
		if(!this.grounded) this.velocity.y+=0.1;
		this.velocity.y = clamp(this.velocity.y, -3, 5);

		if(this.leftcol && this.velocity.x < 0) this.velocity.x = 0;
		if(this.rightcol && this.velocity.x > 0) this.velocity.x = 0;

		this.x += this.velocity.x;
		this.y += this.velocity.y;
	}
	collision() {
		let touchedbottom = 0;
		let touchedleft = false;
		let touchedright = false;
		for (let x in tilemap.grid) {
			if(tilemap.grid[x] == undefined) continue;
			for (let y in tilemap.grid[x]) {
				if(tilemap.grid[x][y] == 0) continue;
				if(tilemap.grid[x][y] == undefined) continue;

				let blockType = getTypeFromBlockName(types, tilemap.grid[x][y].type);
				if(blockType?.bakedData?.nocollision) continue;

				if(tilemap.optimize) if(Math.hypot(tilemap.getRealX(x)-player.x,tilemap.getRealY(y)-player.y) > tilemap.renderDistance) continue;
				
				let realx= tilemap.getRealX(x);
				let realy= tilemap.getRealY(y);

				if(this.x+this.w>=realx && this.x <= realx+tilemap.gridWidth && this.y+this.h+this.velocity.y>=realy && this.y<=realy+tilemap.gridHeight) { // collision check
					this.grounded = true;
					touchedbottom++;
					this.velocity.y = 0;
				} 

				if(this.y+this.h-0.1>=realy && this.y<=realy+tilemap.gridHeight-0.1) { // y collision
					if(this.x-this.velocity.x > realx && this.x+this.velocity.x < realx+tilemap.gridWidth) { // LEFT COLLISION
						this.leftcol = true;
						touchedleft = true;
						this.velocity.x = 0;
					}
					if(this.x+this.w+this.velocity.x > realx && this.x+this.w+this.velocity.x < realx+tilemap.gridWidth+this.velocity.x) { // RIGHT COLLISION
						this.rightcol = true;
						touchedright = true;
						this.velocity.x = 0;
					}
				}
			}
		}
		if(touchedbottom==0) this.grounded=false;
		if(!touchedleft) this.leftcol=false;
		if(!touchedright) this.rightcol=false;
	}
}

class Client {
	constructor(id,name,x,y,w,h) {
		this.id = id;
		this.name = name;
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
		this.velocity = {x:0,y:0};
		this.tobject = new NFTiles.TranslatedObject(tilemap, () => {
			let playerTexture = this.velocity.x > 0 ? playerTextureR : playerTextureL;

			ctx.font = "14px Comic Sans MS";
			ctx.fillStyle = "black";
			ctx.textAlign = "center";
			ctx.fillText(this.name, this.x+16, this.y-8);
			ctx.drawImage(playerTexture, this.x, this.y, tilemap.gridWidth, tilemap.gridHeight);
		});
	}
	draw() {
	}
}

let player = new Player(0,-680,32,32);

// SOCKET
socket.on("client.join", (id, name) => {
	clients.push(new Client(id, name, 0, 0, 32, 32));
});

socket.on("client.disconnect", (id, name) => {
	let cindex = null;
	clients.forEach((client, index) => {
		if(client.id !== id) return;
		clients.splice(index, 1);
		cindex = index;
	});
	let playerExcluded = tilemap.tobjects.slice(1, tilemap.tobjects.length);
	playerExcluded.forEach((client, index) => {
		if(index !== cindex) return;
		tilemap.tobjects.splice(index+1, 1);
	});
});

socket.on("client.list", (clientlist, grid) => {
	clientlist.forEach(client => {
		clients.push(new Client(client.id, client.name, client.x, client.y, 32, 32));
	});

	if(grid != null) {
		let decryptedTerrain = decryptArray(grid);
		tilemap.grid = decryptedTerrain;
	}
});

socket.on("client.position", (id,x,y,velocity) => {
	let foundClient = null;
	clients.forEach((client) => {
		if(client.id === id) foundClient = client;
	});
	if(!foundClient) return;
	
	foundClient.x = x;
	foundClient.y = y;
	foundClient.velocity = velocity;
});

function controls() {
	socket.emit("client.position", player.x, player.y, player.velocity);

	if(mouseItem == "") mouseSlot.classList.add("empty");
	else {
		mouseSlot.setAttribute("src", mouseItem);
		mouseSlot.classList.remove("empty");
	}

	if(keys["KeyA"]) {
		player.velocity.x -= 0.1;
	}
	if(keys["KeyD"]) {
		player.velocity.x += 0.1;
	}
	if(player.grounded) if(keys["KeyW"] || keys["Space"]) {
		player.grounded = false;
		player.velocity.y = -5;
	}
}

function BlockData() {
	for (let x in tilemap.grid) {
		if(tilemap.grid[x] == undefined) continue;
		for (let y in tilemap.grid[x]) {
			if(tilemap.grid[x][y] == 0) continue;
			if(tilemap.grid[x][y] == undefined) continue;
			if(tilemap.optimize) if(Math.hypot(tilemap.getRealX(x)-player.x,tilemap.getRealY(y)-player.y) > tilemap.renderDistance) continue;

			let block = tilemap.grid[x][y];

			let blocktype = types.find(texture => texture.name === block.type);
			if(!blocktype) return;
			if(blocktype.data.tick) blocktype.data.tick(tilemap, socket, x, y, block.data);
		}
	}
}

function Think() {
	tilemap.scrollCenter(player.x, player.y);
	tilemap.draw();
	player.collision();
	player.draw();
	BlockData();

	controls();
	fpsLoop();
	requestAnimationFrame(Think);
}

requestAnimationFrame(Think);

function InventoryLoop() {
	let currentTexture = playerInventory[playerItemWheel]?.[0] ?? playerItemWheel; // Current block that have been chosen
	playerItem = textures[currentTexture]?.[0] ?? null;

	let invSlots = document.querySelectorAll(".invSlot");
	let invImageRaw = document.querySelectorAll(".invSlot img");
	let invCountRaw = document.querySelectorAll(".invSlot span");

	invSlots.forEach((slot, index) => {
		let invImage = null;
		let invCount = null;
		invImageRaw.forEach((img, indexi) => {
			if(index === indexi) invImage = img;
		})

		invCountRaw.forEach((span, indexi) => {
			if(index === indexi) invCount = span;
		})
		
		if(playerInventory[index][0] === -1) {
			invImage.src = "image/empty.png";
		} else {
			invImage.src = textures[playerInventory[index][0]][1];
		}

		if(playerInventory[index][1] > 1) {
			invCount.innerText = playerInventory[index][1];
			invCount.classList.remove("invisible");
		} else {
			invCount.classList.add("invisible");
		}

		slot.classList.remove("selected");
		if(index == playerItemWheel) {
			slot.classList.add("selected");
		}
	})
}
InventoryLoop();

addEventListener("keydown", (e) => {
	keys[e.code] = true;

	if(e.code.startsWith("Digit") && !e.code.endsWith("0")) {
		playerItemWheel = parseInt(e.code.substring(5,6))-1;
		InventoryLoop();
	}
	if(e.code === "KeyE") {
		if(inventoryStatus) {
			inventoryStatus = false;
			inventoryMenu.style = "display: none;";
		} else {
			inventoryStatus = true;
			inventoryMenu.style = "display: initial;";
		}
	}
});

addEventListener("keyup", (e) => {
	keys[e.code] = false;
});

mainContainer.addEventListener("mousedown", (e) => {
	e.preventDefault();
	if(e.button == 0) { // Left click(sphilip)
		let blockX = Math.floor((e.offsetX-tilemap.scrollX)/tilemap.gridWidth);
		let blockY = Math.floor((e.offsetY-tilemap.scrollY)/tilemap.gridHeight);

		let blockType = getTypeFromBlockName(types, tilemap.grid[blockX]?.[blockY]?.type);
		if(blockType?.bakedData?.unbreakable) return;

		let blockID = getIDFromName(textures, tilemap.grid[blockX]?.[blockY]?.type);
		let freeSlot = getFreeSlot(playerInventory, blockID);
		
		if(freeSlot && blockID) { // add item to inventory
			if(!blockType?.bakedData?.nodrop) {
				playerInventory[freeSlot][0] = blockID;
				playerInventory[freeSlot][1]++;
			}
		}

		InventoryLoop();

		if(tilemap.grid[blockX]?.[blockY]) {
			tilemap.grid[blockX][blockY] = 0;
		}

		socket.emit("client.break", blockX, blockY);
	} else if(e.button == 2 || e.button == 1) { // Right click(sphilip)
		let blockX = Math.floor((e.offsetX-tilemap.scrollX)/tilemap.gridWidth);
		let blockY = Math.floor((e.offsetY-tilemap.scrollY)/tilemap.gridHeight);

		if(tilemap.grid[blockX]?.[blockY] == undefined || tilemap.grid[blockX]?.[blockY] == 0) {
			if(playerItem != null) {
				tilemap.grid[blockX] ??= [];
				tilemap.grid[blockX][blockY] = {type: playerItem};

				let blockID = getIDFromName(textures, playerItem);
				let removedSlot = getRemovedSlot(playerInventory, blockID);

				if(removedSlot && blockID) {
					playerInventory[removedSlot][0] = blockID;
					playerInventory[removedSlot][1]--;
				}
				if(playerInventory[removedSlot][1] <= 0) {
					playerInventory[removedSlot][0] = -1;
					playerInventory[removedSlot][1] = 0;
				}

				InventoryLoop();

				socket.emit("client.place", blockX, blockY, playerItem);
			}
		} else {
			let block = tilemap.grid[blockX]?.[blockY]
			let blocktype = types.find(texture => texture.name === block.type);
			if(!blocktype) return;
			if(blocktype.data.click) blocktype.data.click(tilemap, socket, blockX, blockY, block.data, playerInventory);
		}
		
	}
});

// SOCKET

socket.on("client.break", (x,y) => {	
	if(tilemap.grid[x]?.[y]) {
		tilemap.grid[x][y] = 0;
	}
});

socket.on("client.place", (x,y,block) => {	
	if(!tilemap.grid[x]) tilemap.grid[x] = [];
	if(block === 0) tilemap.grid[x][y] = 0;
	else tilemap.grid[x][y] = {type: block};
});

mainContainer.addEventListener("wheel", (e) => {
	if(e.wheelDelta > 0) { // UPPER WHEEL
		if(playerItemWheel == 0) {
			playerItemWheel = 9;
			InventoryLoop();
		}
		if(playerItemWheel > 0) {
			playerItemWheel--;
			InventoryLoop();
		}
	} else {
		if(playerItemWheel == 8) {
			playerItemWheel = -1;
			InventoryLoop();
		}
		if(playerItemWheel < 8) {
			playerItemWheel++;
			InventoryLoop();
		}
	}
});

mainContainer.addEventListener("contextmenu", (e) => {
	e.preventDefault();
});

mainContainer.addEventListener("mousemove", (e) => {
	if(mouseItem != "") {
		mouseSlot.style.left = e.clientX + "px";
		mouseSlot.style.top = e.clientY + "px";
	}
});

inventoryMenu.addEventListener("click", (e) => {
	let invSlots = document.querySelectorAll(".invSlot");
	let invIndex;

	invSlots.forEach((slot, index) => {
		let bounding = slot.getBoundingClientRect();
		if(e.clientX > bounding.x && e.clientX < bounding.x+40) {
			if(e.clientY > bounding.y && e.clientY < bounding.y+40) {
				invIndex = index;
			}
		}
	})

	if(!playerInventory[invIndex][0] < 0 || !playerInventory[invIndex][1] <= 0) {
		if(mouseItem == "" && !compareInventoryWithMouse(textures, playerInventory[invIndex], mouseItem)) {
			let blockName = getBlockNameFromID(textures, playerInventory[invIndex][0]);
		
			mouseItem = blockName.texture;
			mouseItemCount = playerInventory[invIndex][1];
			playerInventory[invIndex] = [-1, 0];
		} else {
			mouseItemCount += playerInventory[invIndex][1];
			playerInventory[invIndex] = [-1, 0];
		}
	}
	else if(playerInventory[invIndex][0] < 0 || playerInventory[invIndex][1] <= 0) {
		if(mouseItem != "") {
			let blockID = getIDFromTextureName(textures, mouseItem);
			playerInventory[invIndex] = [blockID, mouseItemCount];
			mouseItem = "";
			mouseItemCount = 0;
		}
	}
	
	InventoryLoop();
});
