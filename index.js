const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

const printer = require(path.join(__dirname, "Utility", "Printer"));
const db = require(path.join(__dirname, "Utility", "Sqlite"));

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  win.loadFile(path.join(__dirname, "Print.html"));
}

app.whenReady().then(() => {
  db.createTable();
  createWindow();
});

// ========== PRINTER FUNCTIONS ==========

// Connect to Printer
ipcMain.handle("connect-printer", async (event, { ip, port }) => {
  return new Promise((resolve) => {
    printer.connectPrinter(ip, port, (err) => {
      if (err) return resolve({ success: false, message: err.message });
      return resolve({ success: true, message: "Connected Successfully" });
    });
  });
});

ipcMain.handle("printer:connect-usb", async () => {
  return new Promise((resolve, reject) => {
    printer.connectPrinterByUSB((err, type) => {
      if (err) reject(err);
      else resolve(type);
    });
  });
});

// Disconnect Printer
ipcMain.handle("disconnect-printer", async (event) => {
  return new Promise((resolve) => {
    try {
      printer.disconnectPrinter();
      return resolve({ success: true, message: "Printer Disconnected" });
    } catch (err) {
      return resolve({ success: false, message: err.message });
    }
  });
});

// Print Label
ipcMain.handle("print-label", async (event, { code, labelType }) => {
  return new Promise((resolve) => {
    printer.printLabel(code, labelType, (err) => {
      if (err) {
        return resolve({ success: false, message: err });
      }
      return resolve({ success: true, message: "Printed Successfully" });
    });
  });
});

// ========== DATABASE FUNCTIONS ==========

// Bulk Insert Codes
ipcMain.handle("bulk-insert", async (event, items) => {
  return new Promise((resolve) => {
    db.bulkInsert(items, (err) => {
      if (err) return resolve({ success: false, message: err.message });
      resolve({ success: true, message: "Inserted Successfully" });
    });
  });
});

// Fetch Records By Status (0 = not printed, 1 = printed)
ipcMain.handle("fetch-records", async (event, isPrinted) => {
  return new Promise((resolve) => {
    db.fetchByStatus(isPrinted, (err, rows) => {
      if (err) return resolve({ success: false, error: err.message });
      resolve({ success: true, data: rows });
    });
  });
});

// Delete Single Record by ID
ipcMain.handle("delete-record", async (event, id) => {
  return new Promise((resolve) => {
    db.deleteRecord(id, (err) => {
      if (err) return resolve({ success: false, message: err.message });
      resolve({ success: true, message: "Record Deleted" });
    });
  });
});

// Delete All Records
ipcMain.handle("delete-all-records", async (event) => {
  return new Promise((resolve) => {
    db.deleteAllRecords((err) => {
      if (err) return resolve({ success: false, message: err.message });
      resolve({ success: true, message: "All Records Deleted" });
    });
  });
});

// Mark Record as Printed
ipcMain.handle("mark-as-printed", async (event, id) => {
  return new Promise((resolve) => {
    db.markAsPrinted(id, (err) => {
      if (err) return resolve({ success: false, message: err.message });
      resolve({ success: true, message: "Marked as Printed" });
    });
  });
});

// Handle app quit
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
