// ========================================
// ระบบแสดงผลบน Canvas สำหรับผู้ป่วย Stroke
// canvas-display.js
// ========================================
// ========================================
// ฟังก์ชันตั้งค่า Canvas
// ========================================

function setupCameraCanvas() {
    if (!canvasElement || !videoElement) {
        console.error('❌ ไม่พบ canvas หรือ video element');
        return;
    }

    console.log('🎨 ตั้งค่า Canvas...');

    // รอให้ video พร้อม
    const updateCanvasSize = () => {
        if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
            canvasElement.width = videoElement.videoWidth;
            canvasElement.height = videoElement.videoHeight;
            
            // ปรับ CSS ให้แสดงผลได้ดี
            canvasElement.style.width = '100%';
            canvasElement.style.height = 'auto';
            canvasElement.style.maxHeight = '400px';
            
            console.log(`✅ Canvas ขนาด: ${canvasElement.width}x${canvasElement.height}`);
        } else {
            // ลองอีกครั้งหลัง 100ms
            setTimeout(updateCanvasSize, 100);
        }
    };
    
    updateCanvasSize();
}

// ========================================
// ฟังก์ชันวาดผลลัพธ์การตรวจจับ
// ========================================

function drawPoseResults() {
    if (!canvasCtx || !poseResults) return;
    
    try {
        // เคลียร์ canvas
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        
        // วาดภาพจากกล้อง
        if (videoElement && videoElement.videoWidth > 0) {
            canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        }
        
        if (poseResults.poseLandmarks) {
            // วาดเส้นเชื่อมจุดโครงร่าง
            drawPoseConnections();
            
            // ไฮไลท์จุดสำคัญตามท่าที่เลือก
            highlightImportantLandmarks();
            
            // วาดจุด landmarks ทั้งหมด
            drawAllLandmarks();
            
            // แสดงข้อมูลเพิ่มเติม
            drawExerciseInfo();
            
            // แสดงข้อมูลการตรวจจับทั้งสองข้าง
            drawSideComparisonInfo();
        }
    } catch (error) {
        console.warn('⚠️ Error in drawPoseResults:', error);
    }
}

function drawPoseConnections() {
    if (!window.drawConnectors || !window.POSE_CONNECTIONS) return;
    
    try {
        window.drawConnectors(canvasCtx, poseResults.poseLandmarks, 
            window.POSE_CONNECTIONS, {
                color: '#00FF00', 
                lineWidth: 2
            });
    } catch (error) {
        console.warn('⚠️ Error drawing connectors:', error);
    }
}

function drawAllLandmarks() {
    if (!window.drawLandmarks) return;
    
    try {
        window.drawLandmarks(canvasCtx, poseResults.poseLandmarks, {
            color: '#FF0000', 
            lineWidth: 1, 
            radius: 3
        });
    } catch (error) {
        console.warn('⚠️ Error drawing landmarks:', error);
    }
}

// ========================================
// ฟังก์ชันไฮไลท์จุดสำคัญ
// ========================================

function highlightImportantLandmarks() {
    if (!poseResults.poseLandmarks || !window.drawLandmarks || !currentExercise) return;
    
    const landmarks = poseResults.poseLandmarks;
    let highlightIndices = [];
    
    // เลือกจุดสำคัญตามประเภทและท่าการฝึก
    switch (currentCategory) {
        case 'warmup':
            highlightIndices = getWarmupHighlights();
            break;
        case 'upper-body':
            highlightIndices = getUpperBodyHighlights();
            break;
        case 'trunk':
            highlightIndices = getTrunkHighlights();
            break;
        case 'lower-body':
            highlightIndices = getLowerBodyHighlights();
            break;
    }
    
    // วาดจุดไฮไลท์
    const highlightLandmarks = highlightIndices
        .map(index => landmarks[index])
        .filter(landmark => landmark && landmark.visibility > 0.5);
    
    if (highlightLandmarks.length > 0) {
        try {
            // วาดจุดไฮไลท์สีเหลือง
            window.drawLandmarks(canvasCtx, highlightLandmarks, {
                color: '#FFFF00', 
                lineWidth: 3, 
                radius: 6
            });
            
            // วาดจุดไฮไลท์พิเศษสำหรับข้างที่กำลังตรวจจับ
            drawActiveSideHighlights(landmarks, highlightIndices);
        } catch (error) {
            console.warn('⚠️ Error highlighting landmarks:', error);
        }
    }
}

function getWarmupHighlights() {
    switch (currentExercise) {
        case 'arm-spread':
            // ไหล่, ศอก, ข้อมือทั้งสองข้าง
            return [11, 12, 13, 14, 15, 16];
        case 'neck-flex':
            // จมูก, ปาก, คาง
            return [0, 9, 10];
        case 'neck-tilt':
            // จมูก, หูทั้งสองข้าง
            return [0, 7, 8];
        default:
            return [];
    }
}

function getUpperBodyHighlights() {
    switch (currentExercise) {
        case 'shoulder-shrug':
            // ไหล่และสะโพกทั้งสองข้าง
            return [11, 12, 23, 24];
        case 'hand-grip-side':
        case 'hand-grip-front':
        case 'finger-touch':
            // ข้อมือทั้งสองข้าง
            return [15, 16];
        case 'arm-overhead':
            // ไหล่, ศอก, ข้อมือทั้งสองข้าง
            return [11, 12, 13, 14, 15, 16];
        case 'elbow-flex':
            // ไหล่, ศอก, ข้อมือทั้งสองข้าง
            return [11, 12, 13, 14, 15, 16];
        case 'wrist-rotation':
            // ศอก, ข้อมือทั้งสองข้าง
            return [13, 14, 15, 16];
        default:
            return [];
    }
}

function getTrunkHighlights() {
    switch (currentExercise) {
        case 'trunk-sway':
        case 'back-extension':
            // ไหล่และสะโพกทั้งสองข้าง
            return [11, 12, 23, 24];
        case 'trunk-reach':
        case 'side-reach':
            // แขนทั้งสองข้าง
            return [11, 12, 13, 14, 15, 16];
        case 'trunk-reach-floor':
            // แขนและสะโพกทั้งสองข้าง
            return [11, 12, 15, 16, 23, 24];
        default:
            return [];
    }
}

function getLowerBodyHighlights() {
    switch (currentExercise) {
        case 'hip-shift':
            // สะโพกทั้งสองข้าง
            return [23, 24];
        case 'leg-abduction':
        case 'leg-together':
            // เข่าทั้งสองข้าง
            return [25, 26];
        case 'leg-forward':
        case 'knee-extension':
            // สะโพก, เข่า, ข้อเท้าทั้งสองข้าง
            return [23, 24, 25, 26, 27, 28];
        default:
            return [];
    }
}

