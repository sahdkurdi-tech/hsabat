import { db } from './firebase-config.js';
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// دروستکردنی ڕاپۆرتی مرۆڤدۆستی VIP
document.getElementById('btnVipReport').addEventListener('click', async () => {
    const vipName = document.getElementById('vipNameInput').value;
    if (!vipName) {
        alert("تکایە سەرەتا ناوی مرۆڤدۆست بنووسە!");
        return;
    }

    try {
        // هێنانەوەی هەموو ئەو پارانەی ئەم کەسە بەخشیوویەتی
        const incomesRef = collection(db, "incomes");
        const q = query(incomesRef, where("donorName", "==", vipName));
        const querySnapshot = await getDocs(q);

        let totalUSD = 0;
        let totalIQD = 0;
        const tableData = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // ئامادەکردنی داتا بۆ خشتەی PDF
            tableData.push([
                data.projectFund, 
                `${data.amount} ${data.currency}`, 
                data.source === 'office' ? 'ئۆفیس' : 'سەرۆکی ڕێکخراو',
                new Date(data.timestamp?.toDate()).toLocaleDateString() || 'نەزانراو'
            ]);

            if (data.currency === 'USD') totalUSD += data.amount;
            if (data.currency === 'IQD') totalIQD += data.amount;
        });

        if (tableData.length === 0) {
            alert("هیچ زانیارییەک بۆ ئەم ناوە نەدۆزرایەوە!");
            return;
        }

        generateVipPDF(vipName, tableData, totalUSD, totalIQD);

    } catch (error) {
        console.error("Error generating report: ", error);
        alert("کێشەیەک ڕوویدا لە کاتی هێنانی زانیارییەکان.");
    }
});

function generateVipPDF(vipName, tableData, totalUSD, totalIQD) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // سەرەدێڕی فەرمی (دەتوانرێت لۆگۆی ڕێکخراوەکە لێرەدا زیاد بکرێت)
    doc.setFontSize(20);
    doc.text("Charity Organization - Official Statement", 105, 20, null, null, "center");
    
    doc.setFontSize(14);
    doc.text(`Donor Name: ${vipName}`, 14, 40);
    doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 14, 50);

    // دروستکردنی خشتەکە بەبەکارهێنانی autoTable plugin
    doc.autoTable({
        startY: 60,
        head: [['Project / Fund', 'Amount', 'Source', 'Date']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [0, 86, 179] }
    });

    // پوختەی کۆتایی (فرەدراوی)
    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(12);
    doc.text("Total Contributions Summary:", 14, finalY);
    doc.text(`Total in USD: $${totalUSD}`, 14, finalY + 10);
    doc.text(`Total in IQD: ${totalIQD} IQD`, 14, finalY + 20);

    // واژۆ و مۆر
    doc.text("Accountant Signature", 14, finalY + 40);
    doc.text("President Signature", 140, finalY + 40);

    // سەیڤکردنی ڕاپۆرتەکە
    doc.save(`VIP_Report_${vipName}.pdf`);
}