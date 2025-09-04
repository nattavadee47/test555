// ========================================
// ระบบวิเคราะห์การกายภาพบำบัดสำหรับผู้ป่วย Stroke - 4 ท่าหลัก
// stroke-physical-therapy-essential.js
// ========================================

// ตัวแปรสำหรับการนับครั้งและตรวจสอบท่าทาง
let exerciseState = {
    currentReps: 0,
    targetReps: 10,
    currentSet: 1,
    targetSets: 2,
    lastAngle: 0,
    isInPosition: false,
    movementStarted: false,
    holdTimer: 0,
    requiredHoldTime: 2000, // 2 วินาที
    lastMovementTime: 0
};


// ========================================
// ฟังก์ชันหลักวิเคราะห์ท่าทาง
// ========================================

function analyzeCurrentExercise() {
    if (!poseResults || !poseResults.poseLandmarks) {
        return;
    }

    if (!currentExercise) {
        showFeedback('กรุณาเลือกท่ากายภาพบำบัดก่อนเริ่มการบำบัด');
        return;
    }

    const landmarks = poseResults.poseLandmarks;
    
    // เลือกข้างที่ดีที่สุดจากการตรวจจับอัตโนมัติ
    const activeSide = autoDetectedSide;
    
    // วิเคราะห์ตามท่าที่เลือก
    switch (currentExercise) {
        case 'arm-raise-forward':
            analyzeArmRaiseForward(landmarks, activeSide);
            break;
        case 'knee-extension':
            analyzeKneeExtension(landmarks, activeSide);
            break;
        case 'trunk-sway':
            analyzeTrunkSway(landmarks);
            break;
        case 'neck-tilt':
            analyzeNeckTiltFixed(landmarks);
            break;
        default:
            showFeedback('ไม่พบประเภทท่ากายภาพบำบัดที่เลือก');
    }
}

// ========================================
// ท่าที่ 1: ยกแขนไปข้างหน้า - บำบัดกล้ามเนื้อแขน
// ========================================

let armRaiseState = {
    currentSide: 'left',
    leftCount: 0,
    rightCount: 0,
    lastSoundTime: 0,
    hasPlayedReady: false
};

function analyzeArmRaiseForward(landmarks, activeSide) {
    if (!validateLandmarks(landmarks, [11, 12, 13, 14, 15, 16])) {
        showFeedback('ไม่สามารถตรวจจับแขนได้ชัดเจน กรุณาปรับตำแหน่ง');
        return;
    }

    const currentSide = armRaiseState.currentSide;
    const isLeftSide = currentSide === 'left';
    
    const wristIndex = isLeftSide ? 15 : 16;
    const shoulderIndex = isLeftSide ? 11 : 12;
    const elbowIndex = isLeftSide ? 13 : 14;
    
    if (!landmarks[wristIndex] || !landmarks[shoulderIndex] || !landmarks[elbowIndex]) {
        return;
    }

    const armAngle = calculateAngle(
        {x: landmarks[shoulderIndex].x, y: landmarks[shoulderIndex].y},
        {x: landmarks[elbowIndex].x, y: landmarks[elbowIndex].y},
        {x: landmarks[wristIndex].x, y: landmarks[wristIndex].y}
    );
    
    const normalizedAngle = Math.max(0, 180 - armAngle);
    updateAngleTracking(normalizedAngle);

    const REST_POSITION = 10;      // แขนอยู่ข้างตัว
    const FORWARD_POSITION = 50;   // ยกแขนไปข้างหน้า
    const MOVEMENT_THRESHOLD = 3;  // เกณฑ์การเคลื่อนไหว

    const sideName = isLeftSide ? 'ขวา' : 'ซ้าย';
    
    console.log(`ยกแขน${sideName}: ${Math.round(normalizedAngle)}° | เฟส: ${movementPhase}`);

    switch (movementPhase) {
        case 'rest':
            // เล่นเสียงเตรียมครั้งเดียว
            if (!armRaiseState.hasPlayedReady) {
                playReadySound();
                armRaiseState.hasPlayedReady = true;
            }
            
            if (normalizedAngle > REST_POSITION + MOVEMENT_THRESHOLD) {
                startMovementPhase('raising_forward', `เริ่มยกแขน${sideName}...`);
                showFeedback(`กำลังบำบัดกล้ามเนื้อแขน${sideName}...`, 'info');
            } else {
                const totalCount = armRaiseState.leftCount + armRaiseState.rightCount;
                showFeedback(`บำบัดยกแขน${sideName} (${totalCount + 1}/${exerciseState.targetReps})`, 'info');
            }
            break;

        case 'raising_forward':
            if (normalizedAngle >= FORWARD_POSITION * 0.95) {
                startMovementPhase('holding', `ยกแขน${sideName}สำเร็จ! ค้างท่า...`);
                showFeedback(`ยกแขน${sideName}ได้ดี! ค้างท่าแล้วลงแขน`, 'success');
                
                setTimeout(() => {
                    if (movementPhase === 'holding') {
                        startMovementPhase('lowering', `เริ่มลงแขน${sideName}...`);
                    }
                }, 1500);
            }
            break;

        case 'holding':
            showFeedback(`ค้างท่าบำบัดแขน${sideName}...`, 'info');
            break;

        case 'lowering':
            if (normalizedAngle <= REST_POSITION + 5) {
                // เล่นเสียงถูกและนับ
                playCorrectSound();
                completeSideRep(currentSide);
            } else {
                showFeedback(`ลงแขน${sideName}กลับ...`, 'info');
            }
            break;
    }

    let accuracy = 50;
    if (movementPhase === 'raising_forward') {
        accuracy = Math.min(95, 50 + ((normalizedAngle - REST_POSITION) / (FORWARD_POSITION - REST_POSITION)) * 45);
    } else if (movementPhase === 'lowering') {
        accuracy = Math.min(95, 50 + ((FORWARD_POSITION - normalizedAngle) / (FORWARD_POSITION - REST_POSITION)) * 45);
    } else if (movementPhase === 'holding') {
        accuracy = 95;
    }
    
    updateAccuracy(accuracy, 100);
    displayMovementInfo(`${Math.round(normalizedAngle)}° (${sideName})`, 'ยกแขน');
}

