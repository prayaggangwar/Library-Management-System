// --- FIREBASE CONFIGURATION ---
let auth;

(async function initializeFirebase() {
  try {
    const res = await fetch(`${API_BASE_URL}/config/firebase`);
    if (!res.ok) {
      throw new Error(`Failed to fetch Firebase config: ${res.statusText}`);
    }
    const firebaseConfig = await res.json();

    if (!firebaseConfig.apiKey) {
      console.error("Received empty config from server:", firebaseConfig);
      throw new Error("Server returned empty Firebase keys! Make sure they are saved in your .env file or Render Dashboard.");
    }

    // Initialize Firebase using the compat libraries imported in index.html
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();

    // Ensure Firebase session survives redirects and page reloads
    await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

    // Fallback listener for users returning from redirect where getRedirectResult is flaky
    auth.onAuthStateChanged(async (user) => {
      if (user && localStorage.getItem('pendingGoogleRedirect')) {
        console.log("User detected via onAuthStateChanged");
        localStorage.removeItem('pendingGoogleRedirect');
        await processGoogleUser(user);
      }
    });

    // HANDLE REDIRECT RESULT EXACTLY AS INSTRUCTED
    auth.getRedirectResult()
      .then(async (result) => {
        if (result?.user) {
          console.log("Google Login Success", result.user);
          localStorage.removeItem('pendingGoogleRedirect');
          await processGoogleUser(result.user);
        } else {
          // Wait for onAuthStateChanged to catch up. If not, reset UI after 3 seconds.
          setTimeout(() => {
            if (localStorage.getItem('pendingGoogleRedirect')) {
              localStorage.removeItem('pendingGoogleRedirect');
              const btn = document.querySelector('button[onclick="googleSignIn()"]');
              if (btn && btn.disabled && btn.innerHTML.includes("Completing login...")) {
                btn.innerHTML = `<svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg> Sign in with Google`;
                btn.disabled = false;
              }
            }
          }, 3000);
        }
      })
      .catch((error) => {
        localStorage.removeItem('pendingGoogleRedirect');
        console.log(error);
      });
  } catch (error) {
    console.error("Could not initialize Firebase:", error);
    const btn = document.querySelector('button[onclick="googleSignIn()"]');
    if (btn && btn.disabled && btn.innerHTML.includes("Completing login...")) {
      btn.innerHTML = `<svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg> Sign in with Google`;
      btn.disabled = false;
    }

    // Display an error to the user on the page
    const loginBox = document.querySelector('.login-box');
    if (loginBox) loginBox.innerHTML = `<h1>Error</h1><p style="color: #ff4d4d; text-align: center;">${error.message}</p><p style="text-align: center; color: #888; font-size: 14px;">Press F12 to check the browser console for more details.</p>`;
  }
})();

function togglePassword(inputId, icon) {
  const input = document.getElementById(inputId);
  if (input.type === "password") {
    input.type = "text";
    icon.innerText = "🙈";
  } else {
    input.type = "password";
    icon.innerText = "👁️";
  }
}

window.isGoogleSignIn = false; // State flag to assist with seamless Google auto-registration

function clearMessages() {
  document.querySelectorAll('.inline-message').forEach(el => el.innerText = '');
}

function displayMessage(containerId, message, isError = true) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  let msgDiv = container.querySelector(':scope > .inline-message');
  
  if (!message) {
    if (msgDiv) msgDiv.innerText = '';
    return;
  }

  if (!msgDiv) {
    msgDiv = document.createElement('div');
    msgDiv.className = 'inline-message';
    msgDiv.style.fontSize = '14px';
    msgDiv.style.marginTop = '-5px';
    msgDiv.style.marginBottom = '10px';
    msgDiv.style.textAlign = 'center';
    msgDiv.style.fontWeight = 'bold';
    
    // find the first direct button to insert before (skipping nested OTP buttons)
    const btn = container.querySelector(':scope > button');
    if (btn) {
      container.insertBefore(msgDiv, btn);
    } else {
      container.appendChild(msgDiv);
    }
  }
  
  msgDiv.style.color = isError ? '#ff4d4d' : '#28a745';
  msgDiv.innerText = message;
}

