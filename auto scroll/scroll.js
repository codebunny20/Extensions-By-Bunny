if (!window.__autoScrollExtensionInitialized) {
	window.__autoScrollExtensionInitialized = true;

	let scrollTimer = null;

function isAtPageBottom() {
	const scrollBottom = window.scrollY + window.innerHeight;
	const pageHeight = document.documentElement.scrollHeight;
	return scrollBottom >= pageHeight - 2;
}

function startAutoScroll() {
	if (scrollTimer !== null) {
		return;
	}

	scrollTimer = window.setInterval(() => {
		if (isAtPageBottom()) {
			stopAutoScroll();
			return;
		}

		window.scrollBy(0, 3);
	}, 16);
}

function stopAutoScroll() {
	if (scrollTimer === null) {
		return;
	}

	window.clearInterval(scrollTimer);
	scrollTimer = null;
}

chrome.runtime.onMessage.addListener((message) => {
	if (!message || !message.action) {
		return;
	}

	if (message.action === "start") {
		startAutoScroll();
	}

	if (message.action === "stop") {
		stopAutoScroll();
	}
});
}
