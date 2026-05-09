import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// پشکنین: ئایا بەکارهێنەر چووەتە ژوورەوە؟ وە ئایا هی ئەم سیستەمەیە؟
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // ئەگەر هەر لۆگین نەبووە
        window.location.href = "login.html";
    } else {
        // ئەگەر لۆگین بووە، بزانە ئایا ئەدمینی مرۆڤدۆستانە؟
        const docRef = doc(db, "mrovdostan_admins", user.email);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            // ئەگەر لەناو لیستی ڕێگەپێدراوەکان نەبوو، دەری بکە بە زۆر
            signOut(auth).then(() => {
                window.location.href = "login.html";
            });
        }
    }
});

window.logoutUser = function() {
    signOut(auth).then(() => {
        window.location.href = "login.html";
    }).catch((error) => {
        console.error("هەڵە لە چوونەدەرەوە", error);
    });
};