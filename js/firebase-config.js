import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyD75LsGRt5asgP-UmUNHC1cd98mwkvLOrU",
  authDomain: "profile-21fde.firebaseapp.com",
  projectId: "profile-21fde",
  storageBucket: "profile-21fde.firebasestorage.app",
  messagingSenderId: "96182241271",
  appId: "1:96182241271:web:14b4dff180faeae71fd0f2"
};

// دامەزراندنی فایەربەیس
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

export { db, storage, auth };