function showSuccessPopup(message, redirectUrl) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px);
    display: flex; justify-content: center; align-items: center;
    z-index: 10000; opacity: 0; transition: opacity 0.3s ease;
  `;

  const popup = document.createElement('div');
  popup.style.cssText = `
    background: white; padding: 40px; border-radius: 12px;
    text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    transform: scale(0.5); transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  `;

  popup.innerHTML = `
    <div style="font-size: 60px; line-height: 1; margin-bottom: 15px;">✅</div>
    <h2 style="margin: 0; color: #333; font-family: sans-serif;">${message}</h2>
  `;

  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  setTimeout(() => { overlay.style.opacity = '1'; popup.style.transform = 'scale(1)'; }, 10);
  setTimeout(() => { window.location.href = redirectUrl; }, 1500);
}

function showRoleSelection() {
  clearMessages();
  const roleSelection = document.getElementById("role-selection");
  if (roleSelection) roleSelection.style.display = "flex";
  
  document.getElementById("student-login").classList.add("hidden");
  document.getElementById("librarian-login").classList.add("hidden");
  const adminLogin = document.getElementById("admin-login");
  if (adminLogin) adminLogin.classList.add("hidden");
  const studentRegister = document.getElementById("student-register");
  const studentReset = document.getElementById("student-reset-password");
  if (studentRegister) studentRegister.classList.add("hidden");
  if (studentReset) studentReset.classList.add("hidden");
}

function showLogin(type) {
  clearMessages();
  window.isGoogleSignIn = false;

  const roleSelection = document.getElementById("role-selection");
  if (roleSelection) roleSelection.style.display = "none";

  const regStep1 = document.getElementById("regStep1");
  const regStep2 = document.getElementById("regStep2");
  const regPassword = document.getElementById("regPasswordContainer") || document.getElementById("regPassword");
  const regConfirm = document.getElementById("regConfirmPasswordContainer") || document.getElementById("regConfirmPassword");
  if (regStep1) regStep1.style.display = "flex";
  if (regStep2) regStep2.style.display = "none";
  if (regPassword) regPassword.style.display = "block";
  if (regConfirm) regConfirm.style.display = "block";

  const studentLogin = document.getElementById("student-login");
  const librarianLogin = document.getElementById("librarian-login");
  const adminLogin = document.getElementById("admin-login");
  const studentRegister = document.getElementById("student-register");
  const studentReset = document.getElementById("student-reset-password");

  studentLogin.classList.add("hidden");
  librarianLogin.classList.add("hidden");
  if (adminLogin) adminLogin.classList.add("hidden");
  if (studentRegister) studentRegister.classList.add("hidden");
  if (studentReset) studentReset.classList.add("hidden");

  if (type === "student") {
    studentLogin.classList.remove("hidden");
  } else if (type === "librarian") {
    librarianLogin.classList.remove("hidden");
  } else if (type === "admin" && adminLogin) {
    adminLogin.classList.remove("hidden");
  }
}

function showRegister() {
  clearMessages();
  document.getElementById("student-login").classList.add("hidden");
  document.getElementById("librarian-login").classList.add("hidden");
  const adminLogin = document.getElementById("admin-login");
  if (adminLogin) adminLogin.classList.add("hidden");
  const reset = document.getElementById("student-reset-password");
  if(reset) reset.classList.add("hidden");
  
  const step1 = document.getElementById("regStep1");
  const step2 = document.getElementById("regStep2");
  if(step1) step1.style.display = "flex";
  if(step2) step2.style.display = "none";

  document.getElementById("student-register").classList.remove("hidden");
}

function showResetPassword() {
  clearMessages();
  document.getElementById("student-login").classList.add("hidden");
  document.getElementById("librarian-login").classList.add("hidden");
  const adminLogin = document.getElementById("admin-login");
  if (adminLogin) adminLogin.classList.add("hidden");
  document.getElementById("student-register").classList.add("hidden");
  document.getElementById("student-reset-password").classList.remove("hidden");
}

let countdown;

function startOtpTimer(otpButton) {
  let timeLeft = 30;

  // stop old timer first
  clearInterval(countdown);

  if (otpButton) {
    otpButton.disabled = true;
    otpButton.innerHTML = `✅ Sent! (${timeLeft}s)`;
  }

  countdown = setInterval(() => {
    timeLeft--;

    if (timeLeft <= 0) {
      clearInterval(countdown);
      if (otpButton) {
        otpButton.disabled = false;
        otpButton.innerText = "Send OTP";
      }
    } else if (otpButton) {
      otpButton.innerHTML = `✅ Sent! (${timeLeft}s)`;
    }
  }, 1000);
}

async function sendOTP(emailInputId, type) {
  let containerId = 'student-register';
  if (emailInputId === 'regEmail') containerId = 'regStep1';
  else if (emailInputId === 'resetEmail') containerId = 'student-reset-password';
  else if (emailInputId === 'librarianEmail') containerId = 'librarian-login';
  else if (emailInputId === 'adminEmail') containerId = 'admin-login';

  displayMessage(containerId, "");

  let email = document.getElementById(emailInputId).value.trim();
  if (!email) { displayMessage(containerId, "Please enter an email address first!"); return; }

  // Get the button to show a loading state
  let btn = null;
  let otpInputId = null;
  if (emailInputId === 'regEmail') { btn = document.querySelector('#regOtpSection button'); otpInputId = 'regOtp'; }
  else if (emailInputId === 'resetEmail') { btn = document.querySelector('#student-reset-password button'); otpInputId = 'resetOtp'; }
  else if (emailInputId === 'librarianEmail') { btn = document.querySelector('#librarian-login div button'); otpInputId = 'librarianOtp'; }
  else if (emailInputId === 'adminEmail') { btn = document.querySelector('#admin-login div button'); otpInputId = 'adminOtp'; }

  if (btn) {
    btn.innerHTML = `<span class="spinner"></span>Sending...`;
    btn.disabled = true;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/send-email-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await res.json();

    if (data.success) {
      startOtpTimer(btn);
      displayMessage(containerId, data.message, false);
      if (otpInputId) {
        const otpInput = document.getElementById(otpInputId);
        if (otpInput) otpInput.focus();
      }
    } else {
      if (btn) {
        btn.innerText = "Send OTP";
        btn.disabled = false;
      }
      displayMessage(containerId, data.message);
    }
  } catch (error) { 
    console.error(error); 
    displayMessage(containerId, "Connection Error: Your backend is not reachable! Please ensure 'node server.js' is running in your terminal."); 
    if (btn) {
      btn.innerText = "Send OTP";
      btn.disabled = false;
    }
  }
}

async function verifyOtpAndProceed() {
  const containerId = "regStep1";
  displayMessage(containerId, "");

  const email = document.getElementById("regEmail").value.trim();
  const otp = document.getElementById("regOtp").value.trim();

  if (!email || !otp) {
    displayMessage(containerId, "Please enter email and OTP.");
    return;
  }

  const btn = document.querySelector('button[onclick="verifyOtpAndProceed()"]');
  if (btn && btn.disabled) return;
  const originalText = btn ? btn.innerHTML : "Verify OTP & Continue";
  if (btn) {
    btn.innerHTML = `<span class="spinner"></span>Verifying...`;
    btn.disabled = true;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/verify-email-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp })
    });
    
    if (!res.headers.get("content-type")?.includes("application/json")) {
      throw new Error("Server returned HTML instead of JSON! Please restart your Node.js backend server.");
    }

    const data = await res.json();
    
    if (data.success) {
      document.getElementById("regStep1").style.display = "none";
      document.getElementById("regStep2").style.display = "flex";
      displayMessage("regStep2", "Email verified! Please fill in your details.", false);
    } else {
      displayMessage(containerId, data.message);
    }
  } catch (err) {
    console.error(err);
    displayMessage(containerId, "Verification failed: " + (err.message || "Server error"));
  } finally {
    if (btn) {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }
}

async function processGoogleUser(user) {
  const containerId = "student-login";
  displayMessage(containerId, "");

  try {
    const res = await fetch(`${API_BASE_URL}/login/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email })
    });
    const data = await res.json();

    if (data.success) {
      localStorage.setItem("authToken", data.token);
      showSuccessPopup("Login Successful!", "./student/student-dashboard.html");
    } else if (data.requireRegistration) {
      showRegister();
      displayMessage("regStep2", "Account not found. Please complete your registration details.", false);
      
      document.getElementById("regEmail").value = user.email;
      document.getElementById("regName").value = user.displayName;
      
      window.isGoogleSignIn = true;
      document.getElementById("regStep1").style.display = 'none';
      document.getElementById("regStep2").style.display = 'flex';
      const regPassword = document.getElementById("regPasswordContainer") || document.getElementById("regPassword");
      if (regPassword) regPassword.style.display = 'none';
      const regConfirm = document.getElementById("regConfirmPasswordContainer") || document.getElementById("regConfirmPassword");
      if (regConfirm) regConfirm.style.display = 'none';
    }
    else {
      displayMessage(containerId, data.message || "Google Login failed on server.");
    }
  } catch (error) {
    console.error(error);
    displayMessage(containerId, "Authentication failed: " + error.message);
  }
  finally {
    const btn = document.querySelector('button[onclick="googleSignIn()"]');
    if (btn && btn.disabled && btn.innerHTML.includes("Completing login...")) {
      btn.innerHTML = `<svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg> Sign in with Google`;
      btn.disabled = false;
    }
  }
}

