// --- CLOCK FUNCTIONALITY ---
function updateClock() {
  const now = new Date();
  const clockElement = document.getElementById('clock');
  if (clockElement) {
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    clockElement.innerText = now.toLocaleString('en-US', options);
  }
}
setInterval(updateClock, 1000);
updateClock();

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

const token = localStorage.getItem("authToken");
const loggedInStudent = (token ? parseJwt(token) : null) || { name: "Prayag", course: "B.Tech CSE", semester: "4th" };
const studentName = loggedInStudent.name;

document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem('darkMode') === 'enabled') {
    document.body.classList.add('dark-mode');
    const btn = document.getElementById('darkModeBtn');
    if(btn) btn.innerText = '☀️';
  }

  const welcomeText = document.getElementById("welcome-text");
  if (welcomeText) welcomeText.innerText = `Welcome, ${studentName}`;
  
  const profileName = document.getElementById("profile-name");
  if (profileName) profileName.innerText = studentName;
  
  const profileCourse = document.getElementById("profile-course");
  if (profileCourse) profileCourse.innerText = loggedInStudent.course;
  
  const profileSemester = document.getElementById("profile-semester");
  if (profileSemester) profileSemester.innerText = loggedInStudent.semester;
});

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

const bookList = document.getElementById("bookList");

function renderBooks() {
  const searchInput = document.getElementById("searchAvailable");
  const searchQuery = searchInput ? searchInput.value.toLowerCase() : "";

  bookList.innerHTML = "";
  const issuedBooksList = document.getElementById("issuedBooksList");
  if (issuedBooksList) issuedBooksList.innerHTML = "";

  let issuedCount = 0;
  let notificationsHTML = '';

  books.forEach(book => {
    // 1. Show all books in the main Book List so students know what is unavailable
    if (book.name.toLowerCase().includes(searchQuery)) {
      let actionButton = book.status === "Available" 
        ? `<button onclick="issueBook('${book.id}')">Issue</button>` 
        : `<span style="color: #ff4d4d; font-weight: bold;">Unavailable</span>`;
      let statusColor = book.status === "Available" ? "green" : "red";
      bookList.innerHTML += `
        <tr>
          <td>${book.id}</td>
          <td>${book.name}</td>
          <td style="color: ${statusColor}; font-weight: bold;">${book.status}</td>
          <td>${actionButton}</td>
        </tr>
      `;
    }

    // 2. Populate Issued Books and Reminders for the logged-in student
    if (book.status === "Issued" && book.issuedTo === studentName) {
      issuedCount++;
      
      if (!book.returnDate) {
        const returnDateObj = new Date();
        returnDateObj.setDate(returnDateObj.getDate() + 15);
        const yyyy = returnDateObj.getFullYear();
        const mm = String(returnDateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(returnDateObj.getDate()).padStart(2, '0');
        book.returnDate = `${yyyy}-${mm}-${dd}`;
      }

      if (book.returnDate) {
        notificationsHTML += `<div style="background: #fff3cd; color: #856404; padding: 15px; margin-bottom: 15px; border-radius: 8px; border-left: 5px solid #ffeeba;">
          <strong>Reminder:</strong> Please return "<strong>${book.name}</strong>" by ${book.returnDate}.
        </div>`;
      }
      if (issuedBooksList) {
        let actionButton = `<button onclick="returnBook('${book.id}')">Return</button>`;
        let returnDateInfo = book.returnDate ? `<br><small style="color: #666;">Due: ${book.returnDate}</small>` : '';
        issuedBooksList.innerHTML += `
          <tr>
            <td>${book.id}</td>
            <td>${book.name}${returnDateInfo}</td>
            <td style="color: red; font-weight: bold;">${book.status}</td>
            <td>${actionButton}</td>
          </tr>
        `;
      }
    }
  });

  const statIssued = document.getElementById("stat-issued-books");
  if (statIssued) statIssued.innerText = issuedCount;

  const notifArea = document.getElementById("dashboard-notifications");
  if (notifArea) notifArea.innerHTML = notificationsHTML;
}

async function issueBook(bookId) {
  const book = books.find(b => String(b.id) === String(bookId));
  if (book && book.status === "Available") {
    
    const token = localStorage.getItem("authToken");
    if (!token) {
      alert("You must be logged in to issue a book!");
      window.location.href = "../index.html";
      return;
    }
    
    const returnDate = new Date();
    returnDate.setDate(returnDate.getDate() + 15);
    const yyyy = returnDate.getFullYear();
    const mm = String(returnDate.getMonth() + 1).padStart(2, '0');
    const dd = String(returnDate.getDate()).padStart(2, '0');
    const formattedDate = `${yyyy}-${mm}-${dd}`;

    try {
      const res = await fetch(`https://library-management-system-1-vh1g.onrender.com/api/books/${bookId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ status: "Issued", issuedTo: studentName, returnDate: formattedDate })
      });

      if (res.status === 401 || res.status === 403) {
        alert("Session expired or unauthorized. Please log in again.");
        window.location.href = "../index.html";
        return;
      }

      fetchBooks();
    } catch (err) {
      console.error(err);
      alert("Server connection error.");
    }
  }
}

async function returnBook(bookId) {
  const book = books.find(b => String(b.id) === String(bookId));
  if (book && book.status === "Issued") {
    
    const token = localStorage.getItem("authToken");
    if (!token) {
      alert("You must be logged in to return a book!");
      window.location.href = "../index.html";
      return;
    }

    try {
      const res = await fetch(`https://library-management-system-1-vh1g.onrender.com/api/books/${bookId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ status: "Available", issuedTo: null, returnDate: null })
      });

      if (res.status === 401 || res.status === 403) {
        alert("Session expired or unauthorized. Please log in again.");
        window.location.href = "../index.html";
        return;
      }

      fetchBooks();
      fetchFines(); // Refresh fines in case an overdue penalty was automatically imposed
    } catch (err) {
      console.error(err);
      alert("Server connection error.");
    }
  }
}

