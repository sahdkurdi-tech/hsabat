import { db, auth } from './firebase-config.js';
import { collection, addDoc, getDocs, doc, setDoc, updateDoc, increment, serverTimestamp, query, where, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

let loadedProjects = {}; 
let projectsUnsub = null;
let projectDonorsUnsub = null;

document.getElementById('projectForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('projectName').value;
    const cost = parseFloat(document.getElementById('estimatedCost').value);
    const currency = document.getElementById('projectCurrency').value;

    try {
        await addDoc(collection(db, "projects"), {
            name: name, estimatedCost: cost, currency: currency,
            collectedAmount: 0, spentAmount: 0, status: 'active', timestamp: serverTimestamp()
        });
        alert("دۆسیەی پڕۆژەکە بە سەرکەوتوویی کرایەوە!");
        document.getElementById('projectForm').reset();
    } catch (error) { console.error(error); }
});

window.loadProjects = function() {
    const tableBody = document.querySelector('#projectsTable tbody');
    const completedTableBody = document.querySelector('#completedProjectsTable tbody');
    const spendSelect = document.getElementById('spendProjectId');
    
    if(projectsUnsub) projectsUnsub();
    projectsUnsub = onSnapshot(collection(db, "projects"), (querySnapshot) => {
        tableBody.innerHTML = ''; completedTableBody.innerHTML = '';
        spendSelect.innerHTML = '<option value="">تکایە پڕۆژەیەک هەڵبژێرە...</option>';
        loadedProjects = {}; 

        querySnapshot.forEach((documentSnapshot) => {
            const data = documentSnapshot.data();
            const id = documentSnapshot.id;
            loadedProjects[id] = data.currency;

            if (data.status === 'completed') {
                let dateStr = data.completedAt ? data.completedAt.toDate().toLocaleDateString('ku-IQ') : "نەزانراو";
                completedTableBody.innerHTML += `<tr><td>${data.name}</td><td dir="ltr">${data.spentAmount.toFixed(2)} ${data.currency}</td><td dir="ltr">${dateStr}</td><td><button class="btn-history" onclick="viewProjectHistory('${id}', '${data.name}')">مێژووی تەواو</button></td></tr>`;
            } else {
                const availableBalance = data.collectedAmount - data.spentAmount; 
                let fundStatus = availableBalance <= 0 && data.collectedAmount > 0 ? '<span class="locked">قوفڵ دراوە (سفرە)</span>' : (availableBalance > 0 ? '<span class="open">پارەی تێدایە</span>' : 'چاوەڕوانی مرۆڤدۆست...');
                
                const remainingToComplete = data.estimatedCost - data.spentAmount;
                let remainingText = remainingToComplete > 0 ? `<span style="color: #d35400; font-weight:bold;">${remainingToComplete.toFixed(2)} ${data.currency}</span>` : `<span style="color: #27ae60; font-weight:bold;">ئامانج پێکا</span>`;

                tableBody.innerHTML += `
                    <tr>
                        <td>${data.name} <br> <small>(${data.estimatedCost} ${data.currency})</small></td>
                        <td dir="ltr" style="color:#27ae60;">+${data.collectedAmount.toFixed(2)} ${data.currency}</td>
                        <td dir="ltr" style="color:#c0392b;">-${data.spentAmount.toFixed(2)} ${data.currency}</td>
                        <td dir="ltr">${remainingText}</td>
                        <td dir="ltr"><strong>${availableBalance.toFixed(2)} ${data.currency}</strong></td>
                        <td>${fundStatus}</td>
                        <td>
                            <button class="btn-history" onclick="viewProjectHistory('${id}', '${data.name}')">مێژوو</button>
                            <button class="btn-complete" onclick="markAsCompleted('${id}')">تەواوبوو</button>
                        </td>
                    </tr>
                `;
                const option = document.createElement("option");
                option.value = id;
                option.text = `${data.name} - دراو: ${data.currency} (بەردەست: ${availableBalance.toFixed(2)})`;
                spendSelect.appendChild(option);
            }
        });
    }, (error) => console.error(error));
};

