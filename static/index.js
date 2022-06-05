let canvas = document.querySelector("#tileMap");
let ctx = canvas.getContext("2d");
let keys = {};

let socket = io();
let clients = [];

const clamp = (num, min, max) => Math.min(Math.max(num, min), max);
function encryptArray(array) {
	for(let x in array) {
		array[x] = Object.assign({}, array[x]);
	}
	return Object.assign({}, array);
}
function decryptArray(object) {
	let array = [];
	Object.entries(object).forEach(item => {
		let childarray = [];
		Object.entries(item[1]).forEach(itemy => {
			childarray[itemy[0]] = itemy[1];
		});
		array[item[0]] = childarray;
	});
	return array;
}

function getRandomInt(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomBool() {
	return Boolean(getRandomInt(0,1));
}

let tilemap = new NFTiles(canvas, {
	gridWidth:32,
	gridHeight:32,
	background:"rgb(150,150,255)",
	renderDistance: 420
});

function loadImage(w,h,url) {
	let image = new Image(w,h);
	image.src = url;
	return image;
}

let playerTextureL = loadImage(32,32,"image/steveleft.png");
let playerTextureR = loadImage(32,32,"image/steveright.png");
let playerItem = "Grass Block";
let playerInventory = [
	[0, 1],
	[1, 1],
	[2, 1],
	[3, 1],
	[4, 1],
	[5, 1],
	[6, 1],
	[-1, 0],
	[-1, 0]
];
let playerItemWheel = 0;

let textures = [
	["Grass Block","image/grassblock.png"],
	["Stone","image/stone.png"],
	["Dirt","image/dirt.png"],
	["Oak Log","image/oaklog.png"],
	["Oak Planks","image/oakplanks.png"],
	["Bricks","image/bricks.png"],
	["Glass","image/glass.png"]
]
textures.forEach(texture => {
	let image = loadImage(tilemap.gridWidth, tilemap.gridHeight, texture[1]);
	texture.push(image);
});

let types = [];
textures.forEach(texture => {
	types.push({name:texture[0],draw(ctx,xaxis,yaxis) {ctx.drawImage(texture[2], xaxis, yaxis, tilemap.gridWidth, tilemap.gridHeight)}})
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

				if(tilemap.optimize) if(Math.hypot(tilemap.getRealX(x)-player.x,tilemap.getRealY(y)-player.y) > tilemap.renderDistance) continue;
				
				let realx= tilemap.getRealX(x);
				let realy= tilemap.getRealY(y);

				if(this.x+this.w>=realx && this.x <= realx+tilemap.gridWidth && this.y+this.h+this.velocity.y>=realy && this.y<=realy+tilemap.gridHeight) { // collision check
					this.grounded = true;
					touchedbottom++;
					this.velocity.y = 0;
				} 

				if(this.y+this.h/2>=realy && this.y<=realy+tilemap.gridHeight/2) { // y collision
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

let player = new Player(0,-640,32,32);

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
		console.log(index, cindex)
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

socket.on("client.generate", () => {
	generateTerrain({
		startX: -50,
		startY: 0,
		clearBefore: true,
		length: 100,
		height: 15,
		maxHeight: 20,
		minHeight: -20,
		upProbility: 5,
		downProbility: 95,
	})
	let encryptedTerrain = encryptArray(tilemap.grid);
	socket.emit("client.generate", encryptedTerrain);
})

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

function Think() {
	tilemap.scrollCenter(player.x, player.y);
	tilemap.draw();
	player.collision();
	player.draw();

	controls();
	requestAnimationFrame(Think);
}

requestAnimationFrame(Think);

function generateTerrain(options={startX: 0,startY: 0,clearBefore: false,length: 20,height: 7,maxHeight: 20,minHeight: -20,upProbility:15, downProbility:95}) {
	let genX = options.startX ?? 0;
	let genY = options.startY ?? 0;
	options.clearBefore ??= false;
	options.length ??= 20;
	options.height ??= 7;
	options.maxHeight ??= 20;
	options.minHeight ??= -20;
	options.upProbility ??= 10;
	options.downProbility ??= 90;

	if(options.clearBefore) {
		tilemap.grid = [];
		for(let x=0;x<tilemap.gridX;x++) {
			tilemap.grid[x] = [];
			for(let y=0;y<tilemap.gridY;y++) {
				tilemap.grid[x].push([0]);      
			}
		}
	}
	function place() {
		
		if(!tilemap.grid[genX]) tilemap.grid[genX] = [];
		tilemap.grid[genX][genY] = {type:"Grass Block"};
		for(let h=0;h<options.height;h++){
			if(h==0 || h==1) {
				tilemap.grid[genX][genY+(h+1)] = {type:"Dirt"};
			} else {
				tilemap.grid[genX][genY+(h+1)] = {type:"Stone"};
			}
		}
	}

	for(let i=0;i<options.length;i++) {
		place();
		let height = getRandomInt(0, 100);
		if(height <= options.upProbility) { 
			genX++;
			if(height<options.maxHeight) {
				genY--;
			}
			place();
		} else if(height>options.upProbility && height<options.downProbility) {
			genX++;
			place();
		} else if(height>=options.downProbility) {
			genX++;
			if(height>options.minHeight) {
				genY++;
			}
			place();
		}
	}
	
}

function Inventory() {
	playerItem = textures[playerItemWheel]?.[0] ?? null;

	let invSlots = document.querySelectorAll(".invSlot");
	let invImageRaw = document.querySelectorAll(".invSlot img");

	invSlots.forEach((slot, index) => {
		let invImage = null
		invImageRaw.forEach((img, indexi) => {
			if(index === indexi) invImage = img;
		})
		

		if(playerInventory[index][0] === -1) {
			invImage.src = "image/empty.png";
		} else {
			invImage.src = textures[playerInventory[index][0]][1];
		}
		

		slot.classList.remove("selected");
		if(index == playerItemWheel) {
			slot.classList.add("selected");
		}
	})
}
Inventory();

addEventListener("keydown", (e) => {
	keys[e.code] = true;

	if(e.code.startsWith("Digit") && !e.code.endsWith("0")) {
		playerItemWheel = parseInt(e.code.substring(5,6))-1;
		Inventory();
	}
});

addEventListener("keyup", (e) => {
	keys[e.code] = false;
});

canvas.addEventListener("mousedown", (e) => {
	e.preventDefault();
	if(e.button == 0) { // Left click(sphilip)
		let blockX = Math.floor((e.clientX-tilemap.scrollX)/tilemap.gridWidth);
		let blockY = Math.floor((e.clientY-tilemap.scrollY)/tilemap.gridHeight);

		if(tilemap.grid[blockX]?.[blockY]) {
			tilemap.grid[blockX][blockY] = 0;
		}
		socket.emit("client.break", blockX, blockY);
	} else if(e.button == 2 || e.button == 1) {
		let blockX = Math.floor((e.clientX-tilemap.scrollX)/tilemap.gridWidth);
		let blockY = Math.floor((e.clientY-tilemap.scrollY)/tilemap.gridHeight);

		if(tilemap.grid[blockX]?.[blockY] == undefined || tilemap.grid[blockX]?.[blockY] == 0) {
			if(playerItem != null) {
				tilemap.grid[blockX] ??= [];
				tilemap.grid[blockX][blockY] = {type: playerItem};
			}
		}
		socket.emit("client.place", blockX, blockY, playerItem);
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
	tilemap.grid[x][y] = {type: block};
});

canvas.addEventListener("wheel", (e) => {
	if(e.wheelDelta > 0) { // UPPER WHEEL
		if(playerItemWheel == 0) {
			playerItemWheel = 9;
			Inventory();
		}
		if(playerItemWheel > 0) {
			playerItemWheel--;
			Inventory();
		}
	} else {
		if(playerItemWheel == 8) {
			playerItemWheel = -1;
			Inventory();
		}
		if(playerItemWheel < 8) {
			playerItemWheel++;
			Inventory();
		}
	}
});

canvas.addEventListener("contextmenu", (e) => {
	e.preventDefault();
});
