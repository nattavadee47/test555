// ========================================
// ระบบกายภาพบำบัดสำหรับผู้ป่วยหลังเส้นเลือดสมองแตก (Stroke)
// ไฟล์หลัก - main.js (แก้ไขแล้ว)
// ========================================

// ตัวแปรระบบหลัก
let poseDetection = null;
let camera = null;
let isDetecting = false;
let sessionStartTime = null;
let timerInterval = null;
let elapsedSeconds = 0;

// ตัวแปรการตรวจจับท่าทาง
let poseResults = null;
let currentExercise = '';
let currentCategory = 'warmup';
let currentAngle = 0;
let prevAngle = 0;
let movementPhase = 'rest';

// ตัวแปรสถิติ
let repCounter = 0;
let setCounter = 1;
let exerciseCount = 0;
let targetReps = 10;
let targetSets = 2;
let exerciseHistory = [];
let lastRepTime = 0;

// ตัวแปรการตรวจจับอัตโนมัติ
let autoDetectedSide = 'both';
let bothSidesData = {
    left: { angle: 0, quality: 0, movement: 0, totalQuality: 0 },
    right: { angle: 0, quality: 0, movement: 0, totalQuality: 0 }
};

// ตัวแปรการกรองสัญญาณ
let angleHistory = [];
let movementThreshold = 5;
let stabilityCounter = 0;

// ตัวแปรสำหรับการแสดงมุมแบบเรียลไทม์
let realtimeDisplayEnabled = false;
let angleUpdateInterval = null;

// องค์ประกอบ DOM - ปรับปรุงแล้ว
const videoElement = document.querySelector('#input-video');
const canvasElement = document.querySelector('#output-canvas');
const canvasCtx = canvasElement ? canvasElement.getContext('2d') : null;
const startButton = document.querySelector('#start-btn');
const feedbackText = document.querySelector('#feedback-text');
const repCountElement = document.getElementById('rep-counter');
const timeElement = document.getElementById('timer-display');
const accuracyElement = document.getElementById('accuracy-value');
const scoreElement = document.getElementById('score-display');

// เพิ่มตัวแปร DOM ที่ขาดหายไป
const instructionText = feedbackText; // ใช้ feedback-text เป็น instruction text
const progressFillElement = document.getElementById('progress-fill');
const detectionStatusElement = document.getElementById('detection-status');
const realtimeInfoElement = document.getElementById('realtime-info');

// เมนูเลือกท่า
const exerciseSelect = document.getElementById('exercise-select');

// ========================================
// ฟังก์ชันตรวจสอบ DOM elements
// ========================================
function checkDOMElements() {
    const requiredElements = {
        'video element': videoElement,
        'canvas element': canvasElement,
        'start button': startButton,
        'feedback text': feedbackText,
        'exercise select': exerciseSelect
    };
    
    const missingElements = [];
    Object.entries(requiredElements).forEach(([name, element]) => {
        if (!element) {
            missingElements.push(name);
        }
    });
    
    if (missingElements.length > 0) {
        console.error('❌ องค์ประกอบที่หายไป:', missingElements);
        showError(`ไม่พบองค์ประกอบที่จำเป็น: ${missingElements.join(', ')}`);
        return false;
    }
    
    return true;
}

// ========================================
// ฟังก์ชันเริ่มต้นระบบ
// ========================================

window.onload = function() {
    console.log('🚀 เริ่มโหลดระบบกายภาพบำบัด Stroke...');
    
    // ตรวจสอบ DOM elements ก่อน
    if (!checkDOMElements()) {
        return;
    }
    
    loadMediaPipeLibraries().then(() => {
        console.log("✅ MediaPipe libraries โหลดสำเร็จ");
        initializeSystem();
    }).catch(error => {
        console.error("❌ ไม่สามารถโหลด MediaPipe libraries:", error);
        showError("ไม่สามารถโหลดไลบรารี่การตรวจจับท่าทางได้ กรุณาโหลดหน้าเว็บใหม่");
    });
};

