let isConnected = false;
let allCodes = [];

// Initialize the application
document.addEventListener("DOMContentLoaded", function () {
  // Add event listeners to buttons
  document
    .getElementById("connectBtn")
    .addEventListener("click", selectPrinter);
  document
    .getElementById("disconnectBtn")
    .addEventListener("click", disconnectPrinter);
  document
    .getElementById("refreshPrintersBtn")
    .addEventListener("click", loadPrinters);
  document
    .getElementById("testPrintBtn")
    .addEventListener("click", testPrinter);
  document
    .getElementById("generateBtn")
    .addEventListener("click", generateCodes);
  document
    .getElementById("printAllBtn")
    .addEventListener("click", printAllCodes);
  document
    .getElementById("clearAllBtn")
    .addEventListener("click", clearAllCodes);
  document.getElementById("logoutBtn").addEventListener("click", logout);

  // Printer select change handler
  document
    .getElementById("printerSelect")
    .addEventListener("change", function () {
      const connectBtn = document.getElementById("connectBtn");
      connectBtn.disabled = !this.value;
    });

  // Load initial data
  loadPrinters();
  loadCodes();
});

// Load available printers
async function loadPrinters() {
  const select = document.getElementById("printerSelect");
  const messageDiv = document.getElementById("connectionMessage");
  const refreshBtn = document.getElementById("refreshPrintersBtn");

  refreshBtn.disabled = true;
  refreshBtn.textContent = "Loading...";

  try {
    const result = await window.api.getInstalledPrinters();

    if (result.success) {
      select.innerHTML = '<option value="">-- Select a printer --</option>';

      result.printers.forEach((printer) => {
        const option = document.createElement("option");
        option.value = printer.name;
        option.textContent =
          printer.name + (printer.isDefault ? " (Default)" : "");
        if (printer.isDefault) {
          option.selected = true;
          document.getElementById("connectBtn").disabled = false;
        }
        select.appendChild(option);
      });

      if (result.printers.length === 0) {
        showMessage(messageDiv, "No printers found on system", "error");
      }
    } else {
      showMessage(
        messageDiv,
        "Failed to load printers: " + result.message,
        "error"
      );
    }
  } catch (error) {
    showMessage(
      messageDiv,
      "Error loading printers: " + error.message,
      "error"
    );
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.textContent = "🔄 Refresh Printers";
  }
}

// Select Printer
async function selectPrinter() {
  const printerName = document.getElementById("printerSelect").value;
  const connectBtn = document.getElementById("connectBtn");
  const disconnectBtn = document.getElementById("disconnectBtn");
  const testPrintBtn = document.getElementById("testPrintBtn");
  const statusDiv = document.getElementById("status");
  const messageDiv = document.getElementById("connectionMessage");

  if (!printerName) {
    showMessage(messageDiv, "Please select a printer", "error");
    return;
  }

  connectBtn.disabled = true;
  connectBtn.textContent = "Connecting...";

  try {
    const result = await window.api.selectPrinter(printerName);

    if (result.success) {
      isConnected = true;
      statusDiv.className = "status connected";
      statusDiv.textContent = "🟢 Printer Selected: " + printerName;

      connectBtn.style.display = "none";
      disconnectBtn.style.display = "inline-block";
      testPrintBtn.style.display = "inline-block";

      updatePrintButtonState();
      showMessage(messageDiv, result.message, "success");
    } else {
      handleConnectionError(connectBtn, statusDiv, result.message);
      showMessage(messageDiv, "Selection failed: " + result.message, "error");
    }
  } catch (error) {
    handleConnectionError(connectBtn, statusDiv, error.message);
    showMessage(messageDiv, "Error: " + error.message, "error");
  }
}

// Test Printer
async function testPrinter() {
  const messageDiv = document.getElementById("connectionMessage");
  const testBtn = document.getElementById("testPrintBtn");

  testBtn.disabled = true;
  testBtn.textContent = "Testing...";

  try {
    const result = await window.api.testPrinter();

    if (result.success) {
      showMessage(messageDiv, "✓ Test print sent successfully", "success");
    } else {
      showMessage(messageDiv, "Test print failed: " + result.message, "error");
    }
  } catch (error) {
    showMessage(messageDiv, "Error: " + error.message, "error");
  } finally {
    testBtn.disabled = false;
    testBtn.textContent = "Test Print";
  }
}

// Disconnect Printer
async function disconnectPrinter() {
  const connectBtn = document.getElementById("connectBtn");
  const disconnectBtn = document.getElementById("disconnectBtn");
  const testPrintBtn = document.getElementById("testPrintBtn");
  const statusDiv = document.getElementById("status");
  const messageDiv = document.getElementById("connectionMessage");

  try {
    const result = await window.api.disconnectPrinter();

    if (result.success) {
      isConnected = false;
      statusDiv.className = "status disconnected";
      statusDiv.textContent = "⚫ No Printer Selected";

      connectBtn.style.display = "inline-block";
      disconnectBtn.style.display = "none";
      testPrintBtn.style.display = "none";
      connectBtn.disabled = !document.getElementById("printerSelect").value;
      connectBtn.textContent = "Select Printer";

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
      await loadCodes();
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
    const pendingResult = await window.api.fetchRecords(0);
    const printedResult = await window.api.fetchRecords(1);

    if (pendingResult.success && printedResult.success) {
      allCodes = [...pendingResult.data, ...printedResult.data];
      updateCodesDisplay();
      updatePrintButtonState();
      updateCounts();
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
    showMessage(messageDiv, "Please select a printer first", "error");
    return;
  }

  const pendingCodes = allCodes.filter((code) => !code.IsPrinted);
  if (pendingCodes.length === 0) {
    showMessage(messageDiv, "No pending codes to print", "error");
    return;
  }

  printBtn.disabled = true;
  printBtn.textContent = `Printing 0/${pendingCodes.length}...`;

  let successCount = 0;
  let errorCount = 0;

  try {
    for (let i = 0; i < pendingCodes.length; i++) {
      const code = pendingCodes[i];
      printBtn.textContent = `Printing ${i + 1}/${pendingCodes.length}...`;

      try {
        const result = await window.api.printLabel(code.Code, code.CodeType);

        if (result.success) {
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
    showMessage(messageDiv, "Please select a printer first", "error");
    return;
  }

  try {
    const result = await window.api.printLabel(code, codeType);

    if (result.success) {
      await window.api.markAsPrinted(recNo);
      await loadCodes();
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
            <span class="code-date">${formatDate(code.DownloadDate)}</span>
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
  statusDiv.textContent = "⚫ No Printer Selected";
  connectBtn.disabled = false;
  connectBtn.textContent = "Select Printer";
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

function logout() {
  localStorage.clear();
  alert("Logged out successfully!");
  window.location.href = "../index.html";
}

// Event listeners for Enter key
document.getElementById("quantity").addEventListener("keypress", function (e) {
  if (e.key === "Enter") generateCodes();
});
