const API_URL = "https://library-management-system-1-vh1g.onrender.com/api";
let token = localStorage.getItem("authToken");

if (!token) {
  window.location.href = "../index.html";
}

document.addEventListener("DOMContentLoaded", () => {
  fetchLibrarians();
  
  const payload = JSON.parse(atob(token.split('.')[1]));
  document.getElementById("adminEmailDisplay").innerText = payload.email || "Admin";

  if (localStorage.getItem('darkMode') === 'enabled') {
    document.body.classList.add('dark-mode');
  }
});

function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  if (document.body.classList.contains('dark-mode')) {
    localStorage.setItem('darkMode', 'enabled');
  } else {
    localStorage.setItem('darkMode', 'disabled');
  }
}

function logout() {
  localStorage.removeItem("authToken");
  window.location.href = "../index.html";
}

async function fetchLibrarians() {
  try {
    const res = await fetch(`${API_URL}/librarians`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (res.status === 401 || res.status === 403) {
      alert("Session expired or unauthorized!");
      logout();
      return;
    }
    const librarians = await res.json();
    
    const tbody = document.getElementById("librarianList");
    tbody.innerHTML = "";
    
    librarians.forEach(lib => {
      tbody.innerHTML += `
        <tr>
          <td>${lib.email}</td>
          <td><button style="background: #dc3545;" onclick="removeLibrarian('${lib._id}')">Remove</button></td>
        </tr>
      `;
    });
  } catch (err) {
    console.error("Failed to load librarians", err);
  }
}

async function addLibrarian() {
  const email = document.getElementById("newLibrarianEmail").value.trim();
  if (!email) {
    alert("Please enter an email address.");
    return;
  }
  
  try {
    const res = await fetch(`${API_URL}/librarians`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}` 
      },
      body: JSON.stringify({ email })
    });
    
    const data = await res.json();
    if (data.success) {
      document.getElementById("newLibrarianEmail").value = "";
      fetchLibrarians();
    } else {
      alert(data.message || "Failed to add librarian.");
    }
  } catch (err) {
    console.error(err);
    alert("Server error.");
  }
}

async function removeLibrarian(id) {
  if (!confirm("Are you sure you want to remove this librarian?")) return;
  
  try {
    const res = await fetch(`${API_URL}/librarians/${id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    const data = await res.json();
    if (data.success) {
      fetchLibrarians();
    } else {
      alert(data.message || "Failed to remove librarian.");
    }
  } catch (err) {
    console.error(err);
    alert("Server error.");
  }
}