import { db } from './firebase-config.js';
import { collection, addDoc, getDocs, doc, setDoc, updateDoc, increment, serverTimestamp, query, where, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

document.getElementById('confirmYesBtn').onclick = () => {
    closeModal('customConfirmModal');
    if (currentConfirmCallback) currentConfirmCallback();
};

window.closeModal = function(id) { document.getElementById(id).style.display = 'none'; };

async function loadDonors() {
    const select = document.getElementById('sponsorName');
    select.innerHTML = '<option value="">هەڵبژێرە...</option>';
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
    const donorName = document.getElementById('sponsorName').value;
    const receiptSelect = document.getElementById('sponsorReceipt');
    
    receiptSelect.innerHTML = '<option value="">هەڵبژێرە...</option>';
    if (!donorName) return;

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
                option.text = `بڕی ماوە: ${rem.toFixed(2)} ${data.currency} (وەسڵی بەرواری: ${dateStr})`;
                receiptSelect.appendChild(option);
            }
        });
        
        if (!hasReceipts) {
            receiptSelect.innerHTML = '<option value="">هیچ وەسڵێک نەدۆزرایەوە کە پارەی تێدا مابێت!</option>';
        }
        
    } catch (error) { console.error("Error loading receipts:", error); }
};

window.checkCurrencyMatch = function() {
    const receiptSelect = document.getElementById('sponsorReceipt');
    const kafalaCurrency = document.getElementById('currency').value;
    const exchangeRateDiv = document.getElementById('exchangeRateDiv');
    const exchangeRateInput = document.getElementById('exchangeRate');

    if (receiptSelect.selectedIndex <= 0) {
        exchangeRateDiv.style.display = 'none';
        exchangeRateInput.required = false;
        return;
    }

    const receiptCurrency = receiptSelect.options[receiptSelect.selectedIndex].dataset.currency;

    if (receiptCurrency && receiptCurrency !== kafalaCurrency) {
        exchangeRateDiv.style.display = 'block';
        exchangeRateInput.required = true;
        
        if (receiptCurrency === 'USD' && kafalaCurrency === 'IQD') {
            document.getElementById('exchangeRateLabel').innerText = "نرخی گۆڕینەوە (١٠٠ دۆلار = چەند دینارە؟):";
        } else if (receiptCurrency === 'IQD' && kafalaCurrency === 'USD') {
            document.getElementById('exchangeRateLabel').innerText = "نرخی گۆڕینەوە (١٠٠ دۆلار = چەند دینارە؟):";
        }
    } else {
        exchangeRateDiv.style.display = 'none';
        exchangeRateInput.required = false;
        exchangeRateInput.value = '';
    }
};

document.getElementById('kafalaForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const sponsorName = document.getElementById('sponsorName').value;
    const receiptSelect = document.getElementById('sponsorReceipt');
    const receiptId = receiptSelect.value; 
    const receiptCurrency = receiptSelect.options[receiptSelect.selectedIndex].dataset.currency;

    const beneficiaryName = document.getElementById('beneficiaryName').value;
    const totalAmount = parseFloat(document.getElementById('totalAmount').value);
    const kafalaDuration = parseInt(document.getElementById('kafalaDuration').value);
    const kafalaCurrency = document.getElementById('currency').value;
    
    const exchangeRate = parseFloat(document.getElementById('exchangeRate').value) || 0;

    if (!receiptId) { customAlert("تکایە وەسڵێک هەڵبژێرە.", "warning"); return; }

    let amountToDeductFromReceipt = totalAmount;
    if (receiptCurrency !== kafalaCurrency && exchangeRate > 0) {
        if (kafalaCurrency === 'IQD' && receiptCurrency === 'USD') {
            amountToDeductFromReceipt = totalAmount / (exchangeRate / 100);
        } else if (kafalaCurrency === 'USD' && receiptCurrency === 'IQD') {
            amountToDeductFromReceipt = totalAmount * (exchangeRate / 100);
        }
    }

    customConfirm(`ئایا دڵنیایت؟\n\nبڕی ${totalAmount} ${kafalaCurrency} بە یەکجار و ڕاستەوخۆ لە وەسڵی مرۆڤدۆستەکە دەبڕدرێت بۆ کەفالەتی (${kafalaDuration} مانگ).`, async () => {
        try {
            await addDoc(collection(db, "kafala_contracts"), {
                sponsorName: sponsorName,
                beneficiaryName: beneficiaryName,
                totalAmount: totalAmount,
                durationMonths: kafalaDuration,
                currency: kafalaCurrency,
                exchangeRate: exchangeRate,
                receiptCurrency: receiptCurrency,
                amountDeductedFromReceipt: amountToDeductFromReceipt,
                status: 'active',
                timestamp: serverTimestamp()
            });
            
            const donorRef = doc(db, "donor_balances", sponsorName);
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

            let projectDesc = `کەفالەتی: ${beneficiaryName} (بۆ ماوەی ${kafalaDuration} مانگ)`;
            if (exchangeRate > 0 && receiptCurrency !== kafalaCurrency) {
                projectDesc += ` | بنەڕەتی: ${totalAmount} ${kafalaCurrency} (بە گۆڕینەوەی: ${exchangeRate})`;
            }

            await addDoc(collection(db, "donor_expenses"), {
                donorName: sponsorName,
                projectName: projectDesc,
                amount: amountToDeductFromReceipt,
                currency: receiptCurrency,
                incomeId: receiptId,
                timestamp: serverTimestamp()
            });
            
            customAlert(`کەفالەتەکە بە سەرکەوتوویی تۆمارکرا!\nبڕی بڕدراو لە وەسڵ: ${amountToDeductFromReceipt.toFixed(2)} ${receiptCurrency}`, "success");
            
            document.getElementById('kafalaForm').reset();
            document.getElementById('sponsorReceipt').innerHTML = '<option value="">تکایە سەرەتا مرۆڤدۆستێک هەڵبژێرە...</option>';
            document.getElementById('exchangeRateDiv').style.display = 'none';
        } catch (error) {
            console.error("Error:", error);
            customAlert("کێشەیەک ڕوویدا لە تۆمارکردنی کەفالەتەکە.", "error");
        }
    });
});

let kafalaUnsub = null;
window.loadKafalaContracts = function() {
    if(kafalaUnsub) kafalaUnsub();
    const q = query(collection(db, "kafala_contracts"), orderBy("timestamp", "desc"));
    kafalaUnsub = onSnapshot(q, (querySnapshot) => {
        const tableBody = document.querySelector('#kafalaTable tbody');
        tableBody.innerHTML = ''; 
        querySnapshot.forEach((documentSnapshot) => {
            const data = documentSnapshot.data();
            let dateStr = data.timestamp ? data.timestamp.toDate().toLocaleDateString('ku-IQ') : "نەزانراو";

            const row = `
                <tr>
                    <td><strong>${data.sponsorName}</strong></td>
                    <td>${data.beneficiaryName}</td>
                    <td dir="ltr" style="color: #27ae60; font-weight: bold;">${data.totalAmount} ${data.currency}</td>
                    <td>${data.durationMonths} مانگ</td>
                    <td dir="ltr">${dateStr}</td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    });
};

window.onload = () => {
    loadDonors();
    window.loadKafalaContracts();
};