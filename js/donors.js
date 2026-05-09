import { db, storage } from './firebase-config.js';
import { collection, addDoc, getDocs, doc, setDoc, updateDoc, increment, serverTimestamp, query, where, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

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

let masterDashUnsub = null;
window.openMasterDashboard = function() {
    document.getElementById('masterDashboardModal').style.display = 'block';
    
    const currDiv = document.getElementById('dashTotalCurrency');
    const typeDiv = document.getElementById('dashTotalDonationType');
    const projDiv = document.getElementById('dashTotalProjects');

    currDiv.innerHTML = '<div style="text-align:center; padding:15px; color:#999; width:100%;">چاوەڕوان بە...</div>';
    typeDiv.innerHTML = '';
    projDiv.innerHTML = '';

    if(masterDashUnsub) masterDashUnsub();
    
    masterDashUnsub = onSnapshot(collection(db, "incomes"), (snap) => {
        let totalUSD = 0;
        let totalIQD = 0;
        let byType = {};
        let byProject = {};

        snap.forEach(doc => {
            const data = doc.data();
            const remaining = data.remainingAmount !== undefined ? data.remainingAmount : data.amount;
            
            if (remaining > 0) {
                const cur = data.currency;
                const typeName = data.donationTypeText || 'جۆری نەزانراو';
                const projName = data.projectFundName || 'سندووقی گشتی (بێ مەرج)';

                if (cur === 'USD') totalUSD += remaining;
                else if (cur === 'IQD') totalIQD += remaining;

                if (!byType[typeName]) byType[typeName] = { USD: 0, IQD: 0 };
                byType[typeName][cur] += remaining;

                if (!byProject[projName]) byProject[projName] = { USD: 0, IQD: 0 };
                byProject[projName][cur] += remaining;
            }
        });

        currDiv.innerHTML = `
            <div class="stat-item" style="border-color: #27ae60;">
                <span>کۆی گشتی دۆلار</span>
                <strong style="color: #27ae60;">${totalUSD.toFixed(2)} $</strong>
            </div>
            <div class="stat-item" style="border-color: #2980b9;">
                <span>کۆی گشتی دینار</span>
                <strong style="color: #2980b9;">${totalIQD.toFixed(2)} IQD</strong>
            </div>
        `;

        typeDiv.innerHTML = '';
        if(Object.keys(byType).length === 0) {
            typeDiv.innerHTML = '<div style="text-align:center; padding:15px; color:#999; width:100%;">هیچ پارەیەک نییە.</div>';
        } else {
            for (let type in byType) {
                let html = `<div class="stat-item" style="border-color: #8e44ad;"><span>${type}</span>`;
                if(byType[type].USD > 0) html += `<strong style="display:block; color:#27ae60;">${byType[type].USD.toFixed(2)} $</strong>`;
                if(byType[type].IQD > 0) html += `<strong style="display:block; color:#2980b9;">${byType[type].IQD.toFixed(2)} IQD</strong>`;
                if(byType[type].USD === 0 && byType[type].IQD === 0) html += `<strong>0</strong>`;
                html += `</div>`;
                typeDiv.innerHTML += html;
            }
        }

        projDiv.innerHTML = '';
        if(Object.keys(byProject).length === 0) {
            projDiv.innerHTML = '<div style="text-align:center; padding:15px; color:#999; width:100%;">هیچ پارەیەک نییە.</div>';
        } else {
            for (let proj in byProject) {
                let html = `<div class="stat-item" style="border-color: #f39c12;"><span>${proj}</span>`;
                if(byProject[proj].USD > 0) html += `<strong style="display:block; color:#27ae60;">${byProject[proj].USD.toFixed(2)} $</strong>`;
                if(byProject[proj].IQD > 0) html += `<strong style="display:block; color:#2980b9;">${byProject[proj].IQD.toFixed(2)} IQD</strong>`;
                if(byProject[proj].USD === 0 && byProject[proj].IQD === 0) html += `<strong>0</strong>`;
                html += `</div>`;
                projDiv.innerHTML += html;
            }
        }
    }, (error) => console.error(error));
};

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

async function loadDonationTypes() {
    const container = document.getElementById('donationTypeContainer');
    container.innerHTML = '';
    document.getElementById('donationTypeValue').value = '';
    document.getElementById('donationTypeTextValue').value = '';

    try {
        const snap = await getDocs(collection(db, "donation_types"));
        if (snap.empty) {
            await addDoc(collection(db, "donation_types"), { name: "زەکات" });
            await addDoc(collection(db, "donation_types"), { name: "سەدەقەی گشتی" });
            loadDonationTypes(); 
            return;
        }
        let addedNames = new Set();
        snap.forEach(doc => {
            const name = doc.data().name;
            if (!addedNames.has(name)) {
                addedNames.add(name);
                createRadioItem('donationTypeContainer', 'donationTypeValue', 'donationTypeTextValue', doc.id, name);
            } else {
                deleteDoc(doc.ref);
            }
        });
    } catch (error) { console.error(error); }
}

window.addDonationType = function() {
    document.getElementById('newDonationTypeInput').value = '';
    document.getElementById('addDonationTypeModal').style.display = 'block';
    setTimeout(() => document.getElementById('newDonationTypeInput').focus(), 100);
};

window.submitNewDonationType = async function() {
    const name = document.getElementById('newDonationTypeInput').value.trim();
    if (!name) { customAlert("تکایە ناوی جۆرەکە بنووسە!", "warning"); return; }
    closeModal('addDonationTypeModal');
    try {
        await addDoc(collection(db, "donation_types"), { name: name });
        customAlert("جۆرێکی نوێ بە سەرکەوتوویی زیادکرا!", "success");
        loadDonationTypes();
    } catch(e) { console.error(e); customAlert("کێشەیەک لە زیادکردندا ڕوویدا.", "error"); }
};

window.deleteDonationType = function() {
    const id = document.getElementById('donationTypeValue').value;
    if (!id) { customAlert("تکایە سەرەتا جۆرێک دیاری بکە بۆ ئەوەی بیسڕیتەوە!", "warning"); return; }
    customConfirm("ئایا دڵنیایت لە سڕینەوەی ئەم جۆرە؟", async () => {
        try {
            await deleteDoc(doc(db, "donation_types", id));
            loadDonationTypes();
            customAlert("جۆرەکە سڕایەوە.", "success");
        } catch(e) { console.error(e); customAlert("هەڵەیەک لە سڕینەوەدا ڕوویدا.", "error"); }
    });
};

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
            name: name, estimatedCost: 0, currency: "USD",
            collectedAmount: 0, spentAmount: 0, status: 'active', timestamp: serverTimestamp()
        });
        customAlert("سندووقەکە بە سەرکەوتوویی زیادکرا!", "success");
        loadProjects();
    } catch(e) { console.error(e); customAlert("کێشەیەک لە زیادکردندا ڕوویدا.", "error"); }
};