function completeSideRep(side) {
    // นับครั้ง
    if (side === 'left') {
        armRaiseState.leftCount++;
    } else {
        armRaiseState.rightCount++;
    }
    
    const totalReps = armRaiseState.leftCount + armRaiseState.rightCount;
    exerciseState.currentReps = totalReps;
    
    // อัปเดตตัวนับในระบบ
    if (typeof repCounter !== 'undefined') repCounter = totalReps;
    if (typeof exerciseCount !== 'undefined') exerciseCount = totalReps;
    
    const sideName = side === 'left' ? 'ซ้าย' : 'ขวา';
    showFeedback(`บำบัดแขน${sideName}สำเร็จ! (${totalReps}/${exerciseState.targetReps})`, 'success');
    
    // สลับข้าง
    armRaiseState.currentSide = side === 'left' ? 'right' : 'left';
    
    // ตรวจสอบว่าเสร็จครบหรือยัง
    if (totalReps >= exerciseState.targetReps) {
        completeRepetition('บำบัดยกแขนไปข้างหน้า', 'ทั้งสองข้าง');
        resetArmRaiseState();
    } else {
        movementPhase = 'rest';
        if (typeof updateCounters === 'function') updateCounters();
    }
    
    console.log(`เสร็จ${sideName} | L:${armRaiseState.leftCount} R:${armRaiseState.rightCount} | รวม:${totalReps}`);
}

function resetArmRaiseState() {
    armRaiseState = {
        currentSide: 'left',
        leftCount: 0,
        rightCount: 0,
        lastSoundTime: 0,
        hasPlayedReady: false
    };
}

// เสียงเตรียมตัว (ครั้งเดียว)
function playReadySound() {
    const now = Date.now();
    if (now - armRaiseState.lastSoundTime < 1000) return;
    armRaiseState.lastSoundTime = now;
    
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (audioContext.state === 'suspended') audioContext.resume();
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
        
        oscillator.onended = () => {
            oscillator.disconnect();
            gainNode.disconnect();
            audioContext.close();
        };
    } catch (error) {
        console.log('ไม่สามารถเล่นเสียงได้');
    }
}

// เสียงถูก (ทุกครั้งที่ทำสำเร็จ)
function playCorrectSound() {
    const now = Date.now();
    if (now - armRaiseState.lastSoundTime < 800) return;
    armRaiseState.lastSoundTime = now;
    
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (audioContext.state === 'suspended') audioContext.resume();
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
        
        oscillator.onended = () => {
            oscillator.disconnect();
            gainNode.disconnect();
            audioContext.close();
        };
    } catch (error) {
        console.log('ไม่สามารถเล่นเสียงได้');
    }
}

// ========================================
// ท่าที่ 2: เหยียดเข่าตรง - บำบัดกล้ามเนื้อขา
// ========================================

