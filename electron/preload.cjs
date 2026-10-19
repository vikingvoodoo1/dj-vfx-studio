const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: true,
    platform: process.platform,
    version: process.versions.electron,
    selectFolder: (defaultPath) => ipcRenderer.invoke('dialog:selectFolder', defaultPath),
    openInFinder: (folderPath) => ipcRenderer.invoke('shell:openPath', folderPath)
});
