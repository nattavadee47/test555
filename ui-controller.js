// ========================================
// ระบบควบคุม UI และการโต้ตอบผู้ใช้สำหรับผู้ป่วย Stroke
// ui-controller.js
// ========================================
// เพิ่มการกำหนดตัวแปร DOM elements
const progressBar = document.querySelector('.progress-fill') || document.getElementById('progress-fill');
const progressText = document.querySelector('.progress-text') || document.getElementById('progress-text');
// ========================================
// ฟังก์ชันการแสดงผลข้อความ
// ========================================

function showFeedback(message, type = 'info') {
    if (feedbackText) {
        feedbackText.textContent = message;
        
        // ตั้งค่าสีตามประเภทข้อความ
        switch (type) {
            case 'success':
                feedbackText.style.color = '#4CAF50';
                feedbackText.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
                break;
            case 'warning':
                feedbackText.style.color = '#FF9800';
                feedbackText.style.backgroundColor = 'rgba(255, 152, 0, 0.1)';
                break;
            case 'error':
                feedbackText.style.color = '#F44336';
                feedbackText.style.backgroundColor = 'rgba(244, 67, 54, 0.1)';
                break;
            default:
                feedbackText.style.color = '#333';
                feedbackText.style.backgroundColor = 'rgba(33, 150, 243, 0.1)';
        }
        
        feedbackText.style.padding = '8px 12px';
        feedbackText.style.borderRadius = '6px';
        feedbackText.style.border = `1px solid ${feedbackText.style.color}`;
    }
    
    console.log(`💬 ${type.toUpperCase()}: ${message}`);
    
    // เพิ่มการแจ้งเตือนด้วยเสียง (ถ้าต้องการ)
    if (type === 'success') {
        playSuccessSound();
    } else if (type === 'error') {
        playErrorSound();
    }
}

function showError(message) {
    showFeedback(message, 'error');
}

function showSuccess(message) {
    showFeedback(message, 'success');
}

function showWarning(message) {
    showFeedback(message, 'warning');
}

// ========================================
// ฟังก์ชันการอัปเดต UI
// ========================================

function updateCounters() {
    // อัปเดตตัวนับจำนวนครั้ง
    if (repCountElement) {
        repCountElement.textContent = repCounter;
        
        // เพิ่มเอฟเฟกต์เมื่อเพิ่มจำนวนครั้ง
        if (repCounter > 0) {
            repCountElement.style.transform = 'scale(1.2)';
            setTimeout(() => {
                repCountElement.style.transform = 'scale(1)';
            }, 200);
        }
    }
    
    updateProgressBar();
    updateSetInfo();
}
function updateProgressBar() {
    // ตรวจสอบว่าองค์ประกอบมีอยู่จริงก่อนใช้งาน
    if (!progressBar) {
        console.warn('ไม่พบ progress bar element');
        return;
    }
    
    const totalReps = (typeof targetReps !== 'undefined' ? targetReps : 10) * 
                     (typeof targetSets !== 'undefined' ? targetSets : 2);
    const currentCount = typeof exerciseCount !== 'undefined' ? exerciseCount : 0;
    const progress = Math.min(100, Math.round((currentCount / totalReps) * 100));
    
    // อัปเดตแถบความคืบหน้า
    progressBar.style.width = `${progress}%`;
    
    // อัปเดตข้อความ (ถ้ามี)
    if (progressText) {
        progressText.textContent = `การฝึกสำเร็จ ${progress}%`;
    }
    
    // เปลี่ยนสีตามความคืบหน้า
    if (progress < 30) {
        progressBar.style.backgroundColor = '#FF6B6B';
    } else if (progress < 70) {
        progressBar.style.backgroundColor = '#4ECDC4';
    } else {
        progressBar.style.backgroundColor = '#45B7D1';
    }
    
    // เอฟเฟกต์เมื่อครบ 100%
    if (progress === 100) {
        progressBar.style.backgroundColor = '#4CAF50';
        if (progressText) {
            progressText.style.fontWeight = 'bold';
            progressText.style.color = '#4CAF50';
        }
    }
}

function updateSetInfo() {
    // อัปเดตข้อมูลเซต
    const setInfoElement = document.getElementById('set-info');
    if (setInfoElement) {
        setInfoElement.textContent = `เซต ${setCounter}/${targetSets}`;
    }
    
    // แสดงข้อมูลในแถบความคืบหน้า
    if (progressText) {
        const totalReps = targetReps * targetSets;
        const progress = Math.min(100, Math.round((exerciseCount / totalReps) * 100));
        progressText.textContent = `เซต ${setCounter}/${targetSets} - การฝึกสำเร็จ ${progress}%`;
    }
}