function analyzeKneeExtension(landmarks, side) {
    // ตรวจสอบว่ามีระบบ realtime angles หรือไม่
    let currentAngle = 0;
    
    if (window.realtimeAngleSystem && window.realtimeAngleSystem.realtimeAngles) {
        currentAngle = side === 'left' ? 
            window.realtimeAngleSystem.realtimeAngles.leftKnee : 
            window.realtimeAngleSystem.realtimeAngles.rightKnee;
    } else {
        // fallback: คำนวดมุมจาก landmarks โดยตรง
        currentAngle = calculateKneeAngleFromLandmarks(landmarks, side);
    }
    
    // เกณฑ์ตามข้อมูล Excel ท่าที่ 2
    const SITTING_ANGLE_MIN = 110;  // มุมเข่านั่งต่ำสุด
    const SITTING_ANGLE_MAX = 179;  // มุมเข่านั่งสูงสุด  
    const SITTING_ANGLE_AVG = 150.1; // มุมเข่านั่งเฉลี่ย
    
    const EXTENSION_MIN = 155;      // เหยียดขั้นต่ำ
    const EXTENSION_MAX = 169;      // เหยียดสูงสุด
    const EXTENSION_AVG = 162.8;    // เหยียดเฉลี่ย
    const EXTENSION_TARGET = 165;   // เป้าหมาย (ใกล้ค่าสูงสุด)
    
    const HOLD_TIME = 1500;         // ค้างท่า 1.5 วินาที
    
    // ตรวจสอบว่าอยู่ในท่านั่งปกติหรือไม่
    const isInSittingPosition = currentAngle >= SITTING_ANGLE_MIN && currentAngle <= SITTING_ANGLE_MAX;
    const isInExtensionRange = currentAngle >= EXTENSION_MIN && currentAngle <= EXTENSION_MAX;
    
    console.log(`บำบัดเหยียดเข่า (${side}): ${Math.round(currentAngle)}° | เป้าหมาย: ${EXTENSION_TARGET}° | เฟส: ${movementPhase}`);

    switch (movementPhase) {
        case 'rest':
            // ตรวจสอบว่าอยู่ในท่านั่ง
            if (isInSittingPosition) {
                exerciseState.isInPosition = true;
                showFeedback(`เตรียมบำบัดเข่า${side} (ปัจจุบัน: ${Math.round(currentAngle)}°)`);
            } else if (currentAngle < SITTING_ANGLE_MIN) {
                showFeedback(`งอเข่ามากเกินไป กรุณาปรับให้อยู่ในช่วง ${SITTING_ANGLE_MIN}-${SITTING_ANGLE_MAX}°`);
            } else if (currentAngle > SITTING_ANGLE_MAX) {
                showFeedback(`เหยียดเข่าเกินไป กรุณางอเข่าลงให้อยู่ในท่านั่งปกติ`);
            }
            
            // เริ่มเหยียดเมื่อมุมเข่าเพิ่มขึ้นจากท่านั่ง
            if (exerciseState.isInPosition && currentAngle > SITTING_ANGLE_AVG + 5) {
                startMovementPhase('extending', `เริ่มบำบัดเหยียดเข่า${side}... (${Math.round(currentAngle)}°)`);
                showFeedback(`กำลังบำบัดกล้ามเนื้อเข่า${side}...`, 'info');
            }
            break;

        case 'extending':
            // ตรวจสอบว่าเหยียดถึงช่วงเป้าหมาย
            if (isInExtensionRange && currentAngle >= EXTENSION_TARGET * 0.95) {
                startMovementPhase('holding', `บำบัดเข่า${side}สำเร็จ! ค้างท่า... (${Math.round(currentAngle)}°)`);
                exerciseState.holdTimer = Date.now();
                showFeedback(`เหยียดเข่า${side}สำเร็จ! ค้างท่า 2 วินาที`, 'success');
            }
            // ถ้าเหยียดเกินขีดจำกัด
            else if (currentAngle > EXTENSION_MAX + 5) {
                showFeedback(`เหยียดมากเกินไป! เป้าหมาย: ${EXTENSION_TARGET}° ปัจจุบัน: ${Math.round(currentAngle)}°`, 'warning');
            }
            // ถ้าเหยียดไม่ถึงเป้า
            else if (currentAngle < EXTENSION_MIN) {
                showFeedback(`บำบัดเหยียดเข่า${side}ต่อ... เป้าหมาย: ${EXTENSION_TARGET}° ปัจจุบัน: ${Math.round(currentAngle)}°`, 'warning');
            }
            break;

        case 'holding':
            // ค้างท่าเหยียดเข่า
            if (isInExtensionRange && currentAngle >= EXTENSION_MIN) {
                const holdTime = Date.now() - exerciseState.holdTimer;
                const remainingTime = Math.ceil((HOLD_TIME - holdTime) / 1000);
                
                if (holdTime >= HOLD_TIME) {
                    startMovementPhase('flexing', `ยอดเยี่ยม! งอเข่า${side}กลับ...`);
                    showFeedback(`ค้างท่าสำเร็จ! งอเข่ากลับสู่ท่านั่ง`, 'success');
                } else if (remainingTime > 0) {
                    showFeedback(`ค้างท่าบำบัดเข่า${side}... เหลือ ${remainingTime} วินาที`, 'info');
                }
            } else {
                // ถ้าปล่อยเข่าก่อนเวลา
                showFeedback(`บำบัดเข่า${side}ให้คงที่... เป้าหมาย: ${EXTENSION_TARGET}°`, 'warning');
                startMovementPhase('extending', 'เหยียดเข่าใหม่...');
            }
            break;

        case 'flexing':
            // งอเข่ากลับสู่ท่านั่งปกติ
            if (isInSittingPosition && currentAngle <= SITTING_ANGLE_AVG + 10) {
                completeRepetition('บำบัดเหยียดเข่า', side);
                exerciseState.isInPosition = false;
                showFeedback(`บำบัดเข่า${side}สำเร็จสมบูรณ์!`, 'success');
            } else if (currentAngle > EXTENSION_MIN) {
                showFeedback(`งอเข่า${side}กลับสู่ท่านั่ง... (${Math.round(currentAngle)}°)`, 'info');
            }
            break;
    }

    // คำนวดความแม่นยำตามข้อมูล Excel
    let accuracy = 50;
    
    if (movementPhase === 'rest' && isInSittingPosition) {
        // ท่านั่งถูกต้อง
        accuracy = 100;
    } else if (movementPhase === 'extending') {
        // ยิ่งใกล้เป้าหมายยิ่งแม่นยำ
        const progress = Math.max(0, currentAngle - SITTING_ANGLE_AVG);
        const targetProgress = EXTENSION_TARGET - SITTING_ANGLE_AVG;
        accuracy = Math.min(95, (progress / targetProgress) * 100);
    } else if (movementPhase === 'holding') {
        // ค้างท่าในช่วงที่ถูกต้อง
        accuracy = isInExtensionRange ? 95 : 60;
    } else if (movementPhase === 'flexing') {
        // ยิ่งกลับใกล้ท่านั่งยิ่งแม่นยำ
        const returnProgress = Math.max(0, EXTENSION_MAX - currentAngle);
        const totalReturn = EXTENSION_MAX - SITTING_ANGLE_AVG;
        accuracy = Math.min(95, (returnProgress / totalReturn) * 100);
    }
    
    updateAccuracy(accuracy);
    displayMovementInfo(`${Math.round(currentAngle)}° (${side})`, 'เข่า');
}

