/**
 * Smart Farm Soil Analytics & Advice Logic
 * Ver 2.0 - Integrated with LocalStorage and New Features Support
 */

// --- ฐานข้อมูลเริ่มต้น ---
const DEFAULT_CROPS = {
    rice: { n: { min: 21, max: 30 }, p: { min: 25, max: 45 }, k: { min: 80, max: 120 }, ph: { min: 5.5, max: 6.5 }, name: "ข้าว" },
    corn: { n: { min: 50, max: 80 }, p: { min: 25, max: 40 }, k: { min: 40, max: 70 }, ph: { min: 5.8, max: 7.0 }, name: "ข้าวโพด" },
    sugarcane: { n: { min: 60, max: 90 }, p: { min: 30, max: 50 }, k: { min: 80, max: 120 }, ph: { min: 6.0, max: 8.0 }, name: "อ้อย" }
};

let cropDatabase = JSON.parse(localStorage.getItem('cropDatabase')) || DEFAULT_CROPS;
let savedLocations = JSON.parse(localStorage.getItem('savedLocations')) || [];
let sensorData = { n: 15, p: 50, k: 90, ph: 5.2 }; 
let chart, map, marker;

// --- ระบบสลับแท็บ ---
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    document.getElementById(`btn-${tabName}`).classList.add('active');
    
    if(tabName === 'dashboard') updateDashboardUI();
    if(tabName === 'settings') loadCurrentStandard();
    if(tabName === 'mapTab') {
        initMap();
        if (map) setTimeout(() => map.invalidateSize(), 100);
        renderSavedLocations();
    }
}

// --- ระบบแผนที่ (Leaflet) ---
function initMap() {
    if (map) {
        setTimeout(() => map.invalidateSize(), 100);
        return;
    }

    // เริ่มต้นที่กรุงเทพฯ หรือตำแหน่งล่าสุด (ถ้ามี)
    const initialPos = savedLocations.length > 0 
        ? [savedLocations[0].lat, savedLocations[0].lng] 
        : [13.7563, 100.5018];

    map = L.map('map').setView(initialPos, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    map.on('click', onMapClick);
}

function onMapClick(e) {
    if (marker) {
        marker.setLatLng(e.latlng);
    } else {
        marker = L.marker(e.latlng).addTo(map);
    }
}

function saveLocation() {
    const name = document.getElementById('locationName').value.trim();
    if (!name) return alert('กรุณาระบุชื่อเรียกพื้นที่');
    if (!marker) return alert('กรุณาคลิกเลือกตำแหน่งบนแผนที่ก่อนบันทึก');

    const latlng = marker.getLatLng();
    const newLoc = {
        id: Date.now(),
        name: name,
        lat: latlng.lat,
        lng: latlng.lng,
        timestamp: new Date().toLocaleString('th-TH')
    };

    savedLocations.push(newLoc);
    localStorage.setItem('savedLocations', JSON.stringify(savedLocations));
    
    document.getElementById('locationName').value = '';
    renderSavedLocations();
    alert('บันทึกตำแหน่งเรียบร้อยแล้ว');
}

function renderSavedLocations() {
    const list = document.getElementById('savedLocationsList');
    if (!list) return;
    
    list.innerHTML = '';
    savedLocations.forEach(loc => {
        list.innerHTML += `
            <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 hover:border-green-500 transition-all group">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-bold text-slate-800">${loc.name}</h4>
                    <button onclick="deleteLocation(${loc.id})" class="text-rose-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
                <p class="text-[10px] text-slate-400 mb-3">📍 ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}<br>🕒 ${loc.timestamp}</p>
                <button onclick="flyToLocation(${loc.lat}, ${loc.lng})" class="w-full py-1.5 text-xs bg-white border border-green-600 text-green-700 rounded-lg font-bold hover:bg-green-50 transition-all">ดูบนแผนที่</button>
            </div>
        `;
    });

    if (savedLocations.length === 0) {
        list.innerHTML = '<p class="col-span-full text-center py-8 text-slate-400 text-sm">ยังไม่มีข้อมูลพื้นที่ที่บันทึกไว้</p>';
    }
}

function deleteLocation(id) {
    if (!confirm('ยืนยันการลบตำแหน่งนี้?')) return;
    savedLocations = savedLocations.filter(l => l.id !== id);
    localStorage.setItem('savedLocations', JSON.stringify(savedLocations));
    renderSavedLocations();
}

function flyToLocation(lat, lng) {
    if (!map) return;
    map.flyTo([lat, lng], 16);
    if (marker) {
        marker.setLatLng([lat, lng]);
    } else {
        marker = L.marker([lat, lng]).addTo(map);
    }
}

// --- ระบบจัดการข้อมูลพืช ---
function updateCropSelectors() {
    ['cropSelect', 'editCropSelect'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const currentVal = el.value;
        el.innerHTML = '';
        for (let key in cropDatabase) {
            el.innerHTML += `<option value="${key}">${cropDatabase[key].name}</option>`;
        }
        if (currentVal && cropDatabase[currentVal]) el.value = currentVal;
    });
}

