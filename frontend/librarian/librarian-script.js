let studentItemsPerPage = 10;
let bookItemsPerPage = 10;
let currentStudentPage = 1;
let currentBookPage = 1;

// --- CLOCK FUNCTIONALITY ---
function updateClock() {
  const now = new Date();
  document.getElementById('clock').innerText = now.toLocaleTimeString();
}
setInterval(updateClock, 1000);
updateClock();

// --- SIDEBAR NAVIGATION ---
function showSection(sectionId) {
  const sections = document.querySelectorAll('.content-section');
  sections.forEach(section => {
    section.classList.remove('active-section');
  });
  document.getElementById(sectionId).classList.add('active-section');
}

// --- LOGOUT ---
function logout() {
  localStorage.removeItem("authToken");
  window.location.href = '../index.html';
}

// --- AUTHENTICATION ---
function getAuthHeaders() {
  const token = localStorage.getItem("authToken");
  return { "Authorization": `Bearer ${token}` };
}

// --- DECODE JWT ---
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

// --- MANAGE STUDENTS ---
let students = [];
let currentStudentMode = 'list';
let currentStudentFilter = '';

function searchLibrarianStudents() {
  currentStudentPage = 1;
  const searchInput = document.getElementById("librarianSearchStudent");
  currentStudentFilter = searchInput ? searchInput.value : "";
  if (currentStudentMode === 'attendance') {
    renderAttendance();
  } else {
    renderStudents();
  }
}

function getFilteredStudents() {
  if (!currentStudentFilter) return students;
  const filter = currentStudentFilter.toLowerCase();
  return students.filter(student => 
    student.name.toLowerCase().includes(filter) ||
    (student.email && student.email.toLowerCase().includes(filter)) ||
    student.studentId.toLowerCase().includes(filter)
  );
}

async function fetchStudents() {
  try {
    const res = await fetch("https://library-management-system-1-vh1g.onrender.com/api/students", { headers: getAuthHeaders() });
    if (res.status === 401 || res.status === 403) {
      alert("Session expired or unauthorized. Please log in again.");
      logout();
      return;
    }
    students = await res.json();
    
    if (currentStudentMode === 'attendance') {
      renderAttendance();
    } else {
      renderStudents();
    }
    updateDashboardStats();
  } catch (err) {
    console.error("Failed to fetch students from backend", err);
  }
}

function renderStudents() {
  const list = document.getElementById('studentList');
  if (!list) return;
  list.innerHTML = '';
  const filteredStudents = getFilteredStudents();
  
  const totalPages = Math.ceil(filteredStudents.length / studentItemsPerPage) || 1;
  if (currentStudentPage > totalPages) currentStudentPage = totalPages;
  
  const start = (currentStudentPage - 1) * studentItemsPerPage;
  const end = start + studentItemsPerPage;
  const paginatedStudents = filteredStudents.slice(start, end);
  
  paginatedStudents.forEach((student) => {
    const li = document.createElement('li');
    const statusColor = student.present ? '#28a745' : '#ff4d4d';
    const statusText = student.present ? 'Present' : 'Absent';
    li.innerHTML = `
      <span class="student-name-link" onclick="showStudentDetails('${student.studentId}')" title="Click to view details"><strong>[${student.studentId}]</strong> ${student.name} - <strong style="color: ${statusColor};">${statusText}</strong></span> 
      <div>
        <button onclick="removeStudent('${student.studentId}')" style="background:#ff4d4d; padding: 5px 10px;">Remove</button>
      </div>
    `;
    list.appendChild(li);
  });
  updateStudentPagination(filteredStudents.length);
  updateDashboardStats();
}

function renderAttendance() {
  const list = document.getElementById('studentList');
  if (!list) return;
  list.innerHTML = '';
  const filteredStudents = getFilteredStudents();
  
  const totalPages = Math.ceil(filteredStudents.length / studentItemsPerPage) || 1;
  if (currentStudentPage > totalPages) currentStudentPage = totalPages;
  
  const start = (currentStudentPage - 1) * studentItemsPerPage;
  const end = start + studentItemsPerPage;
  const paginatedStudents = filteredStudents.slice(start, end);
  
  paginatedStudents.forEach((student) => {
    const li = document.createElement('li');
    const statusColor = student.present ? '#28a745' : '#ff4d4d';
    const statusText = student.present ? 'Present' : 'Absent';
    li.innerHTML = `
      <span class="student-name-link" onclick="showStudentDetails('${student.studentId}')" title="Click to view details"><strong>[${student.studentId}]</strong> ${student.name}</span> 
      <button onclick="toggleAttendance('${student.studentId}', ${student.present})" style="background:${statusColor}; padding: 5px 10px;">${statusText}</button>
    `;
    list.appendChild(li);
  });
  updateStudentPagination(filteredStudents.length);
}

