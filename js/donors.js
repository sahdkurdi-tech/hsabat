import { db } from './firebase-config.js';
import { collection, addDoc, getDocs, doc, setDoc, deleteDoc, updateDoc, increment, serverTimestamp, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ==========================================
// فەنکشنەکانی پەیامە مۆدێرنەکان (لەبری Alert و Confirm کۆن)
// ==========================================

window.customAlert = function(message, type = "success") {
    const titleEl = document.getElementById('alertTitle');
    const iconEl = document.getElementById('alertIcon');
    const borderEl = document.getElementById('alertModalBorder');
    
    document.getElementById('alertMessage').innerText = message;
    
    if (type === "success") {
        titleEl.innerText = "سەرکەوتوو بوو";
        titleEl.style.color = "#27ae60";
        iconEl.innerText = "✅";
        borderEl.style.borderTop = "5px solid #27ae60";
    } else if (type === "error") {
        titleEl.innerText = "هەڵەیەک ڕوویدا";
        titleEl.style.color = "#e74c3c";
        iconEl.innerText = "❌";
        borderEl.style.borderTop = "5px solid #e74c3c";
    } else {
        titleEl.innerText = "تێبینی";
        titleEl.style.color = "#f39c12";
        iconEl.innerText = "⚠️";
        borderEl.style.borderTop = "5px solid #f39c12";
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
// حیسابکردنی کۆی گشتی و دروستکردنی کارتەکان
// ==========================================

async function loadGlobalTotals() {
    let totalUSD = 0, totalIQD = 0;
    try {
        const snap = await getDocs(collection(db, "donor_balances"));
        snap.forEach(doc => {
            const data = doc.data();
            totalUSD += (data.remaining_USD || 0);
            totalIQD += (data.remaining_IQD || 0);
        });
        document.getElementById('globalTotalUSD').innerText = totalUSD.toFixed(2) + " $";
        document.getElementById('globalTotalIQD').innerText = totalIQD.toFixed(2) + " IQD";
    } catch (error) { console.error(error); }
}

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

function loadCurrencies() {
    const container = document.getElementById('currencyContainer');
    container.innerHTML = '';
    document.getElementById('currencyValue').value = '';
    createRadioItem('currencyContainer', 'currencyValue', null, 'USD', 'دۆلار ($)');
    createRadioItem('currencyContainer', 'currencyValue', null, 'IQD', 'دینار (IQD)');
}

// ==========================================
// بەڕێوەبردنی پڕۆژەکان و سندووقەکان
// ==========================================

async function loadProjects() {
    const container = document.getElementById('projectContainer');
    container.innerHTML = '';
    document.getElementById('projectValue').value = '';
    document.getElementById('projectNameValue').value = '';
    
    createRadioItem('projectContainer', 'projectValue', 'projectNameValue', 'general', 'سندووقی گشتی (بێ مەرج)');
    
    try {
        const snap = await getDocs(collection(db, "projects"));
        snap.forEach((doc) => {
            createRadioItem('projectContainer', 'projectValue', 'projectNameValue', doc.id, doc.data().name);
        });
    } catch (error) { console.error(error); }
}

window.addFund = function() {
    document.getElementById('newFundInput').value = '';
    document.getElementById('addFundModal').style.display = 'block';
    setTimeout(() => document.getElementById('newFundInput').focus(), 100);
};

window.submitNewFund = async function() {
    const name = document.getElementById('newFundInput').value.trim();
    if (!name) { customAlert("تکایە ناوی سندووقەکە بنووسە!", "warning"); return; }
    
    closeModal('addFundModal');
    
    try {
        await addDoc(collection(db, "projects"), {
            name: name, 
            estimatedCost: 0, 
            currency: "USD", // تەنیا بۆ ئەوەی داتابەیسەکە ئیرۆر نەدات، پرسیار ناکرێت
            collectedAmount: 0, 
            spentAmount: 0, 
            status: 'active', 
            timestamp: serverTimestamp()
        });
        customAlert("سندووقەکە بە سەرکەوتوویی زیادکرا!", "success");
        loadProjects();
    } catch(e) { console.error(e); customAlert("کێشەیەک لە زیادکردندا ڕوویدا.", "error"); }
};

window.deleteFund = function() {
    const id = document.getElementById('projectValue').value;
    if (!id) { customAlert("تکایە سەرەتا پڕۆژەیەک دیاری بکە (کلیکی لێ بکە تا شین دەبێت) بۆ ئەوەی بیسڕیتەوە!", "warning"); return; }
    if (id === 'general') { customAlert("سندووقی گشتی ناسڕێتەوە!", "error"); return; }
    
    customConfirm("دڵنیایت لە سڕینەوەی ئەم سندووقە؟ (ئەمە لە سەرجەم سیستەمەکە دەسڕێتەوە)", async () => {
        try {
            await deleteDoc(doc(db, "projects", id));
            loadProjects();
            customAlert("سندووقەکە سڕایەوە.", "success");
        } catch(e) { console.error(e); customAlert("هەڵەیەک لە سڕینەوەدا ڕوویدا.", "error"); }
    });
};

// ==========================================
// بەڕێوەبردنی کەناڵەکان (بەدەستی کێ)
// ==========================================

async function loadChannels() {
    const container = document.getElementById('sourceContainer');
    container.innerHTML = '';
    document.getElementById('sourceValue').value = '';
    document.getElementById('sourceTextValue').value = '';

    try {
        const snap = await getDocs(collection(db, "channels"));
        if (snap.empty) {
            await addDoc(collection(db, "channels"), { name: "لە ئۆفیس پێشکەش کراوە" });
            await addDoc(collection(db, "channels"), { name: "سەرۆکی ڕێکخراو هێناویەتی" });
            loadChannels(); 
            return;
        }
        snap.forEach(doc => {
            createRadioItem('sourceContainer', 'sourceValue', 'sourceTextValue', doc.id, doc.data().name);
        });
    } catch (error) { console.error(error); }
}

window.addChannel = function() {
    document.getElementById('newChannelInput').value = '';
    document.getElementById('addChannelModal').style.display = 'block';
    setTimeout(() => document.getElementById('newChannelInput').focus(), 100);
};

window.submitNewChannel = async function() {
    const name = document.getElementById('newChannelInput').value.trim();
    if (!name) { customAlert("تکایە ناوی کەناڵەکە یان کەسەکە بنووسە!", "warning"); return; }
    
    closeModal('addChannelModal');
    
    try {
        await addDoc(collection(db, "channels"), { name: name });
        customAlert("ناوێکی نوێ بە سەرکەوتوویی زیادکرا!", "success");
        loadChannels();
    } catch(e) { console.error(e); customAlert("کێشەیەک لە زیادکردندا ڕوویدا.", "error"); }
};

window.deleteChannel = function() {
    const id = document.getElementById('sourceValue').value;
    if (!id) { customAlert("تکایە سەرەتا ناوێک دیاری بکە (کلیکی لێ بکە تا شین دەبێت) بۆ ئەوەی بیسڕیتەوە!", "warning"); return; }
    
    customConfirm("ئایا دڵنیایت لە سڕینەوەی ئەم ناوە؟", async () => {
        try {
            await deleteDoc(doc(db, "channels", id));
            loadChannels();
            customAlert("ناوەکە سڕایەوە.", "success");
        } catch(e) { console.error(e); customAlert("هەڵەیەک لە سڕینەوەدا ڕوویدا.", "error"); }
    });
};

// ==========================================
// کردنەوە و پڕکردنەوەی مۆداڵەکانی مێژوو
// ==========================================

window.openGeneralHistory = function() {
    document.getElementById('generalHistoryModal').style.display = 'block';
    loadDonorBalances();
    loadDonorExpensesHistory();
    loadDonationsHistory();
};

window.openSpecificHistory = async function() {
    document.getElementById('specificHistoryModal').style.display = 'block';
    const sel = document.getElementById('specificDonorSelect');
    sel.innerHTML = '<option value="">هەڵبژێرە...</option>';
    document.getElementById('specificTotals').style.display = 'none';
    
    // پاککردنەوەی کارتی وەسڵەکان کاتێک مۆداڵەکە دەکرێتەوە
    const container = document.getElementById('specificReceiptsContainer');
    if (container) container.innerHTML = '';
    
    try {
        const snap = await getDocs(collection(db, "donor_balances"));
        snap.forEach(doc => {
            const name = doc.data().name;
            let opt = document.createElement('option');
            opt.value = name; opt.text = name;
            sel.appendChild(opt);
        });
    } catch(e) { console.error(e); }
};

// ==========================================
// دیزاینی کارتە جوانەکانی وەسڵ بۆ مێژووی تایبەتی
// ==========================================
window.loadSpecificDonorData = async function() {
    const donorName = document.getElementById('specificDonorSelect').value;
    if (!donorName) { document.getElementById('specificTotals').style.display = 'none'; return; }
    
    document.getElementById('specificTotals').style.display = 'flex';
    
    try {
        // هێنانەوەی باڵانسی گشتی
        const docSnap = await getDocs(query(collection(db, "donor_balances"), where("name", "==", donorName)));
        if (!docSnap.empty) {
            const data = docSnap.docs[0].data();
            let htmlIn = "", htmlOut = "", htmlRem = "";
            if(data.totalDonated_USD > 0 || data.spent_USD > 0) {
                htmlIn += `<div>${(data.totalDonated_USD||0).toFixed(2)} $</div>`;
                htmlOut += `<div>${(data.spent_USD||0).toFixed(2)} $</div>`;
                htmlRem += `<div>${(data.remaining_USD||0).toFixed(2)} $</div>`;
            }
            if(data.totalDonated_IQD > 0 || data.spent_IQD > 0) {
                htmlIn += `<div>${(data.totalDonated_IQD||0).toFixed(2)} IQD</div>`;
                htmlOut += `<div>${(data.spent_IQD||0).toFixed(2)} IQD</div>`;
                htmlRem += `<div>${(data.remaining_IQD||0).toFixed(2)} IQD</div>`;
            }
            document.getElementById('specTotalIn').innerHTML = htmlIn || "0";
            document.getElementById('specTotalOut').innerHTML = htmlOut || "0";
            document.getElementById('specRemaining').innerHTML = htmlRem || "0";
        }

        // هێنانەوەی هەموو وەسڵەکان
        const qInc = query(collection(db, "incomes"), where("donorName", "==", donorName));
        const snapInc = await getDocs(qInc);
        let incList = [];
        snapInc.forEach(d => incList.push({ id: d.id, ...d.data() }));
        incList.sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)); 
        
        // هێنانەوەی هەموو خەرجییەکان
        const qExp = query(collection(db, "donor_expenses"), where("donorName", "==", donorName));
        const snapExp = await getDocs(qExp);
        let expensesByIncome = {};
        
        // جیاکردنەوەی خەرجییەکان بەپێی ئایدی وەسڵەکە
        snapExp.forEach(doc => {
            let data = doc.data();
            if (!expensesByIncome[data.incomeId]) expensesByIncome[data.incomeId] = [];
            expensesByIncome[data.incomeId].push(data);
        });

        const container = document.getElementById('specificReceiptsContainer');
        if (!container) return; 
        container.innerHTML = '';

        if (incList.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#999;">هیچ وەسڵێک نەدۆزرایەوە.</p>';
            return;
        }

        // دروستکردنی کارت بۆ هەر وەسڵێک
        incList.forEach(inc => {
            let rem = inc.remainingAmount !== undefined ? inc.remainingAmount : inc.amount;
            let dateStr = inc.timestamp ? inc.timestamp.toDate().toLocaleDateString('ku-IQ') : "نەزانراو";
            let timeStr = inc.timestamp ? inc.timestamp.toDate().toLocaleTimeString('ku-IQ', {hour: '2-digit', minute:'2-digit'}) : "";

            let exps = expensesByIncome[inc.id] || [];
            let expHTML = '';

            if (exps.length === 0) {
                expHTML = '<div style="color:#999; text-align:center; padding:15px; font-size:14px;">تا ئێستا هیچ بڕە پارەیەک لەم وەسڵە خەرج نەکراوە.</div>';
            } else {
                exps.sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
                exps.forEach(ex => {
                    let exDate = ex.timestamp ? ex.timestamp.toDate().toLocaleDateString('ku-IQ') : "";
                    expHTML += `
                    <div class="expense-row">
                        <span style="color:#c0392b; font-weight:bold;" dir="ltr">-${ex.amount.toFixed(2)} ${ex.currency}</span>
                        <span>سەرفکراوە لە: <strong>${ex.projectName}</strong></span>
                        <span style="color:#7f8c8d; font-size:13px;" dir="ltr">${exDate}</span>
                    </div>`;
                });
            }

            let cardHTML = `
            <div class="receipt-card">
                <div class="receipt-header">
                    <div>
                        <strong style="font-size:16px;">وەسڵی بڕی: <span style="color:#27ae60" dir="ltr">${inc.amount.toFixed(2)} ${inc.currency}</span></strong>
                        <div style="font-size:13px; color:#7f8c8d; margin-top:5px;">بەروار: ${dateStr} ${timeStr}</div>
                    </div>
                    <div style="text-align:left;">
                        <strong style="font-size:15px; color:#555;">پارەی ماوە:</strong><br>
                        <span style="color:#f39c12; font-size:18px; font-weight:bold;" dir="ltr">${rem.toFixed(2)} ${inc.currency}</span>
                    </div>
                </div>
                <div class="receipt-body">
                    <div style="background:#f4f6f7; padding:8px 10px; border-radius:4px; font-size:13px; color:#555; margin-bottom:15px;">
                        مەبەستی پارە: <strong>${inc.projectFundName || 'نەزانراو'}</strong> | بەدەستی: <strong>${inc.sourceText || 'نەزانراو'}</strong>
                    </div>
                    <h4 style="margin-top:0; color:#2c3e50; font-size:15px; border-bottom:2px solid #ecf0f1; padding-bottom:8px;">وردەکاری خەرجکردنی ئەم وەسڵە:</h4>
                    ${expHTML}
                </div>
            </div>`;

            container.innerHTML += cardHTML;
        });

    } catch (e) { console.error(e); }
}

async function loadDonorBalances() {
    const tableBody = document.querySelector('#donorBalancesTable tbody');
    const datalist = document.getElementById('vipDonors'); 
    tableBody.innerHTML = ''; datalist.innerHTML = '';
    
    try {
        const snap = await getDocs(collection(db, "donor_balances"));
        snap.forEach(doc => {
            const data = doc.data();
            const option = document.createElement('option');
            option.value = data.name; datalist.appendChild(option);

            if (data.totalDonated_USD > 0 || data.spent_USD > 0) {
                tableBody.innerHTML += `<tr><td><strong>${data.name}</strong></td><td>دۆلار ($)</td><td dir="ltr" style="color: #27ae60;">+${(data.totalDonated_USD||0).toFixed(2)}</td><td dir="ltr" style="color: #c0392b;">-${(data.spent_USD||0).toFixed(2)}</td><td dir="ltr" style="font-weight: bold;">${(data.remaining_USD||0).toFixed(2)}</td></tr>`;
            }
            if (data.totalDonated_IQD > 0 || data.spent_IQD > 0) {
                tableBody.innerHTML += `<tr><td><strong>${data.name}</strong></td><td>دینار (IQD)</td><td dir="ltr" style="color: #27ae60;">+${(data.totalDonated_IQD||0).toFixed(2)}</td><td dir="ltr" style="color: #c0392b;">-${(data.spent_IQD||0).toFixed(2)}</td><td dir="ltr" style="font-weight: bold;">${(data.remaining_IQD||0).toFixed(2)}</td></tr>`;
            }
        });
    } catch (error) { console.error(error); }
}

async function loadDonorExpensesHistory() {
    const tableBody = document.querySelector('#donorExpensesHistoryTable tbody');
    tableBody.innerHTML = '';
    try {
        const q = query(collection(db, "donor_expenses"), orderBy("timestamp", "desc"));
        const snap = await getDocs(q);
        snap.forEach(doc => {
            const data = doc.data();
            let dateStr = data.timestamp ? data.timestamp.toDate().toLocaleDateString('ku-IQ') : "نەزانراو";
            tableBody.innerHTML += `<tr><td><strong>${data.donorName}</strong></td><td dir="ltr" style="color: #c0392b;">-${data.amount.toFixed(2)} ${data.currency}</td><td>${data.projectName}</td><td dir="ltr">${dateStr}</td></tr>`;
        });
    } catch (error) { console.error(error); }
}

async function loadDonationsHistory() {
    const tableBody = document.querySelector('#donationsHistoryTable tbody');
    tableBody.innerHTML = '';
    try {
        const q = query(collection(db, "incomes"), orderBy("timestamp", "desc"));
        const snap = await getDocs(q);
        snap.forEach(doc => {
            const data = doc.data();
            let dateStr = data.timestamp ? data.timestamp.toDate().toLocaleDateString('ku-IQ') : "نەزانراو";
            tableBody.innerHTML += `<tr><td><strong>${data.donorName}</strong></td><td dir="ltr" style="color: #27ae60;">${data.amount} ${data.currency}</td><td>${data.projectFundName || 'سندووقی گشتی'}</td><td>${data.sourceText || 'نەزانراو'}</td><td dir="ltr">${dateStr}</td></tr>`;
        });
    } catch (error) { console.error(error); }
}

window.onload = () => {
    loadGlobalTotals();
    loadCurrencies(); 
    loadProjects();
    loadChannels();
    loadDonorBalances(); 
};

// ==========================================
// ناردنی فۆڕم و دەرکردنی وەسڵ
// ==========================================

document.getElementById('donationForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const donorName = document.getElementById('donorName').value;
    const amount = parseFloat(document.getElementById('amount').value);
    
    const currency = document.getElementById('currencyValue').value;
    const sourceId = document.getElementById('sourceValue').value;
    const sourceText = document.getElementById('sourceTextValue').value;
    const projectFund = document.getElementById('projectValue').value;
    const projectNameForReceipt = document.getElementById('projectNameValue').value;

    if (!currency || !sourceId || !projectFund) {
        customAlert("تکایە دڵنیابە لەوەی 'جۆری دراو'، 'بەدەستی کێ؟' وە 'بۆ کام پڕۆژە'ت دیاری کردووە (کلیکیان لێ بکە تا شین دەبن).", "warning");
        return;
    }

    try {
        const docRef = await addDoc(collection(db, "incomes"), {
            donorName: donorName, amount: amount, currency: currency, 
            remainingAmount: amount, 
            sourceId: sourceId, sourceText: sourceText, 
            projectFundId: projectFund, projectFundName: projectNameForReceipt, 
            timestamp: serverTimestamp(), receiptPrinted: false
        });

        if (projectFund !== 'general') {
            const projectRef = doc(db, "projects", projectFund);
            await updateDoc(projectRef, { collectedAmount: increment(amount) });
        }

        const donorRef = doc(db, "donor_balances", donorName);
        await setDoc(donorRef, {
            name: donorName,
            [`totalDonated_${currency}`]: increment(amount),
            [`remaining_${currency}`]: increment(amount)
        }, { merge: true });

        customAlert("پارەکە بە سەرکەوتوویی تۆمارکرا، ئێستا وەسڵەکە دادەبەزێت...", "success");
        
        await generatePDFReceipt(donorName, amount, currency, projectNameForReceipt, docRef.id);
        
        document.getElementById('donationForm').reset();
        loadCurrencies(); 
        loadProjects(); 
        loadChannels();
        loadGlobalTotals();

    } catch (error) { console.error(error); customAlert("کێشەیەک هەیە لە تۆمارکردندا!", "error"); }
});

async function generatePDFReceipt(name, amount, currency, project, receiptId) {
    const template = document.getElementById('receiptTemplate');
    document.getElementById('recId').innerText = receiptId;
    document.getElementById('recName').innerText = name;
    document.getElementById('recAmount').innerText = `${amount} ${currency}`;
    document.getElementById('recProject').innerText = project;
    document.getElementById('recDate').innerText = new Date().toLocaleDateString('ku-IQ');

    template.style.display = 'block';
    template.style.position = 'absolute';
    template.style.top = '-9999px'; 

    try {
        const canvas = await html2canvas(template, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('landscape', 'mm', 'a5'); 
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
        pdf.save(`Receipt_${name}.pdf`);
    } catch (error) {
        console.error("Error:", error);
    } finally {
        template.style.display = 'none';
        template.style.position = 'static';
    }
}