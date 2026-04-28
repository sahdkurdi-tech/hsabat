// js/menu.js

function openMenu() {
    document.getElementById("slideMenu").style.right = "0";
    document.getElementById("overlay").style.display = "block";
}

function closeMenu() {
    document.getElementById("slideMenu").style.right = "-250px";
    document.getElementById("overlay").style.display = "none";
}

// داخستنی مینۆکە ئەگەر پەنجە بە بەشە ڕەشەکەدا نرا
document.getElementById("overlay").addEventListener('click', closeMenu);