const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const cron = require("node-cron");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, '../.env') });

const app = express();

app.use(cors());
app.use(express.json());

console.log("\n--- ENVIRONMENT CHECK ---");
console.log("BREVO_EMAIL:", process.env.BREVO_EMAIL ? "✅ Found" : "❌ Missing");
console.log("BREVO_PASS:", process.env.BREVO_PASS ? "✅ Found" : "❌ Missing");
console.log("-------------------------\n");

if (!process.env.MONGO_URI) {
  console.error("FATAL ERROR: MONGO_URI is not defined in the environment variables.");
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
.then(() => {
  console.log("MongoDB Connected");
  initializeDB(); // Seed default data if empty
})
.catch((err) => {
  console.error("MongoDB connection failed:", err.message);
  process.exit(1);
});

// Listen for errors after the initial connection was established
mongoose.connection.on('error', err => {
  console.error("MongoDB runtime error:", err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn("MongoDB disconnected.");
});

// --- MONGOOSE SCHEMAS ---
const studentSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String }, // Made optional to support Google Sign-In
  name: { type: String, required: true },
  phone: { type: String }, // Optional contact number
  course: { type: String, default: "" },
  semester: { type: String, default: "" },
  present: { type: Boolean, default: false },
  attendanceHistory: { type: [Date], default: [] }
});
const Student = mongoose.model("Student", studentSchema);

const bookSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  status: { type: String, default: "Available" },
  issuedTo: { type: String, default: null },
  returnDate: { type: String, default: null }
});
const Book = mongoose.model("Book", bookSchema);

const fineSchema = new mongoose.Schema({
  student: { type: String, required: true },
  bookId: { type: String, required: true },
  amount: { type: Number, required: true },
  reason: { type: String, default: "Overdue Return" }
});
const Fine = mongoose.model("Fine", fineSchema);

const librarianSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true }
});
const Librarian = mongoose.model("Librarian", librarianSchema);

const statSchema = new mongoose.Schema({
  id: { type: String, default: 'global' },
  totalFinesCollected: { type: Number, default: 0 }
});
const Stat = mongoose.model("Stat", statSchema);

// --- DATABASE INITIALIZATION ---
async function initializeDB() {
  try {
    const count = await Book.countDocuments();
    if (count === 0) {
      const defaultBooks = [
        { id: '101', name: 'JavaScript: The Good Parts', status: 'Available' },
        { id: '102', name: 'Clean Code', status: 'Available' },
        { id: '103', name: 'Design Patterns', status: 'Available' },
        { id: '104', name: 'Grokking Algorithms', status: 'Available',},
        { id: '105', name: 'The Pragmatic Programmer', status: 'Available' },
        { id: '106', name: 'Introduction to Algorithms', status: 'Available' },
        { id: '107', name: 'Head First Design Patterns', status: 'Available' },
        { id: '108', name: 'You Don\'t Know JS', status: 'Available' },
        { id: '109', name: 'Cracking the Coding Interview', status: 'Available' },
        { id: '110', name: 'Clean Architecture', status: 'Available' }
      ];
      await Book.insertMany(defaultBooks);
      console.log("Database initialized with default books.");
    }

    const libCount = await Librarian.countDocuments();
    if (libCount === 0) {
      await Librarian.insertMany([{ email: "aavararebel@gmail.com" }]);
      console.log("Database initialized with default librarian emails.");
    }

    const statCount = await Stat.countDocuments();
    if (statCount === 0) {
      await Stat.create({ id: 'global', totalFinesCollected: 0 });
      console.log("Database initialized with global stats tracker.");
    }
  } catch (err) {
    console.error("Database initialization failed:", err.message);
  }
}

const otpStore = {}; // Temporary in-memory store for OTPs
const JWT_SECRET = process.env.JWT_SECRET || "lms_super_secret_key_123";

// --- MIDDLEWARE ---
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extracts the token after "Bearer"
  
  if (!token) return res.status(401).json({ success: false, message: "Access Denied: No token provided!" });
  
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ success: false, message: "Invalid or expired token!" });
    req.user = decoded; // Attach the decoded user payload (id, email, role) to the request object
    next();
  });
};

const verifyLibrarian = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user && req.user.role === 'librarian') {
      next(); // Success! Move on to the route logic
    } else {
      res.status(403).json({ success: false, message: "Access Denied: Librarian privileges required!" });
    }
  });
};

const verifyLibrarianOrAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user && (req.user.role === 'librarian' || req.user.role === 'admin')) {
      next();
    } else {
      res.status(403).json({ success: false, message: "Access Denied: Librarian or Admin privileges required!" });
    }
  });
};