function updateAccuracyDisplay(accuracy) {
    if (!accuracyElement) return;
    
    const accuracyValue = Math.min(95, Math.max(0, Math.round(accuracy)));
    accuracyElement.textContent = `${accuracyValue}%`;
    
    // เปลี่ยนสีตามความแม่นยำ
    if (accuracyValue >= 90) {
        accuracyElement.style.color = '#4CAF50'; // เขียว
    } else if (accuracyValue >= 70) {
        accuracyElement.style.color = '#FF9800'; // ส้ม
    } else {
        accuracyElement.style.color = '#F44336'; // แดง
    }
}

function updateExerciseInstructions() {
    if (!instructionText || !currentExercise) return;
    
    const instructions = getDetailedInstructions(currentExercise);
    instructionText.textContent = instructions;
    
    // เพิ่มการแสดงผลแบบไดนามิก
    instructionText.style.opacity = '0';
    setTimeout(() => {
        instructionText.style.opacity = '1';
    }, 100);
}

function getDetailedInstructions(exerciseCode) {
    const instructions = {
        // ท่าวอร์มร่างกาย
        'arm-spread': 'วางมือทั้งสองข้างซ้อนกันบริเวณหน้าท้อง กางแขนออกไปด้านข้างระดับไหล่ จากนั้นหุบกลับมาที่เดิมช้าๆ ระวังไม่ให้ยกแขนสูงเกินหัวไหล่',
        'neck-flex': 'ก้มศีรษะช้าๆ จนคางเกือบชิดอก แล้วเงยกลับจนมองเพดาน เคลื่อนไหวจากข้อต่อคอเท่านั้น ไม่ขยับลำตัว หายใจเข้า-ออกสม่ำเสมอ',
        'neck-tilt': 'เอียงศีรษะไปทางไหล่ซ้าย จากนั้นสลับไปทางขวา หูพยายามเอียงหาไหล่แต่ไม่ยกไหล่ขึ้น ค้างไว้ 3-5 วินาที ทำช้าๆ',
        
        // ส่วนบน
        'shoulder-shrug': 'ยักไหล่ขึ้นและลงช้าๆ หลังตรง ไม่เกร็งคอ ยกไหล่ขึ้นพร้อมกันแล้วผ่อนลงอย่างควบคุม',
        'hand-grip-side': 'กำมือและแบมือสลับกัน โดยแขนวางข้างลำตัว ไม่ยกขึ้นขณะกำ-แบ เน้นการเคลื่อนไหวของนิ้วมือ',
        'hand-grip-front': 'ชูแขนไปด้านหน้าระดับไหล่ กำมือและแบมือสลับกัน แขนยกระดับไหล่ เหยียดศอกตรง',
        'arm-overhead': 'ประสานมือวางบนตัก แล้วชูแขนขึ้นเหนือหัว ยืดหลังตรง ประสานมือให้ศอกเหยียดเท่ากัน',
        'elbow-flex': 'กำมือ พับศอก แตะมือ และเหยียดกางศอก แขนอยู่ระดับอก ศอกแนบลำตัวตอนงอ',
        'wrist-rotation': 'ประสานมือ ศอกเหยียดตรง คว่ำมือ-หงายมือ หมุนข้อมือเท่านั้น ไม่ขยับแขน',
        'finger-touch': 'แตะนิ้วหัวแม่มือกับนิ้วอื่นๆ เคลื่อนไหวช้าๆ นิ้วเรียงตามลำดับ 1-5',
        
        // ลำตัว
        'trunk-sway': 'โยกลำตัวซ้าย-ขวา ขานั่งมั่นคงบนเก้าอี้ เอียงตัวจากสะโพก หัวไม่เอียงตาม',
        'trunk-reach': 'ประสานมือเหยียดตรง เอื้อมไปด้านซ้าย-ขวา หลังตรง แขนเหยียดขนานพื้น หมุนจากเอว',
        'trunk-reach-floor': 'ประสานมือเอื้อมแตะพื้นด้านหน้า หลังตรง ไม่งอคอ เอื้อมออกไปจากสะโพก',
        'side-reach': 'แตะพื้นซ้าย-ขวา มือแตะพื้นข้างลำตัว ขาไม่ยกตาม เอียงตัวจากเอว',
        'back-extension': 'เอนตัวหลังแตะพนักพิง เอนจากสะโพก หลังยังตรง ไม่งอหลังล่าง',
        
        // ส่วนล่าง
        'hip-shift': 'ยกก้นซ้าย-ขวา ยกก้นจากข้างหนึ่งโดยใช้กล้ามเนื้อแกนกลาง ไม่เอนตัวมากเกินไป',
        'leg-abduction': 'กางขาซ้าย-ขวาออกด้านข้าง หลังตรง ไม่เอนไปด้านใด แขนช่วยประคองตัว',
        'leg-forward': 'ก้าวขาแตะด้านหน้าซ้าย-ขวา ขาตรง แนบพื้นเบาๆ เป็นจังหวะ ไม่กระแทก',
        'leg-together': 'กางขา-หุบขาพร้อมกัน เท้าติดพื้น เคลื่อนไหวพร้อมกัน คุมกล้ามเนื้อหน้าขา',
        'knee-extension': 'เหยียดเข่าตรงทีละข้าง นั่งบนเก้าอี้ ตัวตรง ไม่เอนไปหลัง ใช้กล้ามเนื้อต้นขาเหยียดขาให้สุด'
    };
    
    return instructions[exerciseCode] || 'เลือกท่าออกกำลังกายจากเมนูด้านบน';
}

