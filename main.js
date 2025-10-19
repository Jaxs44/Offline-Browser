const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let customPages = [];
let customCurrentIndex = -1;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1024,
        height: 768,
        title: 'Offline Testing Browser',
        icon: path.join(__dirname, 'icon.png'),
        autoHideMenuBar: true,
        frame: false, // Remove default title bar to add custom one
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webviewTag: true
        }
    });

    mainWindow.setMenuBarVisibility(false);
    mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC handlers
ipcMain.handle('open-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'HTML Files', extensions: ['html', 'htm'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
        return 'file://' + result.filePaths[0];
    }
    return null;
});

ipcMain.handle('duplicate-window', () => {
    const newWindow = new BrowserWindow({
        width: 1024,
        height: 768,
        title: 'Offline Testing Browser',
        icon: path.join(__dirname, 'icon.png'),
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webviewTag: true
        }
    });
    newWindow.setMenuBarVisibility(false);
    newWindow.loadFile('index.html');
});

ipcMain.handle('duplicate-window-with-url', (event, url) => {
    const newWindow = new BrowserWindow({
        width: 1024,
        height: 768,
        title: 'Offline Testing Browser',
        icon: path.join(__dirname, 'icon.png'),
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webviewTag: true
        }
    });
    newWindow.setMenuBarVisibility(false);
    newWindow.loadFile('index.html');
    
    // Send URL to new window after it loads
    newWindow.webContents.on('did-finish-load', () => {
        newWindow.webContents.send('load-url', url);
    });
});

ipcMain.handle('set-fullscreen', (event, flag) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win.setFullScreen(flag);
});

ipcMain.handle('is-maximized', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win.isMaximized();
});

ipcMain.handle('toggle-devtools', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win.webContents.isDevToolsOpened()) {
        win.webContents.closeDevTools();
        return false;
    } else {
        win.webContents.openDevTools();
        return true;
    }
});

let customDownloadPath = null; // User's custom download path (null = auto-detect)

function getCurrentExeFolder() {
    if (app.isPackaged) {
        // For portable exe, default to user's Downloads folder since process.execPath 
        // points to temp extraction folder, not where user placed the exe
        return app.getPath('downloads');
    } else {
        // Development: use project folder
        return __dirname;
    }
}

ipcMain.handle('get-download-path', () => {
    // If user set a custom path, use it; otherwise use Downloads folder
    return customDownloadPath || getCurrentExeFolder();
});

ipcMain.handle('set-download-path', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
        customDownloadPath = result.filePaths[0];
        return customDownloadPath;
    }
    return null;
});

ipcMain.handle('save-screenshot-dialog', async () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const defaultFilename = `screenshot-${timestamp}.png`;
    
    // Get current download path (custom or auto-detected exe folder)
    const downloadPath = customDownloadPath || getCurrentExeFolder();
    
    const result = await dialog.showSaveDialog({
        title: 'Save Screenshot',
        defaultPath: path.join(downloadPath, defaultFilename),
        filters: [
            { name: 'PNG Images', extensions: ['png'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });
    
    if (!result.canceled && result.filePath) {
        return result.filePath;
    }
    return null;
});

ipcMain.handle('take-screenshot', async (event, savePath) => {
    try {
        const win = BrowserWindow.fromWebContents(event.sender);
        
        // Find the webview's webContents (it's a guest webContents)
        const allWebContents = require('electron').webContents.getAllWebContents();
        let webviewContents = null;
        
        // The webview will be a guest of the main window
        for (const wc of allWebContents) {
            if (wc.hostWebContents && wc.hostWebContents.id === event.sender.id) {
                webviewContents = wc;
                break;
            }
        }
        
        // Capture the webview content directly (or fallback to window)
        const webContents = webviewContents || event.sender;
        const image = await webContents.capturePage();
        
        const pngBuffer = image.toPNG();
        fs.writeFileSync(savePath, pngBuffer);
        const filename = path.basename(savePath);
        return { success: true, filename, path: savePath };
    } catch (err) {
        console.error('Screenshot error in main:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('show-about', async () => {
    const { version } = require('./package.json');
    await dialog.showMessageBox({
        type: 'info',
        title: 'About Offline Browser',
        message: 'Offline Browser',
        detail: `Version: ${version}\n\nAdvanced offline HTML browser with fullscreen overlay, zoom, JavaScript toggle, screenshot capture, and audio controls.\n\nAuthor: Jaxs the Fox\nLicense: CC BY 4.0\n\nFeatures:\n• Full navigation (Back/Forward/Reload)\n• Page history with titles\n• Fullscreen mode with auto-hide overlay\n• Zoom 10-500%\n• JavaScript toggle\n• Audio mute\n• Screenshot capture (webview only)\n• Multiple windows\n• Developer tools\n\nBuilt with Electron`,
        buttons: ['OK']
    });
});

ipcMain.handle('window-minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win.minimize();
});

ipcMain.handle('window-maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win.isMaximized()) {
        win.unmaximize();
    } else {
        win.maximize();
    }
});

ipcMain.handle('window-close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win.close();
});