const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ success: false, message: "Access Denied: Admin privileges required!" });
    }
  });
};

// --- API ROUTES ---

app.get("/", (req, res) => {

  res.send("LMS Backend Running Successfully");

});
app.get("/test", (req, res) => {

  res.json({

    success: true,

    message: "Backend Working"
  });

});

app.get("/api/config/firebase", (req, res) => {
  res.json({
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID,
  });
});

app.post("/api/send-email-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email required" });
    const normalizedEmail = email.toLowerCase().trim();
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[normalizedEmail] = otp;
    
    if (process.env.BREVO_EMAIL && process.env.BREVO_PASS) {
      const otpTemplate = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #1e3c72; padding: 20px; text-align: center;">
            <h2 style="color: white; margin: 0;">Library Management System</h2>
          </div>
          <div style="padding: 30px; background-color: #ffffff; text-align: center;">
            <h3 style="color: #333333; margin-top: 0;">Verification Code</h3>
            <p style="color: #555555; font-size: 16px; line-height: 1.5;">Please use the following OTP to complete your verification.</p>
            <div style="background-color: #f8f9fa; border: 1px dashed #ced4da; border-radius: 5px; padding: 20px; margin: 25px 0; display: inline-block;">
              <h1 style="color: #1e3c72; margin: 0; letter-spacing: 5px; font-size: 36px;">${otp}</h1>
            </div>
            <p style="color: #888888; font-size: 14px; margin-top: 30px;">If you didn't request this code, you can safely ignore this email.</p>
          </div>
        </div>
      `;

      const transporter = nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 2525,
        secure: false, // Must be false for port 2525
        auth: {
          user: process.env.BREVO_EMAIL,
          pass: process.env.BREVO_PASS
        }
      });

      // Temporarily verify the transporter configuration
      transporter.verify((error, success) => {
        if(error){
          console.log("SMTP Verification Error:", error);
        } else {
          console.log("SMTP Ready");
        }
      });

      await transporter.sendMail({
        from: `"Library System" <${process.env.BREVO_EMAIL}>`,
        to: normalizedEmail,
        subject: "Library Management System OTP",
        html: otpTemplate
      });

      console.log(`\n[EMAIL GATEWAY] OTP successfully sent to ${normalizedEmail}\n`); 
      res.json({ success: true, message: "OTP sent successfully! Please check your email." });
    } else {
      console.log(`\n[DEV EMAIL GATEWAY] OTP for ${normalizedEmail} is: ${otp}\n`);
      res.json({ success: true, message: "DEV MODE: OTP printed to your Node.js terminal instead of email." });
    }
  } catch (err) {
    console.error("\n❌ Email Gateway Error:", err.message, "\n");
    res.status(500).json({ success: false, message: "Failed to send OTP email: " + err.message });
  }
});

app.post("/api/verify-email-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    if (!otpStore[normalizedEmail] || otpStore[normalizedEmail] !== otp) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP!" });
    }
    
    // Check if email already exists
    const exists = await Student.findOne({ email: new RegExp(`^${normalizedEmail}$`, 'i') });
    if (exists) return res.status(400).json({ success: false, message: "Email already exists!" });

    res.json({ success: true, message: "OTP verified successfully!" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Login & Register
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, course, semester, password, phone, otp, googleSignIn } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const exists = await Student.findOne({ email: new RegExp(`^${normalizedEmail}$`, 'i') });
    if (exists) return res.status(400).json({ success: false, message: "Email already exists!" });
    
    // Verify Email OTP if it's not a Google Sign-In
    if (!googleSignIn) {
      if (!otpStore[normalizedEmail] || otpStore[normalizedEmail] !== otp) {
        return res.status(400).json({ success: false, message: "Invalid or expired OTP!" });
      }
      if (!password || password.length < 6) {
        return res.status(400).json({ success: false, message: "Password must be at least 6 characters long!" });
      }
    }
    
    // Generate Student ID
    const count = await Student.countDocuments();
    const studentId = "S" + String(count + 1).padStart(3, '0');

    const newStudent = new Student({ studentId, email: normalizedEmail, name, course, semester, password, phone });
    await newStudent.save();
    
    if (!googleSignIn) delete otpStore[normalizedEmail];

    const token = jwt.sign({ id: newStudent._id, email: newStudent.email, name: newStudent.name, course: newStudent.course, semester: newStudent.semester, role: 'student' }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ success: true, message: `Registration Successful! Your generated Student ID is ${studentId}`, student: newStudent, token });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/login/google", async (req, res) => {
  try {
    const { email } = req.body;
    const student = await Student.findOne({ email });
    
    if (student) {
      const token = jwt.sign({ id: student._id, email: student.email, name: student.name, course: student.course, semester: student.semester, role: 'student' }, JWT_SECRET, { expiresIn: '1d' });
      res.json({ success: true, token, student });
    } else {
      res.json({ success: false, requireRegistration: true });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    
    if (!otpStore[normalizedEmail] || otpStore[normalizedEmail] !== otp) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP!" });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters long!" });
    }

    const student = await Student.findOne({ email: new RegExp(`^${normalizedEmail}$`, 'i') });
    if (!student) return res.status(404).json({ success: false, message: "Student not found!" });
    
    student.password = newPassword;
    await student.save();
    delete otpStore[normalizedEmail];
    
    res.json({ success: true, message: "Password reset successful!" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/login/student", async (req, res) => {
  try {
    const { email, password } = req.body;
    const student = await Student.findOne({ email, password });
    if (student) {
      const token = jwt.sign({ id: student._id, email: student.email, name: student.name, course: student.course, semester: student.semester, role: 'student' }, JWT_SECRET, { expiresIn: '1d' });
      res.json({ success: true, token, student });
    } else {
      res.status(401).json({ success: false, message: "Invalid Email or Password!" });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/login/admin", (req, res) => {
  const { email, otp } = req.body;
  const normalizedEmail = email.toLowerCase().trim();
  
  if (normalizedEmail !== "classmate11007@gmail.com") {
    return res.status(401).json({ success: false, message: "Unauthorized Admin Email!" });
  }

  if (!otpStore[normalizedEmail] || otpStore[normalizedEmail] !== otp) {
    return res.status(400).json({ success: false, message: "Invalid or expired OTP!" });
  }

  delete otpStore[normalizedEmail];
  const token = jwt.sign({ id: "admin", email: normalizedEmail, role: 'admin' }, JWT_SECRET, { expiresIn: '1d' });
  res.json({ success: true, token });
});

app.post("/api/login/librarian", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const isAuthorized = await Librarian.findOne({ email: normalizedEmail });

    if (!isAuthorized) {
      return res.status(401).json({ success: false, message: "Unauthorized Librarian Email!" });
    }

    if (!otpStore[normalizedEmail] || otpStore[normalizedEmail] !== otp) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP!" });
    }

    delete otpStore[normalizedEmail];
    const token = jwt.sign({ id: "librarian", email: normalizedEmail, role: 'librarian' }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ success: true, token });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- STATS ENDPOINTS ---
app.get("/api/stats", async (req, res) => {
  let stats = await Stat.findOne({ id: 'global' });
  res.json(stats || { totalFinesCollected: 0 });
});

// Admin endpoints
app.get("/api/librarians", verifyAdmin, async (req, res) => {
  try {
    const librarians = await Librarian.find();
    res.json(librarians);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/librarians", verifyAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });
    const normalized = email.toLowerCase().trim();
    const exists = await Librarian.findOne({ email: normalized });
    if (exists) return res.status(400).json({ success: false, message: "Librarian already exists!" });
    const newLib = new Librarian({ email: normalized });
    await newLib.save();
    res.json({ success: true, librarian: newLib });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete("/api/librarians/:id", verifyAdmin, async (req, res) => {
  try {
    await Librarian.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Student self-service endpoints
app.get("/api/student/me", verifyToken, async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });
    res.json({ success: true, student });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.put("/api/student/attendance", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ success: false, message: "Only students can mark attendance." });
    const student = await Student.findById(req.user.id);
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });
    
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const alreadyMarked = student.attendanceHistory.some(d => new Date(d) >= startOfDay);
    if (!alreadyMarked) {
      student.attendanceHistory.push(today);
    }
    student.present = true;
    const updated = await student.save();
    
    res.json({ success: true, message: "Attendance marked successfully!", student: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Student endpoints
app.get("/api/students", verifyLibrarianOrAdmin, async (req, res) => {
  const students = await Student.find();
  res.json(students);
});
app.delete("/api/students/:id", verifyLibrarianOrAdmin, async (req, res) => {
  try {
    const student = await Student.findOne({ studentId: req.params.id });
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    // 1. Remove student from all books (reset status so books are available again)
    await Book.updateMany({ issuedTo: student.name }, { status: 'Available', issuedTo: null, returnDate: null });
    
    // 2. Remove all fines associated with this student
    await Fine.deleteMany({ student: student.name });

    // 3. Delete the student's registration account
    await Student.findOneAndDelete({ studentId: req.params.id });
    
    res.json({ success: true, message: "Student completely removed from all databases." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.put("/api/students/:id", verifyLibrarian, async (req, res) => {
  try {
    const student = await Student.findOne({ studentId: req.params.id });
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    if (req.body.present !== undefined) {
      student.present = req.body.present;
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      if (student.present) {
        const alreadyMarked = student.attendanceHistory.some(d => new Date(d) >= startOfDay);
        if (!alreadyMarked) {
          student.attendanceHistory.push(today);
        }
      } else {
        student.attendanceHistory = student.attendanceHistory.filter(d => new Date(d) < startOfDay);
      }
    }
    
    await student.save();
    res.json(student);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Books endpoints
app.get("/api/books", async (req, res) => {
  const books = await Book.find();
  res.json(books);
});
app.post("/api/books", verifyLibrarian, async (req, res) => {
  const newBook = new Book(req.body);
  await newBook.save();
  res.json(newBook);
});
app.put("/api/books/:id", verifyToken, async (req, res) => {
  try {
    // If the book is being returned, check if it is overdue to impose a fine
    if (req.body.status === "Available" && req.body.issuedTo === null) {
      const bookToReturn = await Book.findOne({ id: req.params.id });
      
      if (bookToReturn && bookToReturn.status === "Issued" && bookToReturn.returnDate) {
        const [yyyy, mm, dd] = bookToReturn.returnDate.split('-');
        const returnDate = new Date(yyyy, mm - 1, dd); // Local time
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today to midnight for an accurate day count
        
        const diffTime = today.getTime() - returnDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays > 0) {
          const fineAmount = diffDays * 50; // 50 rupees per day overdue
          
          // Check if the fine was already created by the daily cron job to prevent duplicates
          const existingFine = await Fine.findOne({ student: bookToReturn.issuedTo, bookId: bookToReturn.id });
          
          if (!existingFine) {
            const newFine = new Fine({ student: bookToReturn.issuedTo, bookId: bookToReturn.id, amount: fineAmount, reason: "Overdue Return" });
            await newFine.save();
            
          } else if (existingFine.amount !== fineAmount) {
            existingFine.amount = fineAmount;
            existingFine.reason = "Overdue Return";
            await existingFine.save();
          }
        }
      }
    }
    const updated = await Book.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.delete("/api/books/:id", verifyLibrarian, async (req, res) => {
  await Book.findOneAndDelete({ id: req.params.id });
  res.json({ success: true });
});

// Fines endpoints
app.get("/api/fines", async (req, res) => {
  const fines = await Fine.find();
  res.json(fines);
});
app.post("/api/fines", verifyLibrarian, async (req, res) => {
  const newFine = new Fine(req.body);
  await newFine.save();
  res.json(newFine);
});
app.put("/api/fines/:id", verifyLibrarian, async (req, res) => {
  try {
    const { amount } = req.body;
    if (amount <= 0) {
      await Fine.findByIdAndDelete(req.params.id);
      return res.json({ success: true, deleted: true });
    }
    const updated = await Fine.findByIdAndUpdate(req.params.id, { amount }, { new: true });
    res.json({ success: true, fine: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.delete("/api/fines/:id", async (req, res) => {
  const fine = await Fine.findById(req.params.id);
  if (fine) {
    // Permanently record collected fine before deleting the active ticket
    await Stat.findOneAndUpdate({ id: 'global' }, { $inc: { totalFinesCollected: fine.amount } }, { upsert: true });
    await Fine.findByIdAndDelete(req.params.id);
  }
  res.json({ success: true });
});

// --- CRON JOBS ---
// Reset attendance for all students every day at midnight (00:00 local server time)
cron.schedule("0 0 * * *", async () => {
  try {
    await Student.updateMany({}, { present: false });
    console.log("\n[CRON] Successfully reset all students' attendance to Absent for the new day.\n");
  } catch (err) {
    console.error("\n❌ [CRON] Error resetting attendance:", err.message, "\n");
  }
});

// Automatically calculate overdue fines every day at 1:00 AM
cron.schedule("0 1 * * *", async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to midnight

    const issuedBooks = await Book.find({ status: "Issued" });

    for (const book of issuedBooks) {
      if (book.returnDate) {
        const [yyyy, mm, dd] = book.returnDate.split('-');
        const returnDate = new Date(yyyy, mm - 1, dd);
        
        const diffTime = today.getTime() - returnDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 0) {
          const fineAmount = diffDays * 50;
          await Fine.findOneAndUpdate(
            { student: book.issuedTo, bookId: book.id },
            { amount: fineAmount, reason: "Overdue Return" },
            { upsert: true }
          );
        }
      }
    }
    console.log("\n[CRON] Successfully calculated and updated daily overdue fines.\n");
  } catch (err) {
    console.error("\n❌ [CRON] Error calculating overdue fines:", err.message, "\n");
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server Running on Port ${PORT}`);
});