function updateStudentPagination(totalItems) {
  const prevBtn = document.getElementById('studentPrevBtn');
  const nextBtn = document.getElementById('studentNextBtn');
  const pageInfo = document.getElementById('studentPageInfo');
  
  if (!prevBtn || !nextBtn || !pageInfo) return;
  
  const totalPages = Math.ceil(totalItems / studentItemsPerPage) || 1;
  pageInfo.innerText = `Page ${currentStudentPage} of ${totalPages}`;
  
  prevBtn.disabled = currentStudentPage === 1;
  nextBtn.disabled = currentStudentPage === totalPages;
}

function changeStudentPerPage(value) {
  studentItemsPerPage = parseInt(value, 10);
  currentStudentPage = 1;
  if (currentStudentMode === 'attendance') renderAttendance();
  else renderStudents();
}

function prevStudentPage() {
  if (currentStudentPage > 1) {
    currentStudentPage--;
    if (currentStudentMode === 'attendance') renderAttendance();
    else renderStudents();
  }
}

function nextStudentPage() {
  currentStudentPage++;
  if (currentStudentMode === 'attendance') renderAttendance();
  else renderStudents();
}

async function toggleAttendance(studentId, currentStatus) {
  try {
    await fetch(`https://library-management-system-1-vh1g.onrender.com/api/students/${studentId}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({ present: !currentStatus })
    });
    fetchStudents();
  } catch (err) { console.error(err); }
}

async function removeStudent(studentId) {
  const studentToRemove = students.find(s => String(s.studentId) === String(studentId));
  if (!studentToRemove) return;
  
  if (!confirm(`Are you sure you want to completely remove ${studentToRemove.name} from all databases? They will need to re-register to access the library again.`)) return;
  
  try {
    const res = await fetch(`https://library-management-system-1-vh1g.onrender.com/api/students/${studentId}`, { 
      method: "DELETE",
      headers: getAuthHeaders() 
    });
    const data = await res.json();
    
    if (data.success) {
      alert("Student completely removed from all databases!");
      fetchStudents();
      fetchBooks();
      fetchFines();
    } else {
      alert("Failed to remove student: " + data.message);
    }
  } catch (err) {
    console.error(err);
    alert("Server connection error.");
  }
}

function sortStudents() {
  students.sort((a, b) => a.name.localeCompare(b.name));
  currentStudentPage = 1;
  if (currentStudentMode === 'attendance') {
    renderAttendance();
  } else {
    renderStudents();
  }
}

function setStudentMode(mode) {
  currentStudentMode = mode;
  currentStudentPage = 1;
  if (mode === 'list') {
    renderStudents();
  } else if (mode === 'attendance') {
    renderAttendance();
  }
}

let currentModalStudentId = null;
let currentCalendarDateLibrarian = new Date();

function changeCalendarMonth(offset) {
  if (!currentModalStudentId) return;
  const student = students.find(s => String(s.studentId) === String(currentModalStudentId));
  if (!student) return;
  
  currentCalendarDateLibrarian.setMonth(currentCalendarDateLibrarian.getMonth() + offset);
  
  const calContainer = document.getElementById('librarian-attendance-calendar');
  if (calContainer) {
    calContainer.innerHTML = renderCalendar(student.attendanceHistory || [], currentCalendarDateLibrarian);
  }
}

