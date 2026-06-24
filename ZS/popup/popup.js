// DOM Elements
const runButton = document.getElementById("run-btn");
const statusText = document.getElementById("status");
const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");
const formatSelect = document.getElementById("format-select");
const saveSettingsBtn = document.getElementById("save-settings-btn");
const settingsStatus = document.getElementById("settings-status");

// Default settings
const DEFAULT_SETTINGS = {
	format: "txt"
};

// Set status message with optional error/success styling
function setStatus(text, isError = false) {
	if (!statusText) return;
	statusText.textContent = text;
	statusText.classList.remove("error", "success");
	if (isError) {
		statusText.classList.add("error");
	}
}

// Set settings status message
function setSettingsStatus(text, isError = false) {
	if (!settingsStatus) return;
	settingsStatus.textContent = text;
	settingsStatus.classList.remove("error", "success");
	if (isError) {
		settingsStatus.classList.add("error");
	} else if (text) {
		settingsStatus.classList.add("success");
	}
}

// Load settings from storage
async function loadSettings() {
	try {
		const result = await chrome.storage.local.get("settings");
		const settings = result.settings || DEFAULT_SETTINGS;
		
		if (formatSelect) {
			formatSelect.value = settings.format || DEFAULT_SETTINGS.format;
		}
	} catch (error) {
		console.error("Error loading settings:", error);
		// Use defaults if loading fails
		if (formatSelect) {
			formatSelect.value = DEFAULT_SETTINGS.format;
		}
	}
}

// Save settings to storage
async function saveSettings() {
	try {
		if (!saveSettingsBtn) return;
		saveSettingsBtn.disabled = true;
		
		const settings = {
			format: formatSelect?.value || DEFAULT_SETTINGS.format
		};
		
		await chrome.storage.local.set({ settings });
		setSettingsStatus("Settings saved!");
		
		// Clear success message after 3 seconds
		setTimeout(() => {
			setSettingsStatus("");
		}, 3000);
	} catch (error) {
		console.error("Error saving settings:", error);
		setSettingsStatus("Failed to save settings.", true);
	} finally {
		if (saveSettingsBtn) {
			saveSettingsBtn.disabled = false;
		}
	}
}

// Run extension
async function runExtension() {
	if (!runButton) return;
	runButton.disabled = true;
	setStatus("Running...");

	try {
		// Load current settings to pass to background
		const result = await chrome.storage.local.get("settings");
		const settings = result.settings || DEFAULT_SETTINGS;
		
		const response = await chrome.runtime.sendMessage({ 
			action: "runReadingZoneText",
			settings: settings
		});
		
		if (!response?.ok) {
			setStatus(response?.error || "Unable to run extension.", true);
			runButton.disabled = false;
			return;
		}

		setStatus("Opened viewer.");
		window.close();
	} catch (error) {
		console.error("Error:", error);
		setStatus("Unable to run extension.", true);
		runButton.disabled = false;
	}
}

// Tab switching
function switchTab(tabName) {
	// Deactivate all tabs and contents
	tabButtons.forEach(btn => btn.classList.remove("active"));
	tabContents.forEach(content => content.classList.remove("active"));
	
	// Activate selected tab
	const activeButton = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
	const activeContent = document.getElementById(`${tabName}-tab`);
	
	if (activeButton) activeButton.classList.add("active");
	if (activeContent) activeContent.classList.add("active");
}

// Event Listeners
if (runButton) {
	runButton.addEventListener("click", runExtension);
}

if (saveSettingsBtn) {
	saveSettingsBtn.addEventListener("click", saveSettings);
}

tabButtons.forEach(btn => {
	btn.addEventListener("click", () => {
		const tabName = btn.getAttribute("data-tab");
		if (tabName) switchTab(tabName);
	});
});

// Initialize settings on popup open
loadSettings();

