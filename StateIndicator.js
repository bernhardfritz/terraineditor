class StateIndicator {
	constructor() {
		this.modeLabel = document.getElementById('modeLabel');
	}

	set color(color) {
		this.modeLabel.style.borderLeft = `3px solid ${color}`;
	}

	set text(text) {
		this.modeLabel.textContent = text;
	}
}

module.exports = {
  StateIndicator
};