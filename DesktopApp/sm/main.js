const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

process.env.IaminDevMode = false;

require("./handlers/main-handler");

function createWindow() {
  const win = new BrowserWindow({
    webPreferences: {
      nodeIntegration: false, // Disable nodeIntegration for security
      contextIsolation: true, // Enable context isolation
      preload: path.join(__dirname, "preload.js"), // Specify the path to preload.js
      icon: path.join(__dirname, "resources", "app-icon.png"),
    },
    autoHideMenuBar: true,
  });
  win.maximize();
  win.loadFile("index.html"); // Assuming you're running a React dev server
  // if (process.env.ELECTRON_IS_DEV) win.webContents.openDevTools();
}

app.whenReady().then(createWindow);

ipcMain.on("print-content", (event, htmlContent) => {
  console.log("Received HTML Content:", htmlContent);

  const fullHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Print</title>
      <style>
        body {
          font-family: Arial, sans-serif;
        }
      </style>
    </head>
    <body>
      ${htmlContent}
    </body>
    </html>
  `;

  const printWindow = new BrowserWindow({
    show: true, // Display the window for debugging
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
    },
  });

  printWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(fullHTML)}`
  );

  printWindow.webContents.on("did-finish-load", () => {
    printWindow.webContents.openDevTools(); // Debug the content visually
    printWindow.webContents
      .executeJavaScript("document.body.innerHTML")
      .then((result) => {
        console.log("Rendered Content:", result); // Log rendered content
      });

    setTimeout(() => {
      printWindow.webContents.print(
        {
          silent: false,
          printBackground: true,
        },
        (success, errorType) => {
          if (!success) {
            console.error("Print failed:", errorType);
          }
          printWindow.close();
        }
      );
    }, 1000); // Add delay to ensure rendering
  });

  printWindow.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription) => {
      console.error("Failed to load content:", errorDescription);
    }
  );
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