function calculateKneeAngleFromLandmarks(landmarks, side) {
    // กำหนด indices ตามข้าง
    const hipIndex = side === 'left' ? 23 : 24;   // สะโพก
    const kneeIndex = side === 'left' ? 25 : 26;  // เข่า
    const ankleIndex = side === 'left' ? 27 : 28; // ข้อเท้า
    
    if (!landmarks[hipIndex] || !landmarks[kneeIndex] || !landmarks[ankleIndex]) {
        return 150; // ค่าเริ่มต้น (ท่านั่งปกติ)
    }
    
    // คำนวดมุมระหว่าง สะโพก-เข่า-ข้อเท้า
    const hip = landmarks[hipIndex];
    const knee = landmarks[kneeIndex];
    const ankle = landmarks[ankleIndex];
    
    const angle = calculateAngle(
        {x: hip.x, y: hip.y},
        {x: knee.x, y: knee.y},
        {x: ankle.x, y: ankle.y}
    );
    
    return angle;
}

// ========================================
// ท่าที่ 3: โยกลำตัวซ้าย-ขวา - บำบัดสมดุลและลำตัว
// ========================================

function analyzeTrunkSway(landmarks) {
    // ท่าโยกลำตัวซ้าย-ขวา (ตามข้อมูล Excel)
    if (!landmarks[11] || !landmarks[12] || !landmarks[23] || !landmarks[24]) {
        showFeedback('ไม่สามารถตรวจจับลำตัวได้ชัดเจน กรุณาปรับตำแหน่ง');
        return;
    }

    // คำนวดจุดกึ่งกลางไหล่และสะโพก (ตามข้อมูล Excel)
    const shoulderCenter = {
        x: (landmarks[11].x + landmarks[12].x) / 2,
        y: (landmarks[11].y + landmarks[12].y) / 2
    };
    const hipCenter = {
        x: (landmarks[23].x + landmarks[24].x) / 2,
        y: (landmarks[23].y + landmarks[24].y) / 2
    };
    
    // คำนวดมุมการเอียงลำตัวตามข้อมูล Excel (0-8 องศา)
    const deltaX = shoulderCenter.x - hipCenter.x;
    
    // ปรับสูตรการคำนวดให้ตรงกับข้อมูล Excel
    const angleFactor = 100;
    const swayAngle = Math.min(10, Math.max(0, Math.abs(deltaX) * angleFactor));
    
    // กำหนดทิศทางการเอียง
    let currentDirection = 'center';
    const DIRECTION_THRESHOLD = 0.01;
    
    if (deltaX > DIRECTION_THRESHOLD) {
        currentDirection = 'right'; // เอียงขวา
    } else if (deltaX < -DIRECTION_THRESHOLD) {
        currentDirection = 'left';  // เอียงซ้าย
    }

    updateAngleTracking(swayAngle);

    // ปรับเกณฑ์ตามข้อมูل Excel ท่าที่ 3
    const REST_POSITION = 1;    // ท่าตรง (0-1 องศา)
    const MIN_SWAY = 2;         // เอียงขั้นต่ำ
    const TARGET_SWAY = 4.6;    // ค่าเป้าหมาย (ค่าเฉลี่ยจาก Excel)
    const MAX_SWAY = 8;         // เอียงสูงสุด (ตามข้อมูล Excel)
    const HOLD_TIME = 2000;     // ค้างท่า 2 วินาที

    console.log(`บำบัดเอียงลำตัว: ${Math.round(swayAngle)}° ทิศทาง=${currentDirection} | เฟส: ${movementPhase}`);

    switch (movementPhase) {
        case 'rest':
            // ตรวจสอบว่าอยู่ในท่าตรง
            if (swayAngle <= REST_POSITION) {
                showFeedback('ท่าตรงดี! เริ่มบำบัดโยกลำตัวไปซ้ายหรือขวา');
            }
            
            // เริ่มเอียงเมื่อเกินค่าขั้นต่ำ
            if (swayAngle >= MIN_SWAY && currentDirection !== 'center') {
                const directionText = currentDirection === 'left' ? 'ซ้าย' : 'ขวา';
                startMovementPhase('swaying', `เริ่มบำบัดโยกลำตัว${directionText}... (${Math.round(swayAngle)}°)`);
                showFeedback(`กำลังบำบัดสมดุลลำตัว${directionText}...`, 'info');
            }
            break;

        case 'swaying':
            // ตรวจสอบว่าเอียงถึงเป้าหมายแล้ว
            if (swayAngle >= TARGET_SWAY) {
                const directionText = currentDirection === 'left' ? 'ซ้าย' : 'ขวา';
                startMovementPhase('sway_hold', `บำบัดโยกลำตัว${directionText}สำเร็จ! ค้างท่า... (${Math.round(swayAngle)}°)`);
                showFeedback(`โยกลำตัว${directionText}สำเร็จ! ค้างท่า 2 วินาที`, 'success');
                
                setTimeout(() => {
                    if (movementPhase === 'sway_hold') {
                        startMovementPhase('returning', 'กลับสู่ท่าตรง...');
                    }
                }, HOLD_TIME);
            }
            // ถ้าเอียงเกินขีดจำกัด
            else if (swayAngle >= MAX_SWAY) {
                showFeedback(`เอียงมากเกินไป! กลับมาในช่วง ${TARGET_SWAY}° โดยประมาณ`, 'warning');
            }
            // ถ้าหยุดเอียงแต่ยังไม่ถึงเป้า
            else if (Math.abs(swayAngle - prevAngle) < 0.5) {
                const directionText = currentDirection === 'left' ? 'ซ้าย' : 'ขวา';
                showFeedback(`บำบัดโยกลำตัว${directionText}ต่อ... เป้าหมาย: ${Math.round(TARGET_SWAY)}° ปัจจุบัน: ${Math.round(swayAngle)}°`, 'warning');
            }
            break;

        case 'sway_hold':
            const holdDirectionText = currentDirection === 'left' ? 'ซ้าย' : 'ขวา';
            showFeedback(`ค้างท่าบำบัดลำตัว${holdDirectionText}... (${Math.round(swayAngle)}°)`, 'info');
            break;

        case 'returning':
            if (swayAngle <= REST_POSITION + 0.5 && currentDirection === 'center') {
                completeRepetition('บำบัดโยกลำตัว', 'ทั้งสองข้าง');
                showFeedback('บำบัดโยกลำตัวสำเร็จ!', 'success');
            } else {
                showFeedback('กลับสู่ท่าตรง...', 'info');
            }
            break;
    }

    // คำนวดความแม่นยำตามข้อมูล Excel
    let accuracy = 50;
    if (movementPhase === 'swaying') {
        // ยิ่งใกล้เป้าหมาย (4.6°) ยิ่งแม่นยำ
        accuracy = Math.min(95, 50 + ((swayAngle / TARGET_SWAY) * 45));
    } else if (movementPhase === 'sway_hold') {
        // ค้างท่าได้ = แม่นยำสูง
        accuracy = 95;
    } else if (movementPhase === 'returning') {
        // ยิ่งกลับมาใกล้ท่าตรงยิ่งแม่นยำ
        accuracy = Math.min(95, 95 - ((swayAngle / TARGET_SWAY) * 45));
    } else if (movementPhase === 'rest' && swayAngle <= REST_POSITION) {
        // ท่าตรงสมบูรณ์
        accuracy = 100;
    }

    updateAccuracy(accuracy, 100);
    displayMovementInfo(`${Math.round(swayAngle)}° (${currentDirection})`, 'เอียงลำตัว');
}

