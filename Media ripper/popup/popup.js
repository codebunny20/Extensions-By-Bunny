const runButton = document.getElementById("run-btn");
const statusText = document.getElementById("status");

function setStatus(text, isError = false) {
  if (!statusText) return;
  statusText.textContent = text;
  statusText.classList.remove("error", "success");
  if (isError) {
    statusText.classList.add("error");
  } else if (text) {
    statusText.classList.add("success");
  }
}

async function runExtension() {
  if (!runButton) return;

  runButton.disabled = true;
  setStatus("Scanning this page for MP4 and MP3 files...");

  try {
    const response = await chrome.runtime.sendMessage({ action: "ripMediaFromPage" });

    if (!response?.ok) {
      setStatus(response?.error || "No media was found on this page.", true);
      return;
    }

    const label = response.count === 1 ? "file" : "files";
    setStatus(`Downloaded ${response.count} ${label}.`);
    window.close();
  } catch (error) {
    console.error("Error ripping media:", error);
    setStatus("Unable to rip media from this page.", true);
  } finally {
    runButton.disabled = false;
  }
}

if (runButton) {
  runButton.addEventListener("click", runExtension);
}

