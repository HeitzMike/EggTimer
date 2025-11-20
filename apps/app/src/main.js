// R1 Egg Timer Plugin
// Tamagotchi-style pixel art egg timer for cooking eggs

// Check if running as R1 plugin
if (typeof PluginMessageHandler !== 'undefined') {
  console.log('Running as R1 Creation');
} else {
  console.log('Running in browser mode');
}

// ===========================================
// Egg Timer Configuration
// ===========================================

const STAGES = [
  { name: 'Soft', time: 360, color: '#FFE66D' },           // 6 minutes
  { name: 'Medium-Soft', time: 480, color: '#FFD93D' },    // 8 minutes
  { name: 'Medium-Hard', time: 600, color: '#FFBB00' },    // 10 minutes
  { name: 'Hard', time: 720, color: '#FF9500' }            // 12 minutes
];

let currentStage = 0;
let elapsedTime = 0;
let timerRunning = false;
let timerInterval = null;
let audioContext = null;

// ===========================================
// Pixel Art Drawing Functions
// ===========================================

function drawPixelArt(ctx, stage, progress) {
  const canvas = ctx.canvas;
  const w = canvas.width;
  const h = canvas.height;
  
  // Clear canvas
  ctx.clearRect(0, 0, w, h);
  
  // Egg pixel art patterns (8x8 grid scaled up)
  const eggShapes = [
    // Soft egg - runny yolk visible
    [
      '........',
      '..1111..',
      '.111111.',
      '.111111.',
      '.111221.',
      '.112221.',
      '..1111..',
      '........'
    ],
    // Medium-soft - slightly firmer
    [
      '........',
      '..1111..',
      '.111111.',
      '.111111.',
      '.111221.',
      '.111221.',
      '..1111..',
      '........'
    ],
    // Medium-hard - mostly solid
    [
      '........',
      '..1111..',
      '.111111.',
      '.111111.',
      '.111111.',
      '.111111.',
      '..1111..',
      '........'
    ],
    // Hard - completely solid
    [
      '........',
      '..1111..',
      '.111111.',
      '.111111.',
      '.111111.',
      '.111111.',
      '..1111..',
      '........'
    ]
  ];
  
  // Color palettes for each stage
  const palettes = [
    { '1': '#FFF9E6', '2': '#FFD700' },  // Soft - light with bright yolk
    { '1': '#FFF4D1', '2': '#FFC700' },  // Medium-soft
    { '1': '#FFEFB8', '2': '#FFB700' },  // Medium-hard
    { '1': '#FFE89F', '2': '#FFA500' }   // Hard
  ];
  
  const pattern = eggShapes[stage];
  const palette = palettes[stage];
  const pixelSize = w / 8;
  
  // Draw egg
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const char = pattern[y][x];
      if (char !== '.') {
        ctx.fillStyle = palette[char];
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    }
  }
  
  // Add steam effect for hot egg
  if (progress > 0.1) {
    drawSteam(ctx, w, h, progress);
  }
  
  // Add cooking animation (bubbles)
  if (timerRunning) {
    drawBubbles(ctx, w, h);
  }
}