fetchBooks();

function searchAvailableBooks() {
  renderBooks();
}

let fines = [];

async function fetchFines() {
  try {
    const res = await fetch("https://library-management-system-1-vh1g.onrender.com/api/fines");
    fines = await res.json();
    renderFine();
  } catch (err) {
    console.error("Failed to fetch fines from backend", err);
  }
}

function renderFine() {
  const myFines = fines.filter(f => f.student === studentName);
  let pendingFine = myFines.reduce((sum, f) => sum + f.amount, 0);

  const fineAmountElement = document.getElementById("total-fine-amount");
  const statFineElement = document.getElementById("stat-pending-fine");
  if (fineAmountElement) fineAmountElement.innerText = `Total Fine: ₹${pendingFine}`;
  if (statFineElement) statFineElement.innerText = `₹${pendingFine}`;

  const dashboardFineList = document.getElementById("dashboard-fine-list");
  const detailedFineList = document.getElementById("detailed-fine-list");
  
  let tableHtml = '';
  if (myFines.length === 0) {
    tableHtml = '<tr><td colspan="3" style="padding: 15px;">No fines imposed.</td></tr>';
  } else {
    myFines.forEach(fine => {
      tableHtml += `
        <tr>
          <td>${fine.bookId === 'N/A' ? '-' : fine.bookId}</td>
          <td>${fine.reason || 'Overdue Return'}</td>
          <td style="color: red; font-weight: bold;">₹${fine.amount}</td>
        </tr>
      `;
    });
  }
  if (dashboardFineList) dashboardFineList.innerHTML = tableHtml;
  if (detailedFineList) detailedFineList.innerHTML = tableHtml;
}

async function payFine() {
  const myFines = fines.filter(f => f.student === studentName);
  let pendingFine = myFines.reduce((sum, f) => sum + f.amount, 0);

  if (pendingFine > 0) {
    try {
      for (const fine of myFines) {
        await fetch(`https://library-management-system-1-vh1g.onrender.com/api/fines/${fine._id}`, { method: 'DELETE' });
      }
      alert(`Successfully paid ₹${pendingFine}.`);
      fetchFines();
    } catch (err) {
      console.error(err);
      alert("Server error while paying fine.");
    }
  } else {
    alert("You have no pending fines.");
  }
}

fetchFines();

let studentAttendanceHistory = [];
let currentCalendarDate = new Date();

function changeCalendarMonth(offset) {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() + offset);
  const calContainer = document.getElementById("student-attendance-calendar");
  if (calContainer) {
    calContainer.innerHTML = renderCalendar(studentAttendanceHistory, currentCalendarDate);
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

async function fetchMyDetails() {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    
    const res = await fetch("https://library-management-system-1-vh1g.onrender.com/api/student/me", { 
      headers: { "Authorization": `Bearer ${token}` } 
    });
    const data = await res.json();
    
    if (data.success) {
      const attText = document.getElementById("stat-attendance");
      const attTime = document.getElementById("stat-attendance-time");
      const attBtn = document.getElementById("markAttendanceBtn");
      const calContainer = document.getElementById("student-attendance-calendar");
      
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const history = data.student.attendanceHistory || [];
      studentAttendanceHistory = history;
      const todayEntry = history.find(d => new Date(d) >= startOfDay);
      
      if (data.student.present) {
         if (attText) { attText.innerText = "Present"; attText.style.color = "#28a745"; }
         if (attBtn) { attBtn.innerText = "Marked"; attBtn.disabled = true; attBtn.style.background = "#6c757d"; }
         if (attTime && todayEntry) { 
            const timeStr = new Date(todayEntry).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            attTime.innerText = `Marked at: ${timeStr}`; 
         }
      } else {
         if (attText) { attText.innerText = "Absent"; attText.style.color = "#ff4d4d"; }
         if (attBtn) { attBtn.innerText = "Mark Present"; attBtn.disabled = false; attBtn.style.background = "#28a745"; }
         if (attTime) { attTime.innerText = ""; }
      }
      
      if (calContainer) {
        calContainer.innerHTML = renderCalendar(studentAttendanceHistory, currentCalendarDate);
      }
    }
  } catch (err) {
    console.error("Failed to fetch student details", err);
  }
}

async function markAttendance() {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    
    const btn = document.getElementById("markAttendanceBtn");
    if (btn) { btn.innerText = "Marking..."; btn.disabled = true; }
    
    const res = await fetch("https://library-management-system-1-vh1g.onrender.com/api/student/attendance", { 
      method: "PUT",
      headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();
    
    if (data.success) {
      fetchMyDetails();
    } else {
      alert("Failed to mark attendance: " + data.message);
      if (btn) { btn.innerText = "Mark Present"; btn.disabled = false; }
    }
  } catch (err) {
    console.error(err);
    alert("Server connection error.");
  }
}

fetchMyDetails();

function showSection(sectionId) {

  const sections =
    document.querySelectorAll(".content-section");

  sections.forEach(section => {
    section.classList.remove("active-section");
  });

  document
    .getElementById(sectionId)
    .classList.add("active-section");
}

// --- DARK MODE ---
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
  
  const btn = document.getElementById('darkModeBtn');
  if (btn) btn.innerText = isDark ? '☀️' : '🌙';
}

function logout() {

  localStorage.removeItem("authToken");
  window.location.href = "../index.html";
}