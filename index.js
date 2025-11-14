const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

// Functional printer utilities
const printer = require(path.join(__dirname, "Utility", "Printer"));
const db = require(path.join(__dirname, "Utility", "Sqlite"));

let selectedPrinter = "";

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

// Get installed printers
ipcMain.handle("get-installed-printers", async () => {
  try {
    const printers = await printer.getInstalledPrinters();
    return {
      success: true,
      printers,
      message: `Found ${printers.length} printer(s)`,
    };
  } catch (error) {
    console.error("Error getting printers:", error);
    return { success: false, printers: [], message: error.message };
  }
});

// Select a printer
ipcMain.handle("select-printer", async (event, printerName) => {
  selectedPrinter = printerName;
  return {
    success: true,
    message: `Printer "${printerName}" selected successfully`,
  };
});

// Test printer
ipcMain.handle("test-printer", async () => {
  if (!selectedPrinter)
    return { success: false, message: "No printer selected" };
  try {
    await printer.testPrinter(selectedPrinter);
    return { success: true, message: "Test print sent successfully" };
  } catch (error) {
    console.error("Error testing printer:", error);
    return { success: false, message: error.message };
  }
});

// Print label
ipcMain.handle("print-label", async (event, { code, labelType }) => {
  if (!selectedPrinter)
    return { success: false, message: "No printer selected" };

  try {
    if (labelType === "master") {
      await printer.printMasterLabel(code, selectedPrinter);
    } else if (labelType === "mono") {
      await printer.printMonoLabel(code, selectedPrinter);
    } else {
      throw new Error("Invalid label type");
    }

    return { success: true, message: "Label printed successfully" };
  } catch (error) {
    console.error("Error printing label:", error);
    return { success: false, message: error.message };
  }
});

// ========== DATABASE FUNCTIONS ==========

// Bulk insert codes
ipcMain.handle("bulk-insert", async (event, items) => {
  return new Promise((resolve) => {
    db.bulkInsert(items, (err) => {
      if (err) return resolve({ success: false, message: err.message });
      resolve({ success: true, message: "Inserted successfully" });
    });
  });
});

// Fetch records by status
ipcMain.handle("fetch-records", async (event, isPrinted) => {
  return new Promise((resolve) => {
    db.fetchByStatus(isPrinted, (err, rows) => {
      if (err) return resolve({ success: false, error: err.message });
      resolve({ success: true, data: rows });
    });
  });
});

// Delete single record
ipcMain.handle("delete-record", async (event, id) => {
  return new Promise((resolve) => {
    db.deleteRecord(id, (err) => {
      if (err) return resolve({ success: false, message: err.message });
      resolve({ success: true, message: "Record deleted" });
    });
  });
});

// Delete all records
ipcMain.handle("delete-all-records", async () => {
  return new Promise((resolve) => {
    db.deleteAllRecords((err) => {
      if (err) return resolve({ success: false, message: err.message });
      resolve({ success: true, message: "All records deleted" });
    });
  });
});

// Mark record as printed
ipcMain.handle("mark-as-printed", async (event, id) => {
  return new Promise((resolve) => {
    db.markAsPrinted(id, (err) => {
      if (err) return resolve({ success: false, message: err.message });
      resolve({ success: true, message: "Marked as printed" });
    });
  });
});

// Handle app quit
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