function addNewCrop() {
    const name = document.getElementById('newCropName').value.trim();
    if (!name) return alert('กรุณาระบุชื่อพืช');
    
    const key = 'crop_' + Date.now();
    cropDatabase[key] = {
        n: { min: 20, max: 40 },
        p: { min: 20, max: 40 },
        k: { min: 20, max: 40 },
        ph: { min: 5.5, max: 7.0 },
        name: name
    };
    
    saveToLocalStorage();
    updateCropSelectors();
    document.getElementById('newCropName').value = '';
    alert(`เพิ่มพืช "${name}" เรียบร้อยแล้ว! คุณสามารถปรับแต่งเกณฑ์มาตรฐานได้ทันที`);
}

function deleteCrop() {
    const key = document.getElementById('editCropSelect').value;
    const name = cropDatabase[key].name;
    
    if (Object.keys(cropDatabase).length <= 1) return alert('ต้องมีพืชอย่างน้อย 1 ชนิดในระบบ');
    if (!confirm(`คุณต้องการลบพืช "${name}" ใช่หรือไม่?`)) return;
    
    delete cropDatabase[key];
    saveToLocalStorage();
    updateCropSelectors();
    loadCurrentStandard();
    alert(`ลบข้อมูลพืช "${name}" เรียบร้อย`);
}

function saveToLocalStorage() {
    localStorage.setItem('cropDatabase', JSON.stringify(cropDatabase));
}

function exportToText() {
    const cropKey = document.getElementById('cropSelect').value;
    const opt = cropDatabase[cropKey];
    let text = `🌱 รายงานวิเคราะห์ดิน - SmartFarm DSS\n`;
    text += `พืช: ${opt.name}\n`;
    text += `วันที่: ${new Date().toLocaleDateString('th-TH')}\n`;
    text += `--------------------------\n`;
    text += `N: ${sensorData.n} (เป้าหมาย: ${opt.n.min}-${opt.n.max})\n`;
    text += `P: ${sensorData.p} (เป้าหมาย: ${opt.p.min}-${opt.p.max})\n`;
    text += `K: ${sensorData.k} (เป้าหมาย: ${opt.k.min}-${opt.k.max})\n`;
    text += `pH: ${sensorData.ph} (เป้าหมาย: ${opt.ph.min}-${opt.ph.max})\n`;
    text += `--------------------------\n`;
    
    // ดึงคำแนะนำ (แบบย่อ)
    const container = document.getElementById('adviceContent');
    const advices = container.querySelectorAll('p.text-\\[11px\\]');
    if (advices.length > 0) {
        text += `💡 คำแนะนำ:\n`;
        advices.forEach(a => text += `- ${a.innerText}\n`);
    } else {
        text += `✅ ดินมีความสมบูรณ์ดีเยี่ยม!\n`;
    }

    // Copy to clipboard
    navigator.clipboard.writeText(text).then(() => {
        alert('คัดลอกรายงานไปยัง Clipboard แล้ว! คุณสามารถส่งต่อทาง Line หรือ Messenger ได้ทันที');
    });
}

function loadCurrentStandard() {
    const cropKey = document.getElementById('editCropSelect').value;
    const opt = cropDatabase[cropKey];
    if (!opt) return;

    document.getElementById('setNMin').value = opt.n.min;
    document.getElementById('setNMax').value = opt.n.max;
    document.getElementById('setPMin').value = opt.p.min;
    document.getElementById('setPMax').value = opt.p.max;
    document.getElementById('setKMin').value = opt.k.min;
    document.getElementById('setKMax').value = opt.k.max;
    document.getElementById('setPHMin').value = opt.ph.min;
    document.getElementById('setPHMax').value = opt.ph.max;
}

