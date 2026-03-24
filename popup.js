document.addEventListener("DOMContentLoaded", () => {
  const enableToggle = document.getElementById("enableToggle");

  chrome.storage.local.get(["extensionEnabled"], (res) => {
    enableToggle.checked = res.extensionEnabled !== false;
  });

  enableToggle.addEventListener("change", () => {
    chrome.storage.local.set({ extensionEnabled: enableToggle.checked });
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.extensionEnabled) return;
    enableToggle.checked = changes.extensionEnabled.newValue !== false;
  });
});
