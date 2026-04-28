import { db, storage } from './firebase-config.js';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, serverTimestamp, query, orderBy, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

// ==========================================
// مۆداڵەکانی ئاگادارکردنەوە
// ==========================================
window.customAlert = function(message, type = "success") {
    const titleEl = document.getElementById('alertTitle');
    const iconEl = document.getElementById('alertIcon');
    const borderEl = document.getElementById('alertModalBorder');
    document.getElementById('alertMessage').innerText = message;
    
    if (type === "success") {
        titleEl.innerText = "سەرکەوتوو بوو"; titleEl.style.color = "#27ae60"; iconEl.innerText = "✅"; borderEl.style.borderTop = "5px solid #27ae60";
    } else if (type === "error") {
        titleEl.innerText = "هەڵەیەک ڕوویدا"; titleEl.style.color = "#e74c3c"; iconEl.innerText = "❌"; borderEl.style.borderTop = "5px solid #e74c3c";
    } else {
        titleEl.innerText = "تێبینی"; titleEl.style.color = "#f39c12"; iconEl.innerText = "⚠️"; borderEl.style.borderTop = "5px solid #f39c12";
    }
    document.getElementById('customAlertModal').style.display = 'block';
};

let currentConfirmCallback = null;
window.customConfirm = function(message, callback) {
    document.getElementById('confirmMessage').innerText = message;
    currentConfirmCallback = callback;
    document.getElementById('customConfirmModal').style.display = 'block';
};
document.getElementById('confirmYesBtn').onclick = () => { closeModal('customConfirmModal'); if (currentConfirmCallback) currentConfirmCallback(); };

window.closeModal = function(id) { document.getElementById(id).style.display = 'none'; };

// ==========================================
// دروستکردنی کارتی ناوەکان (لیژنەکان / کەسەکان)
// ==========================================
function createRadioItem(containerId, valueInputId, textInputId, value, text) {
    const container = document.getElementById(containerId);
    const div = document.createElement('div');
    div.className = 'radio-item';
    div.innerText = text;
    
    div.onclick = () => {
        Array.from(container.children).forEach(child => child.classList.remove('active'));
        div.classList.add('active');
        
        if(document.getElementById(valueInputId)) document.getElementById(valueInputId).value = value;
        if(textInputId && document.getElementById(textInputId)) document.getElementById(textInputId).value = text;
    };
    container.appendChild(div);
}

async function loadCommittees() {
    const container = document.getElementById('committeeContainer');
    container.innerHTML = '';
    document.getElementById('committeeValue').value = '';
    document.getElementById('committeeTextValue').value = '';

    try {
        const snap = await getDocs(collection(db, "committees"));
        
        if (snap.empty) {
            container.innerHTML = '<span style="color:#999; font-size:14px; padding:10px;">هیچ ناوێک نییە، تکایە لە خوارەوە ناوێک زیاد بکە.</span>';
            return;
        }
        
        let addedNames = new Set();
        
        snap.forEach(doc => {
            const name = doc.data().name;
            if (!addedNames.has(name)) {
                addedNames.add(name);
                createRadioItem('committeeContainer', 'committeeValue', 'committeeTextValue', doc.id, name);
            } else {
                deleteDoc(doc.ref); // سڕینەوەی ناوە دووبارەکان لەکاتی ڕیفڕێشی خێرا
            }
        });
    } catch (error) { console.error(error); }
}

window.addCommittee = function() {
    document.getElementById('newCommitteeInput').value = '';
    document.getElementById('addCommitteeModal').style.display = 'block';
    setTimeout(() => document.getElementById('newCommitteeInput').focus(), 100);
};

window.submitNewCommittee = async function() {
    const name = document.getElementById('newCommitteeInput').value.trim();
    if (!name) { customAlert("تکایە ناوێک بنووسە!", "warning"); return; }
    
    closeModal('addCommitteeModal');
    
    try {
        await addDoc(collection(db, "committees"), { name: name });
        customAlert("ناوەکە بە سەرکەوتوویی زیادکرا!", "success");
        loadCommittees();
    } catch(e) { console.error(e); customAlert("کێشەیەک لە زیادکردندا ڕوویدا.", "error"); }
};

