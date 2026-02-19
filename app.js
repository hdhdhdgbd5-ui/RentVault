
let evidence = JSON.parse(localStorage.getItem('rentvault-evidence') || '{}');
let currentRoom = 'living-room';
let tempFiles = [];

const roomNames = {
    'living-room': '🛋️ Living Room',
    'bedroom': '🛏️ Bedroom',
    'kitchen': '🍳 Kitchen',
    'bathroom': '🚿 Bathroom',
    'hallway': '🚪 Hallway',
    'other': '📦 Other'
};

document.addEventListener('DOMContentLoaded', () => {
    loadEvidence();
    updateRoomSelection();
    updateDisplay();
    loadPropertyInfo();
});

function updateRoomSelection() {
    document.querySelectorAll('.room-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.room-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentRoom = btn.dataset.room;
        });
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    processFiles(files);
}

document.getElementById('file-input').addEventListener('change', (e) => {
    processFiles(Array.from(e.target.files));
});

function processFiles(files) {
    tempFiles = files.map(file => ({
        file,
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString()
    }));
    
    const saveBtn = document.getElementById('save-btn');
    saveBtn.textContent = `💾 Save ${files.length} Photo(s)`;
    saveBtn.disabled = false;
}

function saveEvidence() {
    const note = document.getElementById('photo-note').value;
    const address = document.getElementById('property-address').value;
    const moveInDate = document.getElementById('move-in-date').value;
    
    if (!tempFiles.length) {
        alert('Please select photos first');
        return;
    }
    
    const saveBtn = document.getElementById('save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = '💾 Saving...';
    
    let processed = 0;
    
    tempFiles.forEach(tempFile => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const photo = {
                id: tempFile.id,
                image: e.target.result,
                timestamp: tempFile.timestamp,
                room: currentRoom,
                note: note,
                address: address,
                moveInDate: moveInDate
            };
            
            if (!evidence[currentRoom]) evidence[currentRoom] = [];
            evidence[currentRoom].push(photo);
            processed++;
            
            if (processed === tempFiles.length) {
                localStorage.setItem('rentvault-evidence', JSON.stringify(evidence));
                savePropertyInfo();
                tempFiles = [];
                document.getElementById('photo-note').value = '';
                saveBtn.textContent = '💾 Save Evidence';
                saveBtn.disabled = false;
                updateDisplay();
                showNotification('Evidence saved!');
            }
        };
        reader.readAsDataURL(tempFile.file);
    });
}

function savePropertyInfo() {
    localStorage.setItem('rentvault-property', JSON.stringify({
        address: document.getElementById('property-address').value,
        moveInDate: document.getElementById('move-in-date').value
    }));
}

function loadPropertyInfo() {
    const info = JSON.parse(localStorage.getItem('rentvault-property') || '{}');
    if (info.address) document.getElementById('property-address').value = info.address;
    if (info.moveInDate) document.getElementById('move-in-date').value = info.moveInDate;
}

function loadEvidence() {
    evidence = JSON.parse(localStorage.getItem('rentvault-evidence') || '{}');
}

function updateDisplay() {
    updateGallery();
    updateTotalCount();
}

function updateTotalCount() {
    let total = 0;
    Object.values(evidence).forEach(room => total += room.length);
    document.getElementById('total-count').textContent = total;
}

