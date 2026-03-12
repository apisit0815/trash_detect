// 🚨 สำคัญมาก: นำ Web App URL ของ Google Apps Script มาใส่ในเครื่องหมายคำพูดด้านล่างนี้
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbx1pdHOY5ubDDb-FSj3FuOIyOgRlRUloRKH_TCDQjxn85EUtizkwuIWI-BGa-IeWau0ZQ/exec";

let stream;
let currentFacingMode = 'environment'; // เริ่มต้นด้วยกล้องหลัง
let score = 0;
let combo = 0;

// อ้างอิง UI จาก HTML
const statusDiv = document.getElementById("status");
const scoreDisplay = document.getElementById("score");
const comboBadge = document.getElementById("combo-badge");
const mascot = document.getElementById("mascot");
const gameMessage = document.getElementById("game-message");
const gameContainer = document.querySelector(".game-container");
const imageUpload = document.getElementById("image-upload");
const imagePreview = document.getElementById("image-preview");
const inputOptions = document.getElementById("input-options");
const cameraContainer = document.getElementById("camera-container");
const videoPreview = document.getElementById("video-preview");

// ---- ระบบเสียงเกม 8-bit ----
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playTone(freq, type, duration, vol=0.1) {
    if(audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start();
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
    osc.stop(audioCtx.currentTime + duration);
}

const sfx = {
    coin: () => { playTone(1200, 'sine', 0.1); setTimeout(() => playTone(1600, 'sine', 0.3), 100); },
    error: () => { playTone(300, 'sawtooth', 0.2); setTimeout(() => playTone(200, 'sawtooth', 0.4), 150); },
    shutter: () => { playTone(800, 'square', 0.05); },
    click: () => { playTone(600, 'sine', 0.05); }
};

// เริ่มต้นระบบ
function init() {
    statusDiv.innerHTML = "✨ พร้อมสแกนแล้ว เลือกวิธีใส่รูปเลย!";
    document.getElementById("camera-btn").addEventListener("click", () => { sfx.click(); startCamera(); });
    document.getElementById("browse-btn").addEventListener("click", () => { sfx.click(); imageUpload.click(); });
}

// ระบบกล้อง
async function startCamera() {
    if (stream) stream.getTracks().forEach(track => track.stop());
    const constraints = { video: { facingMode: { exact: currentFacingMode } } };

    try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        videoPreview.srcObject = stream;
        inputOptions.classList.add("hidden");
        imagePreview.style.display = 'none';
        cameraContainer.style.display = 'flex';
        statusDiv.innerHTML = "เล็งขยะให้อยู่ตรงกลาง แล้วกดถ่าย!";
        gameContainer.className = "game-container"; 
        mascot.innerText = "👀";
        gameMessage.innerText = "เล็งดีๆ นะฮีโร่!";
    } catch (e) {
        if (currentFacingMode === 'environment') {
            currentFacingMode = 'user';
            startCamera(); 
        } else {
            statusDiv.innerHTML = "❌ ไม่สามารถเปิดกล้องได้";
        }
    }
}

// ถ่ายภาพและลดขนาดไฟล์ภาพ
function captureImage() {
    sfx.shutter();
    const canvas = document.createElement("canvas");
    // ลดขนาดภาพลงเพื่อให้ส่งผ่านเน็ตไป GAS ได้รวดเร็วขึ้น
    const scale = Math.min(640 / videoPreview.videoWidth, 1);
    canvas.width = videoPreview.videoWidth * scale; 
    canvas.height = videoPreview.videoHeight * scale;
    canvas.getContext("2d").drawImage(videoPreview, 0, 0, canvas.width, canvas.height);
    
    // แปลงเป็น base64
    imagePreview.src = canvas.toDataURL("image/jpeg", 0.7);
    imagePreview.style.display = 'block';
    
    if (stream) stream.getTracks().forEach(track => track.stop());
    cameraContainer.style.display = 'none';
    inputOptions.classList.remove("hidden");
    
    // เรียกใช้ AI ทันที
    predict(); 
}