// ========================================
// ท่าที่ 4: เอียงศีรษะซ้าย-ขวา - บำบัดกล้ามเนื้อคอ
// ========================================

function analyzeNeckTiltFixed(landmarks) {
    // ท่าเอียงศีรษะซ้าย-ขวา
    if (!landmarks[0] || !landmarks[7] || !landmarks[8]) {
        showFeedback('ไม่สามารถตรวจจับศีรษะได้ชัดเจน กรุณาปรับตำแหน่ง');
        return;
    }

    const nose = landmarks[0];        // จมูก
    const leftEar = landmarks[7];     // หูซ้าย
    const rightEar = landmarks[8];    // หูขวา

    // คำนวดตำแหน่งศีรษะในแกน X (normalized 0-1)
    const headX = nose.x;
    
    // คำนวดมุมการเอียงจากระยะห่างหู (ปรับปรุงการคำนวด)
    const earHeightDiff = Math.abs(leftEar.y - rightEar.y);
    const tiltAngle = Math.min(45, earHeightDiff * 150); // ลดความไวเล็กน้อย
    
    // กำหนดทิศทางการเอียง (ปรับปรุงเกณฑ์)
    let currentTiltSide = 'center';
    const TILT_THRESHOLD = 0.012; // ลดเกณฑ์ให้ไวขึ้น
    
    if (leftEar.y < rightEar.y - TILT_THRESHOLD) {
        currentTiltSide = 'left';
    } else if (rightEar.y < leftEar.y - TILT_THRESHOLD) {
        currentTiltSide = 'right';
    }

    updateAngleTracking(tiltAngle);

    // ปรับเกณฑ์การเอียง
    const MIN_TILT = 3;   // เอียงขั้นต่ำ
    const MAX_TILT = 10;  // เอียงสูงสุด
    const HOLD_TIME = 1000; // ค้างท่า 1 วินาที

    console.log(`บำบัดเอียงศีรษะ: X=${headX.toFixed(2)} ทิศทาง=${currentTiltSide} มุม=${Math.round(tiltAngle)}° | เฟส: ${movementPhase}`);

    switch (movementPhase) {
        case 'rest':
            if (currentTiltSide !== 'center' && tiltAngle >= MIN_TILT) {
                const sideText = currentTiltSide === 'left' ? 'ซ้าย' : 'ขวา';
                startMovementPhase('tilting', `เริ่มบำบัดเอียงศีรษะ${sideText}... (${Math.round(tiltAngle)}°)`);
                showFeedback(`กำลังบำบัดกล้ามเนื้อคอ${sideText}...`, 'info');
            } else {
                showFeedback('เอียงศีรษะไปซ้ายหรือขวาเพื่อเริ่มการบำบัด', 'info');
            }
            break;

        case 'tilting':
            if (tiltAngle >= MAX_TILT * 0.8) {
                const sideText = currentTiltSide === 'left' ? 'ซ้าย' : 'ขวา';
                startMovementPhase('tilt_hold', `บำบัดเอียงศีรษะ${sideText}สำเร็จ! ค้างท่า... (${Math.round(tiltAngle)}°)`);
                showFeedback(`เอียงศีรษะ${sideText}สำเร็จ! ค้างท่า 2 วินาที`, 'success');
                
                setTimeout(() => {
                    if (movementPhase === 'tilt_hold') {
                        startMovementPhase('returning', 'กลับสู่ท่าตรง...');
                    }
                }, HOLD_TIME);
            }
            // ถ้าหยุดเอียงแต่ยังไม่ถึงเป้า
            else if (Math.abs(tiltAngle - prevAngle) < 2) {
                const sideText = currentTiltSide === 'left' ? 'ซ้าย' : 'ขวา';
                showFeedback(`บำบัดเอียงศีรษะ${sideText}ต่อ... เป้าหมาย: ${Math.round(MAX_TILT * 0.8)}° ปัจจุบัน: ${Math.round(tiltAngle)}°`, 'warning');
            }
            break;

        case 'tilt_hold':
            const holdSideText = currentTiltSide === 'left' ? 'ซ้าย' : 'ขวา';
            showFeedback(`ค้างท่าบำบัดศีรษะ${holdSideText}... (${Math.round(tiltAngle)}°)`, 'info');
            break;

        case 'returning':
            if (tiltAngle <= MIN_TILT && currentTiltSide === 'center') {
                completeRepetition('บำบัดเอียงศีรษะ', 'ทั้งสองข้าง');
                showFeedback('บำบัดเอียงศีรษะสำเร็จ!', 'success');
            } else {
                showFeedback('กลับสู่ท่าตรง...', 'info');
            }
            break;
    }

    // คำนวดความแม่นยำ
    let accuracy = 50;
    if (movementPhase === 'tilting') {
        accuracy = Math.min(95, 50 + (tiltAngle / MAX_TILT) * 45);
    } else if (movementPhase === 'tilt_hold') {
        accuracy = 95;
    } else if (movementPhase === 'returning') {
        accuracy = Math.min(95, 95 - (tiltAngle / MAX_TILT) * 45);
    }
    
    updateAccuracy(accuracy, 100);
    displayMovementInfo(`${Math.round(tiltAngle)}° (${currentTiltSide})`, 'เอียง');
}

