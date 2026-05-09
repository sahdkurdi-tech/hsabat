import { db, storage } from './firebase-config.js';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, serverTimestamp, query, orderBy, where, increment, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

let currentPersonActiveAdvances = [];

window.customAlert = function(message, type = "success") {
    const titleEl = document.getElementById('alertTitle');
    const iconEl = document.getElementById('alertIcon');
    const borderEl = document.getElementById('alertModalBorder');
    document.getElementById('alertMessage').innerText = message;
    if (type === "success") { titleEl.innerText = "سەرکەوتوو بوو"; titleEl.style.color = "#27ae60"; iconEl.innerText = "✅"; borderEl.style.borderTop = "5px solid #27ae60"; } 
    else if (type === "error") { titleEl.innerText = "هەڵەیەک ڕوویدا"; titleEl.style.color = "#e74c3c"; iconEl.innerText = "❌"; borderEl.style.borderTop = "5px solid #e74c3c"; } 
    else { titleEl.innerText = "تێبینی"; titleEl.style.color = "#f39c12"; iconEl.innerText = "⚠️"; borderEl.style.borderTop = "5px solid #f39c12"; }
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

async function loadCommittees() {
    const container = document.getElementById('committeeContainer');
    container.innerHTML = ''; document.getElementById('committeeValue').value = ''; document.getElementById('committeeTextValue').value = '';
    try {
        const snap = await getDocs(collection(db, "committees"));
        if (snap.empty) { container.innerHTML = '<span style="color:#999; font-size:14px;">تکایە ناوێک زیاد بکە.</span>'; return; }
        let addedNames = new Set();
        snap.forEach(doc => {
            const name = doc.data().name;
            if (!addedNames.has(name)) { addedNames.add(name); createRadioItem('committeeContainer', 'committeeValue', 'committeeTextValue', doc.id, name); } 
            else { deleteDoc(doc.ref); }
        });
    } catch (error) { console.error(error); }
}

window.addCommittee = function() {
    document.getElementById('newCommitteeInput').value = ''; document.getElementById('addCommitteeModal').style.display = 'block';
    setTimeout(() => document.getElementById('newCommitteeInput').focus(), 100);
};
window.submitNewCommittee = async function() {
    const name = document.getElementById('newCommitteeInput').value.trim();
    if (!name) return; closeModal('addCommitteeModal');
    await addDoc(collection(db, "committees"), { name: name }); loadCommittees();
};
window.deleteCommittee = async function() {
    const id = document.getElementById('committeeValue').value;
    if (!id) { customAlert("ناوێک دیاری بکە!", "warning"); return; }
    customConfirm("ئایا دڵنیایت؟", async () => { await deleteDoc(doc(db, "committees", id)); loadCommittees(); });
};

async function loadSources() {
    const container = document.getElementById('sourceContainer');
    container.innerHTML = ''; document.getElementById('sourceValue').value = ''; document.getElementById('sourceTextValue').value = '';
    try {
        const snap = await getDocs(collection(db, "advance_sources"));
        if (snap.empty) { container.innerHTML = '<span style="color:#999; font-size:14px;">تکایە سەرچاوەیەک زیاد بکە.</span>'; return; }
        let addedNames = new Set();
        snap.forEach(doc => {
            const name = doc.data().name;
            if (!addedNames.has(name)) { addedNames.add(name); createRadioItem('sourceContainer', 'sourceValue', 'sourceTextValue', doc.id, name); } 
            else { deleteDoc(doc.ref); }
        });
    } catch (error) { console.error(error); }
}

window.addSource = function() {
    document.getElementById('newSourceInput').value = ''; document.getElementById('addSourceModal').style.display = 'block';
    setTimeout(() => document.getElementById('newSourceInput').focus(), 100);
};
window.submitNewSource = async function() {
    const name = document.getElementById('newSourceInput').value.trim();
    if (!name) return; closeModal('addSourceModal');
    await addDoc(collection(db, "advance_sources"), { name: name }); loadSources();
};
window.deleteSource = async function() {
    const id = document.getElementById('sourceValue').value;
    if (!id) { customAlert("سەرچاوەیەک دیاری بکە!", "warning"); return; }
    customConfirm("ئایا دڵنیایت؟", async () => { await deleteDoc(doc(db, "advance_sources", id)); loadSources(); });
};

async function loadPurposes() {
    const container = document.getElementById('purposeContainer');
    container.innerHTML = ''; document.getElementById('purposeValue').value = ''; document.getElementById('purposeTextValue').value = '';
    try {
        const snap = await getDocs(collection(db, "advance_purposes"));
        if (snap.empty) { container.innerHTML = '<span style="color:#999; font-size:14px;">تکایە مەبەستێک زیاد بکە.</span>'; return; }
        let addedNames = new Set();
        snap.forEach(doc => {
            const name = doc.data().name;
            if (!addedNames.has(name)) { addedNames.add(name); createRadioItem('purposeContainer', 'purposeValue', 'purposeTextValue', doc.id, name); } 
            else { deleteDoc(doc.ref); }
        });
    } catch (error) { console.error(error); }
}

window.addPurpose = function() {
    document.getElementById('newPurposeInput').value = ''; document.getElementById('addPurposeModal').style.display = 'block';
    setTimeout(() => document.getElementById('newPurposeInput').focus(), 100);
};
window.submitNewPurpose = async function() {
    const name = document.getElementById('newPurposeInput').value.trim();
    if (!name) return; closeModal('addPurposeModal');
    await addDoc(collection(db, "advance_purposes"), { name: name }); loadPurposes();
};
window.deletePurpose = async function() {
    const id = document.getElementById('purposeValue').value;
    if (!id) { customAlert("مەبەستێک دیاری بکە!", "warning"); return; }
    customConfirm("ئایا دڵنیایت؟", async () => { await deleteDoc(doc(db, "advance_purposes", id)); loadPurposes(); });
};

let advancesUnsub = null;
window.loadAdvances = function() {
    if(advancesUnsub) advancesUnsub();
    const q = query(collection(db, "advances"), orderBy("timestamp", "desc"));
    
    advancesUnsub = onSnapshot(q, (querySnapshot) => {
        const personSelect = document.getElementById('settlementPersonSelect');
        const tableBody = document.querySelector('#advancesTable tbody');
        
        if (personSelect) personSelect.innerHTML = '<option value="">تکایە سەرەتا کەسێک هەڵبژێرە...</option>';
        if (tableBody) tableBody.innerHTML = '';

        let activePersons = new Set();

        querySnapshot.forEach((documentSnapshot) => {
            const data = documentSnapshot.data();
            let statusBadge = data.remainingBalance > 0 ? '<span class="locked">کراوەیە</span>' : '<span class="open">پاکتاوکراوە</span>';
            const row = `<tr>
                <td><strong>${data.committeeName}</strong></td>
                <td>${data.purposeName || 'نەزانراو'}</td>
                <td dir="ltr">${data.totalAmount} ${data.currency}</td>
                <td dir="ltr" style="color: #c0392b; font-weight: bold;">${data.remainingBalance.toFixed(2)} ${data.currency}</td>
                <td>${statusBadge}</td>
            </tr>`;
            if (tableBody) tableBody.innerHTML += row;

            if (data.remainingBalance > 0 && data.committeeName) activePersons.add(data.committeeName);
        });

        if (personSelect) {
            activePersons.forEach(name => {
                const option = document.createElement("option"); option.value = name; option.text = name; personSelect.appendChild(option);
            });
        }
    });
};

window.loadPersonPurposes = async function() {
    const personName = document.getElementById('settlementPersonSelect').value;
    const purposeSection = document.getElementById('purposeSelectionSection');
    const purposeSelect = document.getElementById('activePurposeSelect');
    const advanceSection = document.getElementById('specificAdvanceSection');
    const activeAdvancesSelect = document.getElementById('activeAdvances');

    purposeSelect.innerHTML = '<option value="">تکایە مەبەستێک هەڵبژێرە...</option>';
    activeAdvancesSelect.innerHTML = '<option value="">تکایە سلفەیەک هەڵبژێرە...</option>';

    if (!personName) {
        purposeSection.style.display = 'none'; advanceSection.style.display = 'none';
        purposeSelect.required = false; activeAdvancesSelect.required = false;
        window.checkCurrencyMatch();
        return;
    }

    purposeSection.style.display = 'block'; purposeSelect.required = true;
    advanceSection.style.display = 'none'; activeAdvancesSelect.required = false;

    try {
        const qAdv = query(collection(db, "advances"), where("committeeName", "==", personName));
        const snapAdv = await getDocs(qAdv);

        currentPersonActiveAdvances = [];
        let uniquePurposes = new Set();

        snapAdv.forEach(d => {
            let data = { id: d.id, ...d.data() };
            if (data.remainingBalance > 0) {
                currentPersonActiveAdvances.push(data);
                uniquePurposes.add(data.purposeName || 'نەزانراو');
            }
        });

        if (uniquePurposes.size === 0) {
            purposeSelect.innerHTML = '<option value="">هیچ سلفەیەکی کراوە نەدۆزرایەوە!</option>';
        } else {
            uniquePurposes.forEach(purpose => {
                const option = document.createElement("option");
                option.value = purpose; option.text = purpose;
                purposeSelect.appendChild(option);
            });
        }
    } catch (error) { console.error(error); }
};

window.loadSpecificAdvancesByPurpose = function() {
    const selectedPurpose = document.getElementById('activePurposeSelect').value;
    const advanceSection = document.getElementById('specificAdvanceSection');
    const activeAdvancesSelect = document.getElementById('activeAdvances');

    activeAdvancesSelect.innerHTML = '<option value="">تکایە سلفەیەک هەڵبژێرە...</option>';

    if (!selectedPurpose) {
        advanceSection.style.display = 'none'; activeAdvancesSelect.required = false; window.checkCurrencyMatch(); return;
    }

    advanceSection.style.display = 'block'; activeAdvancesSelect.required = true;

    const filteredAdvances = currentPersonActiveAdvances.filter(adv => (adv.purposeName || 'نەزانراو') === selectedPurpose);

    filteredAdvances.forEach(data => {
        const option = document.createElement("option");
        option.value = data.id;
        option.dataset.currency = data.currency;
        option.text = `سلفەی ماوە: ${data.remainingBalance.toFixed(2)} ${data.currency}`;
        activeAdvancesSelect.appendChild(option);
    });

    window.checkCurrencyMatch();
};

let settlementsUnsub = null;
window.loadSettlementHistory = function() {
    if(settlementsUnsub) settlementsUnsub();
    const q = query(collection(db, "settlements"), orderBy("timestamp", "desc"));
    settlementsUnsub = onSnapshot(q, (querySnapshot) => {
        const tableBody = document.querySelector('#settlementHistoryTable tbody'); 
        if (tableBody) tableBody.innerHTML = '';
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            let dateStr = data.timestamp ? data.timestamp.toDate().toLocaleDateString('ku-IQ') : "نەزانراو";
            let imgBtn = data.imageUrl ? `<a href="${data.imageUrl}" target="_blank" class="action-btn" style="padding: 5px 10px; font-size: 12px; text-decoration: none;">بینین</a>` : '<span style="color:#999; font-size:12px;">وێنەی نییە</span>';

            const row = `<tr>
                <td><strong>${data.committeeName || 'نەزانراو'}</strong></td>
                <td>${data.description || 'تۆمار نەکراوە'}</td>
                <td dir="ltr">${data.amount} ${data.currency}</td>
                <td dir="ltr" style="color: #27ae60; font-weight: bold;">${data.deductedBalance.toFixed(2)} ${data.advanceCurrency || ''}</td>
                <td dir="ltr">${dateStr}</td>
                <td>${imgBtn}</td>
            </tr>`;
            if (tableBody) tableBody.innerHTML += row;
        });
    });
};

