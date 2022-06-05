/*

	NFTILES.JS

	Engine Stats:
	
	Max coordinate that engine can handle: 1.073.741.790 (About 33 million 32x32 blocks)

*/

console.log("Powered by NFTiles");

class NFTiles {
	#types;

	constructor(canvas, options) {
		this.gridWidth = options?.gridWidth ?? 32;
		this.gridHeight = options?.gridHeight ?? 32;
		this.gridX = options?.gridX ?? canvas.width / this.gridWidth;
		this.gridY = options?.gridY ?? canvas.height / this.gridHeight;
		this.background = options?.background ?? "black";
		this.scrollX = 0;
		this.scrollY = 0;
		this.scrollObjectX = 0;
		this.scrollObjectY = 0;
		this.optimize = options?.optimize ?? true;
		this.renderDistance = options?.renderDistance ?? 500;

		this.#types = [];

		this.grid = [];
		for(let x=0;x<this.gridX;x++) {
			this.grid[x] = [];
			for(let y=0;y<this.gridY;y++) {
				this.grid[x].push([0]);      
			}
		}

		this.tobjects = [];
		this.canvas = canvas;
		this.ctx = canvas.getContext("2d");
	}
	getRealX(x) {
		return x * this.gridWidth;
	}
	getRealY(y) {
		return y * this.gridHeight;
	}
	draw() {
		this.ctx.fillStyle = this.background;
		this.ctx.fillRect(0,0,canvas.width,canvas.height);

		let grid = this.grid;
		this.ctx.save();
		this.ctx.translate(this.scrollX,this.scrollY)
		for(let x in grid) {
			if(grid[x] == undefined) continue;
			for(let y in grid[x]) {
				if(grid[x][y] == 0) continue;
				if(this.optimize) if(Math.hypot(this.getRealX(x)-this.scrollObjectX,this.getRealY(y)-this.scrollObjectY) > this.renderDistance) continue;
			
				this.#types.forEach(type => {
					if(type[0] === grid[x][y]?.type) {
						type[1](this.ctx, this.getRealX(x), this.getRealY(y), grid[x][y].data);
					}
				});
			}
		}
		this.tobjects.forEach(tobj => tobj.draw());
		this.ctx.restore();
	}
	updateTypes(types) {
		let parsedTypes = [];
		types.forEach(type => {
			parsedTypes.push([type.name, type.draw]);
		});

		this.#types = parsedTypes;
	}
	scrollCenter(x, y) {
		this.scrollObjectX = x;
		this.scrollObjectY = y;
		this.scrollX = -x+(tilemap.canvas.width/2);
		this.scrollY = -y+(tilemap.canvas.height/2);
	}
	save(saveName) {
		localStorage.setItem(saveName, JSON.stringify(this.grid));
	}
	load(saveName) {
		this.grid = JSON.parse(localStorage.getItem(saveName));
	}
}

NFTiles.TranslatedObject = class {
	constructor(tilemap, draw = ()=>{}) {
		this.draw = draw;

		tilemap.tobjects.push(this);
	}
}