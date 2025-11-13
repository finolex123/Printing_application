const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // Printer Functions
  connectPrinter: (ip, port) =>
    ipcRenderer.invoke("connect-printer", { ip, port }),
  connectPrinterByUSB: () => ipcRenderer.invoke("printer:connect-usb"),
  disconnectPrinter: () => ipcRenderer.invoke("disconnect-printer"),
  printLabel: (code, labelType) =>
    ipcRenderer.invoke("print-label", { code, labelType }),

  // Database Functions - Bulk Insert
  insertBulk: (items) => ipcRenderer.invoke("bulk-insert", items),

  // Database Functions - Fetch Records
  fetchRecords: (isPrinted) => ipcRenderer.invoke("fetch-records", isPrinted),

  // Database Functions - Delete Operations
  deleteRecord: (id) => ipcRenderer.invoke("delete-record", id),
  deleteAllRecords: () => ipcRenderer.invoke("delete-all-records"),

  // Database Functions - Mark as Printed
  markAsPrinted: (id) => ipcRenderer.invoke("mark-as-printed", id),
});
