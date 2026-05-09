import { db, auth } from './firebase-config.js';
import { collection, addDoc, getDocs, doc, setDoc, updateDoc, deleteDoc, serverTimestamp, query, orderBy, increment, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

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

async function loadReasons() {
    const container = document.getElementById('reasonContainer');
    container.innerHTML = '';
    document.getElementById('reasonValue').value = '';
    document.getElementById('reasonTextValue').value = '';

    try {
        const snap = await getDocs(collection(db, "expense_reasons"));
        
        if (snap.empty) {
            container.innerHTML = '<span style="color:#999; font-size:14px; padding:10px;">هیچ هۆکارێک نییە، تکایە ناوێک زیاد بکە.</span>';
            return;
        }
        
        let addedNames = new Set();
        snap.forEach(doc => {
            const name = doc.data().name;
            if (!addedNames.has(name)) {
                addedNames.add(name);
                createRadioItem('reasonContainer', 'reasonValue', 'reasonTextValue', doc.id, name);
            } else {
                deleteDoc(doc.ref); 
            }
        });
    } catch (error) { console.error(error); }
}

window.addReason = function() {
    document.getElementById('newReasonInput').value = '';
    document.getElementById('addReasonModal').style.display = 'block';
    setTimeout(() => document.getElementById('newReasonInput').focus(), 100);
};

window.submitNewReason = async function() {
    const name = document.getElementById('newReasonInput').value.trim();
    if (!name) { customAlert("تکایە هۆکارێک بنووسە!", "warning"); return; }
    
    closeModal('addReasonModal');
    
    try {
        await addDoc(collection(db, "expense_reasons"), { name: name });
        customAlert("هۆکارەکە بە سەرکەوتوویی زیادکرا!", "success");
        loadReasons();
    } catch(e) { console.error(e); customAlert("کێشەیەک لە زیادکردندا ڕوویدا.", "error"); }
};

window.deleteReason = async function() {
    const id = document.getElementById('reasonValue').value;
    if (!id) { customAlert("تکایە سەرەتا هۆکارێک دیاری بکە (کلیکی لێ بکە تا شین دەبێت) بۆ ئەوەی بیسڕیتەوە!", "warning"); return; }
    
    customConfirm("ئایا دڵنیایت لە سڕینەوەی ئەم هۆکارە؟", async () => {
        try {
            await deleteDoc(doc(db, "expense_reasons", id));
            loadReasons();
            customAlert("هۆکارەکە سڕایەوە.", "success");
        } catch(e) { console.error(e); customAlert("هەڵەیەک لە سڕینەوەدا ڕوویدا.", "error"); }
    });
};

async function loadDonors() {
    const select = document.getElementById('donorSelect');
    select.innerHTML = '<option value="general_fund">سندووقی گشتی (حیسابی هیچ کەسێک نییە)</option>';
    try {
        const snap = await getDocs(collection(db, "donor_balances"));
        snap.forEach(doc => {
            const name = doc.data().name;
            const option = document.createElement('option');
            option.value = name;
            option.text = name;
            select.appendChild(option);
        });
    } catch (error) { console.error("Error loading donors:", error); }
}

window.loadDonorReceipts = async function() {
    const donorName = document.getElementById('donorSelect').value;
    const receiptSection = document.getElementById('receiptSection');
    const receiptSelect = document.getElementById('donorReceipt');
    
    receiptSelect.innerHTML = '<option value="">هەڵبژێرە...</option>';
    
    if (!donorName || donorName === 'general_fund') {
        receiptSection.style.display = 'none';
        document.getElementById('donorReceipt').required = false;
        window.checkCurrencyMatch(); 
        return;
    }

    receiptSection.style.display = 'block';
    document.getElementById('donorReceipt').required = true;

    try {
        const qInc = query(collection(db, "incomes"), where("donorName", "==", donorName));
        const snapInc = await getDocs(qInc);
        let hasReceipts = false;
        
        snapInc.forEach(docSnap => {
            const data = docSnap.data();
            let rem = data.remainingAmount !== undefined ? data.remainingAmount : data.amount;
            
            if (rem > 0) {
                hasReceipts = true;
                const option = document.createElement('option');
                let dateStr = data.timestamp ? data.timestamp.toDate().toLocaleDateString('ku-IQ') : "نەزانراو";
                
                option.value = docSnap.id;
                option.dataset.currency = data.currency; 
                option.text = `بڕی ماوە: ${rem.toFixed(2)} ${data.currency} (وەسڵی: ${dateStr})`;
                receiptSelect.appendChild(option);
            }
        });
        
        if (!hasReceipts) {
            receiptSelect.innerHTML = '<option value="">هیچ وەسڵێک نەدۆزرایەوە کە پارەی تێدا مابێت!</option>';
        }
    } catch (error) { console.error(error); }
};

window.checkCurrencyMatch = function() {
    const donorName = document.getElementById('donorSelect').value;
    const receiptSelect = document.getElementById('donorReceipt');
    const expenseCurrency = document.getElementById('expenseCurrency').value;
    const exchangeRateDiv = document.getElementById('exchangeRateDiv');
    const exchangeRateInput = document.getElementById('exchangeRate');

    if (donorName === 'general_fund' || receiptSelect.selectedIndex <= 0) {
        exchangeRateDiv.style.display = 'none';
        exchangeRateInput.required = false;
        return;
    }

    const receiptCurrency = receiptSelect.options[receiptSelect.selectedIndex].dataset.currency;

    if (receiptCurrency && receiptCurrency !== expenseCurrency) {
        exchangeRateDiv.style.display = 'block';
        exchangeRateInput.required = true;
        if (receiptCurrency === 'USD' && expenseCurrency === 'IQD') {
            document.getElementById('exchangeRateLabel').innerText = "نرخی گۆڕینەوە (١٠٠ دۆلار = چەند دینارە؟):";
        } else if (receiptCurrency === 'IQD' && expenseCurrency === 'USD') {
            document.getElementById('exchangeRateLabel').innerText = "نرخی گۆڕینەوە (١٠٠ دۆلار = چەند دینارە؟):";
        }
    } else {
        exchangeRateDiv.style.display = 'none';
        exchangeRateInput.required = false;
        exchangeRateInput.value = '';
    }
};

document.getElementById('expenseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const expenseCurrency = document.getElementById('expenseCurrency').value;
    const recipientName = document.getElementById('recipientName').value;
    const recipientAddress = document.getElementById('recipientAddress').value || "نەزانراو";
    const recipientPhone = document.getElementById('recipientPhone').value || "نەزانراو";
    const expenseDate = document.getElementById('expenseDate').value;
    
    const reasonId = document.getElementById('reasonValue').value;
    const reasonText = document.getElementById('reasonTextValue').value;
    
    if (!reasonId) { customAlert("تکایە هۆکاری سەرفکردنەکە هەڵبژێرە (کلیکی لێ بکە تا شین دەبێت)!", "warning"); return; }

    const donorName = document.getElementById('donorSelect').value;
    
    let amountToDeductFromReceipt = amount;
    let receiptId = "none";
    let receiptCurrency = expenseCurrency;
    let exchangeRate = 0;

    if (donorName !== 'general_fund') {
        const receiptSelect = document.getElementById('donorReceipt');
        receiptId = receiptSelect.value;
        
        if (!receiptId) { customAlert("تکایە وەسڵێک هەڵبژێرە بۆ ئەوەی پارەکەی لێ ببڕدرێت.", "warning"); return; }
        
        receiptCurrency = receiptSelect.options[receiptSelect.selectedIndex].dataset.currency;
        exchangeRate = parseFloat(document.getElementById('exchangeRate').value) || 0;

        if (receiptCurrency !== expenseCurrency && exchangeRate > 0) {
            if (expenseCurrency === 'IQD' && receiptCurrency === 'USD') {
                amountToDeductFromReceipt = amount / (exchangeRate / 100);
            } else if (expenseCurrency === 'USD' && receiptCurrency === 'IQD') {
                amountToDeductFromReceipt = amount * (exchangeRate / 100);
            }
        }
    }

    try {
        await addDoc(collection(db, "general_expenses"), {
            amount: amount,
            currency: expenseCurrency,
            recipientName: recipientName,
            recipientAddress: recipientAddress,
            recipientPhone: recipientPhone,
            reason: reasonText,
            donorName: donorName === 'general_fund' ? 'سندووقی گشتی' : donorName,
            date: expenseDate,
            timestamp: serverTimestamp()
        });

        if (donorName !== 'general_fund') {
            const donorRef = doc(db, "donor_balances", donorName);
            await setDoc(donorRef, {
                [`spent_${receiptCurrency}`]: increment(amountToDeductFromReceipt),
                [`remaining_${receiptCurrency}`]: increment(-amountToDeductFromReceipt)
            }, { merge: true });

            if (receiptId !== "none") {
                const incomeRef = doc(db, "incomes", receiptId);
                await updateDoc(incomeRef, {
                    remainingAmount: increment(-amountToDeductFromReceipt)
                });
            }

            await addDoc(collection(db, "donor_expenses"), {
                donorName: donorName,
                projectName: `سەرفی گشتی: ${reasonText} (وەرگر: ${recipientName})` + (exchangeRate > 0 ? ` (بە گۆڕینەوەی ${exchangeRate})` : ''),
                amount: amountToDeductFromReceipt,
                currency: receiptCurrency,
                incomeId: receiptId, 
                timestamp: serverTimestamp()
            });
        }

        let alertMsg = "خەرجییەکە بە سەرکەوتوویی تۆمار کرا!";
        if (donorName !== 'general_fund') {
            alertMsg += `\n\nزانیاری بڕین:\nبڕی خەرجی: ${amount} ${expenseCurrency}\nبڕی بڕدراو لە وەسڵ: ${amountToDeductFromReceipt.toFixed(2)} ${receiptCurrency}`;
        }
        customAlert(alertMsg, "success");
        
        document.getElementById('expenseForm').reset();
        
        document.getElementById('reasonValue').value = '';
        document.getElementById('reasonTextValue').value = '';
        document.getElementById('receiptSection').style.display = 'none';
        document.getElementById('expenseDate').valueAsDate = new Date();

    } catch (error) { console.error("Error:", error); customAlert("کێشەیەک ڕوویدا لە تۆمارکردندا!", "error"); }
});

