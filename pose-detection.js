// ========================================
// ระบบตรวจจับท่าทางอัตโนมัติสำหรับผู้ป่วย Stroke - ลบโค้ดซ้ำซ้อนแล้ว
// pose-detection.js
// ========================================

// ตัวแปรสำหรับการแสดงมุมแบบเรียลไทม์
let realtimeAngles = {
    leftShoulder: 0,
    rightShoulder: 0,
    leftElbow: 0,
    rightElbow: 0,
    leftKnee: 0,
    rightKnee: 0,
    leftHip: 0,
    rightHip: 0,
    neckTilt: 0,
    trunkTilt: 0,
    // เพิ่มมุมข้อมือ
    leftWrist: 0,
    rightWrist: 0
};
let angleDisplayEnabled = false;
let angleDisplayInterval = null;

// ========================================
// ฟังก์ชันตั้งค่า MediaPipe Pose Detection
// ========================================

function setupPoseDetection() {
    if (!checkDependencies()) return;

    try {
        console.log('🎥 กำลังตั้งค่า MediaPipe Pose Detection...');
        
        poseDetection = new window.Pose({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1635988162/${file}`;
            }
        });

        poseDetection.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            enableSegmentation: false,
            minDetectionConfidence: 0.6,
            minTrackingConfidence: 0.5,
            selfieMode: false
        });

        poseDetection.onResults(onPoseResults);

        let lastProcessTime = 0;
        const PROCESS_INTERVAL = 100;

        camera = new window.Camera(videoElement, {
            onFrame: async () => {
                const now = Date.now();
                if (poseDetection && (now - lastProcessTime) > PROCESS_INTERVAL) {
                    lastProcessTime = now;
                    await poseDetection.send({ image: videoElement });
                }
            },
            width: 640,
            height: 480
        });

        camera.start()
            .then(() => {
                console.log('✅ กล้องเริ่มทำงานสำเร็จ');
                updateStartButton(true);
                setupRealtimeAngleDisplay();
                setTimeout(setupCameraCanvas, 500);
            })
            .catch(error => {
                console.error('❌ ไม่สามารถเริ่มกล้องได้:', error);
                showError('ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตการใช้กล้องในเบราว์เซอร์');
            });

    } catch (error) {
        console.error('❌ Error ในการตั้งค่า MediaPipe:', error);
        showError('เกิดข้อผิดพลาดในการตั้งค่าระบบตรวจจับท่าทาง');
    }
}

function onPoseResults(results) {
    poseResults = results;
    
    if (results.poseLandmarks) {
        calculateRealtimeAngles(results.poseLandmarks);
        detectBestSideAutomatically(results.poseLandmarks);
    }

    drawPoseResults();
    
    if (isDetecting) {
        analyzeCurrentExercise();
    }
}

// ========================================
// ฟังก์ชันคำนวณมุมแบบเรียลไทม์
// ========================================

function calculateRealtimeAngles(landmarks) {
    if (!landmarks || landmarks.length < 33) return;

    try {
        realtimeAngles.leftShoulder = calculateShoulderAngle(landmarks, 'left');
        realtimeAngles.rightShoulder = calculateShoulderAngle(landmarks, 'right');
        realtimeAngles.leftElbow = calculateElbowAngle(landmarks, 'left');
        realtimeAngles.rightElbow = calculateElbowAngle(landmarks, 'right');
        realtimeAngles.leftKnee = calculateKneeAngle(landmarks, 'left');
        realtimeAngles.rightKnee = calculateKneeAngle(landmarks, 'right');
        realtimeAngles.leftHip = calculateHipAngle(landmarks, 'left');
        realtimeAngles.rightHip = calculateHipAngle(landmarks, 'right');
        realtimeAngles.neckTilt = calculateNeckTiltAngle(landmarks);
        realtimeAngles.trunkTilt = calculateTrunkTiltAngle(landmarks);
        
        updateAngleDisplay();
        
    } catch (error) {
        console.warn('⚠️ Error calculating realtime angles:', error);
    }
}

function calculateShoulderAngle(landmarks, side) {
    const indices = getSideIndices(side);
    
    if (!validateLandmarks(landmarks, [indices[0], indices[1], indices[3]])) {
        return 0;
    }
    
    const angle = calculateAngle(
        {x: landmarks[indices[3]].x, y: landmarks[indices[3]].y},
        {x: landmarks[indices[0]].x, y: landmarks[indices[0]].y},
        {x: landmarks[indices[1]].x, y: landmarks[indices[1]].y}
    );
    
    return Math.round(angle);
}

function calculateElbowAngle(landmarks, side) {
    const indices = getSideIndices(side);
    
    if (!validateLandmarks(landmarks, [indices[0], indices[1], indices[2]])) {
        return 0;
    }
    
    const angle = calculateAngle(
        {x: landmarks[indices[0]].x, y: landmarks[indices[0]].y},
        {x: landmarks[indices[1]].x, y: landmarks[indices[1]].y},
        {x: landmarks[indices[2]].x, y: landmarks[indices[2]].y}
    );
    
    return Math.round(angle);
}

function calculateKneeAngle(landmarks, side) {
    const indices = getSideIndices(side);
    
    if (!validateLandmarks(landmarks, [indices[3], indices[4], indices[5]])) {
        return 0;
    }
    
    const angle = calculateAngle(
        {x: landmarks[indices[3]].x, y: landmarks[indices[3]].y},
        {x: landmarks[indices[4]].x, y: landmarks[indices[4]].y},
        {x: landmarks[indices[5]].x, y: landmarks[indices[5]].y}
    );
    
    return Math.round(angle);
}

function calculateHipAngle(landmarks, side) {
    const indices = getSideIndices(side);
    
    if (!validateLandmarks(landmarks, [indices[0], indices[3], indices[4]])) {
        return 0;
    }
    
    const angle = calculateAngle(
        {x: landmarks[indices[0]].x, y: landmarks[indices[0]].y},
        {x: landmarks[indices[3]].x, y: landmarks[indices[3]].y},
        {x: landmarks[indices[4]].x, y: landmarks[indices[4]].y}
    );
    
    return Math.round(angle);
}

function calculateNeckTiltAngle(landmarks) {
    if (!landmarks[0] || !landmarks[7] || !landmarks[8]) return 0;
    
    const leftEar = landmarks[7];
    const rightEar = landmarks[8];
    const earDistance = Math.abs(leftEar.y - rightEar.y);
    const tiltAngle = Math.min(45, earDistance * 200);
    
    return Math.round(tiltAngle);
}

function calculateTrunkTiltAngle(landmarks) {
    if (!landmarks[11] || !landmarks[12] || !landmarks[23] || !landmarks[24]) return 0;
    
    const shoulderCenter = {
        x: (landmarks[11].x + landmarks[12].x) / 2,
        y: (landmarks[11].y + landmarks[12].y) / 2
    };
    const hipCenter = {
        x: (landmarks[23].x + landmarks[24].x) / 2,
        y: (landmarks[23].y + landmarks[24].y) / 2
    };
    
    const tilt = Math.abs(shoulderCenter.x - hipCenter.x) * 100;
    return Math.round(Math.min(30, tilt));
}

// ========================================
// ฟังก์ชันการแสดงผลมุมแบบเรียลไทม์
// ========================================

function setupRealtimeAngleDisplay() {
    angleDisplayEnabled = true;
    createAngleDisplayUI();
    
    if (angleDisplayInterval) {
        clearInterval(angleDisplayInterval);
    }
    
    angleDisplayInterval = setInterval(() => {
        if (angleDisplayEnabled) {
            updateAngleDisplay();
        }
    }, 100);
    
    console.log('📐 เริ่มแสดงมุมร่างกายแบบเรียลไทม์');
}

function createAngleDisplayUI() {
    let anglePanel = document.getElementById('realtime-angle-panel');
    if (anglePanel) return;
    
    const angleHTML = `
        <div id="realtime-angle-panel" class="angle-display-panel">
            <div class="angle-header">
                <h3><i class="fas fa-drafting-compass"></i> มุมร่างกายแบบเรียลไทม์</h3>
                <button id="toggle-angle-display" class="btn-icon" title="เปิด/ปิดการแสดงมุม">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
            <div class="angle-grid" id="angle-grid">
                <div class="angle-section">
                    <h4>ส่วนบน (Upper Body)</h4>
                    <div class="angle-row">
                        <div class="angle-item">
                            <span class="angle-label">ไหล่ซ้าย</span>
                            <span class="angle-value" id="left-shoulder-angle">0°</span>
                            <div class="angle-bar">
                                <div class="angle-fill" id="left-shoulder-fill"></div>
                            </div>
                        </div>
                        <div class="angle-item">
                            <span class="angle-label">ไหล่ขวา</span>
                            <span class="angle-value" id="right-shoulder-angle">0°</span>
                            <div class="angle-bar">
                                <div class="angle-fill" id="right-shoulder-fill"></div>
                            </div>
                        </div>
                    </div>
                    <div class="angle-row">
                        <div class="angle-item">
                            <span class="angle-label">ศอกซ้าย</span>
                            <span class="angle-value" id="left-elbow-angle">0°</span>
                            <div class="angle-bar">
                                <div class="angle-fill" id="left-elbow-fill"></div>
                            </div>
                        </div>
                        <div class="angle-item">
                            <span class="angle-label">ศอกขวา</span>
                            <span class="angle-value" id="right-elbow-angle">0°</span>
                            <div class="angle-bar">
                                <div class="angle-fill" id="right-elbow-fill"></div>
                            </div>
                        </div>
                    </div>
                    <div class="angle-row">
                        <div class="angle-item">
                            <span class="angle-label">ข้อมือซ้าย</span>
                            <span class="angle-value" id="left-wrist-angle">0°</span>
                            <div class="angle-bar">
                                <div class="angle-fill" id="left-wrist-fill"></div>
                            </div>
                        </div>
                        <div class="angle-item">
                            <span class="angle-label">ข้อมือขวา</span>
                            <span class="angle-value" id="right-wrist-angle">0°</span>
                            <div class="angle-bar">
                                <div class="angle-fill" id="right-wrist-fill"></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="angle-section">
                    <h4>ลำตัว (Trunk)</h4>
                    <div class="angle-row">
                        <div class="angle-item">
                            <span class="angle-label">คอ</span>
                            <span class="angle-value" id="neck-tilt-angle">0°</span>
                            <div class="angle-bar">
                                <div class="angle-fill" id="neck-tilt-fill"></div>
                            </div>
                        </div>
                        <div class="angle-item">
                            <span class="angle-label">ลำตัว</span>
                            <span class="angle-value" id="trunk-tilt-angle">0°</span>
                            <div class="angle-bar">
                                <div class="angle-fill" id="trunk-tilt-fill"></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="angle-section">
                    <h4>ส่วนล่าง (Lower Body)</h4>
                    <div class="angle-row">
                        <div class="angle-item">
                            <span class="angle-label">สะโพกซ้าย</span>
                            <span class="angle-value" id="left-hip-angle">0°</span>
                            <div class="angle-bar">
                                <div class="angle-fill" id="left-hip-fill"></div>
                            </div>
                        </div>
                        <div class="angle-item">
                            <span class="angle-label">สะโพกขวา</span>
                            <span class="angle-value" id="right-hip-angle">0°</span>
                            <div class="angle-bar">
                                <div class="angle-fill" id="right-hip-fill"></div>
                            </div>
                        </div>
                    </div>
                    <div class="angle-row">
                        <div class="angle-item">
                            <span class="angle-label">เข่าซ้าย</span>
                            <span class="angle-value" id="left-knee-angle">0°</span>
                            <div class="angle-bar">
                                <div class="angle-fill" id="left-knee-fill"></div>
                            </div>
                        </div>
                        <div class="angle-item">
                            <span class="angle-label">เข่าขวา</span>
                            <span class="angle-value" id="right-knee-angle">0°</span>
                            <div class="angle-bar">
                                <div class="angle-fill" id="right-knee-fill"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const controlPanel = document.querySelector('.control-panel');
    if (controlPanel) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = angleHTML;
        controlPanel.insertBefore(tempDiv.firstElementChild, controlPanel.firstElementChild);
        
        const toggleBtn = document.getElementById('toggle-angle-display');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', toggleAngleDisplay);
        }
    }
}

function updateAngleDisplay() {
    if (!angleDisplayEnabled) return;
    
    updateAngleElement('left-shoulder-angle', 'left-shoulder-fill', realtimeAngles.leftShoulder, 180);
    updateAngleElement('right-shoulder-angle', 'right-shoulder-fill', realtimeAngles.rightShoulder, 180);
    updateAngleElement('left-elbow-angle', 'left-elbow-fill', realtimeAngles.leftElbow, 180);
    updateAngleElement('right-elbow-angle', 'right-elbow-fill', realtimeAngles.rightElbow, 180);
    // เพิ่มการอัปเดตมุมข้อมือ
    updateAngleElement('left-wrist-angle', 'left-wrist-fill', realtimeAngles.leftWrist, 180);
    updateAngleElement('right-wrist-angle', 'right-wrist-fill', realtimeAngles.rightWrist, 180);
    updateAngleElement('left-knee-angle', 'left-knee-fill', realtimeAngles.leftKnee, 180);
    updateAngleElement('right-knee-angle', 'right-knee-fill', realtimeAngles.rightKnee, 180);
    updateAngleElement('left-hip-angle', 'left-hip-fill', realtimeAngles.leftHip, 180);
    updateAngleElement('right-hip-angle', 'right-hip-fill', realtimeAngles.rightHip, 180);
    updateAngleElement('neck-tilt-angle', 'neck-tilt-fill', realtimeAngles.neckTilt, 45);
    updateAngleElement('trunk-tilt-angle', 'trunk-tilt-fill', realtimeAngles.trunkTilt, 30);
}

function updateAngleElement(angleId, fillId, angle, maxAngle) {
    const angleElement = document.getElementById(angleId);
    const fillElement = document.getElementById(fillId);
    
    if (angleElement && fillElement) {
        angleElement.textContent = `${angle}°`;
        
        const percentage = Math.min(100, (angle / maxAngle) * 100);
        fillElement.style.width = `${percentage}%`;
        
        if (percentage > 80) {
            fillElement.style.backgroundColor = '#e74c3c';
        } else if (percentage > 50) {
            fillElement.style.backgroundColor = '#f39c12';
        } else if (percentage > 20) {
            fillElement.style.backgroundColor = '#2ecc71';
        } else {
            fillElement.style.backgroundColor = '#3498db';
        }
        
        if (Math.abs(angle - (parseInt(angleElement.dataset.lastAngle) || 0)) > 10) {
            angleElement.style.transform = 'scale(1.1)';
            setTimeout(() => {
                angleElement.style.transform = 'scale(1)';
            }, 200);
        }
        
        angleElement.dataset.lastAngle = angle;
    }
}

function toggleAngleDisplay() {
    angleDisplayEnabled = !angleDisplayEnabled;
    
    const angleGrid = document.getElementById('angle-grid');
    const toggleBtn = document.getElementById('toggle-angle-display');
    
    if (angleGrid && toggleBtn) {
        if (angleDisplayEnabled) {
            angleGrid.style.display = 'block';
            toggleBtn.innerHTML = '<i class="fas fa-eye"></i>';
            toggleBtn.title = 'ซ่อนการแสดงมุม';
        } else {
            angleGrid.style.display = 'none';
            toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
            toggleBtn.title = 'แสดงมุม';
        }
    }
}

// ========================================
// ฟังก์ชันตรวจจับข้างอัตโนมัติ
// ========================================

function detectBestSideAutomatically(landmarks) {
    if (!landmarks || landmarks.length < 33) return;

    const leftSideData = calculateSideData(landmarks, 'left');
    const rightSideData = calculateSideData(landmarks, 'right');
    
    leftSideData.angleVariation = calculateAngleVariation('left');
    rightSideData.angleVariation = calculateAngleVariation('right');
    
    bothSidesData.left = leftSideData;
    bothSidesData.right = rightSideData;
    
    const bestSide = determineBestSide(leftSideData, rightSideData);
    
    if (bestSide && bestSide !== autoDetectedSide) {
        const qualityDifference = Math.abs(leftSideData.totalQuality - rightSideData.totalQuality);
        if (qualityDifference > 15) {
            autoDetectedSide = bestSide;
            console.log(`🔄 เปลี่ยนการตรวจจับเป็นข้าง${bestSide === 'left' ? 'ซ้าย' : 'ขวา'}`);
        }
    }
    
    return autoDetectedSide;
}

function calculateAngleVariation(side) {
    const angles = [
        side === 'left' ? realtimeAngles.leftShoulder : realtimeAngles.rightShoulder,
        side === 'left' ? realtimeAngles.leftElbow : realtimeAngles.rightElbow,
        side === 'left' ? realtimeAngles.leftKnee : realtimeAngles.rightKnee,
        side === 'left' ? realtimeAngles.leftHip : realtimeAngles.rightHip,
        // เพิ่มมุมข้อมือ
        side === 'left' ? realtimeAngles.leftWrist : realtimeAngles.rightWrist
    ];
    
    const validAngles = angles.filter(angle => angle > 0);
    if (validAngles.length === 0) return 0;
    
    const mean = validAngles.reduce((sum, angle) => sum + angle, 0) / validAngles.length;
    const variance = validAngles.reduce((sum, angle) => sum + Math.pow(angle - mean, 2), 0) / validAngles.length;
    
    return Math.sqrt(variance);
}

function calculateSideData(landmarks, side) {
    const indices = getSideIndices(side);
    let visibilityScore = 0;
    let movementScore = 0;
    let positionScore = 0;
    let currentAngle = 0;
    
    let visibleCount = 0;
    indices.forEach(index => {
        if (landmarks[index] && landmarks[index].visibility > 0.5) {
            visibilityScore += landmarks[index].visibility * 15;
            visibleCount++;
        }
    });
    
    currentAngle = calculateAngleForExercise(landmarks, side);
    
    const lastAngle = bothSidesData[side].angle || 0;
    if (lastAngle > 0) {
        const angleDiff = Math.abs(currentAngle - lastAngle);
        movementScore = Math.min(25, angleDiff * 1.5);
    }
    
    if (currentAngle > 10 && currentAngle < 170) {
        positionScore = 20;
    }
    
    const angleVariation = calculateAngleVariation(side);
    const variationScore = Math.min(10, angleVariation * 0.5);
    
    const totalQuality = visibilityScore + movementScore + positionScore + variationScore;
    
    return {
        angle: currentAngle,
        visibilityScore,
        movementScore,
        positionScore,
        variationScore,
        totalQuality,
        visibleCount,
        angleVariation
    };
}

function calculateAngleForExercise(landmarks, side) {
    if (!currentExercise) return 0;
    
    const indices = getSideIndices(side);
    
    switch (currentCategory) {
        case 'warmup':
            return calculateWarmupAngle(landmarks, side, indices);
        case 'upper-body':
            return calculateUpperBodyAngle(landmarks, side, indices);
        case 'trunk':
            return calculateTrunkAngle(landmarks, side, indices);
        case 'lower-body':
            return calculateLowerBodyAngle(landmarks, side, indices);
        default:
            return 0;
    }
}

function calculateWarmupAngle(landmarks, side, indices) {
    switch (currentExercise) {
        case 'arm-spread':
            // ใช้การคำนวณเดิม (ไม่แก้ไข)
            if (validateLandmarks(landmarks, [11, 12, 13, 14])) {
                const leftAngle = calculateArmAngle(landmarks, 'left');
                const rightAngle = calculateArmAngle(landmarks, 'right');
                
                if (side === 'left') return leftAngle;
                if (side === 'right') return rightAngle;
                
                return (leftAngle + rightAngle) / 2;
            }
            break;
            
        case 'neck-flex':
            // การคำนวณมุมสำหรับ neck-flex
            if (landmarks[0] && landmarks[9] && landmarks[10]) {
                return calculateAngle(
                    {x: landmarks[9].x, y: landmarks[9].y},  // ปาก
                    {x: landmarks[0].x, y: landmarks[0].y},  // จมูก
                    {x: landmarks[10].x, y: landmarks[10].y} // คาง
                );
            }
            break;
            
        case 'neck-tilt':
            // การคำนวณมุมสำหรับ neck-tilt
            if (landmarks[0] && landmarks[7] && landmarks[8]) {
                const earDistance = Math.abs(landmarks[7].y - landmarks[8].y);
                return Math.min(45, earDistance * 150); // ปรับค่าให้สอดคล้อง
            }
            break;
    }
    return 0;
}


function calculateUpperBodyAngle(landmarks, side, indices) {
    switch (currentExercise) {
        case 'shoulder-shrug':
            if (landmarks[indices[0]] && landmarks[indices[3]]) {
                const shoulderHeight = Math.abs(landmarks[indices[3]].y - landmarks[indices[0]].y);
                return Math.min(15, shoulderHeight * 100);
            }
            break;
        case 'arm-overhead':
            if (validateLandmarks(landmarks, [indices[0], indices[1], indices[3]])) {
                const angle = calculateAngle(
                    {x: landmarks[indices[3]].x, y: landmarks[indices[3]].y},
                    {x: landmarks[indices[0]].x, y: landmarks[indices[0]].y},
                    {x: landmarks[indices[1]].x, y: landmarks[indices[1]].y}
                );
                return 180 - angle;
            }
            break;
        case 'elbow-flex':
            if (validateLandmarks(landmarks, [indices[0], indices[1], indices[2]])) {
                return calculateAngle(
                    {x: landmarks[indices[0]].x, y: landmarks[indices[0]].y},
                    {x: landmarks[indices[1]].x, y: landmarks[indices[1]].y},
                    {x: landmarks[indices[2]].x, y: landmarks[indices[2]].y}
                );
            }
            break;
    }
    return 0;
}

function calculateTrunkAngle(landmarks, side, indices) {
    switch (currentExercise) {
        case 'trunk-sway':
            if (landmarks[11] && landmarks[12] && landmarks[23] && landmarks[24]) {
                const shoulderCenter = {
                    x: (landmarks[11].x + landmarks[12].x) / 2,
                    y: (landmarks[11].y + landmarks[12].y) / 2
                };
                const hipCenter = {
                    x: (landmarks[23].x + landmarks[24].x) / 2,
                    y: (landmarks[23].y + landmarks[24].y) / 2
                };
                const tilt = Math.abs(shoulderCenter.x - hipCenter.x) * 100;
                return Math.min(20, tilt);
            }
            break;
        case 'trunk-reach':
        case 'trunk-reach-floor':
        case 'side-reach':
            if (validateLandmarks(landmarks, [indices[0], indices[1], indices[2]])) {
                const reachDistance = calculateDistance(landmarks[indices[2]], landmarks[indices[0]]);
                return Math.min(90, reachDistance * 150);
            }
            break;
    }
    return 0;
}

function calculateLowerBodyAngle(landmarks, side, indices) {
    switch (currentExercise) {
        case 'knee-extension':
            if (validateLandmarks(landmarks, [indices[3], indices[4], indices[5]])) {
                return calculateAngle(
                    {x: landmarks[indices[3]].x, y: landmarks[indices[3]].y},
                    {x: landmarks[indices[4]].x, y: landmarks[indices[4]].y},
                    {x: landmarks[indices[5]].x, y: landmarks[indices[5]].y}
                );
            }
            break;
        case 'leg-abduction':
            if (landmarks[25] && landmarks[26]) {
                const legDistance = calculateDistance(landmarks[25], landmarks[26]);
                return Math.min(45, legDistance * 80);
            }
            break;
    }
    return 0;
}

// ========================================
// ฟังก์ชันช่วยเหลือ
// ========================================

function checkDependencies() {
    const requiredObjects = ['Pose', 'Camera'];
    const missing = [];
    
    requiredObjects.forEach(obj => {
        if (typeof window[obj] === 'undefined') {
            missing.push(obj);
        }
    });
    
    if (missing.length > 0) {
        console.error('❌ Missing MediaPipe dependencies:', missing);
        showError(`ไม่พบไลบรารี่ที่จำเป็น: ${missing.join(', ')}`);
        return false;
    }
    
    if (!videoElement || !canvasElement) {
        console.error('❌ Missing DOM elements: video or canvas');
        showError('ไม่พบองค์ประกอบ video หรือ canvas');
        return false;
    }
    
    return true;
}

function updateStartButton(enabled) {
    if (startButton) {
        startButton.disabled = !enabled;
        if (enabled) {
            startButton.innerHTML = '<i class="fas fa-play"></i> เริ่มการฝึก';
        } else {
            startButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังเตรียมพร้อม...';
        }
    }
}

function determineBestSide(leftData, rightData) {
    if (leftData.totalQuality > rightData.totalQuality + 10) {
        return 'left';
    } else if (rightData.totalQuality > leftData.totalQuality + 10) {
        return 'right';
    }
    
    if (leftData.movementScore > rightData.movementScore + 5) {
        return 'left';
    } else if (rightData.movementScore > leftData.movementScore + 5) {
        return 'right';
    }
    
    return autoDetectedSide;
}

function getSideIndices(side) {
    const leftIndices = [11, 13, 15, 23, 25, 27];
    const rightIndices = [12, 14, 16, 24, 26, 28];
    
    return side === 'left' ? leftIndices : rightIndices;
}

function validateLandmarks(landmarks, indices) {
    if (!landmarks || !Array.isArray(landmarks)) return false;
    
    return indices.every(index => {
        const landmark = landmarks[index];
        return landmark && 
               typeof landmark.x === 'number' && 
               typeof landmark.y === 'number' &&
               landmark.visibility > 0.5;
    });
}

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

function calculateDistance(point1, point2) {
    if (!point1 || !point2) return 0;
    
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function stopRealtimeAngleDisplay() {
    angleDisplayEnabled = false;
    
    if (angleDisplayInterval) {
        clearInterval(angleDisplayInterval);
        angleDisplayInterval = null;
    }
    
    const anglePanel = document.getElementById('realtime-angle-panel');
    if (anglePanel) {
        anglePanel.style.display = 'none';
    }
    
    console.log('📐 หยุดแสดงมุมร่างกายแบบเรียลไทม์');
}

function exportAngleData() {
    const angleData = {
        timestamp: new Date().toISOString(),
        angles: { ...realtimeAngles },
        detectedSide: autoDetectedSide,
        currentExercise: currentExercise,
        currentCategory: currentCategory
    };
    
    return angleData;
}

function getAngleStatistics() {
    const angles = Object.values(realtimeAngles).filter(angle => angle > 0);
    
    if (angles.length === 0) {
        return { mean: 0, max: 0, min: 0, range: 0 };
    }
    
    const mean = angles.reduce((sum, angle) => sum + angle, 0) / angles.length;
    const max = Math.max(...angles);
    const min = Math.min(...angles);
    const range = max - min;
    
    return {
        mean: Math.round(mean),
        max,
        min,
        range,
        activeJoints: angles.length
    };
}

// ส่งออกฟังก์ชันที่จำเป็นไปยัง global scope
window.realtimeAngleSystem = {
    setupRealtimeAngleDisplay,
    stopRealtimeAngleDisplay,
    toggleAngleDisplay,
    exportAngleData,
    getAngleStatistics,
    realtimeAngles
};

console.log('✅ pose-detection.js (ลบโค้ดซ้ำซ้อนแล้ว) โหลดเรียบร้อย - ระบบตรวจจับท่าทางพร้อมใช้งาน');