function saveNewStandard() {
    const cropKey = document.getElementById('editCropSelect').value;
    
    cropDatabase[cropKey].n.min = parseFloat(document.getElementById('setNMin').value);
    cropDatabase[cropKey].n.max = parseFloat(document.getElementById('setNMax').value);
    cropDatabase[cropKey].p.min = parseFloat(document.getElementById('setPMin').value);
    cropDatabase[cropKey].p.max = parseFloat(document.getElementById('setPMax').value);
    cropDatabase[cropKey].k.min = parseFloat(document.getElementById('setKMin').value);
    cropDatabase[cropKey].k.max = parseFloat(document.getElementById('setKMax').value);
    cropDatabase[cropKey].ph.min = parseFloat(document.getElementById('setPHMin').value);
    cropDatabase[cropKey].ph.max = parseFloat(document.getElementById('setPHMax').value);

    localStorage.setItem('cropDatabase', JSON.stringify(cropDatabase));
    alert(`บันทึกเกณฑ์มาตรฐานพืช "${cropDatabase[cropKey].name}" เรียบร้อย!`);
    switchTab('dashboard');
}

// --- ระบบแสดงผล Dashboard ---
function updateDashboardUI() {
    const cropKey = document.getElementById('cropSelect').value;
    const opt = cropDatabase[cropKey];
    if (!opt) return;

    document.getElementById('currentCropName').innerText = opt.name;

    analyzeCard('N', sensorData.n, opt.n);
    analyzeCard('P', sensorData.p, opt.p);
    analyzeCard('K', sensorData.k, opt.k);
    analyzeCard('PH', sensorData.ph, opt.ph);

    if (chart) {
        chart.data.datasets[0].data = [sensorData.n, sensorData.p, sensorData.k];
        chart.data.datasets[1].label = `เกณฑ์มาตรฐาน (${opt.name})`;
        chart.data.datasets[1].data = [opt.n.max, opt.p.max, opt.k.max];
        chart.update();
    }
    
    generateAdvancedAdvice(opt);
    // ซ่อนผลลัพธ์การคำนวณปุ๋ยเมื่อเปลี่ยนพืชหรือค่า
    document.getElementById('calcResult').classList.add('hidden');
}

// --- ระบบจำลอง (Simulation) ---
function runSimulation() {
    sensorData.n = parseFloat(document.getElementById('simN').value);
    sensorData.p = parseFloat(document.getElementById('simP').value);
    sensorData.k = parseFloat(document.getElementById('simK').value);
    sensorData.ph = parseFloat(document.getElementById('simPH').value);
    updateDashboardUI();
}

// --- เครื่องคำนวณปุ๋ย ---
function calculateFertilizer() {
    const formula = document.getElementById('fertilizerFormula').value; // เช่น "46-0-0"
    const area = parseFloat(document.getElementById('farmArea').value) || 1;
    const cropKey = document.getElementById('cropSelect').value;
    const opt = cropDatabase[cropKey];

    const [fN, fP, fK] = formula.split('-').map(Number);
    
    // คำนวณหาธาตุที่ขาดมากที่สุดเมื่อเทียบกับค่า Max
    const diffN = Math.max(0, opt.n.max - sensorData.n);
    const diffP = Math.max(0, opt.p.max - sensorData.p);
    const diffK = Math.max(0, opt.k.max - sensorData.k);

    let requiredKg = 0;

    // Logic อย่างง่าย: เลือกคำนวณจากธาตุที่สูตรปุ๋ยนั้นมีเปอร์เซ็นต์สูงสุด
    if (fN >= fP && fN >= fK && fN > 0) {
        requiredKg = (diffN / fN) * 100;
    } else if (fP >= fN && fP >= fK && fP > 0) {
        requiredKg = (diffP / fP) * 100;
    } else if (fK >= fN && fK >= fP && fK > 0) {
        requiredKg = (diffK / fK) * 100;
    }

    // คูณด้วยพื้นที่ และปัดเศษ
    const totalRequired = (requiredKg * area).toFixed(1);
    
    const resultDiv = document.getElementById('calcResult');
    const resultVal = document.getElementById('calcValue');
    
    if (totalRequired > 0) {
        resultVal.innerText = totalRequired;
        resultDiv.classList.remove('hidden');
    } else {
        alert('ธาตุอาหารในดินเพียงพอแล้ว ไม่จำเป็นต้องเพิ่มปุ๋ยสูตรนี้');
        resultDiv.classList.add('hidden');
    }
}

function analyzeCard(id, val, range) {
    const card = document.getElementById(`card${id}`);
    if (!card) return;
    document.getElementById(`val${id}`).innerText = val;
    document.getElementById(`range${id}`).innerText = `เป้าหมาย: ${range.min}-${range.max}`;
    
    card.className = "bg-white p-6 rounded-2xl shadow-sm border-b-8 transition-all duration-500";
    if (val < range.min) card.classList.add('border-rose-500');
    else if (val > range.max) card.classList.add('border-amber-500');
    else card.classList.add('border-green-500', 'bg-green-50');
}