window.deleteFund = function() {
    const id = document.getElementById('projectValue').value;
    if (!id) { customAlert("تکایە سەرەتا پڕۆژەیەک دیاری بکە بۆ ئەوەی بیسڕیتەوە!", "warning"); return; }
    if (id === 'general') { customAlert("سندووقی گشتی ناسڕێتەوە!", "error"); return; }
    
    customConfirm("دڵنیایت لە سڕینەوەی ئەم سندووقە؟", async () => {
        try {
            await deleteDoc(doc(db, "projects", id));
            loadProjects();
            customAlert("سندووقەکە سڕایەوە.", "success");
        } catch(e) { console.error(e); customAlert("هەڵەیەک لە سڕینەوەدا ڕوویدا.", "error"); }
    });
};

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
        let addedNames = new Set();
        snap.forEach(doc => {
            const name = doc.data().name;
            if (!addedNames.has(name)) {
                addedNames.add(name);
                createRadioItem('sourceContainer', 'sourceValue', 'sourceTextValue', doc.id, name);
            } else {
                deleteDoc(doc.ref);
            }
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
    if (!name) { customAlert("تکایە ناوی کەناڵەکە بنووسە!", "warning"); return; }
    closeModal('addChannelModal');
    try {
        await addDoc(collection(db, "channels"), { name: name });
        customAlert("ناوێکی نوێ بە سەرکەوتوویی زیادکرا!", "success");
        loadChannels();
    } catch(e) { console.error(e); customAlert("کێشەیەک لە زیادکردندا ڕوویدا.", "error"); }
};

window.deleteChannel = function() {
    const id = document.getElementById('sourceValue').value;
    if (!id) { customAlert("تکایە سەرەتا ناوێک دیاری بکە بۆ ئەوەی بیسڕیتەوە!", "warning"); return; }
    customConfirm("ئایا دڵنیایت لە سڕینەوەی ئەم ناوە؟", async () => {
        try {
            await deleteDoc(doc(db, "channels", id));
            loadChannels();
            customAlert("ناوەکە سڕایەوە.", "success");
        } catch(e) { console.error(e); customAlert("هەڵەیەک لە سڕینەوەدا ڕوویدا.", "error"); }
    });
};

window.openGeneralHistory = function() {
    document.getElementById('generalHistoryModal').style.display = 'block';
    window.loadDonorBalances();
    window.loadDonorExpensesHistory();
    window.loadDonationsHistory();
};

window.openSpecificHistory = async function() {
    document.getElementById('specificHistoryModal').style.display = 'block';
    const sel = document.getElementById('specificDonorSelect');
    sel.innerHTML = '<option value="">هەڵبژێرە...</option>';
    document.getElementById('specificTotals').style.display = 'none';
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

window.loadSpecificDonorData = async function() {
    const donorName = document.getElementById('specificDonorSelect').value;
    if (!donorName) { document.getElementById('specificTotals').style.display = 'none'; return; }
    
    document.getElementById('specificTotals').style.display = 'flex';
    
    try {
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

        const qInc = query(collection(db, "incomes"), where("donorName", "==", donorName));
        const snapInc = await getDocs(qInc);
        let incList = [];
        snapInc.forEach(d => incList.push({ id: d.id, ...d.data() }));
        incList.sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)); 
        
        const qExp = query(collection(db, "donor_expenses"), where("donorName", "==", donorName));
        const snapExp = await getDocs(qExp);
        let expensesByIncome = {};
        
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

        incList.forEach(inc => {
            let rem = inc.remainingAmount !== undefined ? inc.remainingAmount : inc.amount;
            let dateStr = inc.timestamp ? inc.timestamp.toDate().toLocaleDateString('ku-IQ') : "نەزانراو";
            let timeStr = inc.timestamp ? inc.timestamp.toDate().toLocaleTimeString('ku-IQ', {hour: '2-digit', minute:'2-digit'}) : "";
            let donationTypeBadge = inc.donationTypeText ? `<span style="background-color: #8e44ad; color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px; margin-right: 10px;">${inc.donationTypeText}</span>` : "";

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

            const expensesJSON = encodeURIComponent(JSON.stringify(exps));

let cardHTML = `
            <div class="receipt-card" style="border: 1px solid #e0e6ed; border-radius: 12px; margin-bottom: 25px; background: #fff; box-shadow: 0 4px 15px rgba(0,0,0,0.05); overflow: hidden;">
                <div class="receipt-header" style="background: linear-gradient(135deg, #f8f9fa 0%, #eef2f5 100%); padding: 20px; border-bottom: 1px solid #e0e6ed; display: flex; justify-content: space-between; align-items: center; border-right: 5px solid #27ae60;">
                    <div>
                        <strong style="font-size:18px; color: #2c3e50;">وەسڵی بڕی: <span style="color:#27ae60" dir="ltr">${inc.amount.toFixed(2)} ${inc.currency}</span> ${donationTypeBadge}</strong>
                        <div style="font-size:14px; color:#7f8c8d; margin-top:8px;">بەروار: ${dateStr} ${timeStr}</div>
                    </div>
                    <div style="text-align:left; display: flex; flex-direction: column; align-items: flex-end; gap: 12px;">
                        <div>
                            <strong style="font-size:14px; color:#555;">باڵانسی ماوە:</strong><br>
                            <span style="color:${rem > 0 ? '#f39c12' : '#e74c3c'}; font-size:20px; font-weight:bold;" dir="ltr">${rem.toFixed(2)} ${inc.currency}</span>
                        </div>
                        <div style="display: flex; gap: 8px; margin-top: 5px;">
                            <button class="action-btn" style="background:#e67e22; padding:8px 15px; font-size:13px; border-radius: 6px; display: flex; align-items: center; gap: 5px; box-shadow: 0 2px 8px rgba(230, 126, 34, 0.3);" 
                                onclick="downloadReceiptPDF('${donorName}', ${inc.amount}, '${inc.currency}', '${inc.donationTypeText || ''}', '${inc.projectFundName || ''}', '${inc.id}', '${expensesJSON}')">
                                <span style="font-size: 16px;">📥</span> داونلۆد
                            </button>
                            <button class="action-btn" style="background:#34495e; padding:8px 15px; font-size:13px; border-radius: 6px; display: flex; align-items: center; gap: 5px; box-shadow: 0 2px 8px rgba(52, 73, 94, 0.3);" 
                                onclick="printReceiptPDF('${donorName}', ${inc.amount}, '${inc.currency}', '${inc.donationTypeText || ''}', '${inc.projectFundName || ''}', '${inc.id}', '${expensesJSON}')">
                                <span style="font-size: 16px;">🖨️</span> چاپکردن
                            </button>
                        </div>
                    </div>
                </div>
                <div class="receipt-body" style="padding: 20px;">
                    <div style="background:#f1f4f6; padding:12px 15px; border-radius:6px; font-size:14px; color:#34495e; margin-bottom:20px; border: 1px dashed #bdc3c7;">
                        مەبەست: <strong style="color: #2980b9;">${inc.projectFundName || 'نەزانراو'}</strong> &nbsp;|&nbsp; سەرچاوە: <strong style="color: #2980b9;">${inc.sourceText || 'نەزانراو'}</strong>
                    </div>
                    <h4 style="margin-top:0; color:#2c3e50; font-size:16px; border-bottom:2px solid #ecf0f1; padding-bottom:8px;">مێژووی سەرفکردن لەم وەسڵە:</h4>
                    <div style="margin-top: 15px;">
                        ${expHTML}
                    </div>
                </div>
            </div>`;

            container.innerHTML += cardHTML;
        });

    } catch (e) { console.error(e); }
}