async function googleSignIn() {
  // 1. Instantly trigger the popup to prevent browser popup blockers!
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account' // Forces Google to always ask which account to use
  });
  const signInPromise = auth.signInWithPopup(provider);

  // 2. Now safely perform UI updates while the popup is opening
  const containerId = "student-login";
  displayMessage(containerId, "");

  const btn = document.querySelector('button[onclick="googleSignIn()"]');
  if (btn && btn.disabled) return;
  const originalText = btn ? btn.innerHTML : "Sign in with Google";
  if (btn) {
    btn.innerHTML = `<span class="spinner"></span>Signing in...`;
    btn.disabled = true;
  }

  try {
    const result = await signInPromise;
    await processGoogleUser(result.user);
  } catch (error) {
    console.error(error);
    if (error.code === "auth/popup-blocked") {
      displayMessage(containerId, "Popup blocked. Redirecting to Google...");
      sessionStorage.setItem('pendingGoogleRedirect', 'true');
      auth.signInWithRedirect(provider);
      return;
    }
    // Ignore the error if the user intentionally closed the Google popup window
    if (error.code !== "auth/popup-closed-by-user" && error.code !== "auth/cancelled-popup-request") {
      displayMessage(containerId, "Google Sign-In failed: " + error.message);
    }
  } finally {
    if (btn) {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }
}

