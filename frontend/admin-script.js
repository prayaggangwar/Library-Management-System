const API_URL = API_BASE_URL;
let token = localStorage.getItem("authToken");

let adminStudentItemsPerPage = 10;
let adminBookItemsPerPage = 10;
let currentAdminStudentPage = 1;
let currentAdminBookPage = 1;

if (!token) {
  window.location.href = "./index.html";
}

document.addEventListener("DOMContentLoaded", () => {
  fetchStats();
  fetchLibrarians();
  fetchStudents();
  fetchBooks();
  
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

function showSection(sectionId) {
  document.querySelectorAll('.content-section').forEach(sec => {
    sec.classList.remove('active-section');
  });
  document.getElementById(sectionId).classList.add('active-section');
}

function logout() {
  localStorage.removeItem("authToken");
  window.location.href = "./index.html";
}

async function fetchStats() {
  try {
    const res = await fetch(`${API_URL}/stats`);
    const stats = await res.json();
    document.getElementById("adminTotalCollected").innerText = stats.totalFinesCollected || 0;
  } catch (err) {
    console.error("Failed to load stats", err);
  }
}

let adminStudents = [];

async function fetchStudents() {
  try {
    const res = await fetch(`${API_URL}/students`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (res.status === 401 || res.status === 403) return;
    adminStudents = await res.json();
    
    document.getElementById("adminTotalStudents").innerText = adminStudents.length;
    
    renderAdminStudents();
  } catch (err) { console.error("Failed to load students", err); }
}

function renderAdminStudents(filter = "") {
  const tbody = document.getElementById("adminStudentList");
  tbody.innerHTML = "";
  
  const filteredStudents = adminStudents.filter(student => 
    student.name.toLowerCase().includes(filter.toLowerCase()) ||
    (student.email && student.email.toLowerCase().includes(filter.toLowerCase())) ||
    student.studentId.toLowerCase().includes(filter.toLowerCase())
  );

  const totalPages = Math.ceil(filteredStudents.length / adminStudentItemsPerPage) || 1;
  if (currentAdminStudentPage > totalPages) currentAdminStudentPage = totalPages;
  
  const start = (currentAdminStudentPage - 1) * adminStudentItemsPerPage;
  const end = start + adminStudentItemsPerPage;
  const paginatedStudents = filteredStudents.slice(start, end);

  paginatedStudents.forEach(student => {
    const statusColor = student.present ? 'green' : 'red';
    const statusText = student.present ? 'Present' : 'Absent';
    tbody.innerHTML += `
      <tr>
        <td>${student.studentId}</td>
        <td>${student.name}</td>
        <td>${student.email}</td>
        <td>${student.phone ? `<a href="tel:${student.phone}">${student.phone}</a>` : '-'}</td>
        <td>${student.course || '-'}</td>
        <td style="color: ${statusColor}; font-weight: bold;">${statusText}</td>
        <td><button style="background: #dc3545; padding: 5px 10px;" onclick="removeStudent('${student.studentId}')">Remove</button></td>
      </tr>
    `;
  });

  updateAdminStudentPagination(filteredStudents.length);
}

function updateAdminStudentPagination(totalItems) {
  const prevBtn = document.getElementById('adminStudentPrevBtn');
  const nextBtn = document.getElementById('adminStudentNextBtn');
  const pageInfo = document.getElementById('adminStudentPageInfo');
  
  if (!prevBtn || !nextBtn || !pageInfo) return;
  
  const totalPages = Math.ceil(totalItems / adminStudentItemsPerPage) || 1;
  pageInfo.innerText = `Page ${currentAdminStudentPage} of ${totalPages}`;
  
  prevBtn.disabled = currentAdminStudentPage === 1;
  nextBtn.disabled = currentAdminStudentPage === totalPages;
}

function changeAdminStudentPerPage(value) {
  adminStudentItemsPerPage = parseInt(value, 10);
  currentAdminStudentPage = 1;
  const searchInput = document.getElementById("adminSearchStudent");
  renderAdminStudents(searchInput ? searchInput.value : "");
}

function searchAdminStudents() {
  currentAdminStudentPage = 1;
  const searchInput = document.getElementById("adminSearchStudent");
  renderAdminStudents(searchInput ? searchInput.value : "");
}

function prevAdminStudentPage() {
  if (currentAdminStudentPage > 1) {
    currentAdminStudentPage--;
    const searchInput = document.getElementById("adminSearchStudent");
    renderAdminStudents(searchInput ? searchInput.value : "");
  }
}

function nextAdminStudentPage() {
  currentAdminStudentPage++;
  const searchInput = document.getElementById("adminSearchStudent");
  renderAdminStudents(searchInput ? searchInput.value : "");
}

async function removeStudent(studentId) {
  if (!confirm("Are you sure you want to completely remove this student from all databases?")) return;
  
  try {
    const res = await fetch(`${API_URL}/students/${studentId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    const data = await res.json();
    if (data.success) {
      fetchStudents();
      fetchBooks();
    } else {
      alert(data.message || "Failed to remove student.");
    }
  } catch (err) {
    console.error(err);
    alert("Server error.");
  }
}

let adminBooks = [];

async function fetchBooks() {
  try {
    const res = await fetch(`${API_URL}/books`);
    adminBooks = await res.json();
    
    document.getElementById("adminTotalBooks").innerText = adminBooks.length;
    
    renderAdminBooks();
  } catch (err) { console.error("Failed to load books", err); }
}

function renderAdminBooks() {
  const tbody = document.getElementById("adminBookList");
  tbody.innerHTML = "";
  
  const totalPages = Math.ceil(adminBooks.length / adminBookItemsPerPage) || 1;
  if (currentAdminBookPage > totalPages) currentAdminBookPage = totalPages;
  
  const start = (currentAdminBookPage - 1) * adminBookItemsPerPage;
  const end = start + adminBookItemsPerPage;
  const paginatedBooks = adminBooks.slice(start, end);
  
  paginatedBooks.forEach(book => {
    const statusColor = book.status === 'Available' ? 'green' : 'red';
    tbody.innerHTML += `
      <tr>
        <td>${book.id}</td>
        <td>${book.name}</td>
        <td style="color: ${statusColor}; font-weight: bold;">${book.status}</td>
        <td>${book.issuedTo || '-'}</td>
      </tr>
    `;
  });
  
  updateAdminBookPagination(adminBooks.length);
}

function updateAdminBookPagination(totalItems) {
  const prevBtn = document.getElementById('adminBookPrevBtn');
  const nextBtn = document.getElementById('adminBookNextBtn');
  const pageInfo = document.getElementById('adminBookPageInfo');
  
  if (!prevBtn || !nextBtn || !pageInfo) return;
  
  const totalPages = Math.ceil(totalItems / adminBookItemsPerPage) || 1;
  pageInfo.innerText = `Page ${currentAdminBookPage} of ${totalPages}`;
  
  prevBtn.disabled = currentAdminBookPage === 1;
  nextBtn.disabled = currentAdminBookPage === totalPages;
}

function changeAdminBookPerPage(value) {
  adminBookItemsPerPage = parseInt(value, 10);
  currentAdminBookPage = 1;
  renderAdminBooks();
}

function prevAdminBookPage() {
  if (currentAdminBookPage > 1) {
    currentAdminBookPage--;
    renderAdminBooks();
  }
}

function nextAdminBookPage() {
  currentAdminBookPage++;
  renderAdminBooks();
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
    
    document.getElementById("adminTotalLibrarians").innerText = librarians.length;

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