function renderCalendar(attendanceDates, viewDate = new Date()) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  const presentDates = new Set((attendanceDates || []).map(d => {
     const dt = new Date(d);
     return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
  }));

  const today = new Date();

  let html = `<div class="calendar-container">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
      <button onclick="changeCalendarMonth(-1)" style="padding: 5px 10px; font-size: 12px; min-width: 30px;">&lt;</button>
      <h4 style="margin: 0; color: inherit;">${monthNames[month]} ${year}</h4>
      <button onclick="changeCalendarMonth(1)" style="padding: 5px 10px; font-size: 12px; min-width: 30px;">&gt;</button>
    </div>
    <div class="calendar-grid">
      <div class="calendar-header">Su</div><div class="calendar-header">Mo</div><div class="calendar-header">Tu</div>
      <div class="calendar-header">We</div><div class="calendar-header">Th</div><div class="calendar-header">Fr</div><div class="calendar-header">Sa</div>`;
  
  for (let i = 0; i < firstDay; i++) {
     html += `<div class="calendar-day empty"></div>`;
  }
  for (let day = 1; day <= daysInMonth; day++) {
     const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
     const currentDayDate = new Date(year, month, day);
     
     const isPresent = presentDates.has(dateStr);
     let cls = 'calendar-day';
     let title = 'Future';
     
     if (isPresent) {
       cls += ' present';
       title = 'Present';
     } else if (currentDayDate < new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)) {
       cls += ' absent';
       title = 'Absent';
     }
     
     html += `<div class="${cls}" title="${title}">${day}</div>`;
  }
  html += `</div></div>`;
  return html;
}

function showStudentDetails(studentId) {
  const student = students.find(s => String(s.studentId) === String(studentId));
  if (!student) return;

  currentModalStudentId = studentId;
  currentCalendarDateLibrarian = new Date(); // Reset to current month when modal opens

  const body = document.getElementById('studentDetailsBody');
  let calendarHtml = renderCalendar(student.attendanceHistory || [], currentCalendarDateLibrarian);

  body.innerHTML = `
    <div class="details-row"><strong>ID:</strong> ${student.studentId}</div>
    <div class="details-row"><strong>Name:</strong> ${student.name}</div>
    <div class="details-row"><strong>Email:</strong> ${student.email || 'N/A'}</div>
    <div class="details-row"><strong>Phone:</strong> ${student.phone ? `<a href="tel:${student.phone}">${student.phone}</a>` : 'N/A'}</div>
    <div class="details-row"><strong>Course:</strong> ${student.course || 'N/A'}</div>
    <div class="details-row"><strong>Semester:</strong> ${student.semester || 'N/A'}</div>
    <div class="details-row"><strong>Status:</strong> ${student.present ? 'Present' : 'Absent'}</div>
    <div id="librarian-attendance-calendar">${calendarHtml}</div>
  `;
  
  document.getElementById('studentDetailsModal').classList.add('show');
}

function closeStudentDetails() {
  document.getElementById('studentDetailsModal').classList.remove('show');
}

// --- MANAGE BOOKS ---
let books = [];

async function fetchBooks() {
  try {
    const res = await fetch("https://library-management-system-1-vh1g.onrender.com/api/books");
    books = await res.json();
    renderBooks();
  } catch (err) {
    console.error("Failed to fetch books from backend", err);
  }
}

async function addBook() {
  const idInput = document.getElementById('newBookId');
  const nameInput = document.getElementById('newBookName');
  
  if (idInput && nameInput && nameInput.value.trim() !== '') {
    const newId = idInput.value.trim();
    const newName = nameInput.value.trim();
    
    const exists = books.find(b => String(b.id) === newId);
    if (exists) {
      alert("A book with this ID already exists.");
      return;
    }
    
    try {
      await fetch("https://library-management-system-1-vh1g.onrender.com/api/books", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify({ id: newId, name: newName, status: 'Available' })
      });
      
      nameInput.value = '';
      fetchBooks();
    } catch (err) {
      console.error(err);
      alert("Server connection error.");
    }
  } else {
    alert("Please enter the Book Name.");
  }
}

async function deleteBook(bookId) {
  if (confirm("Are you sure you want to delete this book?")) {
    try {
      const res = await fetch(`https://library-management-system-1-vh1g.onrender.com/api/books/${bookId}`, { 
        method: "DELETE",
        headers: getAuthHeaders() 
      });
      const data = await res.json();
      
      if (data.success) {
        fetchBooks();
      } else {
        alert("Failed to delete book.");
      }
    } catch (err) {
      console.error(err);
      alert("Server connection error.");
    }
  }
}