// ========================================
// ฟังก์ชันการจัดการเมนู
// ========================================

function highlightActiveExercise() {
    // ล้างการเลือกทั้งหมด
    const allSelects = [warmupSelect, upperBodySelect, trunkSelect, lowerBodySelect];
    allSelects.forEach(select => {
        if (select && select !== event.target) {
            select.classList.remove('active-exercise');
        }
    });
    
    // เพิ่มการเน้นเมนูที่เลือก
    if (event.target) {
        event.target.classList.add('active-exercise');
    }
}

function updateExerciseMenu() {
    // อัปเดตสถานะของเมนูต่างๆ
    const menus = {
        'warmup': warmupSelect,
        'upper-body': upperBodySelect,
        'trunk': trunkSelect,
        'lower-body': lowerBodySelect
    };
    
    Object.keys(menus).forEach(category => {
        const menu = menus[category];
        if (menu) {
            if (category === currentCategory) {
                menu.style.borderColor = '#4CAF50';
                menu.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
            } else {
                menu.style.borderColor = '#ddd';
                menu.style.backgroundColor = 'white';
            }
        }
    });
}

function showExercisePreview(exerciseCode) {
    // แสดงตัวอย่างท่าออกกำลังกาย
    const previewContainer = document.getElementById('exercise-preview');
    if (!previewContainer) return;
    
    const previewInfo = getExercisePreviewInfo(exerciseCode);
    
    previewContainer.innerHTML = `
        <div class="preview-header">
            <h4>${previewInfo.name}</h4>
            <span class="preview-category">${previewInfo.category}</span>
        </div>
        <div class="preview-content">
            <div class="preview-description">${previewInfo.description}</div>
            <div class="preview-benefits">
                <strong>ประโยชน์:</strong> ${previewInfo.benefits}
            </div>
            <div class="preview-tips">
                <strong>ข้อควรระวัง:</strong> ${previewInfo.tips}
            </div>
        </div>
    `;
    
    previewContainer.style.display = 'block';
}

function getExercisePreviewInfo(exerciseCode) {
    const previewData = {
        // ท่าวอร์มร่างกาย
        'arm-spread': {
            name: 'ท่ากางแขน-หุบแขน',
            category: 'วอร์มร่างกาย',
            description: 'ช่วยยืดกล้ามเนื้อแขนและไหล่ เตรียมความพร้อมก่อนออกกำลังกาย',
            benefits: 'เพิ่มความยืดหยุ่นไหล่ ลดความตึงของกล้ามเนื้อ',
            tips: 'ไม่ยกแขนสูงเกินไป หายใจสม่ำเสมอ'
        },
        'neck-flex': {
            name: 'ท่าก้ม-เงยศีรษะ',
            category: 'วอร์มร่างกาย',
            description: 'ยืดกล้ามเนื้อคอด้านหน้าและหลัง เพิ่มช่วงการเคลื่อนไหวของคอ',
            benefits: 'ลดอาการคอแข็ง เพิ่มความยืดหยุ่นของคอ',
            tips: 'เคลื่อนไหวช้าๆ ไม่เงยคอมากเกินไป'
        },
        // เพิ่มข้อมูลท่าอื่นๆ ตามต้องการ
    };
    
    return previewData[exerciseCode] || {
        name: 'ท่าออกกำลังกาย',
        category: 'ทั่วไป',
        description: 'ช่วยฟื้นฟูสมรรถภาพร่างกาย',
        benefits: 'เพิ่มความแข็งแรงและความยืดหยุ่น',
        tips: 'ทำตามคำแนะนำอย่างระมัดระวัง'
    };
}

