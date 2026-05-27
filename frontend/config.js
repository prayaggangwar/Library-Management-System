// Central configuration for the frontend

// Replace this with your actual Render URL after deploying the backend!
const PRODUCTION_URL = "https://library-management-system-4l2w.onrender.com/api";
const LOCAL_URL = "http://localhost:5000/api";

const API_BASE_URL = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? LOCAL_URL : PRODUCTION_URL;