function drawActiveSideHighlights(landmarks, highlightIndices) {
    // วาดจุดพิเศษสำหรับข้างที่มีการเคลื่อนไหวมากกว่า
    const leftQuality = bothSidesData.left.totalQuality || 0;
    const rightQuality = bothSidesData.right.totalQuality || 0;
    
    let activeSideColor = '#FF6B6B'; // สีแดงอ่อนสำหรับข้างที่ไม่ได้ใช้
    let activeIndices = [];
    
    if (leftQuality > rightQuality + 10) {
        // ข้างซ้ายเคลื่อนไหวมากกว่า
        activeSideColor = '#4ECDC4'; // สีเขียวอ่อน
        activeIndices = highlightIndices.filter(index => [11, 13, 15, 23, 25, 27].includes(index));
    } else if (rightQuality > leftQuality + 10) {
        // ข้างขวาเคลื่อนไหวมากกว่า
        activeSideColor = '#45B7D1'; // สีฟ้าอ่อน
        activeIndices = highlightIndices.filter(index => [12, 14, 16, 24, 26, 28].includes(index));
    }
    
    if (activeIndices.length > 0) {
        const activeLandmarks = activeIndices
            .map(index => landmarks[index])
            .filter(landmark => landmark && landmark.visibility > 0.6);
        
        if (activeLandmarks.length > 0) {
            try {
                window.drawLandmarks(canvasCtx, activeLandmarks, {
                    color: activeSideColor,
                    lineWidth: 4,
                    radius: 8
                });
            } catch (error) {
                console.warn('⚠️ Error drawing active side highlights:', error);
            }
        }
    }
}

// ========================================
// ฟังก์ชันแสดงข้อมูลการออกกำลังกาย
// ========================================

function drawExerciseInfo() {
    if (!canvasCtx) return;
    
    try {
        // ตั้งค่าฟอนต์และสี
        canvasCtx.font = '16px Kanit, Arial, sans-serif';
        canvasCtx.fillStyle = '#FFFFFF';
        canvasCtx.strokeStyle = '#000000';
        canvasCtx.lineWidth = 3;
        
        let yPosition = 30;
        
        // แสดงท่าที่กำลังฝึก
        if (currentExercise) {
            const exerciseText = `ท่า: ${getExerciseName(currentExercise)}`;
            drawTextWithOutline(exerciseText, 10, yPosition);
            yPosition += 25;
        }
        
        // แสดงข้างที่ตรวจจับได้
        const sideText = getAutoDetectionText();
        drawTextWithOutline(sideText, 10, yPosition);
        yPosition += 25;
        
        // แสดงมุมปัจจุบัน (ถ้ามี)
        if (currentAngle > 0 && movementPhase !== 'rest') {
            const angleText = `มุม: ${Math.round(currentAngle)}°`;
            drawTextWithOutline(angleText, 10, yPosition);
            yPosition += 25;
        }
        
        // แสดงเฟสการเคลื่อนไหว
        if (movementPhase !== 'rest') {
            const phaseText = `สถานะ: ${getPhaseDisplayName(movementPhase)}`;
            drawTextWithOutline(phaseText, 10, yPosition);
            yPosition += 25;
        }
        
        // แสดงจำนวนครั้งที่ทำได้
        if (repCounter > 0) {
            const repText = `ครั้งที่: ${repCounter}/${targetReps}`;
            drawTextWithOutline(repText, 10, yPosition);
        }
        
    } catch (error) {
        console.warn('⚠️ Error drawing exercise info:', error);
    }
}

function drawTextWithOutline(text, x, y) {
    // วาดขอบข้อความสีดำ
    canvasCtx.strokeText(text, x, y);
    // วาดข้อความสีขาว
    canvasCtx.fillText(text, x, y);
}

function getAutoDetectionText() {
    const leftQuality = bothSidesData.left.totalQuality || 0;
    const rightQuality = bothSidesData.right.totalQuality || 0;
    
    if (leftQuality > rightQuality + 15) {
        return 'ตรวจจับ: ข้างซ้าย (อัตโนมัติ)';
    } else if (rightQuality > leftQuality + 15) {
        return 'ตรวจจับ: ข้างขวา (อัตโนมัติ)';
    } else {
        return 'ตรวจจับ: ทั้งสองข้าง';
    }
}

function getPhaseDisplayName(phase) {
    const phaseNames = {
        'lifting': 'กำลังยก',
        'lowering': 'กำลังลด',
        'flexing': 'กำลังงอ',
        'extending': 'กำลังเหยียด',
        'spreading': 'กำลังกาง',
        'closing': 'กำลังหุบ',
        'reaching': 'กำลังเอื้อม',
        'bending': 'กำลังก้ม',
        'tilting': 'กำลังเอียง',
        'shrugging': 'กำลังยักไหล่',
        'gripping': 'กำลังกำ-แบมือ',
        'rotating': 'กำลังหมุน',
        'touching': 'กำลังแตะ',
        'swaying': 'กำลังโยก',
        'shifting': 'กำลังยก',
        'stepping': 'กำลังก้าว',
        'abducting': 'กำลังกาง',
        'holding': 'กำลังคงท่า',
        'returning': 'กำลังกลับท่าเดิม'
    };
    return phaseNames[phase] || phase;
}

// ========================================
// ฟังก์ชันแสดงข้อมูลเปรียบเทียบทั้งสองข้าง
// ========================================

function drawSideComparisonInfo() {
    if (!canvasCtx) return;
    
    try {
        // วาดกรอบข้อมูลมุมขวาบน
        const boxWidth = 200;
        const boxHeight = 80;
        const boxX = canvasElement.width - boxWidth - 10;
        const boxY = 10;
        
        // วาดพื้นหลังโปร่งใส
        canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        canvasCtx.fillRect(boxX, boxY, boxWidth, boxHeight);
        
        // วาดขอบ
        canvasCtx.strokeStyle = '#FFFFFF';
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeRect(boxX, boxY, boxWidth, boxHeight);
        
        // ตั้งค่าฟอนต์
        canvasCtx.font = '14px Kanit, Arial, sans-serif';
        canvasCtx.fillStyle = '#FFFFFF';
        
        // แสดงข้อมูลทั้งสองข้าง
        const leftQuality = Math.round(bothSidesData.left.totalQuality || 0);
        const rightQuality = Math.round(bothSidesData.right.totalQuality || 0);
        
        canvasCtx.fillText('คุณภาพการตรวจจับ:', boxX + 5, boxY + 20);
        canvasCtx.fillText(`ซ้าย: ${leftQuality}%`, boxX + 5, boxY + 40);
        canvasCtx.fillText(`ขวา: ${rightQuality}%`, boxX + 5, boxY + 60);
        
        // แสดงแถบบ่งชี้คุณภาพ
        drawQualityBars(boxX + 80, boxY + 35, leftQuality, rightQuality);
        
    } catch (error) {
        console.warn('⚠️ Error drawing side comparison:', error);
    }
}

function drawQualityBars(x, y, leftQuality, rightQuality) {
    const barWidth = 100;
    const barHeight = 8;
    
    // แถบซ้าย
    canvasCtx.fillStyle = '#FF6B6B';
    canvasCtx.fillRect(x, y - 15, barWidth, barHeight);
    canvasCtx.fillStyle = '#4ECDC4';
    canvasCtx.fillRect(x, y - 15, (leftQuality / 100) * barWidth, barHeight);
    
    // แถบขวา
    canvasCtx.fillStyle = '#FF6B6B';
    canvasCtx.fillRect(x, y + 5, barWidth, barHeight);
    canvasCtx.fillStyle = '#45B7D1';
    canvasCtx.fillRect(x, y + 5, (rightQuality / 100) * barWidth, barHeight);
}

// ========================================
// ฟังก์ชันแสดงผลพิเศษ
// ========================================