// ========================================
// ฟังก์ชันช่วยเหลือ
// ========================================

function updateAngleTracking(newAngle) {
    if (!isNaN(newAngle) && newAngle >= 0 && newAngle <= 180) {
        prevAngle = currentAngle;
        currentAngle = newAngle;
        
        // เพิ่มลงในประวัติมุม
        angleHistory.push(newAngle);
        if (angleHistory.length > 10) {
            angleHistory.shift();
        }
    }
}

function startMovementPhase(phase, message) {
    movementPhase = phase;
    showFeedback(message);
    console.log(`เปลี่ยนเฟส: ${phase} - ${message}`);
}

function completeRepetition(exerciseName, side) {
    exerciseState.currentReps++;
    movementPhase = 'rest';
    
    const repDuration = exerciseState.lastMovementTime ? 
        (Date.now() - exerciseState.lastMovementTime) / 1000 : 0;
    exerciseState.lastMovementTime = Date.now();
    
    // อัปเดตตัวนับ
    if (typeof repCounter !== 'undefined') repCounter = exerciseState.currentReps;
    if (typeof exerciseCount !== 'undefined') exerciseCount++;
    
    // ใช้ฟังก์ชันที่มีอยู่ในระบบหลัก (ถ้ามี)
    if (typeof logExerciseEvent === 'function') {
        logExerciseEvent(`ทำท่า${exerciseName}ถูกต้อง`, 
            `ครั้งที่ ${exerciseState.currentReps} (${side}) ใช้เวลา ${repDuration.toFixed(1)} วินาที`);
    }
    
    if (typeof updateCounters === 'function') updateCounters();
    checkSetCompletion();
    
    showFeedback(`ทำท่า${exerciseName}สำเร็จ! (${exerciseState.currentReps}/${exerciseState.targetReps})`, 'success');
    
    console.log(`เสร็จสิ้นท่า${exerciseName} ครั้งที่ ${exerciseState.currentReps}`);
}

