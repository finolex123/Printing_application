let isConnected = false;
let allCodes = [];

// Initialize the application
document.addEventListener("DOMContentLoaded", function () {
  // Add event listeners to buttons
  document
    .getElementById("connectBtn")
    .addEventListener("click", connectPrinter);
    document
    .getElementById("connectusbBtn")
    .addEventListener("click", connectUsbPrinter);
  document
    .getElementById("disconnectBtn")
    .addEventListener("click", disconnectPrinter);
  document
    .getElementById("generateBtn")
    .addEventListener("click", generateCodes);
  document
    .getElementById("printAllBtn")
    .addEventListener("click", printAllCodes);
  document
    .getElementById("clearAllBtn")
    .addEventListener("click", clearAllCodes);

  // Load initial codes
  loadCodes();
});

// Connect to Printer
async function connectPrinter() {
  const ip = document.getElementById("printerIP").value.trim();
  const port = parseInt(document.getElementById("printerPort").value);
  const connectBtn = document.getElementById("connectBtn");
  const disconnectBtn = document.getElementById("disconnectBtn");
  const statusDiv = document.getElementById("status");
  const messageDiv = document.getElementById("connectionMessage");

  if (!ip) {
    showMessage(messageDiv, "Please enter printer IP address", "error");
    return;
  }

  connectBtn.disabled = true;
  connectBtn.textContent = "Connecting...";

  try {
    const result = await window.api.connectPrinter(ip, port);

    if (result.success) {
      isConnected = true;
      statusDiv.className = "status connected";
      statusDiv.textContent = "🟢 Printer Connected";

      connectBtn.style.display = "none";
      disconnectBtn.style.display = "block";

      updatePrintButtonState();
      showMessage(messageDiv, result.message, "success");
    } else {
      handleConnectionError(connectBtn, statusDiv, result.message);
      showMessage(messageDiv, "Connection failed: " + result.message, "error");
    }
  } catch (error) {
    handleConnectionError(connectBtn, statusDiv, error.message);
    showMessage(messageDiv, "Error: " + error.message, "error");
  }
}

// connect through USB

async function connectUsbPrinter() {
  const connectBtn = document.getElementById("connectBtn");
  const disconnectBtn = document.getElementById("disconnectBtn");
  const statusDiv = document.getElementById("status");
  const messageDiv = document.getElementById("connectionMessage");

  connectBtn.disabled = true;
  connectBtn.textContent = "Connecting...";

  try {
    const usbresuilt = await window.api.connectPrinterByUSB();

    if (usbresuilt.success) {
      isConnected = true;
      statusDiv.className = "status connected";
      statusDiv.textContent = "🟢 Printer Connected";

      connectBtn.style.display = "none";
      disconnectBtn.style.display = "block";

      updatePrintButtonState();
      showMessage(messageDiv, usbresuilt.message, "success");
    } else {
      handleConnectionError(connectBtn, statusDiv, usbresuilt.message);
      showMessage(
        messageDiv,
        "Connection failed: " + usbresuilt.message,
        "error"
      );
    }
  } catch (error) {
    handleConnectionError(connectBtn, statusDiv, error.message);
    showMessage(messageDiv, "Error: " + error.message, "error");
  }
}

// Disconnect Printer
async function disconnectPrinter() {
  const connectBtn = document.getElementById("connectBtn");
  const disconnectBtn = document.getElementById("disconnectBtn");
  const statusDiv = document.getElementById("status");
  const messageDiv = document.getElementById("connectionMessage");

  try {
    const result = await window.api.disconnectPrinter();

    if (result.success) {
      isConnected = false;
      statusDiv.className = "status disconnected";
      statusDiv.textContent = "⚫ Printer Disconnected";

      connectBtn.style.display = "block";
      disconnectBtn.style.display = "none";
      connectBtn.disabled = false;
      connectBtn.textContent = "Connect to Printer";

      updatePrintButtonState();
      showMessage(messageDiv, result.message, "success");
    }
  } catch (error) {
    showMessage(messageDiv, "Error: " + error.message, "error");
  }
}

