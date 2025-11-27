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
      nodeIntegration: true,  // Required for preload to use require()
      preload: path.join(__dirname, "preload.js"),  // WebGL liquid glass
    },
  });
  console.log("Creating window...");
  console.log("Preload path:", path.join(__dirname, "preload.js"));

  // Open DevTools to see preload console output
  win.webContents.openDevTools();

  // Listen for console messages from renderer
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[RENDERER] ${message}`);
  });

  // Check if preload script loaded
  win.webContents.on('did-finish-load', () => {
    console.log("Page finished loading");
  });

  // Load ChatGPT website
  win
    .loadURL("https://chat.openai.com/")
    .then(() => console.log("ChatGPT loaded"))
    .catch((err) => console.error("Failed to load URL:", err));
}

app.whenReady().then(() => {
  createWindow();
});