let balancesUnsub = null;
window.loadDonorBalances = function() {
    if(balancesUnsub) balancesUnsub();
    balancesUnsub = onSnapshot(collection(db, "donor_balances"), (snap) => {
        const tableBody = document.querySelector('#donorBalancesTable tbody');
        const datalist = document.getElementById('vipDonors'); 
        tableBody.innerHTML = ''; datalist.innerHTML = '';
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
    });
}

let expensesHistoryUnsub = null;
window.loadDonorExpensesHistory = function() {
    if(expensesHistoryUnsub) expensesHistoryUnsub();
    const q = query(collection(db, "donor_expenses"), orderBy("timestamp", "desc"));
    expensesHistoryUnsub = onSnapshot(q, (snap) => {
        const tableBody = document.querySelector('#donorExpensesHistoryTable tbody');
        tableBody.innerHTML = '';
        snap.forEach(doc => {
            const data = doc.data();
            let dateStr = data.timestamp ? data.timestamp.toDate().toLocaleDateString('ku-IQ') : "نەزانراو";
            tableBody.innerHTML += `<tr><td><strong>${data.donorName}</strong></td><td dir="ltr" style="color: #c0392b;">-${data.amount.toFixed(2)} ${data.currency}</td><td>${data.projectName}</td><td dir="ltr">${dateStr}</td></tr>`;
        });
    });
}

