const fpsCounter = document.querySelector("#fpsCount");
const mouseSlot = document.querySelector(".mouseSlot");
const mainContainer = document.querySelector(".mainContainer");
const inventoryMenu = document.querySelector(".inventoryMenu");
const hudInventory = document.querySelector("#hudInventory");

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
function loadImage(w,h,url) {
	let image = new Image(w,h);
	image.src = url;
	return image;
}

function getBlockNameFromID(blocks, id) {
	let returnedName;
	blocks.forEach((block,index) => {
		if(index === id) returnedName = block;
	});
	if(!returnedName) return false;
	return {name:returnedName[0], texture:returnedName[1]};
}

function getIDFromTextureName(blocks, name) {
	let returnedID;
	blocks.forEach((block,index) => {
		if(block[1] === name) returnedID = index;
	});
	return returnedID;
}

function getIDFromName(blocks, name) {
	let returnedID;
	blocks.forEach((block,index) => {
		if(block[0] === name) returnedID = index;
	});
	return returnedID;
}

function compareInventoryWithMouse(blocks, inventory, mouse) {
	let invName = getBlockNameFromID(blocks, inventory[0]);
	let id = getIDFromTextureName(blocks, mouse);
	let mouseName = getBlockNameFromID(blocks, id);
	if(invName === mouseName) return true;
	return false;
}

function getFreeSlot(inventory, blockID) {
	let len = inventory.length;
	for(let i=0;i<len;i++) {
		let inventorySlot = inventory[i];

		if(inventorySlot[0] === blockID && inventorySlot[1] < MAXIMUM_SLOT) return i;
		if(inventorySlot[0] === -1) return i;
	}
}

function getRemovedSlot(inventory, blockID) {
	let len = inventory.length;
	for(let i=0;i<len;i++) {
		let inventorySlot = inventory[i];

		if(inventorySlot[0] === blockID) return i;
	}
}

function getTypeFromBlockName(types, blockName) {
	let blocktype = types.find(texture => texture.name === blockName);
	if(!blocktype) return null;
	if(blocktype) return blocktype;
}

let lastCalledTime;
let counter = 0;
let fpsArray = [];

function fpsLoop(timestamp) {
	var fps;

	if (!lastCalledTime) {
		lastCalledTime = new Date().getTime();
		fps = 0;
	}

	var delta = (new Date().getTime() - lastCalledTime) / 1000;
	lastCalledTime = new Date().getTime();
	fps = Math.ceil((1/delta));

	if (counter >= 60) {
		var sum = fpsArray.reduce(function(a,b) { return a + b });
		var average = Math.ceil(sum / fpsArray.length);
		fpsCounter.innerText = fps + " FPS";
		counter = 0;
	} else {
		if (fps !== Infinity) {
			fpsArray.push(fps);
		}
		counter++;
	}
}