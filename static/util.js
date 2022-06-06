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