function drawSuccessEffect() {
    if (!canvasCtx) return;
    
    try {
        // วาดเอฟเฟกต์เมื่อทำท่าสำเร็จ
        const centerX = canvasElement.width / 2;
        const centerY = canvasElement.height / 2;
        
        // วาดวงกลมเรืองแสง
        canvasCtx.save();
        canvasCtx.globalAlpha = 0.7;
        canvasCtx.fillStyle = '#00FF00';
        canvasCtx.beginPath();
        canvasCtx.arc(centerX, centerY, 50, 0, 2 * Math.PI);
        canvasCtx.fill();
        canvasCtx.restore();
        
        // วาดข้อความสำเร็จ
        canvasCtx.font = 'bold 24px Kanit, Arial, sans-serif';
        canvasCtx.fillStyle = '#FFFFFF';
        canvasCtx.strokeStyle = '#000000';
        canvasCtx.lineWidth = 3;
        
        const successText = '✓ สำเร็จ!';
        const textWidth = canvasCtx.measureText(successText).width;
        const textX = centerX - textWidth / 2;
        const textY = centerY + 8;
        
        canvasCtx.strokeText(successText, textX, textY);
        canvasCtx.fillText(successText, textX, textY);
        
    } catch (error) {
        console.warn('⚠️ Error drawing success effect:', error);
    }
}

function drawMotivationMessage() {
    if (!canvasCtx || movementPhase === 'rest') return;
    
    try {
        const messages = {
            'warmup': ['ดีมาก! ร่างกายเริ่มอุ่นแล้ว', 'เยื่ยม! ทำต่อไป'],
            'upper-body': ['แขนแข็งแรงขึ้นแล้ว!', 'ยอดเยี่ยม! ใช้กล้ามเนื้อได้ดี'],
            'trunk': ['ลำตัวยืดหยุ่นขึ้น!', 'เก่งมาก! ความสมดุลดีขึ้น'],
            'lower-body': ['ขาแข็งแรงขึ้น!', 'ดีเลิศ! ขยับได้คล่องแคล่ว']
        };
        
        const categoryMessages = messages[currentCategory] || ['ดีมาก! ทำต่อไป'];
        const randomMessage = categoryMessages[Math.floor(Math.random() * categoryMessages.length)];
        
        // วาดข้อความกำลังใจ
        canvasCtx.font = '18px Kanit, Arial, sans-serif';
        canvasCtx.fillStyle = '#FFD700';
        canvasCtx.strokeStyle = '#000000';
        canvasCtx.lineWidth = 2;
        
        const textWidth = canvasCtx.measureText(randomMessage).width;
        const textX = (canvasElement.width - textWidth) / 2;
        const textY = canvasElement.height - 50;
        
        canvasCtx.strokeText(randomMessage, textX, textY);
        canvasCtx.fillText(randomMessage, textX, textY);
        
    } catch (error) {
        console.warn('⚠️ Error drawing motivation message:', error);
    }
}

// ========================================
// ฟังก์ชันเอฟเฟกต์พิเศษ
// ========================================