async function registerStudent() {
  const containerId = "regStep2";
  displayMessage(containerId, "");

  const name = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const course = document.getElementById("regCourse").value.trim();
  const semester = document.getElementById("regSemester").value.trim();
  const pass = document.getElementById("regPassword").value.trim();
  const confirmPass = document.getElementById("regConfirmPassword").value.trim();
  const phone = document.getElementById("regPhone").value.trim();
  const otp = document.getElementById("regOtp").value.trim();

  // If it's a Google sign in, we bypass the custom password and OTP validation.
  if (!name || !email || !phone || !course || !semester || (!window.isGoogleSignIn && (!pass || !confirmPass || !otp))) {
    displayMessage(containerId, "Please fill in all required fields!");
    return;
  }

  if (!window.isGoogleSignIn && pass.length < 6) {
    displayMessage(containerId, "Password must be at least 6 characters long!");
    return;
  }

  if (!window.isGoogleSignIn && pass !== confirmPass) {
    displayMessage(containerId, "Passwords do not match!");
    return;
  }

  if (!/^\d{10}$/.test(phone)) {
    displayMessage(containerId, "Phone number must be exactly 10 digits!");
    return;
  }

  const btn = document.querySelector('button[onclick="registerStudent()"]');
  if (btn && btn.disabled) return;
  const originalText = btn ? btn.innerHTML : "Register";
  if (btn) {
    btn.innerHTML = `<span class="spinner"></span>Registering...`;
    btn.disabled = true;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, course, semester, password: pass, phone, otp, googleSignIn: window.isGoogleSignIn })
    });
    const data = await res.json();
    
    if (data.success) {
      if (window.isGoogleSignIn) {
        localStorage.setItem("authToken", data.token);
        showSuccessPopup("Registration Successful!", "./student/student-dashboard.html");
      } else {
        ["regName", "regEmail", "regCourse", "regSemester", "regPassword", "regConfirmPassword", "regPhone", "regOtp"].forEach(field => document.getElementById(field).value = "");
        showLogin("student");
        displayMessage("student-login", data.message, false);
      }
    } else {
      displayMessage(containerId, data.message);
    }
  } catch (err) {
    console.error(err);
    displayMessage(containerId, "Registration failed: " + (err.message || "Server error"));
  } finally {
    if (btn) {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }
}

