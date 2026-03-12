// ✅ เอา API Key ออกแล้ว และใส่ URL ของ Google Apps Script ที่เราเพิ่ง Deploy ได้มาแทนที่ตรงนี้
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/xxxxxxxxxxxx/exec"; 

let stream;
let currentFacingMode = 'environment';
let score = 0;
let combo = 0;

// ... (เก็บตัวแปรอ้างอิง UI เลื่อนลงมาจนถึงระบบเสียง sfx, init(), startCamera(), captureImage() ไว้เหมือนเดิมเป๊ะๆ) ...

// 🧠 แก้ไขฟังก์ชัน predict() ให้ส่งรูปไปหา Google Apps Script แทน
async function predict() {
    if (GAS_WEB_APP_URL.includes("xxx")) {
        statusDiv.innerHTML = "❌ กรุณาใส่ Web App URL ของ Google Apps Script ก่อนใช้งาน";
        sfx.error();
        return;
    }

    statusDiv.innerHTML = "📡 กำลังส่งภาพให้ระบบประมวลผล (รอแป๊บนึงนะ)...";
    mascot.innerText = "🤔";
    gameMessage.innerText = "อืมมม... ขอเวลาคิดแป๊บนึงนะ!";

    const base64Image = imagePreview.src;

    try {
        // ยิงข้อมูลรูปภาพไปที่ Google Apps Script ของเรา
        const response = await fetch(GAS_WEB_APP_URL, {
            method: "POST",
            // 💡 เคล็ดลับ: ใช้ text/plain เพื่อป้องกันปัญหา CORS Error ข้ามโดเมนของ Google
            headers: {
                "Content-Type": "text/plain;charset=utf-8", 
            },
            body: JSON.stringify({ image: base64Image })
        });

        const data = await response.json();
        
        // เช็คว่ามี Error จาก OpenAI พ่นกลับมาไหม
        if (data.error) {
            throw new Error(data.error.message || data.error);
        }

        const aiAnswer = data.choices[0].message.content.trim().toLowerCase();
        
        gameContainer.className = "game-container"; 
        let earnedPoints = 10;

        // เช็คคำตอบจาก AI (โค้ดส่วนนี้เหมือนเดิมเลย)
        if (aiAnswer.includes("null")) {
            mascot.innerText = "❓";
            gameMessage.innerText = "เอ๊ะ! นี่ไม่ใช่ขยะนี่นา ถ่ายขยะของจริงมาให้ดูหน่อย";
            combo = 0;
            sfx.error();
            mascot.classList.add("shake"); setTimeout(() => mascot.classList.remove("shake"), 500);
            comboBadge.classList.add("hidden");
        } else {
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
// ... (Event Listener ด้านล่างคงไว้เหมือนเดิม) ...
