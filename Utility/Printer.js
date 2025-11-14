const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

// Get list of installed printers
async function getInstalledPrinters() {
  return new Promise((resolve, reject) => {
    if (process.platform === "win32") {
      exec("wmic printer get name,default", (error, stdout) => {
        if (error) return reject(error);

        const printers = [];
        const lines = stdout.split("\n").slice(1);

        lines.forEach((line) => {
          if (line.trim()) {
            const parts = line.split(/\s{2,}/);
            const name = parts[0].trim();
            const isDefault =
              parts.length > 1 && parts[1].toLowerCase().includes("true");
            printers.push({ name, isDefault });
          }
        });

        resolve(printers);
      });
    } else {
      // macOS / Linux
      exec("lpstat -p", (error, stdout) => {
        if (error) return reject(error);

        exec("lpstat -d", (defaultError, defaultStdout) => {
          let defaultPrinter = "";
          if (!defaultError) {
            const match = defaultStdout.match(
              /system default destination:\s*(.+)/i
            );
            if (match) defaultPrinter = match[1].trim();
          }

          const printers = [];
          const lines = stdout.split("\n");

          lines.forEach((line) => {
            const match = line.match(/printer\s+(\S+)/i);
            if (match) {
              const name = match[1];
              printers.push({ name, isDefault: name === defaultPrinter });
            }
          });

          resolve(printers);
        });
      });
    }
  });
}

// Generate TSPL commands for master label
function generateMonoLabelTSPL(qrCode) {
  return `^XA
^LL320
^PW480
^FO60,40^BQN,2,6^FDLA,${qrCode}^FS
^CF0,20
^FO20,340^FD${qrCode}^FS
^XZ`;
}

function generateMasterLabelTSPL(qrCode) {
  return `^XA
^LL406
^PW812
^CF1,40
^FO560,100^FD|^FS
^FO560,140^FD|^FS
^FO560,180^FD|^FS
^FO560,220^FD|^FS
^FO560,260^FD|^FS
^FO560,300^FD|^FS
^FO560,340^FD|^FS
^FO560,380^FD|^FS
^FO100,100^BQN,2,7^FDLA,${qrCode}^FS
^FO750,100^BQN,2,7^FDLA,${qrCode}^FS
^CF0,45
^FO320,500^FD${qrCode}^FS
^XZ`;
}

// Print raw data to printer
async function printRaw(tsplData, printerName) {
  return new Promise((resolve, reject) => {
    if (!printerName) return reject(new Error("No printer specified"));

    const tempFile = path.join(os.tmpdir(), `label_${Date.now()}.zpl`);
    fs.writeFileSync(tempFile, tsplData, "utf8");

    let cmd = "";
    if (process.platform === "win32") {
      cmd = `print /D:"${printerName}" "${tempFile}"`;
    } else {
      cmd = `lpr -P "${printerName}" "${tempFile}"`;
    }

    exec(cmd, (error) => {
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {}
      if (error) reject(new Error(`Print failed: ${error.message}`));
      else resolve({ success: true, message: "Print job sent successfully" });
    });
  });
}

// Print master label
async function printMasterLabel(qrCode, printerName) {
  const tspl = generateMasterLabelTSPL(qrCode);
  return await printRaw(tspl, printerName);
}

// Print mono label
async function printMonoLabel(qrCode, printerName) {
  const tspl = generateMonoLabelTSPL(qrCode);
  return await printRaw(tspl, printerName);
}

// Test printer
async function testPrinter(printerName) {
  const testLabel = `^XA
^CF0,60
^FO50,50^FDPrinter Test^FS
^CF0,40
^FO50,150^FDPrinter: ${printerName}^FS
^FO50,250^FDStatus: Working!^FS
^XZ`;
  return await printRaw(testLabel, printerName);
}

module.exports = {
  getInstalledPrinters,
  printMasterLabel,
  printMonoLabel,
  testPrinter,
};