window.loadProjectDonors = function() {
    const donorSelect = document.getElementById('spendDonorName');
    
    if(projectDonorsUnsub) projectDonorsUnsub();
    projectDonorsUnsub = onSnapshot(collection(db, "incomes"), (snap) => {
        donorSelect.innerHTML = '<option value="">چاوەڕوان بە...</option>';
        donorSelect.innerHTML = '<option value="general|same|none">پارەی گشتی سندووقەکە</option>';
        
        snap.forEach((doc) => {
            const data = doc.data();
            let rem = data.remainingAmount !== undefined ? data.remainingAmount : data.amount;
            
            if (rem > 0) {
                const option = document.createElement("option");
                let dateStr = data.timestamp ? data.timestamp.toDate().toLocaleDateString('ku-IQ') : "";
                
                option.value = `${data.donorName}|${data.currency}|${doc.id}`;
                option.dataset.currency = data.currency;
                
                option.text = `${data.donorName} - ماوە: ${rem.toFixed(2)} ${data.currency} (وەسڵی: ${dateStr})`;
                donorSelect.appendChild(option);
            }
        });
        checkProjectCurrency(); 
    }, (error) => console.error(error));
};

onAuthStateChanged(auth, (user) => {
    if (user) {
        window.loadProjects(); 
        window.loadProjectDonors();
    } else {
        window.location.href = "login.html";
    }
});

window.checkProjectCurrency = function() {
    const projectId = document.getElementById('spendProjectId').value;
    const spendCurrency = document.getElementById('spendCurrency').value;
    const donorSelect = document.getElementById('spendDonorName');
    
    let donorCurrency = spendCurrency;
    if(donorSelect.selectedIndex > 0 && donorSelect.value !== 'general|same|none') {
        donorCurrency = donorSelect.options[donorSelect.selectedIndex].dataset.currency;
    }

    const projectCurrency = projectId ? loadedProjects[projectId] : null;
    const exchangeDiv = document.getElementById('projectExchangeRateDiv');

    if (projectCurrency && (projectCurrency !== spendCurrency || donorCurrency !== spendCurrency || projectCurrency !== donorCurrency)) {
        exchangeDiv.style.display = 'block';
        document.getElementById('projectExchangeRate').required = true;
    } else {
        exchangeDiv.style.display = 'none';
        document.getElementById('projectExchangeRate').required = false;
    }
};

const convertCurrency = (amount, fromCur, toCur, rate) => {
    if (fromCur === toCur) return amount;
    if (fromCur === 'USD' && toCur === 'IQD') return amount * (rate / 100);
    if (fromCur === 'IQD' && toCur === 'USD') return amount / (rate / 100);
    return amount;
};

document.getElementById('spendProjectForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const projectSelect = document.getElementById('spendProjectId');
    const projectId = projectSelect.value;
    const projectNameFull = projectSelect.options[projectSelect.selectedIndex].text;
    const projectName = projectNameFull.split(' - ')[0]; 
    
    const spendAmount = parseFloat(document.getElementById('spendAmount').value);
    const spendCurrency = document.getElementById('spendCurrency').value;
    const exchangeRate = parseFloat(document.getElementById('projectExchangeRate').value) || 1;
    
    const donorValue = document.getElementById('spendDonorName').value;
    
    let spendDonorName = "پارەی گشتی سندووقەکە";
    let donorCurrency = loadedProjects[projectId]; 
    let incomeId = "none";

    if (donorValue && donorValue !== "general|same|none") {
        const parts = donorValue.split('|');
        spendDonorName = parts[0];
        donorCurrency = parts[1]; 
        incomeId = parts[2]; 
    }

    if (!projectId) { alert("تکایە پڕۆژەیەک هەڵبژێرە!"); return; }

    try {
        const projectCurrency = loadedProjects[projectId];
        const finalAmountForProject = convertCurrency(spendAmount, spendCurrency, projectCurrency, exchangeRate);
        const finalAmountForDonor = convertCurrency(spendAmount, spendCurrency, donorCurrency, exchangeRate);

        await addDoc(collection(db, `projects/${projectId}/expenses`), {
            donorName: spendDonorName,
            spentAmount: finalAmountForProject,
            currency: projectCurrency,
            timestamp: serverTimestamp()
        });

        const projectRef = doc(db, "projects", projectId);
        await updateDoc(projectRef, { spentAmount: increment(finalAmountForProject) });

        if (spendDonorName !== "پارەی گشتی سندووقەکە") {
            const donorRef = doc(db, "donor_balances", spendDonorName);
            await setDoc(donorRef, {
                [`spent_${donorCurrency}`]: increment(finalAmountForDonor),
                [`remaining_${donorCurrency}`]: increment(-finalAmountForDonor)
            }, { merge: true });

            if (incomeId !== "none") {
                const incomeRef = doc(db, "incomes", incomeId);
                await updateDoc(incomeRef, {
                    remainingAmount: increment(-finalAmountForDonor)
                });
            }

            await addDoc(collection(db, "donor_expenses"), {
                donorName: spendDonorName,
                projectName: projectName,
                amount: finalAmountForDonor,
                currency: donorCurrency,
                incomeId: incomeId, 
                timestamp: serverTimestamp()
            });
        }

        alert(`پارەکە خەرج کرا لەسەر حیسابی (${spendDonorName})!`);
        document.getElementById('spendProjectForm').reset();
        document.getElementById('projectExchangeRateDiv').style.display = 'none';
    } catch (error) { console.error(error); alert("کێشەیەک ڕوویدا لە کاتی خەرجکردندا."); }
});