// Generate Codes
async function generateCodes() {
  const quantity = parseInt(document.getElementById("quantity").value);
  const labelType = document.getElementById("generateLabelType").value;
  const generateBtn = document.getElementById("generateBtn");
  const messageDiv = document.getElementById("generateMessage");

  if (!quantity || quantity < 1) {
    showMessage(messageDiv, "Please enter a valid quantity", "error");
    return;
  }

  generateBtn.disabled = true;
  generateBtn.textContent = "Generating...";

  try {
    // Generate code items for bulk insert
    const items = [];
    for (let i = 0; i < quantity; i++) {
      const code = `CODE-${labelType.toUpperCase()}-${Date.now()}-${i}`;
      items.push({ Code: code, CodeType: labelType });
    }

    const result = await window.api.insertBulk(items);

    if (result.success) {
      showMessage(
        messageDiv,
        `✓ Generated ${quantity} ${labelType} codes`,
        "success"
      );
      document.getElementById("quantity").value = "";
      await loadCodes(); // Reload codes from database
    } else {
      showMessage(messageDiv, "Generation failed: " + result.message, "error");
    }
  } catch (error) {
    showMessage(messageDiv, "Error: " + error.message, "error");
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = "Generate Codes";
  }
}

// Load codes from database
async function loadCodes() {
  try {
    // Load pending codes
    const pendingResult = await window.api.fetchRecords(0);
    const printedResult = await window.api.fetchRecords(1);

    if (pendingResult.success && printedResult.success) {
      allCodes = [...pendingResult.data, ...printedResult.data];
      updateCodesDisplay();
      updatePrintButtonState();
      updateCounts();
    } else {
      console.error("Failed to load codes");
    }
  } catch (error) {
    console.error("Error loading codes:", error);
  }
}

// Print All Pending Codes
async function printAllCodes() {
  const printBtn = document.getElementById("printAllBtn");
  const messageDiv = document.getElementById("printMessage");

  if (!isConnected) {
    showMessage(messageDiv, "Please connect to printer first", "error");
    return;
  }

  const pendingCodes = allCodes.filter((code) => !code.IsPrinted);
  if (pendingCodes.length === 0) {
    showMessage(messageDiv, "No pending codes to print", "error");
    return;
  }

  printBtn.disabled = true;
  printBtn.textContent = "Printing...";

  let successCount = 0;
  let errorCount = 0;

  try {
    // Print each pending code sequentially
    for (const code of pendingCodes) {
      try {
        const result = await window.api.printLabel(code.Code, code.CodeType);
        showMessage(messageDiv, result, "error");

        if (result.success) {
          // Mark as printed in database
          await window.api.markAsPrinted(code.RecNo);
          successCount++;
        } else {
          errorCount++;
          console.error(`Failed to print ${code.Code}:`, result.message);
        }
      } catch (error) {
        errorCount++;
        console.error(`Error printing ${code.Code}:`, error);
      }
    }

    // Reload codes to update display
    await loadCodes();

    if (errorCount === 0) {
      showMessage(
        messageDiv,
        `✓ Successfully printed ${successCount} codes`,
        "success"
      );
    } else {
      showMessage(
        messageDiv,
        `Printed ${successCount} codes, ${errorCount} failed`,
        "error"
      );
    }
  } catch (error) {
    showMessage(messageDiv, "Error during printing: " + error.message, "error");
  } finally {
    updatePrintButtonState();
    printBtn.textContent = "Print All Pending Codes";
  }
}

// Print single code
async function printSingleCode(recNo, code, codeType) {
  const messageDiv = document.getElementById("printMessage");

  if (!isConnected) {
    showMessage(messageDiv, "Please connect to printer first", "error");
    return;
  }

  try {
    const result = await window.api.printLabel(code, codeType);

    if (result.success) {
      // Mark as printed in database
      await window.api.markAsPrinted(recNo);
      await loadCodes(); // Reload to update display
      showMessage(messageDiv, `✓ Printed: ${code}`, "success");
    } else {
      showMessage(messageDiv, `Print failed: ${result.message}`, "error");
    }
  } catch (error) {
    showMessage(messageDiv, "Error: " + error.message, "error");
  }
}

