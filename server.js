const express = require("express");
const path = require("path");
const http = require('http');
const { Server } = require("socket.io");

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

let PORT = 8000;

const app = express();
const server = http.createServer(app);

const io = new Server(server);
let clients = [];
let grid = null;

app.use("/", express.static(path.resolve(__dirname, "static")));

app.get("/", (req, res) => {
	res.sendFile(path.resolve(__dirname, "static", "index.html"));
});

server.listen(PORT, () => {
	console.log(`[NFCRAFT] Listening at port ${PORT}`);
});

// SOCKET.IO

io.on("connection", async (socket) => {
	console.log(socket.id + " joined.");
	socket.name = "Player_"+getRandomInt(1000,9999);
	socket.broadcast.emit("client.join", socket.id, socket.name);
	if(!grid) socket.emit("client.generate");
	socket.emit("client.list", clients, grid);
	clients.push({name:socket.name,id:socket.id,x:0,y:0});

	socket.on("client.position", (x,y,velocity) => {
		socket.x = x;
		socket.y = y;
		socket.velocity = velocity;
		socket.broadcast.emit("client.position", socket.id, x, y, velocity);
	});

	socket.on("client.generate", (gridmap) => {
		grid = gridmap;
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
		grid[x][y] = {type: block};
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