function updateGallery() {
    const grid = document.getElementById('photo-grid');
    const allPhotos = [];
    
    Object.entries(evidence).forEach(([room, photos]) => {
        photos.forEach(photo => allPhotos.push({...photo, room}));
    });
    
    allPhotos.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (allPhotos.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: span 3;">
                <div class="empty-state-icon">📭</div>
                <div>No evidence yet.</div>
                <div style="font-size: 14px; margin-top: 5px;">Take photos of each room to protect your deposit!</div>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = allPhotos.map(photo => `
        <div class="photo-item" onclick="viewPhoto(${photo.id}, '${photo.room}')">
            <img src="${photo.image}" alt="Evidence" loading="lazy">
            <div class="photo-timestamp">
                ${formatDate(photo.timestamp)} ${roomNames[photo.room].split(' ')[0]}
            </div>
        </div>
    `).join('');
}

function viewPhoto(id, room) {
    const photo = evidence[room].find(p => p.id === id);
    if (!photo) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <button class="close-btn" onclick="this.parentElement.parentElement.remove()">×</button>
            <h3 style="color: #ff6b9d; margin-bottom: 15px;">${roomNames[room]}</h3>
            <img src="${photo.image}" class="modal-img" alt="Evidence">
            <div style="background: #fff5f7; padding: 15px; border-radius: 12px; margin: 15px 0;">
                <div style="font-size: 12px; color: #888; margin-bottom: 5px;">📅 ${formatDate(photo.timestamp)}</div>
                ${photo.note ? `<div style="margin-top: 10px;"><strong>Notes:</strong><br>${photo.note}</div>` : ''}
            </div>
            <button class="btn" onclick="deletePhoto(${id}, '${room}'); this.parentElement.parentElement.remove();" style="background: #ff4757;">🗑️ Delete Photo</button>
        </div>
    `;
    document.body.appendChild(modal);
}

function deletePhoto(id, room) {
    evidence[room] = evidence[room].filter(p => p.id !== id);
    localStorage.setItem('rentvault-evidence', JSON.stringify(evidence));
    updateDisplay();
    showNotification('Photo deleted');
}

function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function showGrid() {
    document.getElementById('gallery-view').classList.remove('hidden');
    document.getElementById('report-view').classList.add('hidden');
    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.toggle-btn')[0].classList.add('active');
}

function showReport() {
    document.getElementById('gallery-view').classList.add('hidden');
    document.getElementById('report-view').classList.remove('hidden');
    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.toggle-btn')[1].classList.add('active');
    generateReportPreview();
}

function generateReportPreview() {
    const container = document.getElementById('report-content');
    const property = JSON.parse(localStorage.getItem('rentvault-property') || '{}');
    
    let html = `
        <div style="background: white; padding: 30px; border-radius: 16px; margin: 20px 0;">
            <div style="text-align: center; margin-bottom: 30px;">
                <div style="font-size: 24px; font-weight: 800; color: #ff6b9d;">🏠 RentVault Evidence Report</div>
                <div style="color: #888; margin-top: 5px;">Property Condition Documentation</div>
            </div>
    `;
    
    if (property.address) html += `<div style="margin: 20px 0; padding: 15px; background: #fff5f7; border-radius: 12px;"><strong>Address:</strong> ${property.address}</div>`;
    if (property.moveInDate) html += `<div style="margin: 20px 0; padding: 15px; background: #fff5f7; border-radius: 12px;"><strong>Move-in Date:</strong> ${property.moveInDate}</strong></div>`;
    
    Object.entries(evidence).forEach(([room, photos]) => {
        if (photos.length === 0) return;
        html += `<h3 style="color: #ff6b9d; margin: 30px 0 15px; border-bottom: 2px solid #ffd1dc; padding-bottom: 10px;">${roomNames[room]}</h3>`;
        html += `<div style="margin: 15px 0;"><strong>Total Photos:</strong> ${photos.length}</div>`;
        photos.forEach(photo => {
            html += `
                <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 12px; break-inside: avoid;">
                    <div style="font-size: 12px; color: #888; margin-bottom: 8px;">📅 ${formatDate(photo.timestamp)}</div>
                    <img src="${photo.image}" style="width: 100%; max-width: 400px; height: auto; border-radius: 8px; display: block; margin: 10px 0;">
                    ${photo.note ? `<div style="margin-top: 10px; padding: 10px; background: white; border-radius: 8px;"><strong>Notes:</strong> ${photo.note}</div>` : ''}
                </div>
            `;
        });
    });
    
    html += '</div>';
    container.innerHTML = html;
}

async function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const property = JSON.parse(localStorage.getItem('rentvault-property') || '{}');
    
    doc.setFontSize(20);
    doc.text('RentVault Evidence Report', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Property Condition Documentation', 105, 30, { align: 'center' });
    
    let y = 45;
    
    if (property.address) {
        doc.text(`Address: ${property.address}`, 20, y);
        y += 10;
    }
    if (property.moveInDate) {
        doc.text(`Move-in Date: ${property.moveInDate}`, 20, y);
        y += 10;
    }
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, y);
    y += 20;
    
    for (const [room, photos] of Object.entries(evidence)) {
        if (photos.length === 0) continue;
        
        if (y > 250) {
            doc.addPage();
            y = 20;
        }
        
        doc.setFontSize(16);
        doc.setTextColor(255, 107, 157);
        doc.text(roomNames[room], 20, y);
        y += 15;
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Total Photos: ${photos.length}`, 20, y);
        y += 15;
        
        for (const photo of photos) {
            if (y > 220) {
                doc.addPage();
                y = 20;
            }
            
            doc.setFontSize(10);
            doc.text(`Date: ${formatDate(photo.timestamp)}`, 20, y);
            y += 8;
            
            if (photo.note) {
                doc.setFontSize(10);
                const splitNote = doc.splitTextToSize(`Notes: ${photo.note}`, 170);
                doc.text(splitNote, 20, y);
                y += splitNote.length * 5 + 10;
            }
        }
        y += 10;
    }
    
    doc.save('rentvault-evidence-report.pdf');
    showNotification('PDF downloaded!');
}

function showNotification(message) {
    const note = document.createElement('div');
    note.style.cssText = 'position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); background: #ff6b9d; color: white; padding: 12px 24px; border-radius: 25px; font-weight: 600; z-index: 1000; animation: fadeIn 0.3s;';
    note.textContent = message;
    document.body.appendChild(note);
    setTimeout(() => note.remove(), 3000);
}

function installApp() {
    if ('BeforeInstallPromptEvent' in window && window.deferredPrompt) {
        const { deferredPrompt } = window;
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => delete window.deferredPrompt);
    } else {
        showNotification('Tap ≡ then "Add to Home Screen"');
    }
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.deferredPrompt = e;
});
