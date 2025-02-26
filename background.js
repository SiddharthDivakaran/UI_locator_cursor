chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "findLocators",
    title: "Find Locators",
    contexts: ["all"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "findLocators") {
    chrome.tabs.sendMessage(tab.id, { action: "findLocators" });
  }
}); 