function drawSteam(ctx, w, h, progress) {
  const steamLines = 3;
  const time = Date.now() / 200;
  
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  
  for (let i = 0; i < steamLines; i++) {
    const x = w / 2 + Math.sin(time + i) * 5;
    const y = h * 0.1 - (time % 20) + i * 8;
    
    if (y > -10 && y < h * 0.3) {
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawBubbles(ctx, w, h) {
  const time = Date.now() / 300;
  const bubbles = 5;
  
  ctx.fillStyle = 'rgba(135, 206, 235, 0.4)';
  
  for (let i = 0; i < bubbles; i++) {
    const x = w * 0.2 + (i * w * 0.15) + Math.sin(time + i) * 3;
    const y = h * 0.9 - ((time * 10 + i * 15) % (h * 0.5));
    const size = 1 + Math.sin(time + i) * 0.5;
    
    if (y > h * 0.4 && y < h) {
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ===========================================
// Audio Notification Functions
// ===========================================

function initAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playBeep(frequency = 800, duration = 200) {
  initAudio();
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration / 1000);
}

function playStageAlert() {
  // Play a melodic notification
  playBeep(800, 150);
  setTimeout(() => playBeep(1000, 150), 150);
  setTimeout(() => playBeep(1200, 300), 300);
}

function playCompletionAlert() {
  // Play completion melody
  playBeep(1000, 150);
  setTimeout(() => playBeep(800, 150), 150);
  setTimeout(() => playBeep(1000, 150), 300);
  setTimeout(() => playBeep(1200, 400), 450);
}

// ===========================================
// Timer Logic
// ===========================================

function startTimer() {
  if (timerRunning) return;
  
  timerRunning = true;
  currentStage = 0;
  elapsedTime = 0;
  
  updateDisplay();
  
  timerInterval = setInterval(() => {
    elapsedTime++;
    
    // Check if we've reached a stage milestone
    for (let i = 0; i < STAGES.length; i++) {
      if (elapsedTime === STAGES[i].time) {
        currentStage = i;
        playStageAlert();
        updateStatus(`${STAGES[i].name} boiled!`);
        
        // Notify via R1 voice if it's the final stage
        if (i === STAGES.length - 1 && typeof PluginMessageHandler !== 'undefined') {
          PluginMessageHandler.postMessage(JSON.stringify({
            message: 'Your eggs are ready! Hard boiled stage complete.',
            wantsR1Response: true
          }));
        }
        break;
      }
    }
    
    // Stop at the end of hard stage
    if (elapsedTime >= STAGES[STAGES.length - 1].time) {
      stopTimer();
      playCompletionAlert();
      updateStatus('Timer complete!');
      return;
    }
    
    updateDisplay();
  }, 1000);
  
  updateStatus('Timer running...');
}

function stopTimer() {
  timerRunning = false;
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  updateStatus('Timer stopped');
}

function resetTimer() {
  stopTimer();
  elapsedTime = 0;
  currentStage = 0;
  updateDisplay();
  updateStatus('Press side button to start');
}

// ===========================================
// Display Update Functions
// ===========================================

function updateDisplay() {
  const canvas = document.getElementById('eggCanvas');
  const ctx = canvas.getContext('2d');
  const stageName = document.getElementById('stageName');
  const stageTime = document.getElementById('stageTime');
  const progressBar = document.getElementById('progressBar');
  
  // Determine current stage based on elapsed time
  let displayStage = 0;
  for (let i = 0; i < STAGES.length; i++) {
    if (elapsedTime >= STAGES[i].time) {
      displayStage = i;
    }
  }
  currentStage = displayStage;
  
  // Calculate progress within total time
  const totalTime = STAGES[STAGES.length - 1].time;
  const progress = Math.min(elapsedTime / totalTime, 1);
  
  // Update pixel art
  drawPixelArt(ctx, currentStage, progress);
  
  // Update stage name
  if (elapsedTime === 0) {
    stageName.textContent = 'Ready';
  } else if (elapsedTime < STAGES[0].time) {
    stageName.textContent = 'Cooking...';
  } else {
    stageName.textContent = STAGES[currentStage].name;
  }
  
  // Update time display
  const minutes = Math.floor(elapsedTime / 60);
  const seconds = elapsedTime % 60;
  stageTime.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  
  // Update progress bar
  progressBar.style.width = `${progress * 100}%`;
}

function updateStatus(message) {
  const status = document.getElementById('status');
  status.textContent = message;
}

// ===========================================
// Hardware Event Handlers
// ===========================================

window.addEventListener('sideClick', () => {
  console.log('Side button clicked');
  
  if (!timerRunning) {
    if (elapsedTime === 0) {
      startTimer();
    } else {
      resetTimer();
    }
  } else {
    stopTimer();
  }
});

window.addEventListener('scrollUp', () => {
  console.log('Scroll up detected');
});

window.addEventListener('scrollDown', () => {
  console.log('Scroll down detected');
});

// ===========================================
// Initialization
// ===========================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('Egg Timer initialized!');
  
  // Initialize display
  updateDisplay();
  
  // Add keyboard fallback for development (Space = side button)
  if (typeof PluginMessageHandler === 'undefined') {
    window.addEventListener('keydown', (event) => {
      if (event.code === 'Space') {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent('sideClick'));
      }
    });
  }
  
  // Start animation loop for steam and bubbles
  function animate() {
    if (timerRunning || elapsedTime > 0) {
      updateDisplay();
    }
    requestAnimationFrame(animate);
  }
  animate();
});

console.log('Egg Timer Ready!');
console.log('Press side button to start timing your eggs');