function updateAccuracy(accuracyValue) {
    if (typeof accuracyElement !== 'undefined' && accuracyElement) {
        const accuracy = Math.min(95, Math.max(0, Math.round(accuracyValue)));
        accuracyElement.textContent = `${accuracy}%`;
        
        // เปลี่ยนสีตามความแม่นยำ
        if (accuracy >= 90) {
            accuracyElement.style.color = '#4CAF50';
        } else if (accuracy >= 70) {
            accuracyElement.style.color = '#FF9800';
        } else {
            accuracyElement.style.color = '#F44336';
        }
    }
}

function displayMovementInfo(value, unit) {
    const infoElement = document.querySelector('.movement-info');
    if (infoElement) {
        infoElement.textContent = `${value} ${unit}`;
    }
    console.log(`Movement Info: ${value} ${unit}`);
}

function checkSetCompletion() {
    if (exerciseState.currentReps >= exerciseState.targetReps) {
        if (exerciseState.currentSet >= exerciseState.targetSets) {
            completeAllSets();
        } else {
            startNewSet();
        }
    }
}

function startNewSet() {
    exerciseState.currentSet++;
    exerciseState.currentReps = 0;
    if (typeof setCounter !== 'undefined') setCounter = exerciseState.currentSet;
    if (typeof repCounter !== 'undefined') repCounter = 0;
    
    showFeedback(`เสร็จเซตที่ ${exerciseState.currentSet - 1} เริ่มเซตที่ ${exerciseState.currentSet}`, 'success');
    if (typeof updateCounters === 'function') updateCounters();
    
    console.log(`เริ่มเซตใหม่: ${exerciseState.currentSet}/${exerciseState.targetSets}`);
}

