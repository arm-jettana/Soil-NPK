/**
 * Smart Farm Soil Analytics & Advice Logic
 */

 let cropDatabase = {
    rice: { n: { min: 21, max: 30 }, p: { min: 25, max: 45 }, k: { min: 80, max: 120 }, ph: { min: 5.5, max: 6.5 }, name: "ข้าว" },
    corn: { n: { min: 50, max: 80 }, p: { min: 25, max: 40 }, k: { min: 40, max: 70 }, ph: { min: 5.8, max: 7.0 }, name: "ข้าวโพด" },
    sugarcane: { n: { min: 60, max: 90 }, p: { min: 30, max: 50 }, k: { min: 80, max: 120 }, ph: { min: 6.0, max: 8.0 }, name: "อ้อย" }
};

// ค่าจำลองจากเซนเซอร์ (ในงานจริงค่านี้จะมาจาก Firebase หรือการกรอก)
let sensorData = { n: 15, p: 50, k: 90, ph: 5.2 }; 
let chart;

// --- ฟังก์ชันการจัดการ UI และสลับแท็บ ---
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    document.getElementById(`btn-${tabName}`).classList.add('active');
    if(tabName === 'dashboard') updateDashboardUI();
}

function updateDashboardUI() {
    const cropKey = document.getElementById('cropSelect').value;
    const opt = cropDatabase[cropKey];
    document.getElementById('currentCropName').innerText = opt.name;

    analyzeCard('N', sensorData.n, opt.n);
    analyzeCard('P', sensorData.p, opt.p);
    analyzeCard('K', sensorData.k, opt.k);
    analyzeCard('PH', sensorData.ph, opt.ph);

    chart.data.datasets[1].label = `เกณฑ์มาตรฐาน (${opt.name})`;
    chart.data.datasets[1].data = [opt.n.max, opt.p.max, opt.k.max];
    chart.update();

    generateAdvancedAdvice(opt);
}

function analyzeCard(id, val, range) {
    const card = document.getElementById(`card${id}`);
    document.getElementById(`val${id}`).innerText = val;
    document.getElementById(`range${id}`).innerText = `เป้าหมาย: ${range.min}-${range.max}`;
    card.className = "bg-white p-6 rounded-2xl shadow-sm border-b-8 transition-all duration-500";
    if (val < range.min) card.classList.add('border-rose-500');
    else if (val > range.max) card.classList.add('border-amber-500');
    else card.classList.add('border-green-500', 'bg-green-50');
}

// --- ฟังก์ชัน "ระบบคำแนะนำอัจฉริยะ" ---
function generateAdvancedAdvice(opt) {
    const container = document.getElementById('adviceContent');
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

    // ใส่ Logic คำแนะนำรายธาตุ
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
                <p class="text-sm font-bold text-green-700 italic text-pretty">ดินมีความสมบูรณ์ดีเยี่ยม!</p>
                <p class="text-[10px] text-slate-400 mt-1">รักษาระดับสารอาหารตามเกณฑ์นี้ไว้</p>
            </div>`;
    }
}

// --- ฟังก์ชันอื่นๆ เช่น Setting และ Chart Setup (คงเดิม) ---
function updateCropSelectors() {
    ['cropSelect', 'editCropSelect'].forEach(id => {
        const el = document.getElementById(id);
        el.innerHTML = '';
        for (let key in cropDatabase) {
            el.innerHTML += `<option value="${key}">${cropDatabase[key].name}</option>`;
        }
    });
}

window.onload = function() {
    const ctx = document.getElementById('comparisonChart').getContext('2d');
    chart = new Chart(ctx, {
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
    updateCropSelectors();
    updateDashboardUI();
};