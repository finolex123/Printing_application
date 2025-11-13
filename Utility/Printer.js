// // const net = require("net");
// // const escpos = require("escpos");
// // escpos.USB = require("escpos-usb");

// // let client = null;
// // let usbPrinter = null;

// // // Initialize Printer Connection
// // function connectPrinter(printerIP, printerPort = 9100, callback) {
// //   client = new net.Socket();

// //   client.connect(printerPort, printerIP, () => {
// //     console.log(`✅ Connected to Printer at ${printerIP}:${printerPort}`);
// //     if (callback) callback(null);
// //   });

// //   client.on("error", (err) => {
// //     console.error("❌ Printer Connection Error:", err);
// //     if (callback) callback(err);
// //   });
// // }

// // function connectPrinterByUSB(callback) {
// //   try {
// //     const device = new escpos.USB();
// //     const printer = new escpos.Printer(device);
// //     usbPrinter = printer;
// //     console.log("✅ Connected to USB printer");
// //     if (callback) callback(null, "usb");
// //   } catch (err) {
// //     console.error("❌ USB Printer Connection Error:", err);
// //     if (callback) callback(err);
// //   }
// // }

// // // Close Printer Connection
// // function disconnectPrinter() {
// //   // if (client) {
// //   //   client.end();
// //   //   console.log("🛑 Printer Disconnected");
// //   // }

// //   if (client) {
// //     client.end();
// //     client = null;
// //     console.log("🛑 Network Printer Disconnected");
// //   }
// //   if (usbPrinter) {
// //     usbPrinter = null;
// //     console.log("🛑 USB Printer Disconnected");
// //   }
// // }

// // // Send ZPL Data to Printer
// // function printLabel(code, labelType, callback) {
// //   if (!client) {
// //     const err = "⚠ Printer is not connected";
// //     console.error(err);
// //     if (callback) callback(err);
// //     return;
// //   }

// //   // Use your generateZPL function
// //   const zplData = generateZPL(code, labelType);

// //   client.write(zplData, "utf8", () => {
// //     console.log(`🖨 Printing ${labelType} label with code: ${code}`);
// //     if (callback) callback(null);
// //   });
// // }

// // // Include your ZPL generator
// // function generateZPL(code, labelType) {
// //   if (labelType.toLowerCase() === "master") {
// //     return `^XA
// // ^FO50,50^BQN,2,8^FDQA,${code}^FS
// // ^FO50,320^A0N,50,50^FD${code}^FS
// // ^FO50,390^A0N,35,35^FDMASTER LABEL^FS
// // ^FO50,440^A0N,30,30^FD${new Date().toLocaleDateString()}^FS
// // ^XZ`;
// //   } else {
// //     return `^XA
// // ^FO50,50^BQN,2,8^FDQA,${code}^FS
// // ^FO50,320^A0N,50,50^FD${code}^FS
// // ^FO50,390^A0N,35,35^FDMONO LABEL^FS
// // ^FO50,440^A0N,30,30^FD${new Date().toLocaleDateString()}^FS
// // ^XZ`;
// //   }
// // }

// // module.exports = {
// //   connectPrinter,
// //   disconnectPrinter,
// //   printLabel,
// //   connectPrinterByUSB,
// // };

// const net = require("net");
// const usb = require("usb");

// let client = null;
// let usbPrinter = null;

// // -------------------- NETWORK CONNECTION --------------------
// function connectPrinter(printerIP, printerPort = 9100, callback) {
//   client = new net.Socket();
//   client.connect(printerPort, printerIP, () => {
//     console.log(`✅ Connected to Printer at ${printerIP}:${printerPort}`);
//     if (callback) callback(null, "network");
//   });
//   client.on("error", (err) => {
//     console.error("❌ Printer Connection Error:", err);
//     if (callback) callback(err);
//   });
// }

// // -------------------- USB CONNECTION --------------------
// function connectPrinterByUSB(callback) {
//   try {
//     const devices = usb.getDeviceList().filter(
//       (d) =>
//         d.deviceDescriptor.idVendor === 0x0a5f || // Example Zebra vendor ID
//         d.deviceDescriptor.idVendor === 0x2a7a // Sometimes used on newer models
//     );

//     if (devices.length === 0) {
//       throw new Error("No Zebra printer found via USB");
//     }

//     const device = devices[0];
//     device.open();

//     // Get first interface and claim it
//     const iface = device.interfaces[0];
//     if (iface.isKernelDriverActive()) iface.detachKernelDriver();
//     iface.claim();

//     usbPrinter = device;
//     console.log("✅ Connected to Zebra USB Printer");
//     if (callback) callback(null, "usb");
//   } catch (err) {
//     console.error("❌ USB Printer Connection Error:", err);
//     if (callback) callback(err);
//   }
// }

// // -------------------- DISCONNECT --------------------
// function disconnectPrinter() {
//   if (client) {
//     client.end();
//     client = null;
//     console.log("🛑 Network Printer Disconnected");
//   }
//   if (usbPrinter) {
//     try {
//       usbPrinter.close();
//     } catch {}
//     usbPrinter = null;
//     console.log("🛑 USB Printer Disconnected");
//   }
// }

// // -------------------- PRINT --------------------
// function printLabel(code, labelType, callback) {
//   const zplData = generateZPL(code, labelType);