// 🧠 ส่งรูปไปให้ Backend (Google Apps Script) ประมวลผล
async function predict() {
    if (GAS_WEB_APP_URL.includes("ใส่_URL") || GAS_WEB_APP_URL === "") {
        statusDiv.innerHTML = "❌ ลืมใส่ URL ของ Google Apps Script ในไฟล์ script.js ครับ";
        sfx.error();
        return;
    }

    statusDiv.innerHTML = "📡 กำลังส่งภาพให้ระบบประมวลผล (รอแป๊บนึงนะ)...";
    mascot.innerText = "🤔";
    gameMessage.innerText = "อืมมม... ขอเวลาคิดแป๊บนึงนะ!";

    const base64Image = imagePreview.src;

    try {
        // ส่งข้อมูลไปที่ Google Apps Script
        const response = await fetch(GAS_WEB_APP_URL, {
            method: "POST",
            headers: {
                // ใช้ text/plain เพื่อป้องกันปัญหา CORS Policy ข้ามโดเมน
                "Content-Type": "text/plain;charset=utf-8", 
            },
            body: JSON.stringify({ image: base64Image })
        });

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message || data.error);
        }

        // ดึงคำตอบของ AI จากชุดข้อมูลที่ Google Apps Script ส่งกลับมา
        const aiAnswer = data.choices[0].message.content.trim().toLowerCase();
        
        gameContainer.className = "game-container"; 
        let earnedPoints = 10;

        // แยกแยะคำตอบและแสดงผล
        if (aiAnswer.includes("null")) {
            mascot.innerText = "❓";
            gameMessage.innerText = "เอ๊ะ! นี่ไม่ใช่ขยะนี่นา ถ่ายขยะของจริงมาให้ดูหน่อย";
            combo = 0;
            sfx.error();
            mascot.classList.add("shake"); setTimeout(() => mascot.classList.remove("shake"), 500);
            comboBadge.classList.add("hidden");
        } else {
            // ระบบนับคอมโบ
            combo++;
            if (combo >= 2) {
                earnedPoints *= 2;
                comboBadge.classList.remove("hidden");
            } else {
                comboBadge.classList.add("hidden");
            }
            
            score += earnedPoints;
            scoreDisplay.innerText = score;
            sfx.coin();

            // เปลี่ยนสีและข้อความตามประเภทขยะ
            if (aiAnswer.includes("recycle")) {
                mascot.innerText = "♻️🤩";
                gameMessage.innerText = `ยอดเยี่ยม! นี่คือ ขยะรีไซเคิล (+${earnedPoints} แต้ม)`;
                gameContainer.classList.add("bg-recycle");
            } else if (aiAnswer.includes("organic")) {
                mascot.innerText = "🍂😋";
                gameMessage.innerText = `ดีมาก! นี่คือ ขยะอินทรีย์ (+${earnedPoints} แต้ม)`;
                gameContainer.classList.add("bg-organic");
            } else if (aiAnswer.includes("hazardous")) {
                mascot.innerText = "☠️😱";
                gameMessage.innerText = `ระวัง! นี่คือ ขยะอันตราย ต้องทิ้งแยกนะ (+${earnedPoints} แต้ม)`;
                gameContainer.classList.add("bg-hazardous");
                sfx.error(); 
            } else if (aiAnswer.includes("general")) {
                mascot.innerText = "🗑️👍";
                gameMessage.innerText = `เยี่ยม! นี่คือ ขยะทั่วไป ทิ้งลงถังเลย (+${earnedPoints} แต้ม)`;
                gameContainer.classList.add("bg-general");
            } else {
                mascot.innerText = "😵‍💫";
                gameMessage.innerText = `ระบบไม่แน่ใจ ลองถ่ายใหม่อีกครั้งนะ`;
            }

            scoreDisplay.classList.add("bounce");
            setTimeout(() => scoreDisplay.classList.remove("bounce"), 1000);
        }
        statusDiv.innerHTML = "ภารกิจสำเร็จ! สแกนชิ้นต่อไปได้เลย";

    } catch (error) {
        console.error("Error:", error);
        statusDiv.innerHTML = "❌ การเชื่อมต่อล้มเหลว (ขัดข้องที่เซิร์ฟเวอร์)";
        mascot.innerText = "😵";
        gameMessage.innerText = `ระบบขัดข้อง โปรดลองใหม่`;
        sfx.error();
    }
}

// Event Listeners สำหรับปุ่มต่างๆ
document.getElementById("switch-camera-btn").addEventListener("click", () => {
    sfx.click();
    currentFacingMode = (currentFacingMode === 'user') ? 'environment' : 'user';
    startCamera();
});

document.getElementById("close-camera-btn").addEventListener("click", () => {
    sfx.click();
    if (stream) stream.getTracks().forEach(track => track.stop());
    cameraContainer.style.display = 'none';
    inputOptions.classList.remove("hidden");
    statusDiv.innerHTML = "ยกเลิกกล้องแล้ว";
    mascot.innerText = "🤖";
    gameMessage.innerText = "พร้อมลุยภารกิจต่อไป!";
});

document.getElementById("capture-btn").addEventListener("click", captureImage);

imageUpload.addEventListener("change", (event) => {
    if (event.target.files.length > 0) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
            cameraContainer.style.display = 'none';
            inputOptions.classList.remove("hidden");
            predict(); 
        };
        reader.readAsDataURL(event.target.files[0]);
    }
});

// รันโปรแกรมทันที
init();
