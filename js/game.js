// Game state
let gameState = {
    coinsCollected: 0,
    treasuresFound: new Set(),
    isScanning: false,
    sessionId: null
};

// Initialize Supabase client
const { createClient } = supabase;
const supabaseUrl = 'https://daekibhvrbzvtnamvusv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhZWtpYmh2cmJ6dnRuYW12dXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIyMzQ4MjgsImV4cCI6MjA1NzgxMDgyOH0.JbwDI6DYsnzjkNuKir04hClNs9LZxIS-4mEyX4cRnjw';
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// DOM Elements
const welcomeScreen = document.getElementById('welcome-screen');
const startButton = document.getElementById('start-button');
const coinCounter = document.getElementById('coin-counter');
const qrScanner = document.getElementById('qr-scanner');
const qrVideo = document.getElementById('qr-video');
const qrCanvas = document.getElementById('qr-canvas');
const scanButton = document.getElementById('scan-button');

// QR Scanner Setup
let videoStream = null;
const qrContext = qrCanvas.getContext('2d');

// Start button click handler
startButton.addEventListener('click', async () => {
    // Reset game state
    gameState = {
        coinsCollected: 0,
        treasuresFound: new Set(),
        isScanning: false,
        sessionId: null
    };
    
    welcomeScreen.style.display = 'none';
    await startGame();
});

// Scan button click handler
scanButton.addEventListener('click', () => {
    stopQRScanner();
});

// Initialize game
async function startGame() {
    console.log('Starting game...'); // Debug log
    
    // Create new game session
    const { data: session, error } = await supabaseClient
        .from('game_sessions')
        .insert([
            { 
                start_time: new Date().toISOString(),
                status: 'active'
            }
        ])
        .select()
        .single();

    if (error) {
        console.error('Error creating game session:', error);
        return;
    }

    gameState.sessionId = session.id;
    console.log('Game session created:', session.id); // Debug log

    // Initialize MindAR
    try {
        const sceneEl = document.querySelector('a-scene');
        const arSystem = sceneEl.systems["mindar-image-system"];
        
        // Start AR
        await arSystem.start();
        console.log('AR system started'); // Debug log
    } catch (error) {
        console.error('Error starting AR:', error);
    }
}

// QR Scanner Functions
async function startQRScanner() {
    try {
        console.log('Starting QR scanner...');
        videoStream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: "environment",
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });
        
        qrVideo.srcObject = videoStream;
        qrVideo.style.display = 'block'; // Make sure video is visible
        await qrVideo.play();
        
        qrScanner.style.display = 'block';
        gameState.isScanning = true;
        
        // Start the scanning loop
        scanQRCode();
    } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Error accessing camera. Please make sure camera permissions are granted.');
    }
}

function scanQRCode() {
    if (!gameState.isScanning) return;

    if (qrVideo.readyState === qrVideo.HAVE_ENOUGH_DATA) {
        qrCanvas.width = qrVideo.videoWidth;
        qrCanvas.height = qrVideo.videoHeight;
        qrContext.drawImage(qrVideo, 0, 0, qrCanvas.width, qrCanvas.height);
        
        const imageData = qrContext.getImageData(0, 0, qrCanvas.width, qrCanvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code) {
            console.log('QR Code found:', code.data);
            handleQRScan(code.data);
            stopQRScanner();
            return;
        }
    }
    
    // Important: Request the next frame
    requestAnimationFrame(scanQRCode);
}

function stopQRScanner() {
    gameState.isScanning = false;
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    qrVideo.srcObject = null;
    qrScanner.style.display = 'none';
}

// QR Code scanning handler
async function handleQRScan(qrData) {
    console.log('QR Code scanned:', qrData);
    
    // Stop scanning
    stopQRScanner();
    
    // Spawn appropriate sphere
    switch(qrData) {
        case 'treasure1':
            spawnSphere('blue');
            break;
        case 'treasure2':
            spawnSphere('green');
            break;
        case 'treasure3':
            spawnSphere('yellow');
            break;
        default:
            console.warn('Unknown treasure type:', qrData);
    }
}

// Add new function to spawn spheres
function spawnSphere(color) {
    const scene = document.querySelector('a-scene');
    const sphere = document.createElement('a-sphere');
    
    // Large, visible sphere
    sphere.setAttribute('radius', '1'); // Even bigger
    sphere.setAttribute('position', '0 0 -5'); // Further back
    
    // Vibrant materials
    const colors = {
        'blue': '#0066FF',
        'green': '#00FF66',
        'yellow': '#FFFF00'
    };
    
    sphere.setAttribute('material', {
        color: colors[color],
        metalness: 0.7,
        roughness: 0.3,
        emissive: colors[color],
        emissiveIntensity: 0.8
    });
    
    // Animations
    sphere.setAttribute('animation__rotate', {
        property: 'rotation',
        to: '0 360 0',
        loop: true,
        dur: 3000
    });
    
    sphere.setAttribute('animation__float', {
        property: 'position',
        from: '0 0 -5',
        to: '0 0.5 -5',
        dir: 'alternate',
        loop: true,
        dur: 2000
    });

    scene.appendChild(sphere);
    console.log('Large sphere added:', color);
}

