const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  getInstalledPrinters: () => ipcRenderer.invoke("get-installed-printers"),
  selectPrinter: (printerName) => ipcRenderer.invoke("select-printer", printerName),
  disconnectPrinter: () => ipcRenderer.invoke("disconnect-printer"),
  testPrinter: () => ipcRenderer.invoke("test-printer"),
  printLabel: (code, labelType) => ipcRenderer.invoke("print-label", { code, labelType }),
  insertBulk: (items) => ipcRenderer.invoke("bulk-insert", items),
  fetchRecords: (isPrinted) => ipcRenderer.invoke("fetch-records", isPrinted),
  deleteRecord: (id) => ipcRenderer.invoke("delete-record", id),
  deleteAllRecords: () => ipcRenderer.invoke("delete-all-records"),
  markAsPrinted: (id) => ipcRenderer.invoke("mark-as-printed", id),
});