function loadMediaPipeLibraries() {
    return new Promise((resolve, reject) => {
        if (window.Pose && window.Camera && window.drawConnectors) {
            resolve();
            return;
        }

        const scripts = [
            'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1640029074/camera_utils.js',
            'https://cdn.jsdelivr.net/npm/@mediapipe/control_utils@0.6.1629159505/control_utils.js', 
            'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3.1640029074/drawing_utils.js',
            'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1635988162/pose.js'
        ];

        let loadedCount = 0;
        let hasError = false;

        scripts.forEach((src) => {
            const script = document.createElement('script');
            script.src = src;
            script.crossOrigin = 'anonymous';
            
            script.onload = () => {
                loadedCount++;
                console.log(`✅ โหลดสำเร็จ: ${src.split('/').pop()}`);
                if (loadedCount === scripts.length && !hasError) {
                    setTimeout(() => {
                        if (window.Pose && window.Camera) {
                            resolve();
                        } else {
                            reject(new Error('ไลบรารี่ไม่พร้อมใช้งาน'));
                        }
                    }, 1000);
                }
            };
            
            script.onerror = (error) => {
                hasError = true;
                console.error(`❌ โหลดไม่สำเร็จ: ${src}`);
                reject(new Error(`ไม่สามารถโหลด: ${src}`));
            };
            
            document.head.appendChild(script);
        });
    });
}

function initializeSystem() {
    console.log('🔧 เริ่มต้นระบบ...');
    
    setupEventListeners();
    setupPoseDetection();
    updateUI();
    
    console.log('✅ ระบบพร้อมใช้งาน');
}

// ========================================
// ฟังก์ชันตั้งค่า Event Listeners
// ========================================

function setupEventListeners() {
    console.log('🎯 ตั้งค่า Event Listeners...');
    
    // ปุ่มเริ่ม/หยุดการฝึก
    if (startButton) {
        startButton.addEventListener('click', toggleExercise);
    }

    // เมนูเลือกท่า
    if (exerciseSelect) {
        exerciseSelect.addEventListener('change', function() {
            if (this.value) {
                currentExercise = this.value;
                resetExerciseState();
                updateExerciseInstructions();
                
                // เปิดใช้งานปุ่มเริ่ม
                if (startButton) {
                    startButton.disabled = false;
                    startButton.innerHTML = '<i class="fas fa-play"></i> เริ่มการตรวจจับ';
                }
                
                console.log(`📝 เลือกท่า: ${this.value}`);
                showFeedback(`เลือกท่า: ${getExerciseName(this.value)}`);
            }
        });
    }

    // เพิ่ม keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // ตรวจสอบการเข้าถึงกล้อง
    checkCameraPermissions();
}

function handleKeyboardShortcuts(event) {
    if (event.target.tagName.toLowerCase() === 'input' || 
        event.target.tagName.toLowerCase() === 'textarea' || 
        event.target.tagName.toLowerCase() === 'select') {
        return;
    }
    
    switch (event.key.toLowerCase()) {
        case ' ':
            event.preventDefault();
            toggleExercise();
            break;
        case 'r':
            event.preventDefault();
            if (confirm('ต้องการรีเซ็ตการฝึกหรือไม่?')) {
                resetExerciseState();
            }
            break;
    }
}

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
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
            selfieMode: true
        });

        poseDetection.onResults(onPoseResults);
        
        setupCamera();

    } catch (error) {
        console.error('❌ Error ในการตั้งค่า MediaPipe:', error);
        showError('เกิดข้อผิดพลาดในการตั้งค่าระบบตรวจจับท่าทาง');
    }
}

