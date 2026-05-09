import { auth, db } from './firebase-config.js'; // تێبینی: db مان زیادکرد
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js"; // بۆ پشکنینی داتابەیس

const errorMsg = document.getElementById('errorMsg');
const loginBtn = document.getElementById('loginBtn');

// ئەگەر کەسەکە پێشتر لۆگین بووە، بزانە ئایا هی ئەم سیستەمەیە پێش ئەوەی بیبەیتە ژوورەوە
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const docRef = doc(db, "mrovdostan_admins", user.email);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            window.location.href = "donors.html";
        } else {
            // ئەگەر بەکارهێنەری سیستەمەکەی تر بوو بە هەڵە هاتبووە ئێرە، دەری بکە
            signOut(auth);
        }
    }
});

document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    loginBtn.innerText = "چاوەڕوان بە...";
    loginBtn.disabled = true;
    errorMsg.style.display = "none";

    signInWithEmailAndPassword(auth, email, password)
        .then(async (userCredential) => {
            const user = userCredential.user;
            
            // پشکنین: ئایا ئەم ئیمەیڵە لە لیستی ئەدمینەکانی مرۆڤدۆستاندایە؟
            const docRef = doc(db, "mrovdostan_admins", user.email);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                // سەرکەوتوو بوو، ڕێگەپێدراوە
                window.location.href = "donors.html";
            } else {
                // سەر بە سیستەمەکەی ترە، بۆیە ڕاستەوخۆ دەری دەکەین
                await signOut(auth);
                errorMsg.innerText = "ببورە، ئەم هەژمارە ڕێگەپێدراو نییە بۆ سیستەمی مرۆڤدۆستان!";
                errorMsg.style.display = "block";
                loginBtn.innerText = "چوونەژوورەوە";
                loginBtn.disabled = false;
            }
        })
        .catch((error) => {
            // کێشەیەک هەیە لە ئیمەیڵ یان پاسۆرد خۆی
            errorMsg.innerText = "ئیمەیڵ یان وشەی نهێنی هەڵەیە!";
            errorMsg.style.display = "block";
            loginBtn.innerText = "چوونەژوورەوە";
            loginBtn.disabled = false;
            console.error(error.message);
        });
});