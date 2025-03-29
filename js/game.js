// First, create the Supabase client
const { createClient } = supabase;
const supabaseUrl = 'https://daekibhvrbzvtnamvusv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhZWtpYmh2cmJ6dnRuYW12dXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIyMzQ4MjgsImV4cCI6MjA1NzgxMDgyOH0.JbwDI6DYsnzjkNuKir04hClNs9LZxIS-4mEyX4cRnjw';
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Then define your game state
let gameState = {
    coinsCollected: 0,
    treasuresFound: new Set(),
    isScanning: false,
    sessionId: null
};

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
    console.log('Start button clicked'); // Debug log
    welcomeScreen.style.display = 'none';
    try {
        await startGame();
        console.log('Game started successfully'); // Debug log
    } catch (error) {
        console.error('Error starting game:', error); // Error logging
    }
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
        videoStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment" }
        });
        qrVideo.srcObject = videoStream;
        qrVideo.play();
        
        qrScanner.style.display = 'block';
        gameState.isScanning = true;
        
        // Start scanning loop
        requestAnimationFrame(scanQRCode);
    } catch (error) {
        console.error('Error accessing camera:', error);
    }
}

function stopQRScanner() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    qrScanner.style.display = 'none';
    gameState.isScanning = false;
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
            handleQRScan(code.data);
            stopQRScanner();
            return;
        }
    }
    
    requestAnimationFrame(scanQRCode);
}

// QR Code scanning handler
async function handleQRScan(qrData) {
    try {
        console.log('QR Code scanned:', qrData);
        
        if (gameState.treasuresFound.has(qrData)) {
            alert('Already found this treasure!');
            return;
        }

        gameState.treasuresFound.add(qrData);
        
        const { error } = await supabaseClient.from('treasure_finds').insert([
            {
                session_id: gameState.sessionId,
                qr_code: qrData,
                found_at: new Date().toISOString()
            }
        ]);

        if (error) {
            console.error('Supabase error:', error);
            alert('Error saving treasure: ' + error.message);
            return;
        }

        alert('New treasure found!');
        spawnTreasure(qrData);
    } catch (error) {
        console.error('Error in handleQRScan:', error);
        alert('Error processing QR code: ' + error.message);
    }
}

// Spawn AR treasure
function spawnTreasure(qrData) {
    const arEntity = document.querySelector('[mindar-image-target]');
    const treasure = document.createElement('a-entity');
    
    // Set treasure properties
    treasure.setAttribute('gltf-model', '#treasure-model');
    treasure.setAttribute('position', '0 0 0');
    treasure.setAttribute('scale', '0.5 0.5 0.5');
    treasure.setAttribute('animation', 'property: rotation; to: 0 360 0; loop: true; dur: 2000');
    
    // Add click handler for treasure
    treasure.addEventListener('click', () => {
        openTreasure(treasure);
    });

    arEntity.appendChild(treasure);

    addTreasureInteractions(treasure);
    
    // Add glow effect
    const glow = document.createElement('a-entity');
    glow.setAttribute('geometry', 'primitive: sphere; radius: 0.6');
    glow.setAttribute('material', 'shader: standard; opacity: 0.2; color: #FFD700; emissive: #FFD700');
    glow.setAttribute('animation', 'property: material.opacity; from: 0.2; to: 0.4; dur: 1000; loop: true; dir: alternate');
    treasure.appendChild(glow);
    
    return treasure;
}

// Handle treasure opening
function openTreasure(treasure) {
    sounds.treasureOpen.play();
    // Add sparkle effect
    const sparkles = document.createElement('a-entity');
    sparkles.setAttribute('particle-system', {
        preset: 'sparkle',
        particleCount: 20,
        size: 0.1,
        color: '#FFD700,#FFA500',
        duration: 1,
        velocity: 0.5
    });
    treasure.appendChild(sparkles);
    
    // Play opening animation
    treasure.setAttribute('animation', 'property: rotation; to: 0 0 -90; dur: 1000');
    
    // Spawn coin after delay
    setTimeout(() => {
        spawnCoin(treasure);
    }, 1000);
}

// Spawn floating coin
function spawnCoin(treasure) {
    const arEntity = document.querySelector('[mindar-image-target]');
    const coin = document.createElement('a-entity');
    
    coin.setAttribute('gltf-model', '#coin-model');
    coin.setAttribute('position', '0 1 0');
    coin.setAttribute('scale', '0.3 0.3 0.3');
    coin.setAttribute('animation', 'property: position; to: 0 2 0; loop: true; dir: alternate; dur: 1000');
    
    // Add click handler for coin
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
scanTreasureButton.addEventListener('click', startQRScanner);
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

// Update the spawnTreasure function
const originalSpawnTreasure = spawnTreasure;
spawnTreasure = function(qrData) {
    const treasure = originalSpawnTreasure(qrData);
    addTreasureInteractions(treasure);
    
    // Add glow effect
    const glow = document.createElement('a-entity');
    glow.setAttribute('geometry', 'primitive: sphere; radius: 0.6');
    glow.setAttribute('material', 'shader: standard; opacity: 0.2; color: #FFD700; emissive: #FFD700');
    glow.setAttribute('animation', 'property: material.opacity; from: 0.2; to: 0.4; dur: 1000; loop: true; dir: alternate');
    treasure.appendChild(glow);
    
    return treasure;
};

// Update the collectCoin function
const originalCollectCoin = collectCoin;
collectCoin = async function(coin) {
    sounds.coinCollect.play();
    const position = coin.getAttribute('position');
    createCoinParticles(position);
    await originalCollectCoin(coin);
    
    if (gameState.coinsCollected >= 3) {
        sounds.victory.play();
    }
};

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