//   // Send via network printer
//   if (client) {
//     client.write(zplData, "utf8", () => {
//       console.log(`🖨 Printed ${labelType} label via Network`);
//       if (callback) callback(null);
//     });
//   }
//   // Send via USB printer
//   else if (usbPrinter) {
//     const iface = usbPrinter.interfaces[0];
//     const endpoint = iface.endpoints.find((ep) => ep.direction === "out");

//     if (!endpoint) {
//       const err = "No USB OUT endpoint found";
//       console.error(err);
//       if (callback) callback(err);
//       return;
//     }

//     endpoint.transfer(Buffer.from(zplData, "utf8"), (err) => {
//       if (err) {
//         console.error("❌ USB Print Error:", err);
//         if (callback) callback(err);
//       } else {
//         console.log(`🖨 Printed ${labelType} label via USB`);
//         if (callback) callback(null);
//       }
//     });
//   } else {
//     const err = "⚠ No printer connected";
//     console.error(err);
//     if (callback) callback(err);
//   }
// }

// // -------------------- ZPL TEMPLATE --------------------
// function generateZPL(code, labelType) {
//   if (labelType.toLowerCase() === "master") {
//     return `^XA
// ^FO50,50^BQN,2,8^FDQA,${code}^FS
// ^FO50,320^A0N,50,50^FD${code}^FS
// ^FO50,390^A0N,35,35^FDMASTER LABEL^FS
// ^FO50,440^A0N,30,30^FD${new Date().toLocaleDateString()}^FS
// ^XZ`;
//   } else {
//     return `^XA
// ^FO50,50^BQN,2,8^FDQA,${code}^FS
// ^FO50,320^A0N,50,50^FD${code}^FS
// ^FO50,390^A0N,35,35^FDMONO LABEL^FS
// ^FO50,440^A0N,30,30^FD${new Date().toLocaleDateString()}^FS
// ^XZ`;
//   }
// }

// module.exports = {
//   connectPrinter,
//   connectPrinterByUSB,
//   disconnectPrinter,
//   printLabel,
// };

const net = require("net");
const usb = require("usb");

let client = null;
let usbPrinter = null;

// -------------------- NETWORK CONNECTION --------------------
function connectPrinter(printerIP, printerPort = 9100, callback) {
  client = new net.Socket();

  client.connect(printerPort, printerIP, () => {
    console.log(`✅ Connected to TSC Printer at ${printerIP}:${printerPort}`);
    if (callback) callback(null, "network");
  });

  client.on("error", (err) => {
    console.error("❌ Printer Connection Error:", err);
    if (callback) callback(err);
  });
}

// -------------------- USB CONNECTION --------------------
function connectPrinterByUSB(callback) {
  try {
    const devices = usb
      .getDeviceList()
      .filter((d) => d.deviceDescriptor.idVendor === 0x1203);

    if (devices.length === 0) {
      throw new Error("No TSC printer found via USB");
    }

    const device = devices[0];
    device.open();

    const iface = device.interfaces[0];
    if (iface.isKernelDriverActive()) iface.detachKernelDriver();
    iface.claim();

    usbPrinter = device;
    console.log("✅ Connected to TSC USB Printer");
    if (callback) callback(null, "usb");
  } catch (err) {
    console.error("❌ USB Printer Connection Error:", err);
    if (callback) callback(err);
  }
}

// -------------------- DISCONNECT --------------------
function disconnectPrinter() {
  if (client) {
    client.end();
    client = null;
    console.log("🛑 Network Printer Disconnected");
  }
  if (usbPrinter) {
    try {
      usbPrinter.close();
    } catch {}
    usbPrinter = null;
    console.log("🛑 USB Printer Disconnected");
  }
}

// -------------------- PRINT (TSPL / TSC COMMANDS) --------------------
function printLabel(code, labelType, callback) {
  const tsplData = generateTSPL(code, labelType);

  // --- NETWORK ---
  if (client) {
    client.write(tsplData, "utf8", () => {
      console.log(`🖨 Printed ${labelType} label via Network`);
      if (callback) callback(null);
    });
  }
  // --- USB ---
  else if (usbPrinter) {
    const iface = usbPrinter.interfaces[0];
    const endpoint = iface.endpoints.find((ep) => ep.direction === "out");

    if (!endpoint) {
      const err = "No USB OUT endpoint found";
      console.error(err);
      if (callback) callback(err);
      return;
    }

    endpoint.transfer(Buffer.from(tsplData, "ascii"), (err) => {
      if (err) {
        console.error("❌ USB Print Error:", err);
        if (callback) callback(err);
      } else {
        console.log(`🖨 Printed ${labelType} label via USB`);
        if (callback) callback(null);
      }
    });
  } else {
    const err = "⚠ No printer connected";
    console.error(err);
    if (callback) callback(err);
  }
}

// -------------------- TSPL TEMPLATE --------------------
function generateTSPL(code, labelType) {
  const type = labelType.toUpperCase();

  return `
SIZE 100 mm, 50 mm
GAP 2 mm, 0
DENSITY 10
SPEED 4
DIRECTION 1
CLS
QRCODE 100,100,L,5,A,0,M2,S7,"${code}"
TEXT 100,320,"3",0,1,1,"${code}"
TEXT 100,390,"3",0,1,1,"${type} LABEL"
TEXT 100,440,"3",0,1,1,"${new Date().toLocaleDateString()}"
PRINT 1
`;
}

// -------------------- EXPORT --------------------
module.exports = {
  connectPrinter,
  connectPrinterByUSB,
  disconnectPrinter,
  printLabel,
};