window.onload = () => { loadCommittees(); loadSources(); loadPurposes(); window.loadAdvances(); window.loadSettlementHistory(); };

window.checkCurrencyMatch = function() {
    const advanceSelect = document.getElementById('activeAdvances');
    const receiptCurrency = document.getElementById('receiptCurrency').value;
    const exchangeRateDiv = document.getElementById('exchangeRateDiv');
    const exchangeRateInput = document.getElementById('exchangeRate');

    if (advanceSelect.selectedIndex <= 0) { exchangeRateDiv.style.display = 'none'; exchangeRateInput.required = false; return; }
    const advanceCurrency = advanceSelect.options[advanceSelect.selectedIndex].dataset.currency;

    if (advanceCurrency && advanceCurrency !== receiptCurrency) {
        exchangeRateDiv.style.display = 'block'; exchangeRateInput.required = true;
        if (receiptCurrency === 'USD' && advanceCurrency === 'IQD') document.getElementById('exchangeRateLabel').innerText = "نرخی گۆڕینەوە (١٠٠ دۆلار = چەند دینارە؟):";
        else if (receiptCurrency === 'IQD' && advanceCurrency === 'USD') document.getElementById('exchangeRateLabel').innerText = "نرخی گۆڕینەوە (١٠٠ دۆلار = چەند دینارە؟):";
    } else {
        exchangeRateDiv.style.display = 'none'; exchangeRateInput.required = false; exchangeRateInput.value = '';
    }
};