let currentBookFilter = 'All';
function renderBooks(filter = currentBookFilter) {
  currentBookFilter = filter;
  const list = document.getElementById('bookList');
  list.innerHTML = '';
  
  const filteredBooks = books.filter(book => filter === 'All' || book.status === filter);
  
  const totalPages = Math.ceil(filteredBooks.length / bookItemsPerPage) || 1;
  if (currentBookPage > totalPages) currentBookPage = totalPages;
  
  const start = (currentBookPage - 1) * bookItemsPerPage;
  const end = start + bookItemsPerPage;
  const paginatedBooks = filteredBooks.slice(start, end);
  
  paginatedBooks.forEach(book => {
    const tr = document.createElement('tr');
    const issuedToText = book.status === 'Issued' ? (book.issuedTo || 'Unknown') : '-';
    const returnDateText = book.status === 'Issued' && book.returnDate ? book.returnDate : '-';
    const deleteBtn = `<button onclick="deleteBook('${book.id}')" style="background:#ff4d4d; padding: 5px 10px;">Delete</button>`;
    tr.innerHTML = `
      <td>${book.id}</td>
      <td>${book.name}</td>
      <td style="color: ${book.status === 'Available' ? 'green' : 'red'}; font-weight: bold;">${book.status}</td>
      <td>${issuedToText}</td>
      <td>${returnDateText}</td>
      <td>${deleteBtn}</td>
    `;
    list.appendChild(tr);
  });
  updateBookPagination(filteredBooks.length);
  updateDashboardStats();

  // Auto-calculate the next consecutive book ID
  const idInput = document.getElementById('newBookId');
  if (idInput) {
    let nextId = 101;
    if (books.length > 0) {
      nextId = Math.max(...books.map(b => parseInt(b.id) || 0)) + 1;
    }
    idInput.value = nextId;
  }
}

function setBookFilter(filter) {
  currentBookPage = 1;
  renderBooks(filter);
}

function updateBookPagination(totalItems) {
  const prevBtn = document.getElementById('bookPrevBtn');
  const nextBtn = document.getElementById('bookNextBtn');
  const pageInfo = document.getElementById('bookPageInfo');
  
  if (!prevBtn || !nextBtn || !pageInfo) return;
  
  const totalPages = Math.ceil(totalItems / bookItemsPerPage) || 1;
  pageInfo.innerText = `Page ${currentBookPage} of ${totalPages}`;
  
  prevBtn.disabled = currentBookPage === 1;
  nextBtn.disabled = currentBookPage === totalPages;
}

function changeBookPerPage(value) {
  bookItemsPerPage = parseInt(value, 10);
  currentBookPage = 1;
  renderBooks(currentBookFilter);
}

function prevBookPage() {
  if (currentBookPage > 1) {
    currentBookPage--;
    renderBooks();
  }
}

function nextBookPage() {
  currentBookPage++;
  renderBooks();
}

// --- DASHBOARD STATS ---
function updateDashboardStats() {
  const totalStudentsEl = document.getElementById('dashTotalStudents');
  const totalBooksEl = document.getElementById('dashTotalBooks');
  const issuedBooksEl = document.getElementById('dashIssuedBooks');
  
  if (totalStudentsEl) totalStudentsEl.innerText = students.length;
  if (totalBooksEl) totalBooksEl.innerText = books.length;
  if (issuedBooksEl) issuedBooksEl.innerText = books.filter(b => b.status === 'Issued').length;
}

// --- DUE FINES ---
let fines = [];

async function fetchFines() {
  try {
    const res = await fetch("https://library-management-system-1-vh1g.onrender.com/api/fines", { headers: getAuthHeaders() });
    fines = await res.json();
    renderFines();
  } catch (err) {
    console.error("Failed to fetch fines from backend", err);
  }
}

async function fetchStats() {
  try {
    const res = await fetch("https://library-management-system-1-vh1g.onrender.com/api/stats");
    const stats = await res.json();
    const total = stats.totalFinesCollected || 0;
    
    const totalCollectedEl = document.getElementById('totalCollected');
    const dashTotalCollectedEl = document.getElementById('dashTotalCollected');
    if (totalCollectedEl) totalCollectedEl.innerText = total;
    if (dashTotalCollectedEl) dashTotalCollectedEl.innerText = total;
  } catch (err) {
    console.error("Failed to fetch stats", err);
  }
}