let donationsHistoryUnsub = null;
window.loadDonationsHistory = function() {
    if(donationsHistoryUnsub) donationsHistoryUnsub();
    const q = query(collection(db, "incomes"), orderBy("timestamp", "desc"));
    donationsHistoryUnsub = onSnapshot(q, (snap) => {
        const tableBody = document.querySelector('#donationsHistoryTable tbody');
        tableBody.innerHTML = '';
        snap.forEach(doc => {
            const data = doc.data();
            let dateStr = data.timestamp ? data.timestamp.toDate().toLocaleDateString('ku-IQ') : "نەزانراو";
            let typeBadge = data.donationTypeText ? `<span style="color: #8e44ad; font-size: 12px; font-weight: bold;">(${data.donationTypeText})</span>` : '';
            tableBody.innerHTML += `<tr><td><strong>${data.donorName}</strong></td><td dir="ltr" style="color: #27ae60;">${data.amount} ${data.currency}</td><td>${typeBadge}</td><td>${data.projectFundName || 'سندووقی گشتی'}</td><td dir="ltr">${dateStr}</td></tr>`;
        });
    });
}

window.onload = () => {
    loadCurrencies(); 
    loadDonationTypes();
    loadProjects();
    loadChannels();
    window.loadDonorBalances(); 
};

