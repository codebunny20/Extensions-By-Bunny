const startButton = document.getElementById("startScroll");
const stopButton = document.getElementById("stopScroll");

async function getActiveTabId() {
	const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
	return tabs[0] && tabs[0].id;
}

async function sendScrollCommand(action) {
	const tabId = await getActiveTabId();

	if (!tabId) {
		return;
	}

	try {
		await chrome.tabs.sendMessage(tabId, { action });
	} catch (error) {
		// If there is no receiver, inject the script and retry once.
		if (error && error.message && error.message.includes("Receiving end does not exist")) {
			try {
				await chrome.scripting.executeScript({
					target: { tabId },
					files: ["scroll.js"]
				});
				await chrome.tabs.sendMessage(tabId, { action });
				return;
			} catch (injectError) {
				console.warn("Unable to inject content script:", injectError);
			}
		}

		// Content scripts are not available on restricted pages like chrome:// URLs.
		console.warn("Unable to send command to page:", error);
	}
}

if (startButton) {
	startButton.addEventListener("click", () => {
		sendScrollCommand("start");
	});
}

if (stopButton) {
	stopButton.addEventListener("click", () => {
		sendScrollCommand("stop");
	});
}
