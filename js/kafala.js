import { db } from './firebase-config.js';
import { collection, addDoc, getDocs, doc, setDoc, updateDoc, increment, serverTimestamp, query, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ==========================================
// فەنکشنەکانی پەیامە مۆدێرنەکان 
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

document.getElementById('confirmYesBtn').onclick = () => {
    closeModal('customConfirmModal');
    if (currentConfirmCallback) currentConfirmCallback();
};

window.closeModal = function(id) {
    document.getElementById(id).style.display = 'none';
};


// ==========================================
// هێنانەوەی زانیارییەکان و وەسڵەکان
// ==========================================
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

// ==========================================
// فۆڕم و کردارەکان
// ==========================================
document.getElementById('kafalaForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const sponsorName = document.getElementById('sponsorName').value;
    const receiptSelect = document.getElementById('sponsorReceipt');
    const receiptId = receiptSelect.value; 
    const receiptCurrency = receiptSelect.options[receiptSelect.selectedIndex].dataset.currency;

    const beneficiaryName = document.getElementById('beneficiaryName').value;
    const totalAmount = parseFloat(document.getElementById('totalAmount').value);
    const monthlyDeduction = parseFloat(document.getElementById('monthlyDeduction').value);
    const kafalaCurrency = document.getElementById('currency').value;
    
    const exchangeRate = parseFloat(document.getElementById('exchangeRate').value) || 0;

    if (!receiptId) { customAlert("تکایە وەسڵێک هەڵبژێرە.", "warning"); return; }

    try {
        await addDoc(collection(db, "kafala_contracts"), {
            sponsorName: sponsorName,
            incomeId: receiptId,
            receiptCurrency: receiptCurrency,
            beneficiaryName: beneficiaryName,
            totalAmount: totalAmount,
            currentBalance: totalAmount, 
            monthlyDeduction: monthlyDeduction,
            currency: kafalaCurrency, 
            exchangeRate: exchangeRate, 
            status: 'active',
            timestamp: serverTimestamp()
        });
        
        customAlert("جزدانی کەفالەتەکە بە سەرکەوتوویی دروست کرا!", "success");
        document.getElementById('kafalaForm').reset();
        document.getElementById('sponsorReceipt').innerHTML = '<option value="">تکایە سەرەتا بەخشەر هەڵبژێرە...</option>';
        document.getElementById('exchangeRateDiv').style.display = 'none';
        loadKafalaContracts(); 
    } catch (error) {
        console.error("Error:", error);
        customAlert("کێشەیەک ڕوویدا لە دروستکردنی کەفالەتەکە.", "error");
    }
});

async function loadKafalaContracts() {
    const tableBody = document.querySelector('#kafalaTable tbody');
    tableBody.innerHTML = ''; 

    try {
        const querySnapshot = await getDocs(collection(db, "kafala_contracts"));
        
        querySnapshot.forEach((documentSnapshot) => {
            const data = documentSnapshot.data();
            const docId = documentSnapshot.id;
            
            const monthsLeft = Math.floor(data.currentBalance / data.monthlyDeduction);
            
            let rowClass = '';
            let alertText = '';
            let btnDisabled = '';

            if (monthsLeft <= 1 && monthsLeft > 0) {
                rowClass = 'danger-row';
                alertText = '<br><span class="danger-text">⚠️ کاتی نوێکردنەوەیەتی!</span>';
            } else if (monthsLeft === 0) {
                rowClass = 'danger-row';
                alertText = '<br><span class="danger-text">❌ پارە نەماوە</span>';
                btnDisabled = 'disabled'; 
            }

            const incomeIdStr = data.incomeId || "none";
            const recCurrency = data.receiptCurrency || data.currency;
            const exRate = data.exchangeRate || 0;

            const row = `
                <tr class="${rowClass}">
                    <td>${data.sponsorName}</td>
                    <td>${data.beneficiaryName}</td>
                    <td dir="ltr"><strong>${data.currentBalance} ${data.currency}</strong></td>
                    <td dir="ltr">${data.monthlyDeduction} ${data.currency}</td>
                    <td>${monthsLeft} مانگ ${alertText}</td>
                    <td>
                        <button class="btn-deduct" ${btnDisabled} onclick="deductMonthly('${docId}', ${data.currentBalance}, ${data.monthlyDeduction}, '${data.sponsorName}', '${data.currency}', '${data.beneficiaryName}', '${incomeIdStr}', '${recCurrency}', ${exRate})">
                            بڕینی مانگی نوێ
                        </button>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    } catch (error) { console.error("Error loading kafala:", error); }
}

window.deductMonthly = async function(docId, currentBalance, monthlyDeduction, sponsorName, kafalaCurrency, beneficiaryName, incomeId, receiptCurrency, exchangeRate) {
    customConfirm(`دڵنیایت دەتەوێت پارەی ئەم مانگە (${monthlyDeduction} ${kafalaCurrency}) ببڕیت؟\nئەمە ڕاستەوخۆ لە وەسڵەکەی بەخشەر کەم دەبێتەوە.`, async () => {
        try {
            const newBalance = currentBalance - monthlyDeduction;
            let amountToDeductFromReceipt = monthlyDeduction;
            
            if (receiptCurrency !== kafalaCurrency && exchangeRate > 0) {
                if (kafalaCurrency === 'IQD' && receiptCurrency === 'USD') {
                    amountToDeductFromReceipt = monthlyDeduction / (exchangeRate / 100);
                } else if (kafalaCurrency === 'USD' && receiptCurrency === 'IQD') {
                    amountToDeductFromReceipt = monthlyDeduction * (exchangeRate / 100);
                }
            }
            
            const kafalaRef = doc(db, "kafala_contracts", docId);
            await updateDoc(kafalaRef, { currentBalance: newBalance });

            await addDoc(collection(db, "kafala_transactions"), {
                contractId: docId,
                amountDeducted: monthlyDeduction,
                sponsorName: sponsorName,
                beneficiaryName: beneficiaryName,
                currency: kafalaCurrency,
                timestamp: serverTimestamp()
            });

            const donorRef = doc(db, "donor_balances", sponsorName);
            await setDoc(donorRef, {
                [`spent_${receiptCurrency}`]: increment(amountToDeductFromReceipt),
                [`remaining_${receiptCurrency}`]: increment(-amountToDeductFromReceipt)
            }, { merge: true });

            if (incomeId !== "none") {
                const incomeRef = doc(db, "incomes", incomeId);
                await updateDoc(incomeRef, { remainingAmount: increment(-amountToDeductFromReceipt) });
            }

            await addDoc(collection(db, "donor_expenses"), {
                donorName: sponsorName,
                projectName: `کەفالەتی: ${beneficiaryName}` + (exchangeRate > 0 ? ` (بە گۆڕینەوەی ${exchangeRate})` : ''),
                amount: amountToDeductFromReceipt,
                currency: receiptCurrency,
                incomeId: incomeId,
                timestamp: serverTimestamp()
            });

            customAlert(`پارەکە بە سەرکەوتوویی بڕدرا!\n\nزانیاری:\nبڕی کەفالەت: ${monthlyDeduction} ${kafalaCurrency}\nبڕی بڕدراو لە وەسڵ: ${amountToDeductFromReceipt.toFixed(2)} ${receiptCurrency}`, "success");
            loadKafalaContracts(); 
        } catch (error) {
            console.error("Error updating balance:", error);
            customAlert("کێشەیەک ڕوویدا لە کاتی بڕینی پارەکە.", "error");
        }
    });
};

window.onload = () => {
    loadDonors();
    loadKafalaContracts();
};