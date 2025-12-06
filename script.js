// DOM 요소들
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { alpha: false });
const video = document.getElementById('webcam');
const liveIndicator = document.getElementById('liveIndicator');
const errorMessage = document.getElementById('errorMessage');

// 오디오 관련 변수들
let audioContext = null;
let analyser = null;
let dataArray = null;
let isActive = false;

// 형태들을 저장할 배열
let shapes = [];

// 물방울 파동 느낌의 글로우 색상 팔레트 (퍼플/블루/시안/그린)
const colorPalette = [
    { start: 'rgba(200, 150, 255, 0.9)', end: 'rgba(220, 180, 255, 0.1)' }, // 라이트 퍼플
    { start: 'rgba(150, 100, 255, 0.9)', end: 'rgba(180, 140, 255, 0.1)' }, // 딥 퍼플
    { start: 'rgba(100, 150, 255, 0.9)', end: 'rgba(140, 180, 255, 0.1)' }, // 퍼플 블루
    { start: 'rgba(80, 180, 255, 0.9)', end: 'rgba(120, 200, 255, 0.1)' }, // 브라이트 블루
    { start: 'rgba(100, 200, 255, 0.9)', end: 'rgba(140, 220, 255, 0.1)' }, // 스카이 블루
    { start: 'rgba(80, 220, 255, 0.9)', end: 'rgba(120, 240, 255, 0.1)' }, // 시안
    { start: 'rgba(100, 255, 220, 0.9)', end: 'rgba(140, 255, 240, 0.1)' }, // 민트 시안
    { start: 'rgba(150, 255, 200, 0.9)', end: 'rgba(180, 255, 220, 0.1)' }, // 라이트 그린
    { start: 'rgba(255, 255, 200, 0.9)', end: 'rgba(255, 255, 230, 0.1)' }, // 옐로우 글로우 (중심부용)
    { start: 'rgba(255, 200, 255, 0.9)', end: 'rgba(255, 220, 255, 0.1)' }, // 핑크 퍼플
];

// Shape 클래스 - 물방울 파동 효과
class Shape {
    constructor(x, y, size, colorIndex, intensity, angle = 0) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.targetSize = size;
        this.colorIndex = colorIndex;
        this.intensity = intensity;
        this.alpha = 0.9;
        this.angle = angle;
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = (Math.random() - 0.5) * 0.3;
        this.life = 1.0;
        
        // 동심원 설정
        this.rings = 3 + Math.floor(Math.random() * 4); // 3-6개의 링
        this.ringSpacing = 8 + Math.random() * 12; // 링 간격
        this.glowIntensity = 20 + Math.random() * 30; // 글로우 강도
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        
        // ✨ 수정된 부분: this.life 감소 속도를 높여 4초(1/240)만에 사라지도록 설정
        this.life -= 0.0083; 
        this.alpha = this.life * 0.9;
        
        // 크기 변화
        this.size += (this.targetSize - this.size) * 0.05;
        
        // 화면 밖으로 나가면 속도 줄이기
        if (this.x < -100 || this.x > canvas.width + 100) this.vx *= 0.98;
        if (this.y < -100 || this.y > canvas.height + 100) this.vy *= 0.98;
    }

    draw() {
        if (this.life <= 0) return;

        const color = colorPalette[this.colorIndex];
        
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.translate(this.x, this.y);

        // 물방울 파동 - 여러 겹의 동심원
        for (let i = this.rings; i >= 0; i--) {
            const ringRadius = this.size + (i * this.ringSpacing);
            const ringAlpha = (1 - (i / this.rings)) * this.alpha;
            
            // 외곽 글로우
            const outerGlow = ctx.createRadialGradient(0, 0, ringRadius * 0.7, 0, 0, ringRadius * 1.3);
            outerGlow.addColorStop(0, color.start.replace(/[\d.]+\)$/, `0)`));
            outerGlow.addColorStop(0.5, color.start.replace(/[\d.]+\)$/, `${ringAlpha * 0.6})`));
            outerGlow.addColorStop(1, color.end.replace(/[\d.]+\)$/, `0)`));
            
            ctx.fillStyle = outerGlow;
            ctx.filter = `blur(${this.glowIntensity}px)`;
            ctx.beginPath();
            ctx.arc(0, 0, ringRadius * 1.2, 0, Math.PI * 2);
            ctx.fill();
            
            // 링 자체
            const ringGradient = ctx.createRadialGradient(0, 0, ringRadius * 0.8, 0, 0, ringRadius);
            ringGradient.addColorStop(0, color.start.replace(/[\d.]+\)$/, `0)`));
            ringGradient.addColorStop(0.7, color.start.replace(/[\d.]+\)$/, `${ringAlpha * 0.8})`));
            ringGradient.addColorStop(1, color.end.replace(/[\d.]+\)$/, `0)`));
            
            ctx.fillStyle = ringGradient;
            ctx.filter = `blur(${this.glowIntensity * 0.5}px)`;
            ctx.beginPath();
            ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 중심부 밝은 코어
        const coreSize = this.size * 0.3;
        const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, coreSize);
        
        // 중심은 옐로우-화이트 글로우
        coreGradient.addColorStop(0, `rgba(255, 255, 230, ${this.alpha * 0.9})`);
        coreGradient.addColorStop(0.3, `rgba(255, 255, 200, ${this.alpha * 0.7})`);
        coreGradient.addColorStop(0.6, color.start.replace(/[\d.]+\)$/, `${this.alpha * 0.5})`));
        coreGradient.addColorStop(1, color.end.replace(/[\d.]+\)$/, `0)`));
        
        ctx.fillStyle = coreGradient;
        ctx.filter = `blur(${this.glowIntensity * 0.3}px)`;
        ctx.beginPath();
        ctx.arc(0, 0, coreSize * 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

// 캔버스 크기 조정
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// 미디어 장치 초기화
async function initMediaDevices() {
    try {
        // 웹캠 초기화
        const videoStream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            } 
        });
        
        video.srcObject = videoStream;
        await video.play();

        // 오디오 초기화
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(audioStream);
        
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);

        dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        isActive = true;
        liveIndicator.classList.remove('hidden');
        errorMessage.classList.add('hidden');
    } catch (err) {
        showError('카메라와 마이크 접근 권한이 필요합니다. 브라우저 설정을 확인해주세요.');
        console.error('Media devices initialization error:', err);
    }
}