document.getElementById('donationForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const donorName = document.getElementById('donorName').value;
    const amount = parseFloat(document.getElementById('amount').value);
    
    const donationTypeId = document.getElementById('donationTypeValue').value;
    const donationTypeText = document.getElementById('donationTypeTextValue').value;
    
    const currency = document.getElementById('currencyValue').value;
    const sourceId = document.getElementById('sourceValue').value;
    const sourceText = document.getElementById('sourceTextValue').value;
    const projectFund = document.getElementById('projectValue').value;
    const projectNameForReceipt = document.getElementById('projectNameValue').value;

    if (!donationTypeId || !currency || !sourceId || !projectFund) {
        customAlert("تکایە دڵنیابە لەوەی 'جۆری پارەکە'، 'جۆری دراو'، 'بەدەستی کێ؟' وە 'بۆ کام پڕۆژە'ت دیاری کردووە (کلیکیان لێ بکە تا شین دەبن).", "warning");
        return;
    }

    try {
        const docRef = await addDoc(collection(db, "incomes"), {
            donorName: donorName, amount: amount, currency: currency, 
            remainingAmount: amount, 
            donationTypeId: donationTypeId, donationTypeText: donationTypeText,
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
        
        await generatePDFReceipt(donorName, amount, currency, donationTypeText, projectNameForReceipt, docRef.id);
        
        document.getElementById('donationForm').reset();

    } catch (error) { console.error(error); customAlert("کێشەیەک هەیە لە تۆمارکردندا!", "error"); }
});

async function generatePDFReceipt(name, amount, currency, donationType, project, receiptId) {
    const template = document.getElementById('receiptTemplate');
    document.getElementById('recId').innerText = receiptId.substring(0, 8).toUpperCase();
    document.getElementById('recName').innerText = name;
    document.getElementById('recAmount').innerText = `${amount} ${currency}`;
    document.getElementById('recDonationType').innerText = donationType;
    document.getElementById('recProject').innerText = project;
    document.getElementById('recDate').innerText = new Date().toLocaleDateString('ku-IQ');

    // ئەم دوو دێڕە خشتەکە دەشارێتەوە کاتێک پارەی نوێ وەردەگریت
    document.getElementById('recSubtitle').innerText = "وەسڵی وەرگرتنی پارە";
    document.getElementById('expenseSectionContainer').style.display = 'none';

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

window.downloadReceiptPDF = async function(name, amount, currency, donationType, project, receiptId, expensesJSON) {
    const template = document.getElementById('receiptTemplate');
    
    // پڕکردنەوەی زانیارییە سەرەکییەکان
    document.getElementById('recId').innerText = receiptId.substring(0, 8).toUpperCase(); 
    document.getElementById('recName').innerText = name;
    document.getElementById('recAmount').innerText = `${amount} ${currency}`;
    document.getElementById('recDonationType').innerText = donationType || 'گشتی';
    document.getElementById('recProject').innerText = project || 'سندووقی گشتی';
    document.getElementById('recDate').innerText = new Date().toLocaleDateString('ku-IQ');

    // پڕکردنەوەی خشتەی خەرجییەکان
    const tbody = document.getElementById('recExpensesBody');
    if (tbody) {
        tbody.innerHTML = '';
        const exps = JSON.parse(decodeURIComponent(expensesJSON));
        
        if (exps.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:20px; color:#7f8c8d; border-bottom: 1px solid #ecf0f1;">بەڕێز، تا ئێستا هیچ بڕە پارەیەک لەم وەسڵەی تۆ خەرج نەکراوە.</td></tr>`;
        } else {
            exps.forEach(ex => {
                let exDate = ex.timestamp ? new Date(ex.timestamp.seconds * 1000).toLocaleDateString('ku-IQ') : "نەزانراو";
                tbody.innerHTML += `
                <tr style="border-bottom: 1px solid #ecf0f1;">
                    <td style="padding: 12px; font-weight: bold; color: #34495e;">${ex.projectName}</td>
                    <td style="padding: 12px; text-align: center; color: #7f8c8d;">${exDate}</td>
                    <td style="padding: 12px; text-align: left; color: #e74c3c; font-weight: bold; direction: ltr;">-${ex.amount.toFixed(2)} ${ex.currency}</td>
                </tr>`;
            });
        }
    }

    // ئەم دوو دێڕە خشتەکە پیشان دەداتەوە کاتێک ڕاپۆرتەکە لە مێژووەوە داونلۆد دەکەیت
    document.getElementById('recSubtitle').innerText = "وەسڵی فەرمی و ڕاپۆرتی خەرجییەکان";
    document.getElementById('expenseSectionContainer').style.display = 'block';

    template.style.display = 'block';
    template.style.position = 'absolute';
    template.style.top = '-9999px'; 

    customAlert("چاوەڕوان بە... خەریکی ئامادەکردنی فایلی PDF ەکەین ⏳", "info");

    try {
        // گۆڕینی بۆ وێنە بە کوالێتی بەرز
        const canvas = await html2canvas(template, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        
        // خستنە ناو PDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4'); 
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
        
        // لێرەدا ڕاستەوخۆ داونلۆدی دەکەین بەناوی مرۆڤدۆستەکەوە
        pdf.save(`Receipt_${name}_${receiptId.substring(0, 5)}.pdf`);
        
        // ئاگادارکردنەوەی سەرکەوتن
        closeModal('customAlertModal');
        customAlert("فایلەکە بە سەرکەوتوویی داونلۆد بوو! ئێستا دەتوانیت خۆت بینێریت بۆ بەڕێزیان.", "success");

    } catch (error) {
        console.error("Error creating PDF:", error);
        customAlert("کێشەیەک ڕوویدا لە دروستکردنی وەسڵەکە.", "error");
    } finally {
        template.style.display = 'none';
        template.style.position = 'static';
    }
};

window.printReceiptPDF = async function(name, amount, currency, donationType, project, receiptId, expensesJSON) {
    const template = document.getElementById('receiptTemplate');
    
    // پڕکردنەوەی زانیارییە سەرەکییەکان
    document.getElementById('recId').innerText = receiptId.substring(0, 8).toUpperCase(); 
    document.getElementById('recName').innerText = name;
    document.getElementById('recAmount').innerText = `${amount} ${currency}`;
    document.getElementById('recDonationType').innerText = donationType || 'گشتی';
    document.getElementById('recProject').innerText = project || 'سندووقی گشتی';
    document.getElementById('recDate').innerText = new Date().toLocaleDateString('ku-IQ');

    // پڕکردنەوەی خشتەی خەرجییەکان
    const tbody = document.getElementById('recExpensesBody');
    if (tbody) {
        tbody.innerHTML = '';
        const exps = JSON.parse(decodeURIComponent(expensesJSON));
        
        if (exps.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:20px; color:#7f8c8d; border-bottom: 1px solid #ecf0f1;">بەڕێز، تا ئێستا هیچ بڕە پارەیەک لەم وەسڵەی تۆ خەرج نەکراوە.</td></tr>`;
        } else {
            exps.forEach(ex => {
                let exDate = ex.timestamp ? new Date(ex.timestamp.seconds * 1000).toLocaleDateString('ku-IQ') : "نەزانراو";
                tbody.innerHTML += `
                <tr style="border-bottom: 1px solid #ecf0f1;">
                    <td style="padding: 12px; font-weight: bold; color: #34495e;">${ex.projectName}</td>
                    <td style="padding: 12px; text-align: center; color: #7f8c8d;">${exDate}</td>
                    <td style="padding: 12px; text-align: left; color: #e74c3c; font-weight: bold; direction: ltr;">-${ex.amount.toFixed(2)} ${ex.currency}</td>
                </tr>`;
            });
        }
    }

// ئەم دوو دێڕە خشتەکە پیشان دەداتەوە کاتێک ڕاپۆرتەکە لە مێژووەوە چاپ دەکەیت
    document.getElementById('recSubtitle').innerText = "وەسڵی فەرمی و ڕاپۆرتی خەرجییەکان";
    document.getElementById('expenseSectionContainer').style.display = 'block';

    template.style.display = 'block';
    template.style.position = 'absolute';
    template.style.top = '-9999px'; 

    customAlert("چاوەڕوان بە... خەریکی ئامادەکردنی فایلی PDF ەکەین بۆ چاپکردن ⏳", "info");

    try {
        // گۆڕینی بۆ وێنە بە کوالێتی بەرز
        const canvas = await html2canvas(template, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        
        // خستنە ناو PDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4'); 
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
        
        // جیاوازییەکە لێرەدایە: فەرمانی چاپکردن دەدەین و لە تابی نوێ دەیکەینەوە
        pdf.autoPrint();
        const blobURL = pdf.output('bloburl');
        window.open(blobURL, '_blank');
        
        closeModal('customAlertModal');

    } catch (error) {
        console.error("Error printing PDF:", error);
        customAlert("کێشەیەک ڕوویدا لە کاتی ئامادەکردنی وەسڵەکە بۆ چاپ.", "error");
    } finally {
        template.style.display = 'none';
        template.style.position = 'static';
    }
};