function setupCamera() {
    if (!videoElement) {
        console.error('❌ ไม่พบ video element');
        return;
    }

    // อัปเดตสถานะการตรวจจับ
    updateDetectionStatus('กำลังเชื่อมต่อกล้อง...');

    try {
        camera = new window.Camera(videoElement, {
            onFrame: async () => {
                if (poseDetection && videoElement.videoWidth > 0) {
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
                setupCameraCanvas();
                showVideoContainer();
                updateDetectionStatus('กล้องพร้อมใช้งาน');
                showFeedback('กล้องพร้อมใช้งาน - เลือกท่าออกกำลังกายได้เลย');
            })
            .catch(error => {
                console.error('❌ ไม่สามารถเริ่มกล้องได้:', error);
                updateDetectionStatus('ไม่สามารถเข้าถึงกล้อง');
                showError('ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตการใช้กล้องในเบราว์เซอร์');
                showCameraInstructions();
            });

    } catch (error) {
        console.error('❌ Error ในการตั้งค่ากล้อง:', error);
        updateDetectionStatus('เกิดข้อผิดพลาดในการตั้งค่ากล้อง');
        showError('เกิดข้อผิดพลาดในการตั้งค่ากล้อง');
        showCameraInstructions();
    }
}

function onPoseResults(results) {
    poseResults = results;
    
    if (results.poseLandmarks) {
        calculateRealtimeAngles(results.poseLandmarks);
        detectBestSideAutomatically(results.poseLandmarks);
        updateDetectionStatus('พบบุคคลในกรอบภาพ', 'detected');
    } else {
        updateDetectionStatus('กำลังค้นหาบุคคลในกรอบภาพ...', 'waiting');
    }

    drawPoseResults();
    
    if (isDetecting && currentExercise) {
        analyzeCurrentExercise();
    }
}

// ========================================
// ฟังก์ชันอัปเดตสถานะ
// ========================================

function updateDetectionStatus(message, status = 'waiting') {
    if (detectionStatusElement) {
        detectionStatusElement.textContent = message;
        detectionStatusElement.className = `detection-status ${status}`;
    }
}

function updateStartButton(enabled) {
    if (startButton) {
        startButton.disabled = !enabled;
        if (enabled) {
            startButton.innerHTML = '<i class="fas fa-play"></i> เริ่มการตรวจจับ';
        } else {
            startButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังเตรียมพร้อม...';
        }
    }
}

// ========================================
// ฟังก์ชันการควบคุมการฝึก
// ========================================

function toggleExercise() {
    if (!isDetecting) {
        startExercise();
    } else {
        stopExercise();
    }
}

function startExercise() {
    if (!poseDetection || !camera) {
        showError('ระบบยังไม่พร้อม กรุณารอสักครู่');
        return;
    }

    if (!currentExercise) {
        showError('กรุณาเลือกท่าออกกำลังกายก่อนเริ่มฝึก');
        return;
    }

    isDetecting = true;
    sessionStartTime = new Date();
    startTimer();
    resetExerciseState();
    
    if (startButton) {
        startButton.innerHTML = '<i class="fas fa-stop"></i> หยุดการฝึก';
        startButton.classList.add('btn-accent');
    }
    
    showFeedback(`เริ่มการฝึก: ${getExerciseName(currentExercise)}`);
    updateDetectionStatus('กำลังตรวจจับท่าทาง...', 'detecting');
    
    logExerciseEvent('เริ่มเซสชัน', `ท่า: ${getExerciseName(currentExercise)}`);
}

function stopExercise() {
    isDetecting = false;
    clearInterval(timerInterval);
    
    if (startButton) {
        startButton.innerHTML = '<i class="fas fa-play"></i> เริ่มการฝึก';
        startButton.classList.remove('btn-accent');
    }
    
    showFeedback('หยุดการฝึกแล้ว');
    updateDetectionStatus('หยุดการตรวจจับแล้ว');
    
    if (sessionStartTime) {
        const duration = Math.round((new Date() - sessionStartTime) / 1000);
        logExerciseEvent('จบเซสชัน', `ระยะเวลา: ${formatTime(duration)}`);
        saveExerciseSession();
    }
}

function resetExerciseState() {
    repCounter = 0;
    setCounter = 1;
    exerciseCount = 0;
    movementPhase = 'rest';
    currentAngle = 0;
    prevAngle = 0;
    lastRepTime = 0;
    stabilityCounter = 0;
    
    bothSidesData = {
        left: { angle: 0, quality: 0, movement: 0, totalQuality: 0 },
        right: { angle: 0, quality: 0, movement: 0, totalQuality: 0 }
    };
    
    angleHistory = [];
    updateCounters();
    updateUI();
    
    console.log('🔄 รีเซ็ตสถานะการฝึกเรียบร้อย');
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

function checkCameraPermissions() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                console.log('✅ มีการอนุญาตใช้กล้อง');
                stream.getTracks().forEach(track => track.stop());
            })
            .catch(error => {
                console.warn('⚠️ ไม่มีการอนุญาตใช้กล้อง:', error);
                showCameraInstructions();
            });
    } else {
        console.warn('⚠️ เบราว์เซอร์ไม่รองรับการเข้าถึงกล้อง');
        showError('เบราว์เซอร์นี้ไม่รองรับการเข้าถึงกล้อง');
    }
}

