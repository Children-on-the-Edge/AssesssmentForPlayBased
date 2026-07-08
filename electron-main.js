// electron-main.js — desktop wrapper around the same web app used for the PWA.
const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("path");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#f0f4f8",
    icon: path.join(__dirname, "icons", "icon-256.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    },
    title: "Children on the Edge"
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));

  // Open any external links (http/https) in the OS browser instead of inside the app window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) shell.openExternal(url);
    return { action: "deny" };
  });

  // Minimal menu (keeps standard Edit shortcuts like copy/paste working, plus a Reload for troubleshooting).
  const template = [
    ...(process.platform === "darwin" ? [{
      label: app.getName(),
      submenu: [
        { role: "about" }, { type: "separator" },
        { role: "hide" }, { role: "hideOthers" }, { role: "unhide" }, { type: "separator" },
        { role: "quit" }
      ]
    }] : []),
    {
      label: "Edit",
      submenu: [
        { role: "undo" }, { role: "redo" }, { type: "separator" },
        { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" }
      ]
    },
    {
      label: "View",
      submenu: [
        { role: "reload" }, { role: "toggleDevTools" }, { type: "separator" },
        { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" }, { type: "separator" },
        { role: "togglefullscreen" }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
