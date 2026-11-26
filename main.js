// Pix2Burn : coquille de bureau (Electron) autour de index.html.
// L'application elle-même reste la page web ; ce fichier ouvre la fenêtre
// et autorise l'accès au port série USB (Web Serial) pour piloter la machine GRBL.
const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'Pix2Burn',
    icon: path.join(__dirname, 'build', 'icon.png'),
    backgroundColor: '#1b1830',
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false }
  });
  win.loadFile(path.join(__dirname, 'index.html'));

  // Port série : on n'autorise que le série, et seulement pour cette page locale
  const ses = win.webContents.session;
  ses.setPermissionCheckHandler((wc, permission) => permission === 'serial');
  ses.setPermissionRequestHandler((wc, permission, callback) => callback(permission === 'serial'));
  ses.setDevicePermissionHandler((details) => details.deviceType === 'serial');
  ses.on('select-serial-port', (event, portList, wc, callback) => {
    event.preventDefault();
    if (portList.length === 0) {
      dialog.showMessageBoxSync(win, {
        type: 'info', title: 'Pix2Burn', message: 'Aucun port série détecté.',
        detail: 'Branchez la machine avec le câble USB, allumez-la, puis réessayez.'
      });
      callback('');
      return;
    }
    if (portList.length === 1) { callback(portList[0].portId); return; }
    const labels = portList.slice(0, 8).map((p) => (p.displayName || p.portName) + ' (' + p.portName + ')');
    const choice = dialog.showMessageBoxSync(win, {
      type: 'question', title: 'Pix2Burn', message: 'Sur quel port la machine est-elle branchée ?',
      buttons: labels.concat(['Annuler']), cancelId: labels.length
    });
    callback(choice < labels.length ? portList[choice].portId : '');
  });

  // Les liens externes s'ouvrent dans le navigateur, jamais dans l'application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) event.preventDefault();
  });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });
  if (process.platform !== 'darwin') Menu.setApplicationMenu(null);
  app.whenReady().then(createWindow);
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
}