function showCameraInstructions() {
    const instructions = `
        <div class="camera-instructions">
            <h3>วิธีการอนุญาตการใช้กล้อง:</h3>
            <ol>
                <li>คลิกที่ไอคอนกล้องใน address bar</li>
                <li>เลือก "อนุญาต" หรือ "Allow"</li>
                <li>รีเฟรชหน้าเว็บ</li>
            </ol>
            <p>หรือไปที่การตั้งค่าเบราว์เซอร์ → ความเป็นส่วนตัว → กล้อง → อนุญาตสำหรับเว็บไซต์นี้</p>
        </div>
    `;
    
    if (feedbackText) {
        feedbackText.innerHTML = instructions;
    }
}

function showVideoContainer() {
    const setupPhase = document.getElementById('setup-phase');
    const videoContainer = document.getElementById('video-container');
    
    if (setupPhase) setupPhase.style.display = 'none';
    if (videoContainer) videoContainer.style.display = 'block';
}

function setupCameraCanvas() {
    if (!canvasElement || !videoElement) {
        console.error('❌ ไม่พบ canvas หรือ video element');
        return;
    }

    console.log('🎨 ตั้งค่า Canvas...');

    const updateCanvasSize = () => {
        if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
            canvasElement.width = videoElement.videoWidth;
            canvasElement.height = videoElement.videoHeight;
            
            canvasElement.style.width = '100%';
            canvasElement.style.height = 'auto';
            canvasElement.style.maxHeight = '400px';
            
            console.log(`✅ Canvas ขนาด: ${canvasElement.width}x${canvasElement.height}`);
        } else {
            setTimeout(updateCanvasSize, 100);
        }
    };
    
    updateCanvasSize();
}