// Clear All Codes
async function clearAllCodes() {
  const messageDiv = document.getElementById("printMessage");

  if (
    !confirm(
      "Are you sure you want to delete all codes? This action cannot be undone."
    )
  ) {
    return;
  }

  try {
    const result = await window.api.deleteAllRecords();

    if (result.success) {
      allCodes = [];
      updateCodesDisplay();
      updatePrintButtonState();
      updateCounts();
      showMessage(messageDiv, "All codes cleared successfully", "success");
    } else {
      showMessage(messageDiv, "Clear failed: " + result.message, "error");
    }
  } catch (error) {
    showMessage(messageDiv, "Error: " + error.message, "error");
  }
}

// Update codes display
function updateCodesDisplay() {
  const container = document.getElementById("codesContainer");

  if (allCodes.length === 0) {
    container.innerHTML =
      '<div class="empty-state">No codes generated yet. Generate some codes to get started.</div>';
    return;
  }

  // Sort codes: pending first, then by date
  const sortedCodes = [...allCodes].sort((a, b) => {
    if (a.IsPrinted !== b.IsPrinted) return a.IsPrinted ? 1 : -1;
    return new Date(b.DownloadDate) - new Date(a.DownloadDate);
  });

  container.innerHTML = sortedCodes
    .map(
      (code) => `
        <div class="code-item ${code.IsPrinted ? "printed" : ""}">
            <div class="code-info">
                <div class="code-text">${code.Code}</div>
                <div class="code-meta">
                    <span class="code-type">${code.CodeType}</span>
                    <span class="code-date">${formatDate(
                      code.DownloadDate
                    )}</span>
                    ${
                      code.PrintDate
                        ? `<span class="code-date">Printed: ${formatDate(
                            code.PrintDate
                          )}</span>`
                        : ""
                    }
                </div>
            </div>
            <div class="code-actions">
                <div class="code-status ${code.IsPrinted ? "printed" : ""}">
                    ${code.IsPrinted ? "Printed" : "Pending"}
                </div>
                ${
                  !code.IsPrinted
                    ? `
                    <button class="btn-print-single" onclick="printSingleCode(${
                      code.RecNo
                    }, '${code.Code}', '${code.CodeType}')" ${
                        !isConnected ? "disabled" : ""
                      }>
                        Print
                    </button>
                `
                    : ""
                }
            </div>
        </div>
    `
    )
    .join("");
}

// Update counts display
function updateCounts() {
  const pendingCount = allCodes.filter((code) => !code.IsPrinted).length;
  const printedCount = allCodes.filter((code) => code.IsPrinted).length;

  document.getElementById("pendingCount").textContent = pendingCount;
  document.getElementById("printedCount").textContent = printedCount;
}

// Update print button state
function updatePrintButtonState() {
  const printBtn = document.getElementById("printAllBtn");
  const hasPendingCodes = allCodes.some((code) => !code.IsPrinted);

  printBtn.disabled = !isConnected || !hasPendingCodes;
}

// Helper functions
function handleConnectionError(connectBtn, statusDiv, message) {
  isConnected = false;
  statusDiv.className = "status disconnected";
  statusDiv.textContent = "⚫ Printer Disconnected";
  connectBtn.disabled = false;
  connectBtn.textContent = "Connect to Printer";
}

function showMessage(element, text, type) {
  element.textContent = text;
  element.className = `message ${type}`;
  element.style.display = "block";

  setTimeout(() => {
    element.style.display = "none";
  }, 5000);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString();
}

// Event listeners for Enter key
document.getElementById("quantity").addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    generateCodes();
  }
});

document.getElementById("printerIP").addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    connectPrinter();
  }
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.clear();
  alert("Logged out successfully!");
  window.location.href = "../index.html";
});
