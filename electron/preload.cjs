const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: true,
    platform: process.platform,
    version: process.versions.electron,
    selectFolder: (defaultPath) => ipcRenderer.invoke('dialog:selectFolder', defaultPath),
    openInFinder: (folderPath) => ipcRenderer.invoke('shell:openPath', folderPath),
    getLauncherConfig: () => ipcRenderer.invoke('launcher:getConfig'),
    setLauncherDefaultMode: (modeId) => ipcRenderer.invoke('launcher:setDefaultMode', modeId),
    toggleMenuBarTray: (enabled) => ipcRenderer.invoke('launcher:toggleMenuBar', enabled),
    launchVfxMode: (modeId, openInBrowser = false) => ipcRenderer.invoke('launcher:launchMode', { modeId, openInBrowser })
});