let expenseHistoryUnsub = null;
window.openExpenseHistory = async function() {
    document.getElementById('expenseHistoryModal').style.display = 'block';
    const tableBody = document.querySelector('#expenseHistoryTable tbody');
    tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">چاوەڕوان بە...</td></tr>';
    
    if(expenseHistoryUnsub) expenseHistoryUnsub();
    const q = query(collection(db, "general_expenses"), orderBy("timestamp", "desc"));
    expenseHistoryUnsub = onSnapshot(q, (snap) => {
        tableBody.innerHTML = '';
        if (snap.empty) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#999;">هیچ خەرجییەک تۆمار نەکراوە.</td></tr>';
            return;
        }

        snap.forEach(docSnap => {
            const data = docSnap.data();
            const dateDisplay = data.date || "نەزانراو";
            
            const row = `
                <tr>
                    <td dir="ltr">${dateDisplay}</td>
                    <td><strong>${data.reason}</strong></td>
                    <td>${data.recipientName}</td>
                    <td dir="ltr" style="color: #e74c3c; font-weight: bold;">-${data.amount} ${data.currency}</td>
                    <td><span class="locked" style="background-color: #3498db;">${data.donorName}</span></td>
                    <td>${data.recipientPhone} <br> <small style="color:#7f8c8d;">${data.recipientAddress}</small></td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    });
};

onAuthStateChanged(auth, (user) => {
    if (user) {
        loadReasons();
        loadDonors();
        document.getElementById('expenseDate').valueAsDate = new Date();
    } else {
        window.location.href = "login.html";
    }
});