window.viewProjectHistory = async function(projectId, projectName) {
    document.getElementById('modalProjectName').innerText = `مێژووی پڕۆژە: ${projectName}`;
    const tableIncomes = document.querySelector('#modalHistoryTable tbody');
    const tableExpenses = document.querySelector('#modalExpensesTable tbody');
    tableIncomes.innerHTML = '<tr><td colspan="3" style="text-align:center;">چاوەڕوان بە...</td></tr>';
    tableExpenses.innerHTML = '<tr><td colspan="3" style="text-align:center;">چاوەڕوان بە...</td></tr>';
    document.getElementById('historyModal').style.display = 'block';

    try {
        const qIncomes = query(collection(db, "incomes"), where("projectFundId", "==", projectId));
        const incomesSnap = await getDocs(qIncomes);
        tableIncomes.innerHTML = '';
        if (incomesSnap.empty) {
            tableIncomes.innerHTML = '<tr><td colspan="3" style="text-align:center; color:red;">هیچ داهاتێک نەهاتووە.</td></tr>';
        } else {
            incomesSnap.forEach((docSnap) => {
                const data = docSnap.data();
                let dateStr = data.timestamp ? data.timestamp.toDate().toLocaleDateString('ku-IQ') : "نەزانراو";
                tableIncomes.innerHTML += `<tr><td><strong>${data.donorName}</strong></td><td dir="ltr" style="color: #27ae60;">+${data.amount} ${data.currency}</td><td dir="ltr">${dateStr}</td></tr>`;
            });
        }

        const qExpenses = query(collection(db, `projects/${projectId}/expenses`));
        const expensesSnap = await getDocs(qExpenses);
        tableExpenses.innerHTML = '';
        if (expensesSnap.empty) {
            tableExpenses.innerHTML = '<tr><td colspan="3" style="text-align:center; color:gray;">تا ئێستا هیچ بڕە پارەیەک خەرج نەکراوە.</td></tr>';
        } else {
            expensesSnap.forEach((docSnap) => {
                const data = docSnap.data();
                let dateStr = data.timestamp ? data.timestamp.toDate().toLocaleDateString('ku-IQ') : "نەزانراو";
                tableExpenses.innerHTML += `<tr><td>${data.donorName}</td><td dir="ltr" style="color: #c0392b;">-${data.spentAmount.toFixed(2)} ${data.currency}</td><td dir="ltr">${dateStr}</td></tr>`;
            });
        }
    } catch (error) { console.error(error); }
};

window.markAsCompleted = async function(projectId) {
    if (confirm("دڵنیایت کە ئەم پڕۆژەیە بە تەواوی تەواو بووە؟")) {
        try {
            const projectRef = doc(db, "projects", projectId);
            await updateDoc(projectRef, { status: 'completed', completedAt: serverTimestamp() });
            alert("پڕۆژەکە گواسترایەوە بۆ ئەرشیف!");
        } catch (error) { console.error(error); }
    }
};