function createCompletionEffect() {
    if (!canvasElement) return;
    
    // สร้างอนิเมชันเมื่อทำครบเซต
    const effect = document.createElement('div');
    effect.style.position = 'absolute';
    effect.style.top = '50%';
    effect.style.left = '50%';
    effect.style.transform = 'translate(-50%, -50%)';
    effect.style.fontSize = '48px';
    effect.style.color = '#00FF00';
    effect.style.fontWeight = 'bold';
    effect.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
    effect.style.animation = 'fadeInOut 3s ease-in-out';
    effect.style.pointerEvents = 'none';
    effect.style.zIndex = '1000';
    effect.textContent = '🎉 ยินดีด้วย! 🎉';
    
    // เพิ่ม CSS animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
            50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
        }
    `;
    document.head.appendChild(style);
    
    // เพิ่มเอฟเฟกต์ลงในหน้า
    const container = canvasElement.parentElement;
    if (container) {
        container.style.position = 'relative';
        container.appendChild(effect);
        
        // ลบเอฟเฟกต์หลัง 3 วินาที
        setTimeout(() => {
            if (effect.parentElement) {
                effect.parentElement.removeChild(effect);
            }
            if (style.parentElement) {
                style.parentElement.removeChild(style);
            }
        }, 3000);
    }
}

// ========================================
// ฟังก์ชันสำหรับการแสดงผลแบบเต็มจอ
// ========================================

function toggleFullscreen() {
    const videoContainer = document.querySelector('.video-container');
    if (!videoContainer) return;
    
    if (videoContainer.classList.contains('fullscreen-video')) {
        // ออกจากโหมดเต็มจอ
        videoContainer.classList.remove('fullscreen-video');
        const exitButton = videoContainer.querySelector('.fullscreen-exit');
        if (exitButton) {
            exitButton.remove();
        }
    } else {
        // เข้าสู่โหมดเต็มจอ
        videoContainer.classList.add('fullscreen-video');
        
        // เพิ่มปุ่มออกจากเต็มจอ
        const exitButton = document.createElement('div');
        exitButton.className = 'fullscreen-exit';
        exitButton.innerHTML = '<i class="fas fa-times"></i>';
        exitButton.onclick = toggleFullscreen;
        videoContainer.appendChild(exitButton);
    }
}

// ========================================
// ฟังก์ชันตั้งค่า Event Listeners สำหรับ Canvas
// ========================================

function setupCanvasEventListeners() {
    // ปุ่มเต็มจอ
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', toggleFullscreen);
    }
    
    // คลิกที่ canvas เพื่อแสดงข้อมูลเพิ่มเติม
    if (canvasElement) {
        canvasElement.addEventListener('click', function(event) {
            const rect = canvasElement.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            // แสดงข้อมูลการคลิก
            console.log(`คลิกที่พิกัด: (${Math.round(x)}, ${Math.round(y)})`);
            
            // อาจเพิ่มฟีเจอร์เพิ่มเติมได้ เช่น การเลือกจุด landmark
        });
    }
}

// ========================================
// ฟังก์ชันช่วยเหลือ
// ========================================

function resizeCanvas() {
    if (!canvasElement || !videoElement) return;
    
    // ปรับขนาด canvas ให้เหมาะสมกับหน้าจอ
    const container = canvasElement.parentElement;
    if (container) {
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
            const videoAspectRatio = videoElement.videoWidth / videoElement.videoHeight;
            const containerAspectRatio = containerWidth / containerHeight;
            
            if (videoAspectRatio > containerAspectRatio) {
                // วิดีโอกว้างกว่า container
                canvasElement.style.width = '100%';
                canvasElement.style.height = 'auto';
            } else {
                // วิดีโอสูงกว่า container
                canvasElement.style.width = 'auto';
                canvasElement.style.height = '100%';
            }
        }
    }
}
// ========================================
// ระบบแสดงผลบน Canvas สำหรับผู้ป่วย Stroke - Enhanced Version
// canvas-display.js - เพิ่มการแสดงมุมบน Canvas แบบเรียลไทม์
// ========================================

// ตัวแปรสำหรับการแสดงผลมุมบน Canvas
let showAnglesOnCanvas = true;
let angleDisplayMode = 'all'; // 'all', 'selected', 'exercise-specific'
let canvasAngleHistory = [];
let maxHistoryLength = 50;

// ========================================
// ฟังก์ชันตั้งค่า Canvas
// ========================================

function setupCameraCanvas() {
    if (!canvasElement || !videoElement) {
        console.error('❌ ไม่พบ canvas หรือ video element');
        return;
    }

    console.log('🎨 ตั้งค่า Canvas...');

    // รอให้ video พร้อม
    const updateCanvasSize = () => {
        if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
            canvasElement.width = videoElement.videoWidth;
            canvasElement.height = videoElement.videoHeight;
            
            // ปรับ CSS ให้แสดงผลได้ดี
            canvasElement.style.width = '100%';
            canvasElement.style.height = 'auto';
            canvasElement.style.maxHeight = '400px';
            
            // เพิ่มปุ่มควบคุมการแสดงมุมบน Canvas
            addCanvasControls();
            
            console.log(`✅ Canvas ขนาด: ${canvasElement.width}x${canvasElement.height}`);
        } else {
            // ลองอีกครั้งหลัง 100ms
            setTimeout(updateCanvasSize, 100);
        }
    };
    
    updateCanvasSize();
}

function addCanvasControls() {
    // ตรวจสอบว่ามีปุ่มควบคุมอยู่แล้วหรือไม่
    if (document.getElementById('canvas-angle-controls')) return;
    
    const cameraControls = document.querySelector('.camera-controls');
    if (!cameraControls) return;
    
    // สร้างปุ่มควบคุม
    const controlsHTML = `
        <div id="canvas-angle-controls" class="canvas-controls">
            <button class="btn-icon" id="toggle-canvas-angles" title="เปิด/ปิดการแสดงมุมบน Canvas">
                <i class="fas fa-ruler-combined"></i>
            </button>
            <button class="btn-icon" id="change-angle-mode" title="เปลี่ยนโหมดการแสดงมุม">
                <i class="fas fa-eye"></i>
            </button>
        </div>
    `;
    
    // เพิ่มปุ่มควบคุมลงใน camera controls
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = controlsHTML;
    cameraControls.appendChild(tempDiv.firstElementChild);
    
    // เพิ่ม event listeners
    const toggleAnglesBtn = document.getElementById('toggle-canvas-angles');
    const changeModeBtn = document.getElementById('change-angle-mode');
    
    if (toggleAnglesBtn) {
        toggleAnglesBtn.addEventListener('click', toggleCanvasAngles);
    }
    
    if (changeModeBtn) {
        changeModeBtn.addEventListener('click', changeAngleDisplayMode);
    }
}

// ========================================
// ฟังก์ชันวาดผลลัพธ์การตรวจจับ
// ========================================

function drawPoseResults() {
    if (!canvasCtx || !poseResults) return;
    
    try {
        // เคลียร์ canvas
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        
        // วาดภาพจากกล้อง
        if (videoElement && videoElement.videoWidth > 0) {
            canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        }
        
        if (poseResults.poseLandmarks) {
            // วาดเส้นเชื่อมจุดโครงร่าง
            drawPoseConnections();
            
            // ไฮไลท์จุดสำคัญตามท่าที่เลือก
            highlightImportantLandmarks();
            
            // วาดจุด landmarks ทั้งหมด
            drawAllLandmarks();
            
            // แสดงมุมบน Canvas (ฟีเจอร์ใหม่)
            if (showAnglesOnCanvas) {
                drawAnglesOnCanvas();
            }
            
            // แสดงข้อมูลเพิ่มเติม
            drawExerciseInfo();
            
            // แสดงข้อมูลการตรวจจับทั้งสองข้าง
            drawSideComparisonInfo();
        }
    } catch (error) {
        console.warn('⚠️ Error in drawPoseResults:', error);
    }
}

// ========================================
// ฟังก์ชันแสดงมุมบน Canvas
// ========================================

function drawAnglesOnCanvas() {
    if (!poseResults.poseLandmarks || !window.realtimeAngleSystem) return;
    
    const landmarks = poseResults.poseLandmarks;
    
    // วาดมุมตามโหมดที่เลือก
    switch (angleDisplayMode) {
        case 'all':
            drawAllAnglesOnCanvas(landmarks);
            break;
        case 'selected':
            drawSelectedAnglesOnCanvas(landmarks);
            break;
        case 'exercise-specific':
            drawExerciseSpecificAngles(landmarks);
            break;
    }
    
    // วาดกราฟประวัติมุม
    drawAngleHistory();
}

function drawAllAnglesOnCanvas(landmarks) {
    const angles = window.realtimeAngleSystem.realtimeAngles;
    
    // วาดมุมไหล่
    drawAngleAtJoint(landmarks[11], angles.leftShoulder, 'ไหล่ซ้าย', '#4ECDC4');
    drawAngleAtJoint(landmarks[12], angles.rightShoulder, 'ไหล่ขวา', '#45B7D1');
    
    // วาดมุมศอก
    drawAngleAtJoint(landmarks[13], angles.leftElbow, 'ศอกซ้าย', '#96CEB4');
    drawAngleAtJoint(landmarks[14], angles.rightElbow, 'ศอกขวา', '#FFEAA7');
    
    // วาดมุมเข่า
    drawAngleAtJoint(landmarks[25], angles.leftKnee, 'เข่าซ้าย', '#DDA0DD');
    drawAngleAtJoint(landmarks[26], angles.rightKnee, 'เข่าขวา', '#F0B27A');
    
    // วาดมุมคอและลำตัว
    const neckPos = {
        x: (landmarks[7].x + landmarks[8].x) / 2,
        y: (landmarks[7].y + landmarks[8].y) / 2
    };
    drawAngleAtJoint(neckPos, angles.neckTilt, 'คอ', '#FF6B6B');
    
    const trunkPos = {
        x: (landmarks[11].x + landmarks[12].x) / 2,
        y: (landmarks[11].y + landmarks[12].y) / 2
    };
    drawAngleAtJoint(trunkPos, angles.trunkTilt, 'ลำตัว', '#A8E6CF');
}

function drawSelectedAnglesOnCanvas(landmarks) {
    const angles = window.realtimeAngleSystem.realtimeAngles;
    const detectedSide = autoDetectedSide;
    
    if (detectedSide === 'left' || detectedSide === 'both') {
        drawAngleAtJoint(landmarks[11], angles.leftShoulder, 'ไหล่ซ้าย', '#4ECDC4');
        drawAngleAtJoint(landmarks[13], angles.leftElbow, 'ศอกซ้าย', '#96CEB4');
        drawAngleAtJoint(landmarks[25], angles.leftKnee, 'เข่าซ้าย', '#DDA0DD');
    }
    
    if (detectedSide === 'right' || detectedSide === 'both') {
        drawAngleAtJoint(landmarks[12], angles.rightShoulder, 'ไหล่ขวา', '#45B7D1');
        drawAngleAtJoint(landmarks[14], angles.rightElbow, 'ศอกขวา', '#FFEAA7');
        drawAngleAtJoint(landmarks[26], angles.rightKnee, 'เข่าขวา', '#F0B27A');
    }
}

function drawExerciseSpecificAngles(landmarks) {
    if (!currentExercise || !currentCategory) return;
    
    const angles = window.realtimeAngleSystem.realtimeAngles;
    
    switch (currentCategory) {
        case 'warmup':
            drawWarmupAngles(landmarks, angles);
            break;
        case 'upper-body':
            drawUpperBodyAngles(landmarks, angles);
            break;
        case 'trunk':
            drawTrunkAngles(landmarks, angles);
            break;
        case 'lower-body':
            drawLowerBodyAngles(landmarks, angles);
            break;
    }
}

function drawWarmupAngles(landmarks, angles) {
    switch (currentExercise) {
        case 'arm-spread':
            drawAngleAtJoint(landmarks[11], angles.leftShoulder, 'ไหล่ซ้าย', '#4ECDC4');
            drawAngleAtJoint(landmarks[12], angles.rightShoulder, 'ไหล่ขวา', '#45B7D1');
            break;
        case 'neck-flex':
        case 'neck-tilt':
            const neckPos = {
                x: (landmarks[7].x + landmarks[8].x) / 2,
                y: (landmarks[7].y + landmarks[8].y) / 2
            };
            drawAngleAtJoint(neckPos, angles.neckTilt, 'คอ', '#FF6B6B');
            break;
    }
}

function drawUpperBodyAngles(landmarks, angles) {
    // แสดงมุมส่วนบนที่เกี่ยวข้องกับท่าที่กำลังทำ
    drawAngleAtJoint(landmarks[11], angles.leftShoulder, 'ไหล่ซ้าย', '#4ECDC4');
    drawAngleAtJoint(landmarks[12], angles.rightShoulder, 'ไหล่ขวา', '#45B7D1');
    drawAngleAtJoint(landmarks[13], angles.leftElbow, 'ศอกซ้าย', '#96CEB4');
    drawAngleAtJoint(landmarks[14], angles.rightElbow, 'ศอกขวา', '#FFEAA7');
}

function drawTrunkAngles(landmarks, angles) {
    const trunkPos = {
        x: (landmarks[11].x + landmarks[12].x) / 2,
        y: (landmarks[11].y + landmarks[12].y) / 2
    };
    drawAngleAtJoint(trunkPos, angles.trunkTilt, 'ลำตัว', '#A8E6CF');
    
    // เพิ่มมุมไหล่สำหรับการเอื้อม
    if (currentExercise.includes('reach')) {
        drawAngleAtJoint(landmarks[11], angles.leftShoulder, 'ไหล่ซ้าย', '#4ECDC4');
        drawAngleAtJoint(landmarks[12], angles.rightShoulder, 'ไหล่ขวา', '#45B7D1');
    }
}

function drawLowerBodyAngles(landmarks, angles) {
    drawAngleAtJoint(landmarks[25], angles.leftKnee, 'เข่าซ้าย', '#DDA0DD');
    drawAngleAtJoint(landmarks[26], angles.rightKnee, 'เข่าขวา', '#F0B27A');
    drawAngleAtJoint(landmarks[23], angles.leftHip, 'สะโพกซ้าย', '#FFB6C1');
    drawAngleAtJoint(landmarks[24], angles.rightHip, 'สะโพกขวา', '#98FB98');
}

function drawAngleAtJoint(landmark, angle, label, color) {
    if (!landmark || !landmark.visibility || landmark.visibility < 0.5 || angle === 0) return;
    
    try {
        const x = landmark.x * canvasElement.width;
        const y = landmark.y * canvasElement.height;
        
        // วาดวงกลมรอบข้อต่อ
        canvasCtx.save();
        canvasCtx.beginPath();
        canvasCtx.arc(x, y, 25, 0, 2 * Math.PI);
        canvasCtx.strokeStyle = color;
        canvasCtx.lineWidth = 3;
        canvasCtx.stroke();
        
        // วาดพื้นหลังสำหรับข้อความ
        canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        canvasCtx.fillRect(x - 35, y - 45, 70, 30);
        
        // วาดข้อความมุม
        canvasCtx.fillStyle = color;
        canvasCtx.font = 'bold 14px Kanit, Arial, sans-serif';
        canvasCtx.textAlign = 'center';
        canvasCtx.fillText(`${Math.round(angle)}°`, x, y - 30);
        
        // วาดป้ายชื่อข้อต่อ
        canvasCtx.fillStyle = '#FFFFFF';
        canvasCtx.font = '10px Kanit, Arial, sans-serif';
        canvasCtx.fillText(label, x, y - 18);
        
        // วาดแถบแสดงระดับมุม
        drawAngleIndicator(x, y, angle, color);
        
        canvasCtx.restore();
        
        // เก็บประวัติมุม
        updateAngleHistory(label, angle);
        
    } catch (error) {
        console.warn('⚠️ Error drawing angle at joint:', error);
    }
}

function drawAngleIndicator(x, y, angle, color) {
    const maxAngle = 180;
    const percentage = Math.min(100, (angle / maxAngle) * 100);
    
    // วาดแถบพื้นหลัง
    canvasCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    canvasCtx.lineWidth = 6;
    canvasCtx.beginPath();
    canvasCtx.arc(x, y, 15, 0, 2 * Math.PI);
    canvasCtx.stroke();
    
    // วาดแถบแสดงระดับ
    canvasCtx.strokeStyle = color;
    canvasCtx.lineWidth = 4;
    canvasCtx.beginPath();
    const endAngle = (percentage / 100) * 2 * Math.PI;
    canvasCtx.arc(x, y, 15, -Math.PI / 2, -Math.PI / 2 + endAngle);
    canvasCtx.stroke();
}

function drawAngleHistory() {
    if (canvasAngleHistory.length < 2) return;
    
    try {
        const historyX = canvasElement.width - 150;
        const historyY = 50;
        const historyWidth = 140;
        const historyHeight = 80;
        
        // วาดพื้นหลัง
        canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        canvasCtx.fillRect(historyX, historyY, historyWidth, historyHeight);
        
        // วาดกรอบ
        canvasCtx.strokeStyle = '#FFFFFF';
        canvasCtx.lineWidth = 1;
        canvasCtx.strokeRect(historyX, historyY, historyWidth, historyHeight);
        
        // วาดหัวข้อ
        canvasCtx.fillStyle = '#FFFFFF';
        canvasCtx.font = 'bold 12px Kanit, Arial, sans-serif';
        canvasCtx.textAlign = 'center';
        canvasCtx.fillText('ประวัติมุม', historyX + historyWidth / 2, historyY + 15);
        
        // วาดกราฟเส้น
        drawAngleGraph(historyX + 10, historyY + 25, historyWidth - 20, historyHeight - 35);
        
    } catch (error) {
        console.warn('⚠️ Error drawing angle history:', error);
    }
}

function drawAngleGraph(x, y, width, height) {
    if (canvasAngleHistory.length < 2) return;
    
    const maxAngle = Math.max(...canvasAngleHistory.map(item => item.angle));
    const minAngle = Math.min(...canvasAngleHistory.map(item => item.angle));
    const range = maxAngle - minAngle || 1;
    
    canvasCtx.strokeStyle = '#4ECDC4';
    canvasCtx.lineWidth = 2;
    canvasCtx.beginPath();
    
    canvasAngleHistory.forEach((item, index) => {
        const pointX = x + (index / (canvasAngleHistory.length - 1)) * width;
        const pointY = y + height - ((item.angle - minAngle) / range) * height;
        
        if (index === 0) {
            canvasCtx.moveTo(pointX, pointY);
        } else {
            canvasCtx.lineTo(pointX, pointY);
        }
        
        // วาดจุด
        canvasCtx.save();
        canvasCtx.fillStyle = '#4ECDC4';
        canvasCtx.beginPath();
        canvasCtx.arc(pointX, pointY, 2, 0, 2 * Math.PI);
        canvasCtx.fill();
        canvasCtx.restore();
    });
    
    canvasCtx.stroke();
}

function updateAngleHistory(joint, angle) {
    const timestamp = Date.now();
    
    // เพิ่มข้อมูลใหม่
    canvasAngleHistory.push({
        joint,
        angle,
        timestamp
    });
    
    // จำกัดจำนวนข้อมูล
    if (canvasAngleHistory.length > maxHistoryLength) {
        canvasAngleHistory.shift();
    }
    
    // ลบข้อมูลที่เก่าเกิน 10 วินาที
    const cutoffTime = timestamp - 10000;
    canvasAngleHistory = canvasAngleHistory.filter(item => item.timestamp > cutoffTime);
}

// ========================================
// ฟังก์ชันควบคุมการแสดงผล
// ========================================

function toggleCanvasAngles() {
    showAnglesOnCanvas = !showAnglesOnCanvas;
    
    const toggleBtn = document.getElementById('toggle-canvas-angles');
    if (toggleBtn) {
        if (showAnglesOnCanvas) {
            toggleBtn.innerHTML = '<i class="fas fa-ruler-combined"></i>';
            toggleBtn.title = 'ปิดการแสดงมุมบน Canvas';
            toggleBtn.style.backgroundColor = '#4ECDC4';
        } else {
            toggleBtn.innerHTML = '<i class="fas fa-ruler-combined" style="opacity: 0.5;"></i>';
            toggleBtn.title = 'เปิดการแสดงมุมบน Canvas';
            toggleBtn.style.backgroundColor = '';
        }
    }
    
    console.log(`📊 การแสดงมุมบน Canvas: ${showAnglesOnCanvas ? 'เปิด' : 'ปิด'}`);
}

function changeAngleDisplayMode() {
    const modes = ['all', 'selected', 'exercise-specific'];
    const currentIndex = modes.indexOf(angleDisplayMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    angleDisplayMode = modes[nextIndex];
    
    const changeModeBtn = document.getElementById('change-angle-mode');
    const modeNames = {
        'all': 'ทั้งหมด',
        'selected': 'ข้างที่เลือก',
        'exercise-specific': 'เฉพาะท่า'
    };
    
    const modeIcons = {
        'all': 'fas fa-eye',
        'selected': 'fas fa-eye-slash',
        'exercise-specific': 'fas fa-crosshairs'
    };
    
    if (changeModeBtn) {
        changeModeBtn.innerHTML = `<i class="${modeIcons[angleDisplayMode]}"></i>`;
        changeModeBtn.title = `โหมด: ${modeNames[angleDisplayMode]}`;
    }
    
    // แสดงการแจ้งเตือน
    showFeedback(`เปลี่ยนโหมดการแสดงมุม: ${modeNames[angleDisplayMode]}`);
    
    console.log(`🔄 เปลี่ยนโหมดการแสดงมุม: ${angleDisplayMode}`);
}

// ========================================
// ฟังก์ชันแสดงผลเดิม (ปรับปรุงเล็กน้อย)
// ========================================

function drawPoseConnections() {
    if (!window.drawConnectors || !window.POSE_CONNECTIONS) return;
    
    try {
        window.drawConnectors(canvasCtx, poseResults.poseLandmarks, 
            window.POSE_CONNECTIONS, {
                color: '#00FF00', 
                lineWidth: 2
            });
    } catch (error) {
        console.warn('⚠️ Error drawing connectors:', error);
    }
}

function drawAllLandmarks() {
    if (!window.drawLandmarks) return;
    
    try {
        window.drawLandmarks(canvasCtx, poseResults.poseLandmarks, {
            color: '#FF0000', 
            lineWidth: 1, 
            radius: 3
        });
    } catch (error) {
        console.warn('⚠️ Error drawing landmarks:', error);
    }
}

function highlightImportantLandmarks() {
    if (!poseResults.poseLandmarks || !window.drawLandmarks || !currentExercise) return;
    
    const landmarks = poseResults.poseLandmarks;
    let highlightIndices = [];
    
    // เลือกจุดสำคัญตามประเภทและท่าการฝึก
    switch (currentCategory) {
        case 'warmup':
            highlightIndices = getWarmupHighlights();
            break;
        case 'upper-body':
            highlightIndices = getUpperBodyHighlights();
            break;
        case 'trunk':
            highlightIndices = getTrunkHighlights();
            break;
        case 'lower-body':
            highlightIndices = getLowerBodyHighlights();
            break;
    }
    
    // วาดจุดไฮไลท์
    const highlightLandmarks = highlightIndices
        .map(index => landmarks[index])
        .filter(landmark => landmark && landmark.visibility > 0.5);
    
    if (highlightLandmarks.length > 0) {
        try {
            // วาดจุดไฮไลท์สีเหลือง
            window.drawLandmarks(canvasCtx, highlightLandmarks, {
                color: '#FFFF00', 
                lineWidth: 3, 
                radius: 6
            });
            
            // วาดจุดไฮไลท์พิเศษสำหรับข้างที่กำลังตรวจจับ
            drawActiveSideHighlights(landmarks, highlightIndices);
        } catch (error) {
            console.warn('⚠️ Error highlighting landmarks:', error);
        }
    }
}

function getWarmupHighlights() {
    switch (currentExercise) {
        case 'arm-spread':
            return [11, 12, 13, 14, 15, 16];
        case 'neck-flex':
            return [0, 9, 10];
        case 'neck-tilt':
            return [0, 7, 8];
        default:
            return [];
    }
}

function getUpperBodyHighlights() {
    switch (currentExercise) {
        case 'shoulder-shrug':
            return [11, 12, 23, 24];
        case 'hand-grip-side':
        case 'hand-grip-front':
        case 'finger-touch':
            return [15, 16];
        case 'arm-overhead':
        case 'elbow-flex':
            return [11, 12, 13, 14, 15, 16];
        case 'wrist-rotation':
            return [13, 14, 15, 16];
        default:
            return [];
    }
}

function getTrunkHighlights() {
    switch (currentExercise) {
        case 'trunk-sway':
        case 'back-extension':
            return [11, 12, 23, 24];
        case 'trunk-reach':
        case 'side-reach':
            return [11, 12, 13, 14, 15, 16];
        case 'trunk-reach-floor':
            return [11, 12, 15, 16, 23, 24];
        default:
            return [];
    }
}

function getLowerBodyHighlights() {
    switch (currentExercise) {
        case 'hip-shift':
            return [23, 24];
        case 'leg-abduction':
        case 'leg-together':
            return [25, 26];
        case 'leg-forward':
        case 'knee-extension':
            return [23, 24, 25, 26, 27, 28];
        default:
            return [];
    }
}

function drawActiveSideHighlights(landmarks, highlightIndices) {
    // วาดจุดพิเศษสำหรับข้างที่มีการเคลื่อนไหวมากกว่า
    const leftQuality = bothSidesData.left.totalQuality || 0;
    const rightQuality = bothSidesData.right.totalQuality || 0;
    
    let activeSideColor = '#FF6B6B';
    let activeIndices = [];
    
    if (leftQuality > rightQuality + 10) {
        activeSideColor = '#4ECDC4';
        activeIndices = highlightIndices.filter(index => [11, 13, 15, 23, 25, 27].includes(index));
    } else if (rightQuality > leftQuality + 10) {
        activeSideColor = '#45B7D1';
        activeIndices = highlightIndices.filter(index => [12, 14, 16, 24, 26, 28].includes(index));
    }
    
    if (activeIndices.length > 0) {
        const activeLandmarks = activeIndices
            .map(index => landmarks[index])
            .filter(landmark => landmark && landmark.visibility > 0.6);
        
        if (activeLandmarks.length > 0) {
            try {
                window.drawLandmarks(canvasCtx, activeLandmarks, {
                    color: activeSideColor,
                    lineWidth: 4,
                    radius: 8
                });
            } catch (error) {
                console.warn('⚠️ Error drawing active side highlights:', error);
            }
        }
    }
}

function drawExerciseInfo() {
    if (!canvasCtx) return;
    
    try {
        // ตั้งค่าฟอนต์และสี
        canvasCtx.font = '16px Kanit, Arial, sans-serif';
        canvasCtx.fillStyle = '#FFFFFF';
        canvasCtx.strokeStyle = '#000000';
        canvasCtx.lineWidth = 3;
        
        let yPosition = 30;
        
        // แสดงท่าที่กำลังฝึก
        if (currentExercise) {
            const exerciseText = `ท่า: ${getExerciseName(currentExercise)}`;
            drawTextWithOutline(exerciseText, 10, yPosition);
            yPosition += 25;
        }
        
        // แสดงข้างที่ตรวจจับได้
        const sideText = getAutoDetectionText();
        drawTextWithOutline(sideText, 10, yPosition);
        yPosition += 25;
        
        // แสดงมุมปัจจุบัน (ถ้ามี)
        if (currentAngle > 0 && movementPhase !== 'rest') {
            const angleText = `มุม: ${Math.round(currentAngle)}°`;
            drawTextWithOutline(angleText, 10, yPosition);
            yPosition += 25;
        }
        
        // แสดงเฟสการเคลื่อนไหว
        if (movementPhase !== 'rest') {
            const phaseText = `สถานะ: ${getPhaseDisplayName(movementPhase)}`;
            drawTextWithOutline(phaseText, 10, yPosition);
            yPosition += 25;
        }
        
        // แสดงจำนวนครั้งที่ทำได้
        if (repCounter > 0) {
            const repText = `ครั้งที่: ${repCounter}/${targetReps}`;
            drawTextWithOutline(repText, 10, yPosition);
        }
        
        // แสดงโหมดการแสดงมุม
        if (showAnglesOnCanvas) {
            const modeNames = {
                'all': 'ทั้งหมด',
                'selected': 'ข้างที่เลือก',
                'exercise-specific': 'เฉพาะท่า'
            };
            const modeText = `แสดงมุม: ${modeNames[angleDisplayMode]}`;
            canvasCtx.fillStyle = '#FFD700';
            drawTextWithOutline(modeText, 10, canvasElement.height - 20);
        }
        
    } catch (error) {
        console.warn('⚠️ Error drawing exercise info:', error);
    }
}

function drawTextWithOutline(text, x, y) {
    // วาดขอบข้อความสีดำ
    canvasCtx.strokeText(text, x, y);
    // วาดข้อความสีขาว
    canvasCtx.fillText(text, x, y);
}

function getAutoDetectionText() {
    const leftQuality = bothSidesData.left.totalQuality || 0;
    const rightQuality = bothSidesData.right.totalQuality || 0;
    
    if (leftQuality > rightQuality + 15) {
        return 'ตรวจจับ: ข้างซ้าย (อัตโนมัติ)';
    } else if (rightQuality > leftQuality + 15) {
        return 'ตรวจจับ: ข้างขวา (อัตโนมัติ)';
    } else {
        return 'ตรวจจับ: ทั้งสองข้าง';
    }
}

function getPhaseDisplayName(phase) {
    const phaseNames = {
        'lifting': 'กำลังยก',
        'lowering': 'กำลังลด',
        'flexing': 'กำลังงอ',
        'extending': 'กำลังเหยียด',
        'spreading': 'กำลังกาง',
        'closing': 'กำลังหุบ',
        'reaching': 'กำลังเอื้อม',
        'bending': 'กำลังก้ม',
        'tilting': 'กำลังเอียง',
        'shrugging': 'กำลังยักไหล่',
        'gripping': 'กำลังกำ-แบมือ',
        'rotating': 'กำลังหมุน',
        'touching': 'กำลังแตะ',
        'swaying': 'กำลังโยก',
        'shifting': 'กำลังยก',
        'stepping': 'กำลังก้าว',
        'abducting': 'กำลังกาง',
        'holding': 'กำลังคงท่า',
        'returning': 'กำลังกลับท่าเดิม'
    };
    return phaseNames[phase] || phase;
}

function drawSideComparisonInfo() {
    if (!canvasCtx) return;
    
    try {
        // วาดกรอบข้อมูลมุมขวาบน
        const boxWidth = 200;
        const boxHeight = 100;
        const boxX = canvasElement.width - boxWidth - 10;
        const boxY = 10;
        
        // วาดพื้นหลังโปร่งใส
        canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        canvasCtx.fillRect(boxX, boxY, boxWidth, boxHeight);
        
        // วาดขอบ
        canvasCtx.strokeStyle = '#FFFFFF';
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeRect(boxX, boxY, boxWidth, boxHeight);
        
        // ตั้งค่าฟอนต์
        canvasCtx.font = '14px Kanit, Arial, sans-serif';
        canvasCtx.fillStyle = '#FFFFFF';
        
        // แสดงข้อมูลทั้งสองข้าง
        const leftQuality = Math.round(bothSidesData.left.totalQuality || 0);
        const rightQuality = Math.round(bothSidesData.right.totalQuality || 0);
        
        canvasCtx.fillText('คุณภาพการตรวจจับ:', boxX + 5, boxY + 20);
        canvasCtx.fillText(`ซ้าย: ${leftQuality}%`, boxX + 5, boxY + 40);
        canvasCtx.fillText(`ขวา: ${rightQuality}%`, boxX + 5, boxY + 60);
        
        // แสดงโหมดการแสดงมุม
        if (showAnglesOnCanvas) {
            const modeNames = {
                'all': 'ทั้งหมด',
                'selected': 'เลือก',
                'exercise-specific': 'เฉพาะท่า'
            };
            canvasCtx.fillText(`โหมด: ${modeNames[angleDisplayMode]}`, boxX + 5, boxY + 80);
        }
        
        // แสดงแถบบ่งชี้คุณภาพ
        drawQualityBars(boxX + 80, boxY + 35, leftQuality, rightQuality);
        
    } catch (error) {
        console.warn('⚠️ Error drawing side comparison:', error);
    }
}

function drawQualityBars(x, y, leftQuality, rightQuality) {
    const barWidth = 100;
    const barHeight = 8;
    
    // แถบซ้าย
    canvasCtx.fillStyle = '#FF6B6B';
    canvasCtx.fillRect(x, y - 15, barWidth, barHeight);
    canvasCtx.fillStyle = '#4ECDC4';
    canvasCtx.fillRect(x, y - 15, (leftQuality / 100) * barWidth, barHeight);
    
    // แถบขวา
    canvasCtx.fillStyle = '#FF6B6B';
    canvasCtx.fillRect(x, y + 5, barWidth, barHeight);
    canvasCtx.fillStyle = '#45B7D1';
    canvasCtx.fillRect(x, y + 5, (rightQuality / 100) * barWidth, barHeight);
}

// ========================================
// ฟังก์ชันแสดงผลพิเศษ
// ========================================

function drawSuccessEffect() {
    if (!canvasCtx) return;
    
    try {
        // วาดเอฟเฟกต์เมื่อทำท่าสำเร็จ
        const centerX = canvasElement.width / 2;
        const centerY = canvasElement.height / 2;
        
        // วาดวงกลมเรืองแสง
        canvasCtx.save();
        canvasCtx.globalAlpha = 0.7;
        canvasCtx.fillStyle = '#00FF00';
        canvasCtx.beginPath();
        canvasCtx.arc(centerX, centerY, 50, 0, 2 * Math.PI);
        canvasCtx.fill();
        canvasCtx.restore();
        
        // วาดข้อความสำเร็จ
        canvasCtx.font = 'bold 24px Kanit, Arial, sans-serif';
        canvasCtx.fillStyle = '#FFFFFF';
        canvasCtx.strokeStyle = '#000000';
        canvasCtx.lineWidth = 3;
        
        const successText = '✓ สำเร็จ!';
        const textWidth = canvasCtx.measureText(successText).width;
        const textX = centerX - textWidth / 2;
        const textY = centerY + 8;
        
        canvasCtx.strokeText(successText, textX, textY);
        canvasCtx.fillText(successText, textX, textY);
        
    } catch (error) {
        console.warn('⚠️ Error drawing success effect:', error);
    }
}

// ========================================
// ฟังก์ชันช่วยเหลือเพิ่มเติม
// ========================================

function resizeCanvas() {
    if (!canvasElement || !videoElement) return;
    
    // ปรับขนาด canvas ให้เหมาะสมกับหน้าจอ
    const container = canvasElement.parentElement;
    if (container) {
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
            const videoAspectRatio = videoElement.videoWidth / videoElement.videoHeight;
            const containerAspectRatio = containerWidth / containerHeight;
            
            if (videoAspectRatio > containerAspectRatio) {
                // วิดีโอกว้างกว่า container
                canvasElement.style.width = '100%';
                canvasElement.style.height = 'auto';
            } else {
                // วิดีโอสูงกว่า container
                canvasElement.style.width = 'auto';
                canvasElement.style.height = '100%';
            }
        }
    }
}

function toggleFullscreen() {
    const videoContainer = document.querySelector('.video-container');
    if (!videoContainer) return;
    
    if (videoContainer.classList.contains('fullscreen-video')) {
        // ออกจากโหมดเต็มจอ
        videoContainer.classList.remove('fullscreen-video');
        const exitButton = videoContainer.querySelector('.fullscreen-exit');
        if (exitButton) {
            exitButton.remove();
        }
    } else {
        // เข้าสู่โหมดเต็มจอ
        videoContainer.classList.add('fullscreen-video');
        
        // เพิ่มปุ่มออกจากเต็มจอ
        const exitButton = document.createElement('div');
        exitButton.className = 'fullscreen-exit';
        exitButton.innerHTML = '<i class="fas fa-times"></i>';
        exitButton.onclick = toggleFullscreen;
        videoContainer.appendChild(exitButton);
    }
}

function setupCanvasEventListeners() {
    // ปุ่มเต็มจอ
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', toggleFullscreen);
    }
    
    // คลิกที่ canvas เพื่อแสดงข้อมูลเพิ่มเติม
    if (canvasElement) {
        canvasElement.addEventListener('click', function(event) {
            const rect = canvasElement.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            // แสดงข้อมูลการคลิก
            console.log(`คลิกที่พิกัด: (${Math.round(x)}, ${Math.round(y)})`);
            
            // สลับการแสดงมุมเมื่อคลิกบน canvas (double click)
            if (event.detail === 2) { // double click
                toggleCanvasAngles();
            }
        });
        
        // เพิ่ม context menu สำหรับการตั้งค่า
        canvasElement.addEventListener('contextmenu', function(event) {
            event.preventDefault();
            showCanvasContextMenu(event.clientX, event.clientY);
        });
    }
}

function showCanvasContextMenu(x, y) {
    // สร้าง context menu
    const existingMenu = document.getElementById('canvas-context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    const menu = document.createElement('div');
    menu.id = 'canvas-context-menu';
    menu.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        background: white;
        border: 1px solid #ccc;
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 1000;
        padding: 5px 0;
        min-width: 150px;
    `;
    
    const menuItems = [
        {
            text: showAnglesOnCanvas ? 'ซ่อนมุม' : 'แสดงมุม',
            action: toggleCanvasAngles
        },
        {
            text: 'เปลี่ยนโหมด',
            action: changeAngleDisplayMode
        },
        {
            text: 'รีเซ็ตประวัติ',
            action: () => { canvasAngleHistory = []; }
        }
    ];
    
    menuItems.forEach(item => {
        const menuItem = document.createElement('div');
        menuItem.textContent = item.text;
        menuItem.style.cssText = `
            padding: 8px 15px;
            cursor: pointer;
            font-size: 14px;
        `;
        menuItem.addEventListener('mouseenter', () => {
            menuItem.style.backgroundColor = '#f0f0f0';
        });
        menuItem.addEventListener('mouseleave', () => {
            menuItem.style.backgroundColor = '';
        });
        menuItem.addEventListener('click', () => {
            item.action();
            menu.remove();
        });
        menu.appendChild(menuItem);
    });
    
    document.body.appendChild(menu);
    
    // ปิด menu เมื่อคลิกข้างนอก
    setTimeout(() => {
        document.addEventListener('click', function closeMenu() {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        });
    }, 100);
}