function completeAllSets() {
    showFeedback('เสร็จสิ้นการบำบัดทั้งหมด! ยินดีด้วย!', 'success');
    
    // หยุดการบำบัดอัตโนมัติ
    setTimeout(() => {
        if (typeof stopExercise === 'function') {
            stopExercise();
        }
    }, 3000);
    
    console.log('เสร็จสิ้นการบำบัดทั้งหมด!');
}

// รีเซ็ตสถานะการบำบัด
function resetExerciseState() {
    exerciseState = {
        currentReps: 0,
        targetReps: (typeof targetReps !== 'undefined') ? targetReps : 10,
        currentSet: 1,
        targetSets: (typeof targetSets !== 'undefined') ? targetSets : 2,
        lastAngle: 0,
        isInPosition: false,
        movementStarted: false,
        holdTimer: 0,
        requiredHoldTime: 2000,
        lastMovementTime: 0
    };
    
    movementPhase = 'rest';
    if (typeof repCounter !== 'undefined') repCounter = 0;
    if (typeof setCounter !== 'undefined') setCounter = 1;
    if (typeof exerciseCount !== 'undefined') exerciseCount = 0;
}

// ฟังก์ชันคำนวดมุม
function calculateAngle(pointA, pointB, pointC) {
    try {
        const BA = {x: pointA.x - pointB.x, y: pointA.y - pointB.y};
        const BC = {x: pointC.x - pointB.x, y: pointC.y - pointB.y};
        
        const dotProduct = BA.x * BC.x + BA.y * BC.y;
        const magnitudeBA = Math.sqrt(BA.x * BA.x + BA.y * BA.y);
        const magnitudeBC = Math.sqrt(BC.x * BC.x + BC.y * BC.y);
        
        if (magnitudeBA === 0 || magnitudeBC === 0) return 0;
        
        const cosAngle = dotProduct / (magnitudeBA * magnitudeBC);
        const clampedCos = Math.max(-1, Math.min(1, cosAngle));
        const angleRad = Math.acos(clampedCos);
        
        return angleRad * (180 / Math.PI);
    } catch (error) {
        console.warn('Error calculating angle:', error);
        return 0;
    }
}

// ฟังก์ชันตรวจสอบ landmarks
function validateLandmarks(landmarks, indices) {
    return indices.every(index => landmarks[index] && 
                        typeof landmarks[index].x === 'number' && 
                        typeof landmarks[index].y === 'number');
}

// ฟังก์ชันคำนวดระยะห่าง
function calculateDistance(point1, point2) {
    if (!point1 || !point2) return 0;
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

// ฟังก์ชันช่วยเหลือสำหรับการแสดงข้อความ (ถ้าไม่มีในระบบหลัก)
if (typeof drawTextWithOutline === 'undefined') {
    function drawTextWithOutline(text, x, y, fillColor = 'white', strokeColor = 'black', strokeWidth = 2) {
        if (typeof canvasCtx !== 'undefined' && canvasCtx) {
            canvasCtx.strokeStyle = strokeColor;
            canvasCtx.lineWidth = strokeWidth;
            canvasCtx.strokeText(text, x, y);
            canvasCtx.fillStyle = fillColor;
            canvasCtx.fillText(text, x, y);
        }
    }
}

// สร้างฟังก์ชัน showFeedback หากไม่มีในระบบหลัก
if (typeof showFeedback === 'undefined') {
    function showFeedback(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // พยายามหาองค์ประกอบแสดงผลข้อความ
        const feedbackElement = document.querySelector('.feedback-message') || 
                               document.querySelector('#feedback') ||
                               document.querySelector('.exercise-feedback');
        
        if (feedbackElement) {
            feedbackElement.textContent = message;
            feedbackElement.className = `feedback-message ${type}`;
        }
    }
}

console.log('✅ ระบบการกายภาพบำบัด Stroke - 4 ท่าหลัก โหลดเรียบร้อยสมบูรณ์');