// 🚨 สำคัญมาก: นำ Web App URL ของ Google Apps Script มาใส่ในเครื่องหมายคำพูดด้านล่าง
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbx1pdHOY5ubDDb-FSj3FuOIyOgRlRUloRKH_TCDQjxn85EUtizkwuIWI-BGa-IeWau0ZQ/exec";

let stream;
let currentFacingMode = 'environment';
let score = 0;
let isGameActive = false;

// 🎯 กำหนดประเภทภารกิจ
const missions = [
    { id: 'recycle', name: 'ขยะรีไซเคิล ♻️' },
    { id: 'organic', name: 'ขยะอินทรีย์ 🍂' },
    { id: 'hazardous', name: 'ขยะอันตราย ☠️' },
    { id: 'general', name: 'ขยะทั่วไป 🗑️' }
];
let currentMission = null;

// อ้างอิง UI
const statusDiv = document.getElementById("status");
const scoreDisplay = document.getElementById("score");
const mascot = document.getElementById("mascot");
const gameMessage = document.getElementById("game-message");
const gameContainer = document.querySelector(".game-container");
const imagePreview = document.getElementById("image-preview");
const cameraContainer = document.getElementById("camera-container");
const videoPreview = document.getElementById("video-preview");

const startGameBtn = document.getElementById("start-game-btn");
const cameraBtn = document.getElementById("camera-btn");
const browseBtn = document.getElementById("browse-btn");
const restartBtn = document.getElementById("restart-btn");
const imageUpload = document.getElementById("image-upload");

// ---- ระบบเสียงเกม 8-bit ----
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playTone(freq, type, duration, vol=0.1) {
    if(audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type; 
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.connect(gain); 
    gain.connect(audioCtx.destination);
    osc.start();
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
    osc.stop(audioCtx.currentTime + duration);
}

const sfx = {
    start: () => { playTone(440, 'square', 0.1); setTimeout(() => playTone(660, 'square', 0.2), 150); }, 
    coin: () => { playTone(1200, 'sine', 0.1); setTimeout(() => playTone(1600, 'sine', 0.3), 100); }, 
    error: () => { playTone(300, 'sawtooth', 0.2); setTimeout(() => playTone(200, 'sawtooth', 0.4), 150); }, 
    shutter: () => { playTone(800, 'square', 0.05); },
    click: () => { playTone(600, 'sine', 0.05); },
    win: () => { 
        playTone(523.25, 'sine', 0.1); setTimeout(() => playTone(659.25, 'sine', 0.1), 100);
        setTimeout(() => playTone(783.99, 'sine', 0.1), 200); setTimeout(() => playTone(1046.50, 'sine', 0.4), 300);
    }
};

// 🎮 เริ่มเกมใหม่
function startGame() {
    sfx.start();
    score = 0;
    isGameActive = true;
    scoreDisplay.innerText = score;
    startGameBtn.classList.add("hidden");
    restartBtn.classList.add("hidden");
    cameraBtn.classList.remove("hidden");
    browseBtn.classList.remove("hidden");
    gameContainer.className = "game-container";
    
    setNewMission();
}

// 🎯 สุ่มภารกิจใหม่
function setNewMission() {
    if (!isGameActive) return;
    const randomIdx = Math.floor(Math.random() * missions.length);
    currentMission = missions[randomIdx];
    
    document.getElementById("current-mission").innerText = `หาภาพ "${currentMission.name}"`;
    mascot.innerText = "🕵️‍♂️";
    gameMessage.innerText = `ภารกิจมาแล้ว! รีบไปถ่ายรูป ${currentMission.name} มาให้ฉันดูหน่อย!`;
    statusDiv.innerHTML = "รอรับภาพถ่าย...";
}

// 🏆 ฉากจบเกมเมื่อชนะ
function triggerWinGame() {
    isGameActive = false;
    sfx.win();
    gameContainer.className = "game-container bg-win";
    mascot.innerText = "👑🎊";
    gameMessage.innerText = "สุดยอดไปเลยฮีโร่! คุณทำภารกิจสำเร็จ ได้คะแนนทะลุ 50 แต้มแล้ว โลกปลอดภัยเพราะคุณ!";
    document.getElementById("current-mission").innerText = "🎉 ภารกิจสำเร็จ! 🎉";
    statusDiv.innerHTML = "YOU WIN!";
    
    cameraBtn.classList.add("hidden");
    browseBtn.classList.add("hidden");
    restartBtn.classList.remove("hidden"); 
}

// ระบบกล้อง
async function startCamera() {
    if (stream) stream.getTracks().forEach(track => track.stop());
    const constraints = { video: { facingMode: { exact: currentFacingMode } } };

    try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        videoPreview.srcObject = stream;
        cameraBtn.classList.add("hidden"); 
        browseBtn.classList.add("hidden");
        imagePreview.style.display = 'none';
        cameraContainer.style.display = 'flex';
        statusDiv.innerHTML = "เล็งขยะให้ตรงกลางเป้าหมาย!";
    } catch (e) {
        if (currentFacingMode === 'environment') {
            currentFacingMode = 'user';
            startCamera(); 
        } else {
            statusDiv.innerHTML = "❌ ไม่สามารถเปิดกล้องได้";
        }
    }
}

