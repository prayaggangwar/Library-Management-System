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

function showLogin(type) {
  window.isGoogleSignIn = false;
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
  document.getElementById("student-login").classList.add("hidden");
  document.getElementById("librarian-login").classList.add("hidden");
  document.getElementById("student-register").classList.add("hidden");
  document.getElementById("student-reset-password").classList.remove("hidden");
}

let globalOtpTimer = null;

function updateOtpButtons() {
  const expiry = parseInt(localStorage.getItem('otpCooldownExpiry') || '0', 10);
  const now = Date.now();
  const timeLeft = Math.ceil((expiry - now) / 1000);

  const btns = [
    document.querySelector('#regOtpSection button'),
    document.querySelector('#student-reset-password button'),
    document.querySelector('#librarian-login div button')
  ].filter(Boolean);

  if (timeLeft > 0) {
    btns.forEach(btn => {
      btn.disabled = true;
      btn.innerText = `Wait ${timeLeft}s`;
    });
    if (!globalOtpTimer) {
      globalOtpTimer = setInterval(updateOtpButtons, 1000);
    }
  } else {
    btns.forEach(btn => {
      if (btn.innerText.startsWith("Wait")) {
        btn.disabled = false;
        btn.innerText = "Send OTP";
      }
    });
    if (globalOtpTimer) {
      clearInterval(globalOtpTimer);
      globalOtpTimer = null;
    }
  }
}

async function sendOTP(emailInputId, type) {
  let email = document.getElementById(emailInputId).value.trim();
  if (!email) { alert("Please enter an email address first!"); return; }

  // Get the button to show a loading state
  let btn = null;
  if (emailInputId === 'regEmail') btn = document.querySelector('#regOtpSection button');
  else if (emailInputId === 'resetEmail') btn = document.querySelector('#student-reset-password button');
  else if (emailInputId === 'librarianEmail') btn = document.querySelector('#librarian-login div button');

  if (btn) {
    btn.innerText = "Sending...";
    btn.disabled = true;
  }

  try {
    const res = await fetch("http://localhost:5000/api/send-email-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await res.json();

    if (data.success) {
      const expiry = Date.now() + 30000; // Current time + 30 seconds
      localStorage.setItem('otpCooldownExpiry', expiry.toString());
      updateOtpButtons();
    } else if (btn) {
      btn.innerText = "Send OTP";
      btn.disabled = false;
    }

    alert(data.message);
  } catch (error) { 
    console.error(error); 
    alert("Connection Error: Your backend is not reachable! Please ensure 'node server.js' is running in your terminal."); 
    if (btn) {
      btn.innerText = "Send OTP";
      btn.disabled = false;
    }
  }
}

async function verifyOtpAndProceed() {
  const email = document.getElementById("regEmail").value.trim();
  const otp = document.getElementById("regOtp").value.trim();

  if (!email || !otp) {
    alert("Please enter email and OTP.");
    return;
  }

  try {
    const res = await fetch("http://localhost:5000/api/verify-email-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp })
    });
    
    if (!res.headers.get("content-type")?.includes("application/json")) {
      throw new Error("Server returned HTML instead of JSON! Please restart your Node.js backend server.");
    }

    const data = await res.json();
    
    if (data.success) {
      alert("Email verified! Please fill in your details.");
      document.getElementById("regStep1").style.display = "none";
      document.getElementById("regStep2").style.display = "flex";
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error(err);
    alert("Verification failed: " + (err.message || "Server error"));
  }
}

async function googleSignIn() {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    const user = result.user;

    const res = await fetch("http://localhost:5000/api/login/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email })
    });
    const data = await res.json();

    if (data.success) {
      localStorage.setItem("authToken", data.token);
      window.location.href = "./student/student-dashboard.html";
    } else if (data.requireRegistration) {
      alert("Account not found. Please complete your registration details.");
      showRegister();
      
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
    alert("Google Sign-In failed: " + error.message);
  }
}

