class Keyboard {
	constructor() {
		this.keyDownMap = new Map();
		this.keyUpMap = new Map();
	}

	init() {
		document.addEventListener('keydown', (event) => {
			if (this.keyDownMap.has(event.keyCode)) (this.keyDownMap.get(event.keyCode))();
		}, false);
		document.addEventListener('keyup', (event) => {
			if (this.keyUpMap.has(event.keyCode)) (this.keyUpMap.get(event.keyCode))();
		}, false);
	}

	onKeyDown(key, fn) {
		this.keyDownMap.set(key, fn);
	}

	onKeyUp(key, fn) {
		this.keyUpMap.set(key, fn);
	}
}

module.exports = {
	Keyboard
};
