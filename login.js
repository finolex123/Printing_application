const { ipcRenderer } = require("electron");

function togglePassword() {
  const passwordInput = document.getElementById("password");
  const toggle = document.querySelector(".password-toggle");

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    toggle.textContent = "🙈";
  } else {
    passwordInput.type = "password";
    toggle.textContent = "👁️";
  }
}

// Show Message
function showMessage(text, type) {
  const messageDiv = document.getElementById("message");
  messageDiv.textContent = text;
  messageDiv.className = `message ${type}`;
  messageDiv.style.display = "block";

  setTimeout(() => {
    messageDiv.style.display = "none";
  }, 5000);
}

// Load Saved Credentials
window.addEventListener("DOMContentLoaded", () => {
  const savedBaseUrl = localStorage.getItem("baseUrl");
  const savedUsername = localStorage.getItem("username");

  if (rememberMe && savedBaseUrl) {
    document.getElementById("baseUrl").value = savedBaseUrl;
  }
  if (rememberMe && savedUsername) {
    document.getElementById("username").value = savedUsername;
    document.getElementById("rememberMe").checked = true;
  }
});

// Handle Login
async function handleLogin(event) {
  event.preventDefault();

  const baseUrl = document.getElementById("baseUrl").value.trim();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const loginBtn = document.getElementById("loginBtn");

  // Basic Validation
  if (!baseUrl || !username || !password) {
    showMessage("Please fill in all fields", "error");
    return;
  }

  // Validate URL format
  try {
    new URL(baseUrl);
  } catch (e) {
    showMessage("Invalid Base URL format", "error");
    return;
  }

  // Disable button and show loading
  loginBtn.disabled = true;
  loginBtn.innerHTML = '<span class="loading-spinner"></span> Logging in...';

  // Simulate API Call (Replace with actual API call)
  try {
    // TODO: Replace this with actual authentication API call
    // Example:
    // const response = await fetch(`${baseUrl}/auth/login`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ username, password })
    // });
    // const data = await response.json();

    // Simulated delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Simulated successful login (replace with actual logic)
    const isSuccess = true;

    window.location.href = "./Pages/print.html";

    if (isSuccess) {
      if (rememberMe) {
        localStorage.setItem("baseUrl", baseUrl);
        localStorage.setItem("username", username);
        localStorage.setItem("rememberMe", "true");
      } else {
        localStorage.removeItem("baseUrl");
        localStorage.removeItem("username");
        localStorage.removeItem("rememberMe");
      }

      // Save session data
      sessionStorage.setItem("baseUrl", baseUrl);
      sessionStorage.setItem("username", username);
      sessionStorage.setItem("isLoggedIn", "true");

      showMessage("Login successful! Redirecting...", "success");

      // Redirect to main page after 1 second
      setTimeout(() => {
        ipcRenderer.send("navigate", "print.html"); // ✅ Use IPC instead of window.location.href
      }, 1000);
    } else {
      showMessage("Invalid username or password", "error");
      loginBtn.disabled = false;
      loginBtn.textContent = "Login";
    }
  } catch (error) {
    showMessage("Connection error. Please check your Base URL.", "error");
    loginBtn.disabled = false;
    loginBtn.textContent = "Login";
  }
}

// Enter key submit
document.getElementById("password").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    handleLogin(e);
  }
});