function generateAdvancedAdvice(opt) {
    const container = document.getElementById('adviceContent');
    if (!container) return;
    container.innerHTML = '';
    let adviceCount = 0;

    const check = (val, range, label, lowMsg, highMsg) => {
        if (val < range.min) {
            adviceCount++;
            return `<div class="p-3 bg-rose-50 border-l-4 border-rose-500 rounded-lg shadow-sm">
                        <p class="text-xs font-black text-rose-700 uppercase">${label} ต่ำเกินไป ⚠️</p>
                        <p class="text-[11px] text-rose-600 mt-1">${lowMsg}</p>
                    </div>`;
        } else if (val > range.max) {
            adviceCount++;
            return `<div class="p-3 bg-amber-50 border-l-4 border-amber-500 rounded-lg shadow-sm">
                        <p class="text-xs font-black text-amber-700 uppercase">${label} สูงเกินเกณฑ์ ✨</p>
                        <p class="text-[11px] text-amber-600 mt-1">${highMsg}</p>
                    </div>`;
        }
        return '';
    };

    container.innerHTML += check(sensorData.n, opt.n, 'ไนโตรเจน (N)', 
        'ควรเพิ่มปุ๋ยไนโตรเจน เช่น ยูเรีย (46-0-0) เพื่อเร่งการเจริญเติบโตของใบและลำต้น', 
        'มีไนโตรเจนมากเกินไป อาจทำให้ต้นบ้าใบและเสี่ยงต่อโรคแมลง ควรลดการใส่ปุ๋ยกลุ่ม N');

    container.innerHTML += check(sensorData.p, opt.p, 'ฟอสฟอรัส (P)', 
        'ควรเพิ่มฟอสฟอรัส เช่น ปุ๋ยสูตร 16-20-0 เพื่อช่วยพัฒนาในส่วนของรากและดอก', 
        'ปริมาณเพียงพอแล้ว การมีมากเกินไปอาจขัดขวางการดูดซึมธาตุอาหารรองชนิดอื่น');

    container.innerHTML += check(sensorData.k, opt.k, 'โพแทสเซียม (K)', 
        'ควรเพิ่มโพแทสเซียม เช่น ปุ๋ยสูตร 0-0-60 เพื่อเพิ่มน้ำหนักและคุณภาพของผลผลิต', 
        'โพแทสเซียมสูงเกินไปอาจทำให้พืชขาดแคลเซียมและแมกนีเซียม');

    container.innerHTML += check(sensorData.ph, opt.ph, 'ค่า pH (กรด-ด่าง)', 
        'ดินเป็นกรดเกินไป (Acidic) แนะนำให้เติม "ปูนขาว" หรือโดโลไมท์เพื่อปรับสภาพดิน', 
        'ดินเป็นด่างเกินไป (Alkaline) แนะนำให้เพิ่มอินทรียวัตถุหรือใช้ปุ๋ยที่มีกำมะถัน');

    if (adviceCount === 0) {
        container.innerHTML = `
            <div class="text-center py-10">
                <p class="text-3xl mb-2">✅</p>
                <p class="text-sm font-bold text-green-700 italic">ดินมีความสมบูรณ์ดีเยี่ยม!</p>
                <p class="text-[10px] text-slate-400 mt-1">รักษาระดับสารอาหารตามเกณฑ์นี้ไว้</p>
            </div>`;
    }
}

// --- ระบบ Dark Mode ---
function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    document.getElementById('darkIcon').innerText = isDark ? '☀️' : '🌙';
    localStorage.setItem('darkMode', isDark);
    
    // อัปเดตกราฟให้สีเข้ากับธีม
    if (chart) {
        chart.options.scales.x.grid.color = isDark ? '#334155' : '#e2e8f0';
        chart.options.scales.y.grid.color = isDark ? '#334155' : '#e2e8f0';
        chart.update();
    }
}

// --- เริ่มต้นระบบ ---
window.onload = function() {
    // โหลด Dark Mode
    if (localStorage.getItem('darkMode') === 'true') {
        document.documentElement.classList.add('dark');
        document.getElementById('darkIcon').innerText = '☀️';
    }

    const ctx = document.getElementById('comparisonChart');
    if (ctx) {
        chart = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['N', 'P', 'K'],
                datasets: [
                    { label: 'วัดจากแปลง', data: [sensorData.n, sensorData.p, sensorData.k], backgroundColor: '#1e293b', borderRadius: 5 },
                    { label: 'ค่ามาตรฐาน', data: [0, 0, 0], backgroundColor: '#4ade80', borderRadius: 5 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
    updateCropSelectors();
    updateDashboardUI();
};