window.openGeneralHistory = function() {
    document.getElementById('generalHistoryModal').style.display = 'block';
    window.loadAdvances(); window.loadSettlementHistory();
};

window.openSpecificHistory = async function() {
    document.getElementById('specificHistoryModal').style.display = 'block';
    const sel = document.getElementById('specificAdvanceSelect');
    sel.innerHTML = '<option value="">تکایە ناوێک هەڵبژێرە...</option>';
    document.getElementById('purposeTabsContainer').innerHTML = '';
    document.getElementById('specAdvancesContainer').innerHTML = '';
    
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
            option.value = name; option.text = name; sel.appendChild(option);
        });
    } catch(e) { console.error(e); }
};

window.loadSpecificAdvanceData = async function() {
    const personName = document.getElementById('specificAdvanceSelect').value;
    const tabsContainer = document.getElementById('purposeTabsContainer');
    const container = document.getElementById('specAdvancesContainer');
    
    tabsContainer.innerHTML = '';
    if (!personName) { container.innerHTML = ''; return; }
    
    container.innerHTML = '<p style="text-align:center;">چاوەڕوان بە...</p>';
    
    try {
        const qAdvances = query(collection(db, "advances"), where("committeeName", "==", personName));
        const advSnap = await getDocs(qAdvances);
        let advances = [];
        advSnap.forEach(d => advances.push({id: d.id, ...d.data()}));
        advances.sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

        const qSettlements = query(collection(db, "settlements"), where("committeeName", "==", personName));
        const setSnap = await getDocs(qSettlements);
        let settlements = {};
        setSnap.forEach(d => {
            let data = d.data();
            if(!settlements[data.advanceId]) settlements[data.advanceId] = [];
            settlements[data.advanceId].push(data);
        });

        if(advances.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#999;">هیچ سلفەیەک بۆ ئەم کەسە نەدۆزرایەوە.</p>';
            return;
        }

        let uniquePurposes = new Set();
        advances.forEach(adv => uniquePurposes.add(adv.purposeName || 'نەزانراو'));

        container.innerHTML = '<p style="text-align:center; color:#7f8c8d; font-size: 15px; margin-top:20px;">تکایە مەبەستێک لە سەرەوە هەڵبژێرە بۆ بینینی وەسڵەکانی...</p>';

        uniquePurposes.forEach(purpose => {
            let btn = document.createElement('button');
            btn.className = 'action-btn';
            btn.style.backgroundColor = '#95a5a6';
            btn.style.flex = '1';
            btn.style.minWidth = '120px';
            btn.innerText = purpose;
            
            btn.onclick = () => {
                Array.from(tabsContainer.children).forEach(b => b.style.backgroundColor = '#95a5a6');
                btn.style.backgroundColor = '#2c3e50';
                renderPurposeCards(purpose, advances, settlements, container);
            };
            tabsContainer.appendChild(btn);
        });

    } catch (e) { console.error(e); }
};

