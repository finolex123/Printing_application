const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

// =====================================
// 🔍 SAFE POWERSHELL DETECTION
// =====================================
function getPowerShellPath() {
  let ps = path.join(process.env.windir, "Sysnative", "WindowsPowerShell", "v1.0", "powershell.exe");
  if (fs.existsSync(ps)) return `"${ps}"`;

  ps = path.join(process.env.windir, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  if (fs.existsSync(ps)) return `"${ps}"`;

  return null; 
}

// =====================================
// 🖨 UNIVERSAL PRINTER FETCHER (Windows + Mac/Linux)
// =====================================
async function getInstalledPrinters() {
  return new Promise((resolve) => {
    // 🍏 MAC / 🐧 LINUX
    if (process.platform !== "win32") {
      exec("lpstat -p", (error, stdout) => {
        if (error) return resolve([]);

        exec("lpstat -d", (err2, defOut) => {
          const defaultPrinter =
            defOut.match(/system default destination:\s*(.+)/i)?.[1] || "";

          const printers = stdout
            .split("\n")
            .map((line) => line.match(/printer\s+(\S+)/i)?.[1])
            .filter(Boolean)
            .map((p) => ({
              name: p,
              isDefault: p === defaultPrinter,
            }));

          resolve(printers);
        });
      });
      return;
    }

    // 🪟 WINDOWS
    const psPath = getPowerShellPath();

    if (psPath) {
      const cmd = `${psPath} -NoProfile -Command "Get-Printer | Select-Object Name,Default | ConvertTo-Json -Compress 2>$null"`;

      exec(cmd, (err, stdout) => {
        if (!err) {
          try {
            const clean = stdout.trim();
            const printers = JSON.parse(clean);

            return resolve(
              (Array.isArray(printers) ? printers : [printers]).map((p) => ({
                name: p.Name,
                isDefault: p.Default,
              }))
            );
          } catch {}
        }

        // PowerShell failed → WMIC fallback
        runWMIC(resolve);
      });

      return;
    }

    // NO PowerShell → Directly use WMIC fallback
    runWMIC(resolve);
  });
}

// =====================================
// 🪟 WMIC FALLBACK (Windows)
// =====================================
function runWMIC(resolve) {
  exec(`wmic printer get Name,Default /format:csv`, (err, stdout) => {
    if (err || !stdout) return resolve([]);

    const lines = stdout.split("\n").filter((l) => l.includes(","));

    const list = lines
      .map((row) => row.split(","))
      .map((cols) => ({
        name: cols[cols.length - 2]?.trim(),
        isDefault: cols[cols.length - 1]?.trim().toLowerCase() === "true",
      }))
      .filter((p) => p.name);

    resolve(list);
  });
}

// =====================================
// 🖨 RAW PRINTING (Windows + Mac/Linux)
// =====================================
async function printRaw(tsplData, printerName) {
  return new Promise((resolve, reject) => {
    if (!printerName) return reject("No printer selected");

    const tempFile = path.join(os.tmpdir(), `label_${Date.now()}.txt`);
    fs.writeFileSync(tempFile, tsplData);

    let cmd = "";

    if (process.platform === "win32") {
      const psPath = getPowerShellPath();

      if (psPath) {
        cmd = `${psPath} -NoProfile -Command "Get-Content -Raw '${tempFile}' | Out-Printer -Name '${printerName}'"`;
      } else {
        cmd = `print /D:"${printerName}" "${tempFile}"`;
      }
    } else {
      cmd = `lpr -P "${printerName}" "${tempFile}"`;
    }

    exec(cmd, (err) => {
      fs.unlinkSync(tempFile);
      if (err) return reject("Print failed: " + err);
      resolve({ success: true, message: "Print job sent" });
    });
  });
}

// =====================================
// 🧾 TSPL LABEL GENERATORS
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
// 🔍 PRINT MONO LABEL
// =====================================
async function printMonoLabel(qr, printerName) {
  return printRaw(generateMonoLabelTSPL(qr), printerName);
}

// =====================================
// 🔍 PRINT MASTER LABEL
// =====================================
async function printMasterLabel(qr, printerName) {
  return printRaw(generateMasterLabelTSPL(qr), printerName);
}

// =====================================
// 🧪 TEST PRINT
// =====================================
async function testPrinter(printerName) {
  const testLabel = `
SIZE 80 mm, 50 mm
CLS
TEXT 50,50,"4",0,2,2,"Printer Test"
TEXT 50,150,"3",0,1,1,"Printer: ${printerName}"
TEXT 50,250,"3",0,1,1,"Status: Working!"
PRINT 1
`;
  return printRaw(testLabel, printerName);
}

module.exports = {
  getInstalledPrinters,
  printRaw,
  printMonoLabel,
  printMasterLabel,
  testPrinter,
};