// ========================================
// ฟังก์ชันการแจ้งเตือนและเสียง
// ========================================

function playSuccessSound() {
    try {
        // สร้างเสียงแจ้งเตือนเมื่อสำเร็จ
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.1);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
        // ไม่สำคัญถ้าเล่นเสียงไม่ได้
        console.log('ไม่สามารถเล่นเสียงได้');
    }
}

function playErrorSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.1);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
        console.log('ไม่สามารถเล่นเสียงได้');
    }
}

function showNotification(title, message, type = 'info') {
    // สร้างการแจ้งเตือนแบบ popup
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-header">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <strong>${title}</strong>
            <button class="notification-close">&times;</button>
        </div>
        <div class="notification-body">${message}</div>
    `;
    
    // เพิ่ม CSS styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        padding: 16px;
        max-width: 300px;
        z-index: 1000;
        border-left: 4px solid ${getNotificationColor(type)};
        animation: slideInRight 0.3s ease-out;
    `;
    
    // เพิ่มการแจ้งเตือนลงในหน้า
    document.body.appendChild(notification);
    
    // ปุ่มปิด
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.onclick = () => removeNotification(notification);
    
    // ปิดอัตโนมัติหลัง 5 วินาที
    setTimeout(() => removeNotification(notification), 5000);
    
    return notification;
}

function getNotificationIcon(type) {
    const icons = {
        'success': 'check-circle',
        'warning': 'exclamation-triangle',
        'error': 'times-circle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

function getNotificationColor(type) {
    const colors = {
        'success': '#4CAF50',
        'warning': '#FF9800',
        'error': '#F44336',
        'info': '#2196F3'
    };
    return colors[type] || '#2196F3';
}

function removeNotification(notification) {
    if (notification && notification.parentElement) {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentElement) {
                notification.parentElement.removeChild(notification);
            }
        }, 300);
    }
}

// ========================================
// ฟังก์ชันการจัดการโมดัล
// ========================================

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // ป้องกันการเลื่อน
        
        // เพิ่ม event listener สำหรับปิดโมดัล
        const closeBtn = modal.querySelector('.close');
        if (closeBtn) {
            closeBtn.onclick = () => hideModal(modalId);
        }
        
        // คลิกนอกโมดัลเพื่อปิด
        modal.onclick = (event) => {
            if (event.target === modal) {
                hideModal(modalId);
            }
        };
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto'; // คืนค่าการเลื่อน
    }
}

function updateResultModal(sessionData) {
    // อัปเดตข้อมูลในโมดัลผลการฝึก
    const modalReps = document.getElementById('modal-reps');
    const modalTime = document.getElementById('modal-time');
    const modalScore = document.getElementById('modal-score');
    const modalFeedback = document.getElementById('modal-feedback');
    
    if (modalReps) modalReps.textContent = `${sessionData.totalCount}/${sessionData.repetitions * sessionData.sets}`;
    if (modalTime) modalTime.textContent = sessionData.formattedDuration;
    if (modalScore) modalScore.textContent = sessionData.accuracy;
    if (modalFeedback) modalFeedback.textContent = generateSessionFeedback(sessionData);
}

function generateSessionFeedback(sessionData) {
    const accuracy = parseInt(sessionData.accuracy) || 0;
    const completionRate = (sessionData.totalCount / (sessionData.repetitions * sessionData.sets)) * 100;
    
    let feedback = '';
    
    if (completionRate >= 100 && accuracy >= 90) {
        feedback = 'ยอดเยี่ยม! คุณทำได้ครบทุกครั้งและมีความแม่นยำสูงมาก ความสามารถในการเคลื่อนไหวของคุณดีขึ้นอย่างชัดเจน';
    } else if (completionRate >= 80 && accuracy >= 70) {
        feedback = 'ดีมาก! คุณมีความก้าวหน้าอย่างต่อเนื่อง ควรฝึกต่อไปเพื่อเพิ่มความแม่นยำ';
    } else if (completionRate >= 50) {
        feedback = 'ดี! คุณกำลังมีความก้าวหน้า แนะนำให้ฝึกช้าๆ เน้นความถูกต้องมากกว่าความเร็ว';
    } else {
        feedback = 'เริ่มต้นได้ดี! อย่าท้อใจ การฝึกอย่างสม่ำเสมอจะช่วยให้คุณดีขึ้นเรื่อยๆ';
    }
    
    return feedback;
}