// Spawn AR treasure
function spawnTreasure(qrData) {
    const arEntity = document.querySelector('[mindar-image-target]');
    const treasure = document.createElement('a-entity');
    
    // Set common properties
    treasure.setAttribute('position', '0 0 0');
    treasure.setAttribute('mixin', 'sphere-common');
    
    // Set specific properties based on QR code
    switch(qrData) {
        case 'treasure1':
            treasure.setAttribute('mixin', 'sphere-common blue-sphere');
            break;
        case 'treasure2':
            treasure.setAttribute('mixin', 'sphere-common green-sphere');
            break;
        case 'treasure3':
            treasure.setAttribute('mixin', 'sphere-common yellow-sphere');
            break;
        default:
            console.warn('Unknown treasure type:', qrData);
            return;
    }
    
    // Add animation
    treasure.setAttribute('animation', {
        property: 'rotation',
        to: '0 360 0',
        loop: true,
        dur: 2000
    });
    
    // Add click handler
    treasure.addEventListener('click', () => {
        openTreasure(treasure);
    });

    arEntity.appendChild(treasure);
}

// Handle treasure opening
function openTreasure(treasure) {
    // Add bounce animation
    treasure.setAttribute('animation', {
        property: 'position',
        to: '0 1 0',
        dur: 1000,
        easing: 'easeOutBounce'
    });
    
    // Spawn coin after animation
    setTimeout(() => {
        spawnCoin(treasure);
    }, 1000);
}

// Spawn floating coin
function spawnCoin(treasure) {
    const arEntity = document.querySelector('[mindar-image-target]');
    const coin = document.createElement('a-entity');
    
    coin.setAttribute('geometry', 'primitive: cylinder; radius: 0.2; height: 0.02');
    coin.setAttribute('material', 'color: #FFD700; metalness: 1.0; roughness: 0.2');
    coin.setAttribute('position', '0 1.5 0');
    coin.setAttribute('animation', {
        property: 'rotation',
        to: '0 360 0',
        loop: true,
        dur: 1000
    });
    
    coin.addEventListener('click', () => {
        collectCoin(coin);
    });

    arEntity.appendChild(coin);
}

// Handle coin collection
async function collectCoin(coin) {
    sounds.coinCollect.play();
    const position = coin.getAttribute('position');
    createCoinParticles(position);
    gameState.coinsCollected++;
    coinCounter.textContent = `Coins: ${gameState.coinsCollected}/3`;
    
    // Record coin collection in database
    const { error } = await supabaseClient
        .from('coin_collections')
        .insert([
            {
                session_id: gameState.sessionId,
                collected_at: new Date().toISOString()
            }
        ]);

    if (error) {
        console.error('Error recording coin collection:', error);
    }
    
    // Remove coin
    coin.parentNode.removeChild(coin);
    
    // Check win condition
    if (gameState.coinsCollected >= 3) {
        await showWinScreen();
        sounds.victory.play();
    }
}

// Show win screen
async function showWinScreen() {
    // Update game session status
    const { error } = await supabaseClient
        .from('game_sessions')
        .update({ 
            status: 'completed',
            end_time: new Date().toISOString()
        })
        .eq('id', gameState.sessionId);

    if (error) {
        console.error('Error updating game session:', error);
    }

    const winScreen = document.createElement('div');
    winScreen.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        color: white;
        z-index: 1000;
    `;
    
    winScreen.innerHTML = `
        <h1>Congratulations!</h1>
        <p>You've collected all the treasures!</p>
        <button onclick="location.reload()">Play Again</button>
    `;
    
    document.body.appendChild(winScreen);
}

// Add scan button to UI
const scanTreasureButton = document.createElement('button');
scanTreasureButton.textContent = 'Scan for Treasure';
scanTreasureButton.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 15px 30px;
    font-size: 18px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    z-index: 1000;
`;
scanTreasureButton.addEventListener('click', () => {
    if (gameState.isScanning) {
        stopQRScanner();
    } else {
        startQRScanner();
    }
});
document.body.appendChild(scanTreasureButton);

// Make treasure interactive with touch gestures
function addTreasureInteractions(treasure) {
    let currentScale = 0.5;
    let currentRotation = 0;
    let initialTouchDistance = 0;
    let initialScale = 0;
    
    treasure.addEventListener('touchstart', (evt) => {
        if (evt.touches.length === 2) {
            initialTouchDistance = getTouchDistance(evt.touches);
            initialScale = currentScale;
        }
    });

    treasure.addEventListener('touchmove', (evt) => {
        if (evt.touches.length === 2) {
            const distance = getTouchDistance(evt.touches);
            const scale = initialScale * (distance / initialTouchDistance);
            currentScale = Math.min(Math.max(scale, 0.3), 1.0);
            treasure.setAttribute('scale', `${currentScale} ${currentScale} ${currentScale}`);
        } else if (evt.touches.length === 1) {
            currentRotation += evt.touches[0].movementX;
            treasure.setAttribute('rotation', `0 ${currentRotation} 0`);
        }
    });
}

// Helper function for touch gestures
function getTouchDistance(touches) {
    return Math.hypot(
        touches[1].pageX - touches[0].pageX,
        touches[1].pageY - touches[0].pageY
    );
}

// Add particle effects when collecting coins
function createCoinParticles(position) {
    const particleSystem = document.createElement('a-entity');
    particleSystem.setAttribute('position', position);
    particleSystem.setAttribute('particle-system', {
        preset: 'dust',
        particleCount: 50,
        size: 0.2,
        color: '#FFD700',
        duration: 1,
        velocity: 1
    });
    
    document.querySelector('a-scene').appendChild(particleSystem);
    setTimeout(() => particleSystem.remove(), 1000);
}

// Add sound effects
function createAudioElements() {
    const audioElements = {
        coinCollect: new Audio('sounds/coin-collect.mp3'),
        treasureOpen: new Audio('sounds/treasure-open.mp3'),
        victory: new Audio('sounds/victory.mp3')
    };
    
    // Set volume
    Object.values(audioElements).forEach(audio => {
        audio.volume = 0.5;
    });
    
    return audioElements;
}

// Initialize audio
const sounds = createAudioElements(); 