function renderFines() {
  const list = document.getElementById('fineList');
  list.innerHTML = '';
  
  fines.forEach((fine) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${fine.student}</td>
      <td>${fine.bookId === 'N/A' ? '-' : fine.bookId}</td>
      <td>${fine.reason || 'Overdue Return'}</td>
      <td>₹${fine.amount}</td>
      <td>
        <button onclick="collectFine('${fine._id}', ${fine.amount})" style="background:#28a745;">Collect</button>
        <button onclick="adjustFine('${fine._id}', ${fine.amount})" style="background:#ffc107; color: black; margin-left: 5px;">Adjust</button>
      </td>
    `;
    list.appendChild(tr);
  });
}

async function collectFine(fineId, amount) {
  try {
    const res = await fetch(`https://library-management-system-1-vh1g.onrender.com/api/fines/${fineId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    
    if (data.success) {
      fetchStats();
      fetchFines();
    } else {
      alert("Failed to collect fine.");
    }
  } catch (err) {
    console.error(err);
    alert("Server connection error.");
  }
}

async function adjustFine(fineId, currentAmount) {
  const adjustment = prompt(`Current Fine: ₹${currentAmount}\n\nEnter amount to add (use negative numbers to subtract):`, "0");
  if (adjustment === null || adjustment.trim() === "") return;

  const adjustValue = parseInt(adjustment, 10);
  if (isNaN(adjustValue)) {
    alert("Please enter a valid number.");
    return;
  }

  const newAmount = currentAmount + adjustValue;

  try {
    const res = await fetch(`https://library-management-system-1-vh1g.onrender.com/api/fines/${fineId}`, {
      method: 'PUT',
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({ amount: newAmount })
    });
    const data = await res.json();
    
    if (data.success) {
      fetchFines();
    } else {
      alert("Failed to adjust fine: " + data.message);
    }
  } catch (err) {
    console.error(err);
    alert("Server connection error.");
  }
}

async function addManualFine() {
  const studentInput = document.getElementById('manualFineStudent');
  const bookInput = document.getElementById('manualFineBook');
  const reasonInput = document.getElementById('manualFineReason');
  const amountInput = document.getElementById('manualFineAmount');

  const student = studentInput.value.trim();
  const bookId = bookInput.value.trim() || 'N/A';
  const reason = reasonInput.value.trim();
  const amount = parseInt(amountInput.value.trim(), 10);

  if (!student || !reason || isNaN(amount) || amount <= 0) {
    alert("Please provide valid Student Name, Reason, and a positive Fine Amount.");
    return;
  }

  try {
    const res = await fetch("https://library-management-system-1-vh1g.onrender.com/api/fines", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({ student, bookId, amount, reason })
    });
    
    const newFine = await res.json();
    if (newFine._id) {
      studentInput.value = '';
      bookInput.value = 'N/A';
      reasonInput.value = '';
      amountInput.value = '';
      fetchFines();
    } else {
      alert("Failed to add manual fine.");
    }
  } catch(err) {
    console.error(err);
    alert("Server connection error.");
  }
}

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem('darkMode') === 'enabled') {
    document.body.classList.add('dark-mode');
    const btn = document.getElementById('darkModeBtn');
    if(btn) btn.innerText = '☀️';
  }
  
  const token = localStorage.getItem("authToken");
  const loggedInLibrarian = token ? parseJwt(token) : null;
  if (loggedInLibrarian && loggedInLibrarian.email) {
    const emailDisplay = document.getElementById('librarianEmailDisplay');
    if (emailDisplay) emailDisplay.innerText = loggedInLibrarian.email;
  }

  const manualFineBook = document.getElementById('manualFineBook');
  if (manualFineBook) {
    manualFineBook.addEventListener('focus', function() {
      if (this.value === 'N/A') this.value = '';
    });
    manualFineBook.addEventListener('blur', function() {
      if (this.value.trim() === '') this.value = 'N/A';
    });
  }

  fetchStudents();
  fetchBooks();
  fetchFines();
  fetchStats();
});

// --- DARK MODE ---
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
  
  const btn = document.getElementById('darkModeBtn');
  if (btn) btn.innerText = isDark ? '☀️' : '🌙';
}