async function resetPassword() {
  const containerId = "student-reset-password";
  displayMessage(containerId, "");

  const email = document.getElementById("resetEmail").value.trim();
  const otp = document.getElementById("resetOtp").value.trim();
  const newPassword = document.getElementById("resetNewPassword").value.trim();
  const confirmPassword = document.getElementById("resetConfirmPassword").value.trim();

  if (!email || !otp || !newPassword || !confirmPassword) {
    displayMessage(containerId, "Please fill in all fields!");
    return;
  }

  if (newPassword.length < 6) {
    displayMessage(containerId, "Password must be at least 6 characters long!");
    return;
  }

  if (newPassword !== confirmPassword) {
    displayMessage(containerId, "Passwords do not match!");
    return;
  }

  const btn = document.querySelector('button[onclick="resetPassword()"]');
  if (btn && btn.disabled) return;
  const originalText = btn ? btn.innerHTML : "Reset Password";
  if (btn) {
    btn.innerHTML = `<span class="spinner"></span>Resetting...`;
    btn.disabled = true;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, newPassword })
    });
    const data = await res.json();
    
    if (data.success) {
      ["resetEmail", "resetOtp", "resetNewPassword", "resetConfirmPassword"].forEach(f => document.getElementById(f).value = "");
      showLogin("student");
      displayMessage("student-login", "Password reset successfully! You can now log in.", false);
    } else { displayMessage(containerId, data.message); }
  } catch (err) { 
    console.error(err); 
    displayMessage(containerId, "Reset failed: " + (err.message || "Server error.")); 
  } finally {
    if (btn) {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }
}

async function studentLogin() {
  const containerId = "student-login";
  displayMessage(containerId, "");

  const emailInput = document.getElementById("studentEmail");
  const passInput = document.getElementById("studentPassword");
  
  const email = emailInput ? emailInput.value.trim() : "";
  const pass = passInput ? passInput.value.trim() : "";

  if (!email || !pass) {
    displayMessage(containerId, "Please enter Email Address and Password!");
    return;
  }

  const btn = document.querySelector('button[onclick="studentLogin()"]');
  if (btn && btn.disabled) return;
  const originalText = btn ? btn.innerHTML : "Login";
  if (btn) {
    btn.innerHTML = `<span class="spinner"></span>Logging in...`;
    btn.disabled = true;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/login/student`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass })
    });
    const data = await res.json();
    
    if (data.success) {
      localStorage.setItem("authToken", data.token);
      showSuccessPopup("Login Successful!", "./student/student-dashboard.html");
    } else {
      displayMessage(containerId, data.message || "Invalid Email or Password!");
    }
  } catch (err) {
    console.error(err);
    displayMessage(containerId, "Server error. Please ensure the backend is running.");
  } finally {
    if (btn) {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }
}

async function librarianLogin() {
  const containerId = "librarian-login";
  displayMessage(containerId, "");

  const emailInput = document.getElementById("librarianEmail");
  const otpInput = document.getElementById("librarianOtp");
  
  const email = emailInput ? emailInput.value.trim() : "";
  const otp = otpInput ? otpInput.value.trim() : "";

  if (!email || !otp) {
    displayMessage(containerId, "Please enter Email Address and OTP!");
    return;
  }

  const btn = document.querySelector('button[onclick="librarianLogin()"]');
  if (btn && btn.disabled) return;
  const originalText = btn ? btn.innerHTML : "Login";
  if (btn) {
    btn.innerHTML = `<span class="spinner"></span>Logging in...`;
    btn.disabled = true;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/login/librarian`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp })
    });
    const data = await res.json();
    
    if (data.success) {
      localStorage.setItem("authToken", data.token);
      showSuccessPopup("Login Successful!", "./librarian/librarian-dashboard.html");
    } else {
      displayMessage(containerId, data.message || "Invalid Email or OTP!");
    }
  } catch (err) {
    console.error(err);
    displayMessage(containerId, "Server error. Please ensure the backend is running.");
  } finally {
    if (btn) {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }
}

