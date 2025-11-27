const { app, BrowserWindow } = require("electron");
const path = require("path");
console.log("Electron starting...");

app.setPath("userData", path.join(__dirname, "user-data"));

function createWindow() {
  const win = new BrowserWindow({
    width: 600,
    height: 800,
    frame: false, // no titlebar
    transparent: true, // allow glass
    vibrancy: "light", // only works on macOS, ignored on Linux
    backgroundColor: "#00000000",
    alwaysOnTop: false,
    resizable: true,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });
  console.log("Creating window...");

  // Load ChatGPT website
  win
    .loadURL("https://chat.openai.com/")
    .then(() => console.log("ChatGPT loaded"))
    .catch((err) => console.error("Failed to load URL:", err));
}

app.whenReady().then(() => {
  createWindow();
});