async function registerStudent() {
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
    alert("Please fill in all required fields!");
    return;
  }

  if (!window.isGoogleSignIn && pass.length < 6) {
    alert("Password must be at least 6 characters long!");
    return;
  }

  if (!window.isGoogleSignIn && pass !== confirmPass) {
    alert("Passwords do not match!");
    return;
  }

  try {
    const res = await fetch("http://localhost:5000/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, course, semester, password: pass, phone, otp, googleSignIn: window.isGoogleSignIn })
    });
    const data = await res.json();
    
    if (data.success) {
      alert(data.message);
      if (window.isGoogleSignIn) {
        localStorage.setItem("authToken", data.token);
        window.location.href = "./student/student-dashboard.html";
      } else {
        ["regName", "regEmail", "regCourse", "regSemester", "regPassword", "regConfirmPassword", "regPhone", "regOtp"].forEach(field => document.getElementById(field).value = "");
        showLogin("student");
      }
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error(err);
    alert("Registration failed: " + (err.message || "Server error"));
  }
}

async function resetPassword() {
  const email = document.getElementById("resetEmail").value.trim();
  const otp = document.getElementById("resetOtp").value.trim();
  const newPassword = document.getElementById("resetNewPassword").value.trim();
  const confirmPassword = document.getElementById("resetConfirmPassword").value.trim();

  if (!email || !otp || !newPassword || !confirmPassword) {
    alert("Please fill in all fields!");
    return;
  }

  if (newPassword.length < 6) {
    alert("Password must be at least 6 characters long!");
    return;
  }

  if (newPassword !== confirmPassword) {
    alert("Passwords do not match!");
    return;
  }

  try {
    const res = await fetch("http://localhost:5000/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, newPassword })
    });
    const data = await res.json();
    
    if (data.success) {
      alert("Password reset successfully! You can now log in.");
      ["resetEmail", "resetOtp", "resetNewPassword", "resetConfirmPassword"].forEach(f => document.getElementById(f).value = "");
      showLogin("student");
    } else { alert(data.message); }
  } catch (err) { 
    console.error(err); 
    alert("Reset failed: " + (err.message || "Server error.")); 
  }
}

async function studentLogin() {
  const emailInput = document.getElementById("studentEmail");
  const passInput = document.getElementById("studentPassword");
  
  const email = emailInput ? emailInput.value.trim() : "";
  const pass = passInput ? passInput.value.trim() : "";

  if (!email || !pass) {
    alert("Please enter Email Address and Password!");
    return;
  }

  try {
    const res = await fetch("http://localhost:5000/api/login/student", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass })
    });
    const data = await res.json();
    
    if (data.success) {
      localStorage.setItem("authToken", data.token);
      window.location.href = "./student/student-dashboard.html";
    } else {
      alert(data.message || "Invalid Email or Password!");
    }
  } catch (err) {
    console.error(err);
    alert("Server error. Please ensure the backend is running.");
  }
}

async function librarianLogin() {
  const emailInput = document.getElementById("librarianEmail");
  const otpInput = document.getElementById("librarianOtp");
  
  const email = emailInput ? emailInput.value.trim() : "";
  const otp = otpInput ? otpInput.value.trim() : "";

  if (!email || !otp) {
    alert("Please enter Email Address and OTP!");
    return;
  }

  try {
    const res = await fetch("http://localhost:5000/api/login/librarian", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp })
    });
    const data = await res.json();
    
    if (data.success) {
      localStorage.setItem("authToken", data.token);
      window.location.href = "./librarian/librarian-dashboard.html";
    } else {
      alert(data.message || "Invalid Email or OTP!");
    }
  } catch (err) {
    console.error(err);
    alert("Server error. Please ensure the backend is running.");
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

  // Make Librarian Login the default tab when the page loads
  showLogin('librarian');
  updateOtpButtons();
});