async function adminLogin() {
  const containerId = "admin-login";
  displayMessage(containerId, "");

  const emailInput = document.getElementById("adminEmail");
  const otpInput = document.getElementById("adminOtp");
  
  const email = emailInput ? emailInput.value.trim() : "";
  const otp = otpInput ? otpInput.value.trim() : "";

  if (!email || !otp) {
    displayMessage(containerId, "Please enter Email Address and OTP!");
    return;
  }

  const btn = document.querySelector('button[onclick="adminLogin()"]');
  if (btn && btn.disabled) return;
  const originalText = btn ? btn.innerHTML : "Login";
  if (btn) {
    btn.innerHTML = `<span class="spinner"></span>Logging in...`;
    btn.disabled = true;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/login/admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp })
    });
    const data = await res.json();
    
    if (data.success) {
      localStorage.setItem("authToken", data.token);
      showSuccessPopup("Login Successful!", "./admin-dashboard.html");
    } else {
      displayMessage(containerId, data.message || "Invalid Email or OTP!");
    }
  } catch (err) {
    console.error(err);
    displayMessage(containerId, "Server error. Please ensure the backend is running.");
  } finally {
    if (btn) {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }
}

// --- ENTER KEY LOGIN SUPPORT ---
document.addEventListener("DOMContentLoaded", () => {
  const handleEnter = (e, loginAction) => {
    if (e.key === "Enter") loginAction();
  };

  const inputConfig = [
    { id: "studentEmail", action: studentLogin },
    { id: "studentPassword", action: studentLogin },
    { id: "librarianEmail", action: librarianLogin },
    { id: "librarianOtp", action: librarianLogin },
    { id: "adminEmail", action: adminLogin },
    { id: "adminOtp", action: adminLogin },
    { id: "regName", action: registerStudent },
    { id: "regEmail", action: verifyOtpAndProceed },
    { id: "regOtp", action: verifyOtpAndProceed },
    { id: "regPhone", action: registerStudent },
    { id: "regCourse", action: registerStudent },
    { id: "regSemester", action: registerStudent },
    { id: "regPassword", action: registerStudent },
    { id: "regConfirmPassword", action: registerStudent },
    { id: "resetEmail", action: resetPassword },
    { id: "resetOtp", action: resetPassword },
    { id: "resetNewPassword", action: resetPassword },
    { id: "resetConfirmPassword", action: resetPassword }
  ];

  inputConfig.forEach(({ id, action }) => {
    const element = document.getElementById(id);
    if (element) element.addEventListener("keypress", (e) => handleEnter(e, action));
  });

  // Prevent non-numeric input in the phone number field
  const regPhone = document.getElementById("regPhone");
  if (regPhone) {
    regPhone.addEventListener("input", function() {
      this.value = this.value.replace(/\D/g, "");
    });
  }

  if (localStorage.getItem('pendingGoogleRedirect')) {
    showLogin('student');
    const btn = document.querySelector('button[onclick="googleSignIn()"]');
    if (btn) {
      btn.innerHTML = `<span class="spinner"></span>Completing login...`;
      btn.disabled = true;
    }
  } else {
    // Show the role selection landing page by default
    showRoleSelection();
  }
});