// ========================================
// ฟังก์ชันการตั้งค่าแอนิเมชัน
// ========================================

function addAnimationCSS() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        
        @keyframes bounce {
            0%, 20%, 53%, 80%, 100% { transform: translate3d(0,0,0); }
            40%, 43% { transform: translate3d(0,-30px,0); }
            70% { transform: translate3d(0,-15px,0); }
            90% { transform: translate3d(0,-4px,0); }
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        
        .active-exercise {
            animation: pulse 0.5s ease-in-out;
            border-color: #4CAF50 !important;
            box-shadow: 0 0 10px rgba(76, 175, 80, 0.3);
        }
        
        .success-bounce {
            animation: bounce 1s ease-in-out;
        }
        
        .notification {
            animation: slideInRight 0.3s ease-out;
        }
    `;
    document.head.appendChild(style);
}

// ========================================
// ฟังก์ชันเริ่มต้น UI Controller
// ========================================

function initializeUIController() {
    console.log('🎨 เริ่มต้น UI Controller...');
    
    // เพิ่ม CSS สำหรับแอนิเมชัน
    addAnimationCSS();
    
    // ตั้งค่า event listeners สำหรับการปิดโมดัล
    setupModalEventListeners();
    
    // ตั้งค่าการแสดงผลแบบ responsive
    setupResponsiveUI();
    
    console.log('✅ UI Controller พร้อมใช้งาน');
}

function setupModalEventListeners() {
    // ปิดโมดัลเมื่อกด Escape
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const modals = document.querySelectorAll('.modal[style*="block"]');
            modals.forEach(modal => {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            });
        }
    });
}

function setupResponsiveUI() {
    // ปรับ UI ให้เหมาะสมกับขนาดหน้าจอ
    function updateResponsiveElements() {
        const isMobile = window.innerWidth <= 768;
        const elements = document.querySelectorAll('.stat-container, .form-row, .exercise-category');
        
        elements.forEach(element => {
            if (isMobile) {
                element.style.flexDirection = 'column';
                element.style.marginBottom = '10px';
            } else {
                element.style.flexDirection = 'row';
                element.style.marginBottom = '20px';
            }
        });
    }
    
    // เรียกใช้เมื่อปรับขนาดหน้าจอ
    window.addEventListener('resize', updateResponsiveElements);
    updateResponsiveElements(); // เรียกใช้ครั้งแรก
}

// ========================================
// ฟังก์ชันช่วยเหลือ
// ========================================

function displayMovementInfo(value, unit) {
    const infoElement = document.querySelector('.movement-info');
    if (infoElement) {
        infoElement.textContent = `${value} ${unit}`;
        
        // เพิ่มเอฟเฟกต์เมื่ออัปเดตข้อมูล
        infoElement.style.transform = 'scale(1.1)';
        setTimeout(() => {
            infoElement.style.transform = 'scale(1)';
        }, 200);
    }
    
    console.log(`📊 Movement Info: ${value} ${unit}`);
}

function updateTimer(seconds) {
    if (timeElement) {
        const formattedTime = formatTime(seconds);
        timeElement.textContent = formattedTime;
        
        // เปลี่ยนสีเมื่อฝึกนาน
        if (seconds > 300) { // 5 นาที
            timeElement.style.color = '#4CAF50';
        } else if (seconds > 180) { // 3 นาที
            timeElement.style.color = '#FF9800';
        } else {
            timeElement.style.color = '#333';
        }
    }
}

function createFloatingMessage(message, x, y) {
    // สร้างข้อความลอยบนหน้าจอ
    const floatingMsg = document.createElement('div');
    floatingMsg.textContent = message;
    floatingMsg.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        color: #4CAF50;
        font-weight: bold;
        font-size: 18px;
        pointer-events: none;
        z-index: 1000;
        animation: floatUp 2s ease-out forwards;
    `;
    
    // เพิ่ม CSS สำหรับแอนิเมชัน
    const style = document.createElement('style');
    style.textContent = `
        @keyframes floatUp {
            0% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-50px); }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(floatingMsg);
    
    // ลบหลัง 2 วินาที
    setTimeout(() => {
        if (floatingMsg.parentElement) {
            floatingMsg.parentElement.removeChild(floatingMsg);
        }
        if (style.parentElement) {
            style.parentElement.removeChild(style);
        }
    }, 2000);
}

// เรียกใช้เมื่อโหลดไฟล์
document.addEventListener('DOMContentLoaded', initializeUIController);

console.log('✅ ui-controller.js โหลดเรียบร้อย - ระบบควบคุม UI พร้อมใช้งาน');