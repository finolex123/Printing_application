const { exec, execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

// =====================================
// PATH TO HELPER EXE
// =====================================
const HELPER_EXE = path.join(__dirname, "..", "TSCLabelPrinter.exe");

// =====================================
// SAFE POWERSHELL DETECTION
// =====================================
function getPowerShellPath() {
  let ps = path.join(process.env.windir, "Sysnative", "WindowsPowerShell", "v1.0", "powershell.exe");
  if (fs.existsSync(ps)) return `"${ps}"`;

  ps = path.join(process.env.windir, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  if (fs.existsSync(ps)) return `"${ps}"`;

  return null;
}

// =====================================
// GET INSTALLED PRINTERS (Universal)
// =====================================
async function getInstalledPrinters() {
  return new Promise((resolve) => {
    // ------------------------------
    // 🍏 MAC / 🐧 LINUX
    // ------------------------------
    if (process.platform !== "win32") {
      exec("lpstat -p", (error, stdout) => {
        if (error) return resolve([]);

        const printers = stdout
          .split("\n")
          .map((line) => line.match(/printer\s+(\S+)/i)?.[1])
          .filter(Boolean)
          .map((name) => ({
            name,
            isDefault: false
          }));

        resolve(printers);
      });
      return;
    }

    // ------------------------------
    // 🪟 WINDOWS → PowerShell first
    // ------------------------------
    const psPath = getPowerShellPath();
    if (psPath) {
      const cmd = `${psPath} -NoProfile -Command "Get-Printer | Select-Object Name,Default | ConvertTo-Json -Compress 2>$null"`;

      exec(cmd, (err, stdout) => {
        if (!err) {
          try {
            const parsed = JSON.parse(stdout.trim());

            const printers = (Array.isArray(parsed) ? parsed : [parsed]).map((p) => ({
              name: p.Name,
              isDefault: p.Default === true
            }));

            return resolve(printers);
          } catch (e) {
            console.error("PowerShell JSON parse error:", e);
          }
        }

        // PowerShell failed → fallback
        runWMIC(resolve);
      });

      return;
    }

    // No PowerShell → WMIC fallback
    runWMIC(resolve);
  });
}

// =====================================
// WMIC FALLBACK (Windows)
// =====================================
function runWMIC(resolve) {
  exec(`wmic printer get Name,Default /format:csv`, (err, stdout) => {
    if (err || !stdout) return resolve([]);

    const lines = stdout.split("\n").filter((l) => l.includes(","));

    const printers = lines
      .map((row) => row.split(","))
      .map((cols) => ({
        name: cols[cols.length - 2]?.trim(),
        isDefault: cols[cols.length - 1]?.trim().toLowerCase() === "true"
      }))
      .filter((p) => p.name);

    resolve(printers);
  });
}

// =====================================
// RAW TSPL PRINTING (Via EXE)
// =====================================
async function printRaw(tsplData, printerName) {
  return new Promise((resolve, reject) => {
    if (!printerName) return reject("No printer selected");

    const tempFile = path.join(os.tmpdir(), `label_${Date.now()}.txt`);
    fs.writeFileSync(tempFile, tsplData);

    execFile(HELPER_EXE, [tempFile, printerName], (err, stdout) => {
      fs.unlinkSync(tempFile);

      if (err) return reject("Print failed: " + err.message);

      resolve({
        success: true,
        message: stdout || "Print job sent"
      });
    });
  });
}

// =====================================
// TSPL LABEL GENERATORS
// =====================================
function generateMonoLabelTSPL(qr) {
  return `
SIZE 60 mm, 40 mm
GAP 2 mm, 0 mm
CLS
QRCODE 60,40,L,5,A,0,M2,"${qr}"
TEXT 20,160,"3",0,1,1,"${qr}"
PRINT 1
`;
}

function generateMasterLabelTSPL(qr) {
  return `
SIZE 100 mm, 80 mm
GAP 2 mm, 0 mm
CLS
QRCODE 100,100,L,7,A,0,M2,"${qr}"
QRCODE 600,100,L,7,A,0,M2,"${qr}"
TEXT 320,500,"3",0,2,2,"${qr}"
DRAW LINE 560,100,560,380,3
PRINT 1
`;
}

// =====================================
// PRINT FUNCTIONS
// =====================================
async function printMonoLabel(qr, printerName) {
  return printRaw(generateMonoLabelTSPL(qr), printerName);
}

async function printMasterLabel(qr, printerName) {
  return printRaw(generateMasterLabelTSPL(qr), printerName);
}

async function testPrinter(printerName) {
  const testLabel = `
SIZE 80 mm, 50 mm
CLS
TEXT 50,50,"4",0,2,2,"Printer Test"
TEXT 50,150,"3",0,1,1,"Status: Working!"
PRINT 1
`;
  return printRaw(testLabel, printerName);
}

// =====================================
// EXPORT APIS
// =====================================
module.exports = {
  getInstalledPrinters,
  printRaw,
  printMonoLabel,
  printMasterLabel,
  testPrinter
};
