const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

// ===============================
// 🔌 GET INSTALLED PRINTERS (Windows PowerShell)
// ===============================
async function getInstalledPrinters() {
  return new Promise((resolve, reject) => {
    if (process.platform === "win32") {
      const command =
        `powershell -Command "Get-Printer | Select-Object Name,Default"`;

      exec(command, (error, stdout) => {
        if (error) return reject(error);

        const printers = [];
        const lines = stdout.split("\n").slice(3); // skip PS headers

        lines.forEach(line => {
          const parts = line.trim().split(/\s{2,}/);
          if (parts.length >= 1) {
            const name = parts[0].trim();
            const isDefault =
              parts.length > 1 && parts[1].trim().toLowerCase() === "true";

            if (name) printers.push({ name, isDefault });
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

// ===============================
// 🧾 TSPL LABEL GENERATORS (100% TSC FORMAT)
// ===============================

// MONO LABEL (small)
function generateMonoLabelTSPL(qrCode) {
  return `
SIZE 60 mm, 40 mm
GAP 2 mm, 0 mm
CLS
QRCODE 60,40,L,5,A,0,M2,"${qrCode}"
TEXT 20,160,"3",0,1,1,"${qrCode}"
PRINT 1
`;
}

// MASTER LABEL (big)
function generateMasterLabelTSPL(qrCode) {
  return `
SIZE 100 mm, 80 mm
GAP 2 mm, 0 mm
CLS

QRCODE 100,100,L,7,A,0,M2,"${qrCode}"
QRCODE 600,100,L,7,A,0,M2,"${qrCode}"

TEXT 320,500,"3",0,2,2,"${qrCode}"

DRAW LINE 560,100,560,380,3

PRINT 1
`;
}

// ===============================
// 🖨 RAW PRINT FUNCTION
// ===============================
async function printRaw(tsplData, printerName) {
  return new Promise((resolve, reject) => {
    if (!printerName) return reject(new Error("No printer specified"));

    const tempFile = path.join(os.tmpdir(), `label_${Date.now()}.txt`);
    fs.writeFileSync(tempFile, tsplData, "utf8");

    let cmd = "";

    if (process.platform === "win32") {
      // Send raw text to USB printer
      cmd = `powershell -Command "Get-Content '${tempFile}' | Out-Printer -Name '${printerName}'"`;
    } else {
      cmd = `lpr -P "${printerName}" "${tempFile}"`;
    }

    exec(cmd, (error) => {
      try { fs.unlinkSync(tempFile); } catch (e) {}

      if (error)
        reject(new Error(`Print failed: ${error.message}`));
      else
        resolve({ success: true, message: "Print job sent" });
    });
  });
}

// ===============================
// 🏷 PRINT MASTER LABEL
// ===============================
async function printMasterLabel(qrCode, printerName) {
  const tspl = generateMasterLabelTSPL(qrCode);
  return await printRaw(tspl, printerName);
}

// ===============================
// 🏷 PRINT MONO LABEL
// ===============================
async function printMonoLabel(qrCode, printerName) {
  const tspl = generateMonoLabelTSPL(qrCode);
  return await printRaw(tspl, printerName);
}

// ===============================
// 🧪 TEST PRINT
// ===============================
async function testPrinter(printerName) {
  const testLabel = `
SIZE 80 mm, 50 mm
CLS
TEXT 50,50,"4",0,2,2,"Printer Test"
TEXT 50,150,"3",0,1,1,"Printer: ${printerName}"
TEXT 50,250,"3",0,1,1,"Status: Working!"
PRINT 1
`;
  return await printRaw(testLabel, printerName);
}

module.exports = {
  getInstalledPrinters,
  printMasterLabel,
  printMonoLabel,
  testPrinter,
};