// ถ่ายภาพ
function captureImage() {
    sfx.shutter();
    const canvas = document.createElement("canvas");
    const scale = Math.min(640 / videoPreview.videoWidth, 1);
    canvas.width = videoPreview.videoWidth * scale; 
    canvas.height = videoPreview.videoHeight * scale;
    canvas.getContext("2d").drawImage(videoPreview, 0, 0, canvas.width, canvas.height);
    
    imagePreview.src = canvas.toDataURL("image/jpeg", 0.7);
    imagePreview.style.display = 'block';
    
    if (stream) stream.getTracks().forEach(track => track.stop());
    cameraContainer.style.display = 'none';
    
    predict(); 
}

// 🧠 ส่งรูปไปให้ Backend ตรวจสอบ
async function predict() {
    if (GAS_WEB_APP_URL.includes("ใส่_URL") || GAS_WEB_APP_URL === "") {
        alert("❌ ลืมใส่ URL ของ Google Apps Script ในไฟล์ script.js ครับ");
        cameraBtn.classList.remove("hidden"); browseBtn.classList.remove("hidden");
        return;
    }

    statusDiv.innerHTML = "📡 กำลังให้ AI ตรวจสอบว่าตรงกับภารกิจไหม...";
    mascot.innerText = "🧐";
    gameMessage.innerText = "กำลังตรวจดูให้ ถ่ายมาถูกประเภทไหมน้า...";

    try {
        const response = await fetch(GAS_WEB_APP_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ image: imagePreview.src })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message || data.error);

        const aiAnswer = data.choices[0].message.content.trim().toLowerCase();
        
        // ⚖️ กติกาเกม: เช็คว่าคำตอบ AI ตรงกับภารกิจหรือไม่
        if (aiAnswer.includes("null")) {
            mascot.innerText = "❓";
            gameMessage.innerText = "นี่ไม่ใช่ขยะนี่นา! อย่าแกล้งฉันสิ โดนหัก 5 แต้ม";
            score -= 5;
            sfx.error();
            mascot.classList.add("shake"); 
            setTimeout(() => mascot.classList.remove("shake"), 500);
            
        } else if (aiAnswer.includes(currentMission.id)) {
            // 🟢 ตอบถูก! (+10 แต้ม)
            score += 10;
            sfx.coin();
            mascot.innerText = "🤩✅";
            gameMessage.innerText = `เก่งมาก! นี่คือ ${currentMission.name} ถูกต้องตามภารกิจ รับไปเลย +10 แต้ม`;
            gameContainer.className = "game-container bg-" + currentMission.id;
            
        } else {
            // 🔴 ตอบผิดประเภท! (-5 แต้ม)
            score -= 5;
            sfx.error();
            mascot.innerText = "❌😱";
            
            let wrongTypeStr = "ขยะประเภทอื่น";
            if(aiAnswer.includes("recycle")) wrongTypeStr = "ขยะรีไซเคิล";
            else if(aiAnswer.includes("organic")) wrongTypeStr = "ขยะอินทรีย์";
            else if(aiAnswer.includes("hazardous")) wrongTypeStr = "ขยะอันตราย";
            else if(aiAnswer.includes("general")) wrongTypeStr = "ขยะทั่วไป";
            
            gameMessage.innerText = `ผิดประเภทนะ! นี่มันคือ ${wrongTypeStr} ไม่ใช่ ${currentMission.name} ซะหน่อย! โดนหัก 5 แต้ม`;
            gameContainer.className = "game-container bg-danger";
            mascot.classList.add("shake"); 
            setTimeout(() => mascot.classList.remove("shake"), 500);
        }

        scoreDisplay.innerText = score;
        scoreDisplay.classList.add("bounce");
        setTimeout(() => scoreDisplay.classList.remove("bounce"), 1000);

        // เช็คคะแนนชนะ
        if (score >= 50) {
            triggerWinGame();
        } else {
            statusDiv.innerHTML = "รอดูภารกิจต่อไป...";
            setTimeout(() => {
                cameraBtn.classList.remove("hidden");
                browseBtn.classList.remove("hidden");
                gameContainer.className = "game-container";
                setNewMission();
            }, 3500); 
        }

    } catch (error) {
        console.error("Error:", error);
        statusDiv.innerHTML = "❌ การเชื่อมต่อล้มเหลว ลองถ่ายรูปใหม่อีกครั้ง";
        cameraBtn.classList.remove("hidden");
        browseBtn.classList.remove("hidden");
    }
}

// Event Listeners
startGameBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);

document.getElementById("camera-btn").addEventListener("click", () => { sfx.click(); startCamera(); });
document.getElementById("browse-btn").addEventListener("click", () => { sfx.click(); imageUpload.click(); });

document.getElementById("switch-camera-btn").addEventListener("click", () => {
    sfx.click(); 
    currentFacingMode = (currentFacingMode === 'user') ? 'environment' : 'user'; 
    startCamera();
});

document.getElementById("close-camera-btn").addEventListener("click", () => {
    sfx.click();
    if (stream) stream.getTracks().forEach(track => track.stop());
    cameraContainer.style.display = 'none';
    cameraBtn.classList.remove("hidden"); 
    browseBtn.classList.remove("hidden");
    statusDiv.innerHTML = "ยกเลิกกล้องแล้ว";
});

document.getElementById("capture-btn").addEventListener("click", captureImage);

imageUpload.addEventListener("change", (event) => {
    if (event.target.files.length > 0) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
            cameraContainer.style.display = 'none';
            predict(); 
        };
        reader.readAsDataURL(event.target.files[0]);
    }
});
