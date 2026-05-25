// --- FIREBASE CONFIGURATION ---
// This config object was copied from your Firebase project console.
const firebaseConfig = {
  apiKey: "AIzaSyDD2XO6I2HjIDoG29ANowrHBrxUdvuqPTI",
  authDomain: "library-management-syste-dfda4.firebaseapp.com",
  projectId: "library-management-syste-dfda4",
  storageBucket: "library-management-syste-dfda4.appspot.com",
  messagingSenderId: "825256769246",
  appId: "1:825256769246:web:59940faa3e2b00aa26344f",
  measurementId: "G-28FCP7EBLK"
};

// Initialize Firebase using the compat libraries imported in index.html
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

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

function showLogin(type) {
  clearMessages();
  window.isGoogleSignIn = false;
  localStorage.setItem('lastLoginTab', type);
  const regStep1 = document.getElementById("regStep1");
  const regStep2 = document.getElementById("regStep2");
  const regPassword = document.getElementById("regPasswordContainer") || document.getElementById("regPassword");
  const regConfirm = document.getElementById("regConfirmPasswordContainer") || document.getElementById("regConfirmPassword");
  if (regStep1) regStep1.style.display = "flex";
  if (regStep2) regStep2.style.display = "none";
  if (regPassword) regPassword.style.display = "block";
  if (regConfirm) regConfirm.style.display = "block";

  const studentLogin =
    document.getElementById("student-login");

  const librarianLogin =
    document.getElementById("librarian-login");

  const studentRegister = 
    document.getElementById("student-register");

  const studentReset = 
    document.getElementById("student-reset-password");

  if (type === "student") {
    studentLogin.classList.remove("hidden");
    librarianLogin.classList.add("hidden");
    if (studentRegister) studentRegister.classList.add("hidden");
    if (studentReset) studentReset.classList.add("hidden");
  }
  else {
    librarianLogin.classList.remove("hidden");
    studentLogin.classList.add("hidden");
    if (studentRegister) studentRegister.classList.add("hidden");
    if (studentReset) studentReset.classList.add("hidden");
  }
}

function showRegister() {
  clearMessages();
  document.getElementById("student-login").classList.add("hidden");
  document.getElementById("librarian-login").classList.add("hidden");
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

    if (timeLeft < 0) {
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

  displayMessage(containerId, "");

  let email = document.getElementById(emailInputId).value.trim();
  if (!email) { displayMessage(containerId, "Please enter an email address first!"); return; }

  // Get the button to show a loading state
  let btn = null;
  if (emailInputId === 'regEmail') btn = document.querySelector('#regOtpSection button');
  else if (emailInputId === 'resetEmail') btn = document.querySelector('#student-reset-password button');
  else if (emailInputId === 'librarianEmail') btn = document.querySelector('#librarian-login div button');

  if (btn) {
    btn.innerHTML = `<span class="spinner"></span>Sending...`;
    btn.disabled = true;
  }

  try {
    const res = await fetch("https://library-management-system-1-vh1g.onrender.com/api/send-email-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await res.json();

    if (data.success) {
      startOtpTimer(btn);
      displayMessage(containerId, data.message, false);
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
    const res = await fetch("https://library-management-system-1-vh1g.onrender.com/api/verify-email-otp", {
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

async function googleSignIn() {
  const containerId = "student-login";
  displayMessage(containerId, "");

  const btn = document.querySelector('button[onclick="googleSignIn()"]');
  if (btn && btn.disabled) return;
  const originalText = btn ? btn.innerHTML : "Sign in with Google";
  if (btn) {
    btn.innerHTML = `<span class="spinner"></span>Signing in...`;
    btn.disabled = true;
  }

  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    const user = result.user;

    const res = await fetch("https://library-management-system-1-vh1g.onrender.com/api/login/google", {
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
      
      // Hide OTP and password requirements because Google has pre-verified the account
      window.isGoogleSignIn = true;
      document.getElementById("regStep1").style.display = 'none';
      document.getElementById("regStep2").style.display = 'flex';
      (document.getElementById("regPasswordContainer") || document.getElementById("regPassword")).style.display = 'none';
      const regConfirm = document.getElementById("regConfirmPasswordContainer") || document.getElementById("regConfirmPassword");
      if (regConfirm) regConfirm.style.display = 'none';
    }
  } catch (error) {
    console.error(error);
    displayMessage(containerId, "Google Sign-In failed: " + error.message);
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
  if (!name || !email || !course || !semester || (!window.isGoogleSignIn && (!pass || !confirmPass || !otp))) {
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

  const btn = document.querySelector('button[onclick="registerStudent()"]');
  if (btn && btn.disabled) return;
  const originalText = btn ? btn.innerHTML : "Register";
  if (btn) {
    btn.innerHTML = `<span class="spinner"></span>Registering...`;
    btn.disabled = true;
  }

  try {
    const res = await fetch("https://library-management-system-1-vh1g.onrender.com/api/register", {
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
    const res = await fetch("https://library-management-system-1-vh1g.onrender.com/api/reset-password", {
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
    const res = await fetch("https://library-management-system-1-vh1g.onrender.com/api/login/student", {
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
    const res = await fetch("https://library-management-system-1-vh1g.onrender.com/api/login/librarian", {
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

  // Retrieve the last selected tab from localStorage, defaulting to 'student'
  const lastTab = localStorage.getItem('lastLoginTab') || 'student';
  showLogin(lastTab);
});