// ฟังก์ชันรองที่เหลือจากโค้ดเดิม...
function drawPoseResults() {
    if (!canvasCtx || !poseResults) return;
    
    try {
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        
        if (videoElement && videoElement.videoWidth > 0) {
            canvasCtx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        }
        
        if (poseResults.poseLandmarks) {
            drawPoseConnections();
            drawAllLandmarks();
            drawExerciseInfo();
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

function drawExerciseInfo() {
    if (!canvasCtx) return;
    
    try {
        canvasCtx.font = '16px Kanit, Arial, sans-serif';
        canvasCtx.fillStyle = '#FFFFFF';
        canvasCtx.strokeStyle = '#000000';
        canvasCtx.lineWidth = 3;
        
        let yPosition = 30;
        
        if (currentExercise) {
            const exerciseText = `ท่า: ${getExerciseName(currentExercise)}`;
            drawTextWithOutline(exerciseText, 10, yPosition);
            yPosition += 25;
        }
        
        if (currentAngle > 0 && movementPhase !== 'rest') {
            const angleText = `มุม: ${Math.round(currentAngle)}°`;
            drawTextWithOutline(angleText, 10, yPosition);
            yPosition += 25;
        }
        
        if (movementPhase !== 'rest') {
            const phaseText = `สถานะ: ${getPhaseDisplayName(movementPhase)}`;
            drawTextWithOutline(phaseText, 10, yPosition);
            yPosition += 25;
        }
        
        if (repCounter > 0) {
            const repText = `ครั้งที่: ${repCounter}/${targetReps}`;
            drawTextWithOutline(repText, 10, yPosition);
        }
        
    } catch (error) {
        console.warn('⚠️ Error drawing exercise info:', error);
    }
}

function drawTextWithOutline(text, x, y) {
    canvasCtx.strokeText(text, x, y);
    canvasCtx.fillText(text, x, y);
}

// ========================================
// ฟังก์ชันเสริม
// ========================================

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    
    elapsedSeconds = 0;
    timerInterval = setInterval(() => {
        elapsedSeconds++;
        if (timeElement) {
            timeElement.textContent = formatTime(elapsedSeconds);
        }
    }, 1000);
}

function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function getExerciseName(exerciseCode) {
    const exerciseNames = {
        'ArmRaiseForward': 'ท่ายกแขนไปข้างหน้า',
        'KneeExtension': 'ท่าเหยียดเข่าตรง',
        'TrunkSway': 'ท่าโยกลำตัวซ้าย-ขวา',
        'NeckTiltFixed': 'ท่าเอียงศีรษะซ้าย-ขวา'
    };
    return exerciseNames[exerciseCode] || exerciseCode;
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
        'holding': 'กำลังคงท่า',
        'returning': 'กำลังกลับท่าเดิม'
    };
    return phaseNames[phase] || phase;
}

function updateExerciseInstructions() {
    const exerciseInstructions = {
        'ArmRaiseForward': 'ยกแขนทั้งสองข้างไปข้างหน้าให้ขนานกับพื้น จากนั้นลงช้าๆ',
        'KneeExtension': 'นั่งบนเก้าอี้ เหยียดเข่าตรงทีละข้าง คงท่าไว้ 2 วินาที',
        'TrunkSway': 'โยกลำตัวซ้าย-ขวา ขานั่งมั่นคงบนเก้าอี้ เอียงตัวจากสะโพก',
        'NeckTiltFixed': 'เอียงศีรษะไปทางไหล่ซ้าย จากนั้นกลับสู่ท่าตรงและเอียงไปทางขวา'
    };

    if (instructionText) {
        instructionText.textContent = exerciseInstructions[currentExercise] || 'เลือกท่าออกกำลังกายจากเมนูด้านบน';
    }
}

function updateCounters() {
    if (repCountElement) {
        repCountElement.textContent = repCounter;
    }
    
    if (scoreElement) {
        scoreElement.textContent = Math.round((repCounter / targetReps) * 100);
    }
    
    // อัปเดต progress bar
    if (progressFillElement) {
        const progress = Math.min(100, (repCounter / targetReps) * 100);
        progressFillElement.style.width = `${progress}%`;
    }
}

function updateUI() {
    updateCounters();
    updateExerciseInstructions();
}

function showFeedback(message, type = 'info') {
    if (feedbackText) {
        feedbackText.textContent = message;
        
        switch (type) {
            case 'success':
                feedbackText.style.color = '#4CAF50';
                break;
            case 'warning':
                feedbackText.style.color = '#FF9800';
                break;
            case 'error':
                feedbackText.style.color = '#F44336';
                break;
            default:
                feedbackText.style.color = '#333';
        }
    }
    
    console.log(`💬 ${type.toUpperCase()}: ${message}`);
}

function showError(message) {
    showFeedback(message, 'error');
}

function logExerciseEvent(event, details) {
    const timestamp = new Date().toLocaleTimeString('th-TH');
    exerciseHistory.push({
        timestamp,
        event,
        details,
        exercise: currentExercise
    });
    console.log(`[${timestamp}] ${event}: ${details}`);
}

function saveExerciseSession() {
    if (!sessionStartTime) return;
    
    const sessionData = {
        id: Date.now(),
        date: new Date().toLocaleDateString('th-TH'),
        time: new Date().toLocaleTimeString('th-TH'),
        exercise: currentExercise,
        exerciseName: getExerciseName(currentExercise),
        repetitions: repCounter,
        duration: elapsedSeconds,
        formattedDuration: formatTime(elapsedSeconds),
        accuracy: accuracyElement ? accuracyElement.textContent : '85%',
        events: [...exerciseHistory]
    };
    
    console.log('✅ บันทึกเซสชันเรียบร้อย:', sessionData);
}

// ========================================
// ฟังก์ชันสำหรับการตรวจจับและคำนวณมุม (พื้นฐาน)
// ========================================

function calculateRealtimeAngles(landmarks) {
    // ฟังก์ชันพื้นฐานสำหรับคำนวณมุม
    if (!landmarks || landmarks.length < 33) return;
    
    // คำนวณมุมพื้นฐานสำหรับการแสดงผล
    try {
        const leftShoulder = calculateAngleBasic(landmarks, 13, 11, 23); // ศอก-ไหล่-สะโพก
        const rightShoulder = calculateAngleBasic(landmarks, 14, 12, 24);
        
        // อัปเดตข้อมูลพื้นฐาน
        if (leftShoulder > 0) currentAngle = leftShoulder;
        if (rightShoulder > 0 && rightShoulder > currentAngle) currentAngle = rightShoulder;
        
        // อัปเดตข้อมูล realtime info
        updateRealtimeInfo();
        
    } catch (error) {
        console.warn('⚠️ Error calculating angles:', error);
    }
}

function updateRealtimeInfo() {
    if (realtimeInfoElement && movementPhase !== 'rest') {
        const currentAngleDisplay = document.getElementById('current-angle');
        const currentAccuracyDisplay = document.getElementById('current-accuracy');
        const repCountDisplay = document.getElementById('rep-count');
        const movementPhaseDisplay = document.getElementById('movement-phase');
        
        if (currentAngleDisplay) currentAngleDisplay.textContent = Math.round(currentAngle) + '°';
        if (currentAccuracyDisplay) currentAccuracyDisplay.textContent = '0%';
        if (repCountDisplay) repCountDisplay.textContent = repCounter;
        if (movementPhaseDisplay) movementPhaseDisplay.textContent = movementPhase;
    }
}

function calculateAngleBasic(landmarks, aIdx, bIdx, cIdx) {
    if (!landmarks[aIdx] || !landmarks[bIdx] || !landmarks[cIdx]) return 0;
    
    const a = landmarks[aIdx];
    const b = landmarks[bIdx];
    const c = landmarks[cIdx];
    
    if (a.visibility < 0.5 || b.visibility < 0.5 || c.visibility < 0.5) return 0;
    
    return calculateAngle(
        {x: a.x, y: a.y},
        {x: b.x, y: b.y},
        {x: c.x, y: c.y}
    );
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

function detectBestSideAutomatically(landmarks) {
    // ฟังก์ชันพื้นฐานสำหรับตรวจจับข้างที่เคลื่อนไหวมากที่สุด
    if (!landmarks || landmarks.length < 33) return;
    
    const leftMovement = calculateMovementScore(landmarks, 'left');
    const rightMovement = calculateMovementScore(landmarks, 'right');
    
    bothSidesData.left.totalQuality = leftMovement;
    bothSidesData.right.totalQuality = rightMovement;
    
    if (leftMovement > rightMovement + 10) {
        autoDetectedSide = 'left';
    } else if (rightMovement > leftMovement + 10) {
        autoDetectedSide = 'right';
    } else {
        autoDetectedSide = 'both';
    }
}

function calculateMovementScore(landmarks, side) {
    const indices = side === 'left' ? [11, 13, 15, 25] : [12, 14, 16, 26];
    let score = 0;
    let count = 0;
    
    indices.forEach(index => {
        if (landmarks[index] && landmarks[index].visibility > 0.5) {
            score += landmarks[index].visibility * 25;
            count++;
        }
    });
    
    return count > 0 ? score / count : 0;
}

function analyzeCurrentExercise() {
    if (!poseResults || !poseResults.poseLandmarks || !currentExercise) {
        return;
    }

    const landmarks = poseResults.poseLandmarks;
    
    // วิเคราะห์พื้นฐานตามท่าที่เลือก
    switch (currentExercise) {
        case 'ArmRaiseForward':
            analyzeArmRaise(landmarks);
            break;
        case 'KneeExtension':
            analyzeKneeExtension(landmarks);
            break;
        case 'TrunkSway':
            analyzeTrunkSway(landmarks);
            break;
        case 'NeckTiltFixed':
            analyzeNeckTilt(landmarks);
            break;
        default:
            showFeedback('ไม่พบประเภทท่ากายภาพบำบัดที่เลือก');
    }
}

function analyzeArmRaise(landmarks) {
    const leftAngle = calculateAngleBasic(landmarks, 15, 13, 11); // มือ-ศอก-ไหล่
    const rightAngle = calculateAngleBasic(landmarks, 16, 14, 12);
    
    const maxAngle = Math.max(leftAngle, rightAngle);
    currentAngle = maxAngle;
    
    if (maxAngle > 120 && movementPhase === 'rest') {
        movementPhase = 'lifting';
        showFeedback('กำลังยกแขน...');
    } else if (maxAngle > 160 && movementPhase === 'lifting') {
        movementPhase = 'holding';
        showFeedback('ดีมาก! คงท่าไว้');
        setTimeout(() => {
            if (movementPhase === 'holding') {
                movementPhase = 'lowering';
                showFeedback('ลงแขนช้าๆ');
            }
        }, 2000);
    } else if (maxAngle < 60 && movementPhase === 'lowering') {
        completeRepetition();
    }
}

function analyzeKneeExtension(landmarks) {
    const leftKneeAngle = calculateAngleBasic(landmarks, 27, 25, 23); // ข้อเท้า-เข่า-สะโพก
    const rightKneeAngle = calculateAngleBasic(landmarks, 28, 26, 24);
    
    const maxAngle = Math.max(leftKneeAngle, rightKneeAngle);
    currentAngle = maxAngle;
    
    if (maxAngle > 150 && movementPhase === 'rest') {
        movementPhase = 'extending';
        showFeedback('กำลังเหยียดเข่า...');
    } else if (maxAngle > 170 && movementPhase === 'extending') {
        movementPhase = 'holding';
        showFeedback('ดีมาก! คงท่าไว้ 2 วินาที');
        setTimeout(() => {
            if (movementPhase === 'holding') {
                movementPhase = 'flexing';
                showFeedback('งอเข่ากลับ');
            }
        }, 2000);
    } else if (maxAngle < 120 && movementPhase === 'flexing') {
        completeRepetition();
    }
}

function analyzeTrunkSway(landmarks) {
    if (!landmarks[11] || !landmarks[12] || !landmarks[23] || !landmarks[24]) return;
    
    const shoulderCenter = {
        x: (landmarks[11].x + landmarks[12].x) / 2,
        y: (landmarks[11].y + landmarks[12].y) / 2
    };
    const hipCenter = {
        x: (landmarks[23].x + landmarks[24].x) / 2,
        y: (landmarks[23].y + landmarks[24].y) / 2
    };
    
    const tilt = Math.abs(shoulderCenter.x - hipCenter.x) * 100;
    currentAngle = Math.min(30, tilt);
    
    if (tilt > 15 && movementPhase === 'rest') {
        movementPhase = 'swaying';
        showFeedback('กำลังโยกลำตัว...');
    } else if (tilt > 25 && movementPhase === 'swaying') {
        movementPhase = 'holding';
        showFeedback('ดีมาก! คงท่าไว้');
        setTimeout(() => {
            if (movementPhase === 'holding') {
                movementPhase = 'returning';
                showFeedback('กลับสู่ท่าตรง');
            }
        }, 2000);
    } else if (tilt < 5 && movementPhase === 'returning') {
        completeRepetition();
    }
}

function analyzeNeckTilt(landmarks) {
    if (!landmarks[7] || !landmarks[8]) return;
    
    const earHeightDiff = Math.abs(landmarks[7].y - landmarks[8].y);
    const tiltAngle = Math.min(45, earHeightDiff * 100);
    currentAngle = tiltAngle;
    
    if (tiltAngle > 10 && movementPhase === 'rest') {
        movementPhase = 'tilting';
        showFeedback('กำลังเอียงศีรษะ...');
    } else if (tiltAngle > 20 && movementPhase === 'tilting') {
        movementPhase = 'holding';
        showFeedback('ดีมาก! คงท่าไว้ 2 วินาที');
        setTimeout(() => {
            if (movementPhase === 'holding') {
                movementPhase = 'returning';
                showFeedback('กลับสู่ท่าตรง');
            }
        }, 2000);
    } else if (tiltAngle < 5 && movementPhase === 'returning') {
        completeRepetition();
    }
}

function completeRepetition() {
    repCounter++;
    exerciseCount++;
    movementPhase = 'rest';
    
    showFeedback(`สำเร็จ! ครั้งที่ ${repCounter}`, 'success');
    updateCounters();
    
    if (repCounter >= targetReps) {
        showFeedback('เยี่ยม! เสร็จสิ้นการบำบัดแล้ว', 'success');
        setTimeout(() => {
            stopExercise();
        }, 2000);
    }
}

// Export functions to global scope
window.strokeSystem = {
    startExercise,
    stopExercise,
    resetExerciseState,
    toggleExercise,
    getExerciseName,
    formatTime
};

console.log('✅ main.js โหลดเรียบร้อย - ระบบกายภาพบำบัด Stroke พร้อมใช้งาน');