const { contextBridge, ipcRenderer } = require("electron");

window.addEventListener("DOMContentLoaded", () => {
  console.log("Preload injected — ready for custom CSS injection later");
});
