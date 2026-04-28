// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCMgwV15hUX0kruGcSZ48zTRCYCG1dUf_k",
  authDomain: "dynamic-form-builder-51249.firebaseapp.com",
  projectId: "dynamic-form-builder-51249",
  storageBucket: "dynamic-form-builder-51249.firebasestorage.app",
  messagingSenderId: "451980092153",
  appId: "1:451980092153:web:aaeb3f6819e4639a3bb828"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // بۆ هەڵگرتنی داتا (وەسڵ، بەخشەر، پڕۆژە)
const storage = getStorage(app); // بۆ ئەپلۆدکردنی وێنەی وەسڵ و مزگەوتەکان

export { db, storage };