// ========================================
// ฟังก์ชันส่งออกข้อมูล
// ========================================

function exportCanvasAsImage() {
    if (!canvasElement) return null;
    
    try {
        // สร้างภาพจาก canvas
        const imageData = canvasElement.toDataURL('image/png');
        
        // สร้างลิงก์ดาวน์โหลด
        const link = document.createElement('a');
        link.download = `stroke-exercise-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
        link.href = imageData;
        
        return { link, imageData };
    } catch (error) {
        console.error('❌ Error exporting canvas:', error);
        return null;
    }
}

function saveCanvasSnapshot() {
    const exported = exportCanvasAsImage();
    if (exported) {
        exported.link.click();
        showFeedback('บันทึกภาพสำเร็จ!', 'success');
    } else {
        showFeedback('ไม่สามารถบันทึกภาพได้', 'error');
    }
}

// ========================================
// ฟังก์ชันเริ่มต้นและปิดระบบ
// ========================================

function initializeEnhancedCanvasDisplay() {
    console.log('🎨 เริ่มต้น Enhanced Canvas Display...');
    
    // ตั้งค่า event listeners
    setupCanvasEventListeners();
    
    // เริ่มต้นการแสดงมุม
    showAnglesOnCanvas = true;
    angleDisplayMode = 'exercise-specific';
    
    console.log('✅ Enhanced Canvas Display พร้อมใช้งาน');
}

function cleanupCanvasDisplay() {
    // ล้างข้อมูลประวัติ
    canvasAngleHistory = [];
    
    // รีเซ็ตการตั้งค่า
    showAnglesOnCanvas = true;
    angleDisplayMode = 'all';
    
    // ลบ context menu หากมี
    const existingMenu = document.getElementById('canvas-context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    console.log('🧹 ล้างข้อมูล Canvas Display แล้ว');
}

// ========================================
// ส่งออกฟังก์ชันไปยัง global scope
// ========================================

window.enhancedCanvasSystem = {
    setupCameraCanvas,
    toggleCanvasAngles,
    changeAngleDisplayMode,
    exportCanvasAsImage,
    saveCanvasSnapshot,
    initializeEnhancedCanvasDisplay,
    cleanupCanvasDisplay,
    showAnglesOnCanvas,
    angleDisplayMode
};

// ตั้งค่า event listener สำหรับการปรับขนาดหน้าจอ
window.addEventListener('resize', resizeCanvas);

// เรียกใช้งาน setup เมื่อโหลดไฟล์
document.addEventListener('DOMContentLoaded', function() {
    initializeEnhancedCanvasDisplay();
});

console.log('✅ Enhanced canvas-display.js โหลดเรียบร้อย - ระบบแสดงมุมบน Canvas แบบเรียลไทม์พร้อมใช้งาน');

// ตั้งค่า event listener สำหรับการปรับขนาดหน้าจอ
window.addEventListener('resize', resizeCanvas);

// เรียกใช้งาน setup เมื่อโหลดไฟล์
document.addEventListener('DOMContentLoaded', function() {
    setupCanvasEventListeners();
});

console.log('✅ canvas-display.js โหลดเรียบร้อย - ระบบแสดงผลบน Canvas พร้อมใช้งาน');