// 에러 메시지 표시
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

// 미디어 중지
function stopMedia() {
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }
    isActive = false;
    liveIndicator.classList.add('hidden');
}

// 애니메이션 루프
function animate() {
    // 웹캠 영상을 배경으로 그리기
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        // 웹캠을 어둡게 처리
        ctx.filter = 'brightness(0.3) contrast(1.2)';
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.filter = 'none';
    } else {
        // 웹캠이 준비되지 않았을 때 어두운 우주 배경
        ctx.fillStyle = '#0a0a15';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // 반투명 레이어로 잔상 효과 (매우 약하게)
    ctx.fillStyle = 'rgba(10, 10, 21, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (isActive && analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray);
        
        // 전체 볼륨 계산
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        
        // 주파수 대역별 분석
        const bassRange = Array.from(dataArray.slice(0, 8));
        const midRange = Array.from(dataArray.slice(8, 32));
        const highRange = Array.from(dataArray.slice(32, 64));
        
        const bassAvg = bassRange.reduce((a, b) => a + b) / bassRange.length;
        const midAvg = midRange.reduce((a, b) => a + b) / midRange.length;
        const highAvg = highRange.reduce((a, b) => a + b) / highRange.length;

        // 볼륨이 일정 수준 이상일 때 새로운 형태 생성
        if (average > 10) {
            const numShapes = Math.floor(average / 20) + 2;
            
            for (let i = 0; i < numShapes; i++) {
                // 화면 전체에 랜덤 배치
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                
                // 주파수별로 크기와 색상 결정
                let size, colorIndex;
                const rand = Math.random();
                
                // ✨ 수정된 부분: 크기 기준값 및 볼륨 배수 감소
                if (rand < 0.3) {
                    // 저음 - 큰 물방울
                    size = 15 + bassAvg * 0.5;
                    colorIndex = Math.floor(Math.random() * 3); // 퍼플 계열
                } else if (rand < 0.6) {
                    // 중음 - 중간 물방울
                    size = 10 + midAvg * 0.4;
                    colorIndex = 3 + Math.floor(Math.random() * 3); // 블루 계열
                } else if (rand < 0.85) {
                    // 고음 - 작은 물방울
                    size = 6 + highAvg * 0.2;
                    colorIndex = 6 + Math.floor(Math.random() * 2); // 시안/그린 계열
                } else {
                    // 아주 작은 점들
                    size = 1 + Math.random() * 3;
                    colorIndex = Math.floor(Math.random() * colorPalette.length);
                }
                
                const angle = Math.random() * Math.PI * 2;
                shapes.push(new Shape(x, y, size, colorIndex, average, angle));
            }
        }
    }

    // 기존 형태들 업데이트 및 그리기
    shapes = shapes.filter(shape => {
        shape.update();
        shape.draw();
        return shape.life > 0;
    });

    // 너무 많은 형태가 쌓이지 않도록 제한
    if (shapes.length > 400) {
        shapes = shapes.slice(-400);
    }

    requestAnimationFrame(animate);
}

// 초기화
function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // 페이지 로드 시 자동으로 미디어 초기화
    initMediaDevices();
    
    // 애니메이션 시작
    animate();
}

// 페이지 로드 완료 시 초기화
window.addEventListener('load', init);

// 페이지 언로드 시 미디어 중지
window.addEventListener('beforeunload', stopMedia);