function renderPurposeCards(selectedPurpose, allAdvances, settlements, container) {
    container.innerHTML = '';
    let filteredAdvs = allAdvances.filter(a => (a.purposeName || 'نەزانراو') === selectedPurpose);

    filteredAdvs.forEach(adv => {
        let sets = settlements[adv.id] || [];
        sets.sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

        let setRows = '';
        sets.forEach(s => {
            let sDate = s.timestamp ? s.timestamp.toDate().toLocaleDateString('ku-IQ') : '';
            let imgBtn = s.imageUrl ? `<a href="${s.imageUrl}" target="_blank" style="color:#3498db; text-decoration:none; font-weight:bold;">بینین</a>` : '<span style="color:#999;">نییە</span>';
            setRows += `
            <tr style="border-bottom: 1px dashed #eee;">
                <td style="padding: 10px;">${s.description}</td>
                <td dir="ltr" style="color:#e74c3c; padding: 10px;">${s.amount} ${s.currency}</td>
                <td dir="ltr" style="color:#27ae60; font-weight:bold; padding: 10px;">${s.deductedBalance.toFixed(2)} ${s.advanceCurrency}</td>
                <td dir="ltr" style="padding: 10px;">${sDate}</td>
                <td style="padding: 10px;">${imgBtn}</td>
            </tr>`;
        });

        if(sets.length === 0) setRows = `<tr><td colspan="5" style="text-align:center; color:#999; padding:15px;">تا ئێستا هیچ وەسڵێک بۆ ئەم سلفەیە نەگەڕاوەتەوە.</td></tr>`;

        let advDate = adv.timestamp ? adv.timestamp.toDate().toLocaleDateString('ku-IQ') : 'نەزانراو';

        let card = `
        <div style="margin-bottom: 25px; border: 1px solid #dcdde1; border-radius: 8px; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
            <div style="background: #f8f9fa; padding: 15px 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; border-right: 4px solid #8e44ad; border-radius: 8px 8px 0 0;">
                <div>
                    <strong style="font-size:16px;">بڕی سلفە: <span style="color:#2980b9" dir="ltr">${adv.totalAmount} ${adv.currency}</span></strong>
                    <div style="font-size:13px; color:#7f8c8d; margin-top:5px; line-height: 1.6;">
                        مەبەست: <strong style="color:#34495e;">${adv.purposeName || 'نەزانراو'}</strong><br>
                        لەکێی وەرگرتووە: <strong style="color:#34495e;">${adv.sourceName || adv.givenBy || 'نەزانراو'}</strong>
                    </div>
                    <div style="font-size:13px; color:#95a5a6; margin-top:5px;">کۆتا بەروار: ${advDate}</div>
                </div>
                <div style="text-align:left;">
                    <strong style="font-size:15px; color:#555;">پارەی ماوە:</strong><br>
                    <span style="color:${adv.remainingBalance > 0 ? '#e74c3c' : '#27ae60'}; font-size:18px; font-weight:bold;" dir="ltr">${adv.remainingBalance.toFixed(2)} ${adv.currency}</span>
                </div>
            </div>
            <div style="padding: 15px 20px;">
                <h4 style="margin-top:0; color:#2c3e50; font-size:15px; border-bottom:2px solid #ecf0f1; padding-bottom:8px;">وەسڵە گەڕاوەکان:</h4>
                <div style="overflow-x: auto;">
                    <table style="width:100%; border-collapse:collapse; margin-top:10px; font-size: 14px;">
                        <thead>
                            <tr style="background:#f4f6f7; color:#333;">
                                <th style="padding: 10px; text-align: right;">هۆکاری خەرجی</th>
                                <th style="padding: 10px; text-align: right;">بڕی وەسڵ</th>
                                <th style="padding: 10px; text-align: right;">بڕی بڕدراو</th>
                                <th style="padding: 10px; text-align: right;">بەروار</th>
                                <th style="padding: 10px; text-align: right;">وێنە</th>
                            </tr>
                        </thead>
                        <tbody>${setRows}</tbody>
                    </table>
                </div>
            </div>
        </div>`;
        container.innerHTML += card;
    });
}

