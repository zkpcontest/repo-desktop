import {exec} from "child_process";

const url = require('url');
const path = require("path");
const {app, BrowserWindow, protocol, ipcMain, dialog, Menu} = require('electron');
const fs = require("fs");


// Create the native browser window
function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 900,
        height: 600,
        minWidth: 900,
        minHeight: 600,
        icon: path.join(__dirname, 'icons/png/64x64.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // In production, set the initial browser path to the local bundle generated
    // by the Create React App build process.
    // In development, set it to localhost to allow live/hot-reloading
    const appURL = app.isPackaged
        ? url.format({
            pathname: path.join(__dirname, 'index.html'),
            protocol: 'file:',
            slashes: true
        })
        : 'http://localhost:3000';
    mainWindow.loadURL(appURL).then();

    // Automatically open Chrome's DevTools in development mode
    if (!app.isPackaged) mainWindow.webContents.openDevTools();
}


// Setup local proxy to adjust the paths of requested files when loading
// them from the local production bundle (e.g.: local fonts, etc...)
function setupLocalFilesNormalizerProxy() {
    protocol.registerHttpProtocol(
        'file',
        (request: {url: string;}, callback: (arg0: {path: any;}) => void) => {
            const url = request.url.substr(8);
            callback({path: path.normalize(`${__dirname}/${url}`)});
        }
    );
}

// Get everscale binary
function getEverscaleProxyBinary() {
    const buildPath = app.isPackaged ? path.join(app.getAppPath(), '../build') : __dirname;
    const binary = `proxy.${process.platform}.${process.arch}`;
    console.debug('[ELECTRON]: Everscale binary path', path.resolve(buildPath, 'bin/everscale', binary))
    return path.resolve(buildPath, 'bin/everscale', binary);
}

// Get ZKP binary
function getZKPBinary() {
    const buildPath = app.isPackaged ? path.join(app.getAppPath(), '../build') : __dirname;
    const binary = `zkp.${process.platform}.${process.arch}`;
    console.debug('[ELECTRON]: ZKP binary path', path.resolve(buildPath, 'bin', binary))
    return path.resolve(buildPath, 'bin', binary);
}


/*
 * Set application name and menu
 */
app.setName('DevEx Tools');

const template = [
    ...(
        process.platform === 'darwin'
            ? [{
                label: app.name,
                submenu: [
                    {role: 'about'},
                    {type: 'separator'},
                    {role: 'services'},
                    {type: 'separator'},
                    {role: 'hide'},
                    {role: 'hideOthers'},
                    {role: 'unhide'},
                    {type: 'separator'},
                    {role: 'quit'}
                ]
            }]
            : []
    ),
    {
        label: 'Edit',
        submenu: [
            {role: 'cut'},
            {role: 'copy'},
            {role: 'paste'}
        ]
    }

]
Menu.setApplicationMenu(Menu.buildFromTemplate(template));


// This method will be called when Electron has finished its initialization and
// is ready to create the browser windows.
// Some APIs can only be used after this event occurs
app.whenReady().then(async () => {
    // const everscale = require('./everscale');
    createWindow();
    setupLocalFilesNormalizerProxy();

    app.on('activate', () => {
        // On macOS, it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});


// Quit when all windows are closed, except on macOS.
// There, it's common for applications and their menu bar to stay active until
// the user quits  explicitly with Cmd + Q
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});


// IPC handlers
ipcMain.handle('app:getPath', (event: any, name: any) => {
    return app.getPath(name);
});

ipcMain.handle('dialog:showSaveDialogSync', async (event: any, data: string, filename?: string) => {
    // Open file save dialog
    const file = dialog.showSaveDialogSync({
        title: 'Select destination to save to',
        buttonLabel: 'Save',
        defaultPath: path.join(app.getPath('documents'), filename),
        filters: [
            {
                name: 'JSON Files',
                extensions: ['json']
            }
        ],
        properties: ['createDirectory', 'showOverwriteConfirmation']
    });
    if (!file) return;

    // Write file
    fs.writeFile(file.toString(), data, ((err: any) => {
        if (err) console.error(err);
    }));
});

ipcMain.handle('dialog:showOpenDialogSync', (event: any, properties: any[]) => {
    console.log('[ELECTRON]: showOpenDialogSync')
    return dialog.showOpenDialogSync({
        title: 'Select destination',
        buttonLabel: 'Select',
        defaultPath: app.getPath('documents'),
        properties: ['createDirectory', ...properties]
    });
});

ipcMain.handle('everscale', (event: any, args: string) => {
    const binary = getEverscaleProxyBinary();
    console.log('[ELECTRON]: Everscale', `${binary} ${args}`);

    return new Promise<any>((resolve, reject) => {
        exec(
            `${binary} ${args}`,
            {
                cwd: path.resolve(binary, '../')
            }, (error, stdout, stderr) => {
                if (error) {
                    console.log('[ELECTRON]: Everscale ERROR:', error)
                    reject(error.message);
                }
                if (stderr) {
                    console.log('[ELECTRON]: Everscale STDERR:', stderr)
                    reject(stderr);
                }

                console.log('[ELECTRON]: Everscale STDOUT', stdout);
                if (stdout.length) {
                    const response = fs.readFileSync(stdout, {encoding: 'utf8'});
                    fs.rm(stdout, () => {});
                    resolve(JSON.parse(response));
                }
                resolve(null);
            }
        );
    });
});

ipcMain.handle('zkp', (event: any, cwd: string, args: string) => {
    const binary = getZKPBinary();
    console.log('[ELECTRON]: ZKP', `${binary} ${args}`);

    return new Promise<void>((resolve, reject) => {
        exec(
            `${binary} ${args}`,
            {
                cwd
            },
            (error, stdout, stderr) => {
                if (error) {
                    console.log('[ELECTRON]: ZKP ERROR:', error)
                    reject(error.message);
                }
                if (stderr) {
                    console.log('[ELECTRON]: ZKP STDERR:', stderr)
                    reject(stderr);
                }

                console.log('[ELECTRON]: ZKP STDOUT', stdout);
                resolve();
            }
        );
    });
});

export {}