window.deleteCommittee = async function() {
    const id = document.getElementById('committeeValue').value;
    if (!id) { customAlert("تکایە سەرەتا ناوێک دیاری بکە (کلیکی لێ بکە تا شین دەبێت) بۆ ئەوەی بیسڕیتەوە!", "warning"); return; }
    
    customConfirm("ئایا دڵنیایت لە سڕینەوەی ئەم ناوە؟", async () => {
        try {
            await deleteDoc(doc(db, "committees", id));
            loadCommittees();
            customAlert("ناوەکە سڕایەوە.", "success");
        } catch(e) { console.error(e); customAlert("هەڵەیەک لە سڕینەوەدا ڕوویدا.", "error"); }
    });
};

// ==========================================
// هێنانەوەی سلفەکان بۆ درۆپداون و خشتە
// ==========================================
async function loadAdvances() {
    const selectElement = document.getElementById('activeAdvances');
    const tableBody = document.querySelector('#advancesTable tbody');
    
    selectElement.innerHTML = '<option value="">تکایە سلفەیەک هەڵبژێرە...</option>';
    tableBody.innerHTML = '';

    try {
        const q = query(collection(db, "advances"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        
        querySnapshot.forEach((documentSnapshot) => {
            const data = documentSnapshot.data();
            const id = documentSnapshot.id;
            
            let statusBadge = data.remainingBalance > 0 ? '<span class="locked">کراوەیە</span>' : '<span class="open">پاکتاوکراوە</span>';

            const row = `
                <tr>
                    <td><strong>${data.committeeName}</strong></td>
                    <td>${data.givenBy || 'نەزانراو'}</td>
                    <td dir="ltr">${data.totalAmount} ${data.currency}</td>
                    <td dir="ltr" style="color: #c0392b; font-weight: bold;">${data.remainingBalance.toFixed(2)} ${data.currency}</td>
                    <td>${statusBadge}</td>
                </tr>
            `;
            tableBody.innerHTML += row;

            if (data.remainingBalance > 0) {
                const option = document.createElement("option");
                option.value = id;
                option.dataset.currency = data.currency; // دانانی دراوی سلفەکە بە نهێنی بۆ بەکارهێنان لەلایەن checkCurrencyMatch
                option.text = `${data.committeeName} - ماوە: ${data.remainingBalance.toFixed(2)} ${data.currency} (سەرچاوە: ${data.givenBy || ''})`;
                selectElement.appendChild(option);
            }
        });
    } catch (error) { console.error("Error loading advances:", error); }
}

async function loadSettlementHistory() {
    const tableBody = document.querySelector('#settlementHistoryTable tbody');
    tableBody.innerHTML = '';

    try {
        const q = query(collection(db, "settlements"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            let dateStr = data.timestamp ? data.timestamp.toDate().toLocaleDateString('ku-IQ') : "نەزانراو";
            
            let imgBtn = data.imageUrl ? `<a href="${data.imageUrl}" target="_blank" class="action-btn" style="padding: 5px 10px; font-size: 12px; text-decoration: none;">بینین</a>` : '<span style="color:#999; font-size:12px;">وێنەی نییە</span>';

            const row = `
                <tr>
                    <td><strong>${data.committeeName || 'نەزانراو'}</strong></td>
                    <td>${data.description || 'تۆمار نەکراوە'}</td>
                    <td dir="ltr">${data.amount} ${data.currency}</td>
                    <td dir="ltr" style="color: #27ae60; font-weight: bold;">${data.deductedBalance.toFixed(2)} ${data.advanceCurrency || ''}</td>
                    <td dir="ltr">${dateStr}</td>
                    <td>${imgBtn}</td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    } catch (error) { console.error("Error loading history:", error); }
}

window.onload = () => {
    loadCommittees();
    loadAdvances();
    loadSettlementHistory();
};

// ==========================================
// کۆنترۆڵکردنی خانەی نرخی گۆڕینەوە بە زیرەکی
// ==========================================
window.checkCurrencyMatch = function() {
    const advanceSelect = document.getElementById('activeAdvances');
    const receiptCurrency = document.getElementById('receiptCurrency').value;
    const exchangeRateDiv = document.getElementById('exchangeRateDiv');
    const exchangeRateInput = document.getElementById('exchangeRate');

    if (advanceSelect.selectedIndex <= 0) {
        exchangeRateDiv.style.display = 'none';
        exchangeRateInput.required = false;
        return;
    }

    const advanceCurrency = advanceSelect.options[advanceSelect.selectedIndex].dataset.currency;

    if (advanceCurrency && advanceCurrency !== receiptCurrency) {
        exchangeRateDiv.style.display = 'block';
        exchangeRateInput.required = true;
    } else {
        exchangeRateDiv.style.display = 'none';
        exchangeRateInput.required = false;
        exchangeRateInput.value = '';
    }
};

// ==========================================
// مۆداڵەکانی مێژوو
// ==========================================
window.openGeneralHistory = function() {
    document.getElementById('generalHistoryModal').style.display = 'block';
    loadAdvances();
    loadSettlementHistory();
};

window.openSpecificHistory = async function() {
    document.getElementById('specificHistoryModal').style.display = 'block';
    const sel = document.getElementById('specificAdvanceSelect');
    sel.innerHTML = '<option value="">تکایە ناوێک هەڵبژێرە...</option>';
    document.getElementById('specificTotals').style.display = 'none';
    document.querySelector('#specSettlementsTable tbody').innerHTML = '';
    
    try {
        const q = query(collection(db, "advances"));
        const snap = await getDocs(q);
        
        let uniqueNames = new Set();
        snap.forEach(docSnap => {
            const data = docSnap.data();
            if(data.committeeName) uniqueNames.add(data.committeeName);
        });
        
        uniqueNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name; 
            option.text = name;
            sel.appendChild(option);
        });
    } catch(e) { console.error(e); }
};

window.loadSpecificAdvanceData = async function() {
    const personName = document.getElementById('specificAdvanceSelect').value;
    if (!personName) { document.getElementById('specificTotals').style.display = 'none'; return; }
    
    document.getElementById('specificTotals').style.display = 'flex';
    const tableBody = document.querySelector('#specSettlementsTable tbody');
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">چاوەڕوان بە...</td></tr>';
    
    try {
        const qAdvances = query(collection(db, "advances"), where("committeeName", "==", personName));
        const advSnap = await getDocs(qAdvances);
        
        let totalGivenUSD = 0, remUSD = 0;
        let totalGivenIQD = 0, remIQD = 0;

        advSnap.forEach(docSnap => {
            const data = docSnap.data();
            if(data.currency === 'USD') {
                totalGivenUSD += data.totalAmount;
                remUSD += data.remainingBalance;
            } else if (data.currency === 'IQD') {
                totalGivenIQD += data.totalAmount;
                remIQD += data.remainingBalance;
            }
        });

        let settledUSD = totalGivenUSD - remUSD;
        let settledIQD = totalGivenIQD - remIQD;

        let htmlGiven = "", htmlSettled = "", htmlRem = "";
        
        if (totalGivenUSD > 0 || settledUSD > 0) {
            htmlGiven += `<div>${totalGivenUSD.toFixed(2)} $</div>`;
            htmlSettled += `<div>${settledUSD.toFixed(2)} $</div>`;
            htmlRem += `<div>${remUSD.toFixed(2)} $</div>`;
        }
        if (totalGivenIQD > 0 || settledIQD > 0) {
            htmlGiven += `<div>${totalGivenIQD.toFixed(2)} IQD</div>`;
            htmlSettled += `<div>${settledIQD.toFixed(2)} IQD</div>`;
            htmlRem += `<div>${remIQD.toFixed(2)} IQD</div>`;
        }

        document.getElementById('specTotalAdv').innerHTML = htmlGiven || "0";
        document.getElementById('specTotalSettled').innerHTML = htmlSettled || "0";
        document.getElementById('specRemainingAdv').innerHTML = htmlRem || "0";

        const qSettlements = query(collection(db, "settlements"), where("committeeName", "==", personName));
        const setSnap = await getDocs(qSettlements);
        
        let setList = [];
        setSnap.forEach(d => setList.push(d.data()));
        setList.sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        
        tableBody.innerHTML = '';
        if(setList.length === 0) {
             tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#999;">تا ئێستا هیچ وەسڵێک بۆ ئەم کەسە نەگەڕاوەتەوە.</td></tr>';
        } else {
             setList.forEach(data => {
                 let dateStr = data.timestamp ? data.timestamp.toDate().toLocaleDateString('ku-IQ') : "نەزانراو";
                 let imgBtn = data.imageUrl ? `<a href="${data.imageUrl}" target="_blank" style="color:#3498db; font-weight:bold; text-decoration:none;">بینین</a>` : '<span style="color:#999;">نییە</span>';
                 
                 tableBody.innerHTML += `
                    <tr>
                        <td>${data.description}</td>
                        <td dir="ltr" style="color:#e74c3c;">${data.amount} ${data.currency}</td>
                        <td dir="ltr" style="color:#27ae60; font-weight:bold;">${data.deductedBalance.toFixed(2)} ${data.advanceCurrency}</td>
                        <td dir="ltr">${dateStr}</td>
                        <td>${imgBtn}</td>
                    </tr>
                 `;
             });
        }
    } catch (e) { console.error(e); }
}

// ==========================================
// ناردنی فۆڕمەکانی سلفە و پاکتاو
// ==========================================
document.getElementById('advanceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const committeeId = document.getElementById('committeeValue').value;
    const name = document.getElementById('committeeTextValue').value;
    
    if (!committeeId) {
        customAlert("تکایە ناوی لیژنە/کەسێک هەڵبژێرە (کلیکی لێ بکە تا شین دەبێت)!", "warning");
        return;
    }

    const givenBy = document.getElementById('givenBy').value; 
    const amount = parseFloat(document.getElementById('advanceAmount').value);
    const currency = document.getElementById('advanceCurrency').value;

    try {
        await addDoc(collection(db, "advances"), {
            committeeName: name,
            givenBy: givenBy, 
            totalAmount: amount,
            remainingBalance: amount,
            currency: currency,
            status: 'active',
            timestamp: serverTimestamp()
        });
        customAlert("سلفەکە بە سەرکەوتوویی درا بە لیژنەکە!", "success");
        document.getElementById('advanceForm').reset();
        
        document.getElementById('committeeValue').value = '';
        document.getElementById('committeeTextValue').value = '';
        loadCommittees(); 
        loadAdvances(); 
    } catch (error) { console.error("Error:", error); customAlert("کێشەیەک ڕوویدا لە تۆمارکردندا!", "error"); }
});

document.getElementById('settlementForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const advanceId = document.getElementById('activeAdvances').value;
    const receiptDescription = document.getElementById('receiptDescription').value; 
    const receiptAmount = parseFloat(document.getElementById('receiptAmount').value);
    const receiptCurrency = document.getElementById('receiptCurrency').value;
    const exchangeRate = parseFloat(document.getElementById('exchangeRate').value) || 1;
    
    const fileInput = document.getElementById('receiptImage').files[0];

    if (!advanceId) { customAlert("تکایە سلفەیەک هەڵبژێرە!", "warning"); return; }

    try {
        const advanceRef = doc(db, "advances", advanceId);
        const advanceSnap = await getDoc(advanceRef);
        const advanceData = advanceSnap.data();

        let amountToDeduct = receiptAmount;
        if (advanceData.currency !== receiptCurrency) {
            if (advanceData.currency === 'USD' && receiptCurrency === 'IQD') {
                const exchangeRatePerDollar = exchangeRate / 100;
                amountToDeduct = receiptAmount / exchangeRatePerDollar;
            } else if (advanceData.currency === 'IQD' && receiptCurrency === 'USD') {
                const exchangeRatePerDollar = exchangeRate / 100;
                amountToDeduct = receiptAmount * exchangeRatePerDollar;
            }
        }

        let downloadURL = "";
        if (fileInput) {
            const storageRef = ref(storage, `receipts/${Date.now()}_${fileInput.name}`);
            await uploadBytes(storageRef, fileInput);
            downloadURL = await getDownloadURL(storageRef);
        }

        await addDoc(collection(db, "settlements"), {
            advanceId: advanceId,
            committeeName: advanceData.committeeName,
            description: receiptDescription, 
            amount: receiptAmount,
            currency: receiptCurrency,
            advanceCurrency: advanceData.currency,
            exchangeRate: exchangeRate,
            deductedBalance: amountToDeduct, 
            imageUrl: downloadURL, 
            timestamp: serverTimestamp()
        });

        const newBalance = advanceData.remainingBalance - amountToDeduct;
        await updateDoc(advanceRef, {
            remainingBalance: newBalance > 0 ? newBalance : 0 
        });

        customAlert(`وەسڵەکە پاکتاو کرا!\nبڕی ${amountToDeduct.toFixed(2)} ${advanceData.currency} لە سلفەکە کەمکرایەوە.`, "success");
        document.getElementById('settlementForm').reset();
        document.getElementById('exchangeRateDiv').style.display = 'none';
        
        loadAdvances(); 
        loadSettlementHistory(); 
        
    } catch (error) { console.error("Error:", error); customAlert("کێشەیەک ڕوویدا لە کاتی پاکتاوکردن!", "error"); }
});