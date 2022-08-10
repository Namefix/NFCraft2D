const express = require("express");
const path = require("path");
const http = require('http');
const fs = require("fs");
const { Server } = require("socket.io");
const config = require("./serverproperties.json");

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

function generateTerrain(options={startX: 0,startY: 0,clearBefore: false,length: 20,height: 7,maxHeight: 20,minHeight: -20,upProbility:15, downProbility:95}) {
	let genX = options.startX ?? 0;
	let genY = options.startY ?? 0;

	if(options.clearBefore) {
		grid = [];
		for(let x=0;x<gridX;x++) {
			grid[x] = [];
			for(let y=0;y<gridY;y++) {
				grid[x].push([0]);      
			}
		}
	}
	function place() {
		if(!grid[genX]) grid[genX] = [];
		grid[genX][genY] = {type: options.terrainBlocks.topBlanket};
		let len = options.height;
		for(let h=0;h<len;h++){
			if(h==0 || h==1) {
				grid[genX][genY+(h+1)] = {type:options.terrainBlocks.midFiller};
			} else {
				if(h+1 == len) grid[genX][genY+(h+1)] = {type:options.terrainBlocks.bottomBlanket};
				else grid[genX][genY+(h+1)] = {type:options.terrainBlocks.bottomFiller};
			}
		}
		let treeChance = getRandomInt(0, 100);

		if(treeChance <= options.treeProbility) {
			if(!grid[genX+1]) grid[genX+1] = [];
			if(!grid[genX-1]) grid[genX-1] = [];
			grid[genX][genY-1] = {type:options.terrainBlocks.treeBase};
			grid[genX][genY-2] = {type:options.terrainBlocks.treeBase};
			grid[genX][genY-3] = {type:options.terrainBlocks.treeBase};
			grid[genX+1][genY-3] = {type:options.terrainBlocks.treeLeaves};
			grid[genX+1][genY-4] = {type:options.terrainBlocks.treeLeaves};
			grid[genX-1][genY-3] = {type:options.terrainBlocks.treeLeaves};
			grid[genX-1][genY-4] = {type:options.terrainBlocks.treeLeaves};
			grid[genX][genY-4] = {type:options.terrainBlocks.treeLeaves};
			grid[genX][genY-5] = {type:options.terrainBlocks.treeLeaves};
		} else {
			let poppyChance = getRandomInt(0, 100);

			if(poppyChance < 7) grid[genX][genY-1] = {type:"Poppy"};
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

let PORT = config.port || 8000;

const app = express();
const server = http.createServer(app);

const io = new Server(server);
let clients = [];
let grid = [];
let closed;

function saveWorld(exit=false) {
	if(closed) return;
	console.log(`[INFO] Saving world...`);
	let encryptedArray = encryptArray(grid);
	fs.writeFileSync(config.worldPath, JSON.stringify(encryptedArray));
	console.log(`[INFO] World saved.`);
	if(exit) {
		closed = true; 
		process.exit();
	}
}

if(fs.existsSync(config.worldPath)) {
	let rawWorldStr = fs.readFileSync(config.worldPath);
	let rawWorld = JSON.parse(rawWorldStr);
	grid = decryptArray(rawWorld);
	console.log(`[INFO] Loaded ${config.worldPath}`);
} else {
	console.log(`[INFO] Generating Terrain...`);
	generateTerrain(config.generatorSettings);
	let encryptedArray = encryptArray(grid);
	fs.writeFileSync(config.worldPath, JSON.stringify(encryptedArray, undefined, 2));
	console.log(`[INFO] Terrain Generated.`);
}

app.use("/", express.static(path.resolve(__dirname, "static")));

app.get("/", (req, res) => {
	res.sendFile(path.resolve(__dirname, "static", "index.html"));
});

server.listen(PORT, () => {
	console.log(`[INFO] Listening at localhost:${PORT}`);
});

// SOCKET.IO

io.on("connection", async (socket) => {
	console.log(`[INFO] Incoming connection from ${socket.handshake.address}`);
	socket.name = "Player_"+getRandomInt(1000,9999);
	socket.broadcast.emit("client.join", socket.id, socket.name);
	socket.emit("client.list", clients, encryptArray(grid), config.serverName);
	clients.push({name:socket.name,id:socket.id,x:0,y:0});

	socket.on("client.position", (x,y,velocity) => {
		socket.x = x;
		socket.y = y;
		socket.velocity = velocity;
		socket.broadcast.emit("client.position", socket.id, x, y, velocity);
	});
	
	socket.on("client.break", (x,y) => {
		if(grid[x] === undefined) grid[x] = [];
		grid[x][y] = 0;
		socket.broadcast.emit("client.break", x,y);
	});

	socket.on("client.place", (x,y,block) => {
		if(grid[x] === undefined) grid[x] = [];
		if(grid[x][y] == 0) return;
		grid[x][y] = {type: block};
		socket.broadcast.emit("client.place", x,y,block);
	});

	socket.on("client.blockupdate", (x,y,block) => {
		if(grid[x] === undefined) grid[x] = [];
		if(block === 0) grid[x][y] = 0;
		else grid[x][y] = {type: block};
		socket.broadcast.emit("client.place", x,y,block);
	})

	socket.on("disconnect", (reason) => {
		clients.forEach((client, index) => {
			if(client.id !== socket.id) return;
			clients.splice(index, 1);
			socket.broadcast.emit("client.disconnect", client.id, client.name);
		});
	})
});

if(config.autoSave > 0) {
	setInterval(saveWorld, config.autoSave*60*1000);
}

if(grid) { // Crash-Saving
	// app is closing
	process.on('exit', saveWorld.bind(null, true));
	// CTRL+C
	process.on('SIGINT', saveWorld.bind(null, true));
	// kill pid
	process.on('SIGUSR1', saveWorld.bind(null, true));
	process.on('SIGUSR2', saveWorld.bind(null, true));
	// uncaught exceptions
	process.on('uncaughtException', saveWorld.bind(null, true));
}