document.getElementById('advanceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const committeeId = document.getElementById('committeeValue').value;
    const name = document.getElementById('committeeTextValue').value;
    const sourceId = document.getElementById('sourceValue').value;
    const sourceName = document.getElementById('sourceTextValue').value;
    const purposeId = document.getElementById('purposeValue').value;
    const purposeName = document.getElementById('purposeTextValue').value;
    const amount = parseFloat(document.getElementById('advanceAmount').value);
    const currency = document.getElementById('advanceCurrency').value;

    if (!committeeId || !sourceId || !purposeId) { customAlert("تکایە ناوی لیژنە، سەرچاوە، وە مەبەست دیاری بکە (شین بن)!", "warning"); return; }

    try {
        const qAdvances = query(collection(db, "advances"), where("committeeName", "==", name));
        const advSnap = await getDocs(qAdvances);
        let existingAdvanceId = null;
        
        advSnap.forEach(docSnap => {
            const data = docSnap.data();
            if (data.purposeName === purposeName && data.currency === currency) existingAdvanceId = docSnap.id;
        });

        if (existingAdvanceId) {
            const advRef = doc(db, "advances", existingAdvanceId);
            await updateDoc(advRef, { totalAmount: increment(amount), remainingBalance: increment(amount), sourceName: sourceName, timestamp: serverTimestamp() });
            customAlert("پارەکە بە سەرکەوتوویی خرایە سەر هەمان کەیسی پێشوو!", "success");
        } else {
            await addDoc(collection(db, "advances"), { committeeName: name, sourceName: sourceName, purposeName: purposeName, totalAmount: amount, remainingBalance: amount, currency: currency, status: 'active', timestamp: serverTimestamp() });
            customAlert("سلفەی نوێ بە سەرکەوتوویی درا بە لیژنەکە!", "success");
        }
        document.getElementById('advanceForm').reset(); document.getElementById('committeeValue').value = ''; document.getElementById('sourceValue').value = ''; document.getElementById('purposeValue').value = '';
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
            if (advanceData.currency === 'USD' && receiptCurrency === 'IQD') amountToDeduct = receiptAmount / (exchangeRate / 100);
            else if (advanceData.currency === 'IQD' && receiptCurrency === 'USD') amountToDeduct = receiptAmount * (exchangeRate / 100);
        }

        let downloadURL = "";
        if (fileInput) {
            const storageRef = ref(storage, `receipts/${Date.now()}_${fileInput.name}`);
            await uploadBytes(storageRef, fileInput);
            downloadURL = await getDownloadURL(storageRef);
        }

        await addDoc(collection(db, "settlements"), { advanceId: advanceId, committeeName: advanceData.committeeName, description: receiptDescription, amount: receiptAmount, currency: receiptCurrency, advanceCurrency: advanceData.currency, exchangeRate: exchangeRate, deductedBalance: amountToDeduct, imageUrl: downloadURL, timestamp: serverTimestamp() });

        const newBalance = advanceData.remainingBalance - amountToDeduct;
        await updateDoc(advanceRef, { remainingBalance: newBalance > 0 ? newBalance : 0 });

        customAlert(`وەسڵەکە پاکتاو کرا!\nبڕی ${amountToDeduct.toFixed(2)} ${advanceData.currency} لە سلفەکە کەمکرایەوە.`, "success");
        document.getElementById('settlementForm').reset(); document.getElementById('specificAdvanceSection').style.display = 'none'; document.getElementById('exchangeRateDiv').style.display = 'none';
        document.getElementById('purposeSelectionSection').style.display = 'none';
    } catch (error) { console.error("Error:", error); customAlert("کێشەیەک ڕوویدا لە کاتی پاکتاوکردن!", "error"); }
});