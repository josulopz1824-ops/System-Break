// SYSTEM BREAK - CORE LOGIC | KUROGANE ENTERTAINMENT
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue, update, push, get, onDisconnect, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCk1N1vIRVbdIoQ00iegw47u-XxneS0Lk0",
    authDomain: "system-break-c96b4.firebaseapp.com",
    projectId: "system-break-c96b4",
    storageBucket: "system-break-c96b4.firebasestorage.app",
    messagingSenderId: "411852631638",
    appId: "1:411852631638:web:b9ffe7bee591e7616d15f7",
    measurementId: "G-W77MYNWBCL",
    databaseURL: "https://system-break-c96b4-default-rtdb.firebaseio.com"
};

// Inicialización de Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app); 
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

// --- VARIABLES GLOBALES ---
let salaID = null;
let miRol = null;
let claseElegida = "Tank"; 
let ultimoTimestampEmote = 0; 
let victoriaRegistrada = false; // Bloqueo local para evitar bucles
let esSalaPrivada = false; 
let currentUser = null; 
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const state = {
    cordura: 100,
    corduraEnemigo: 100,
    maxCorduraSelf: 100, 
    maxCorduraEnemy: 100,
    turno: 'player1', 
    maxCartas: 5,
    cartasRestantes: 20,
    miXP: 0
};

// --- COLORES POR TIPO ---
const COLORES_TIPO = {
    damage: '#ff4444', heal: '#44ff44', shield: '#ffffff', 
    drain: '#bb00ff', risky: '#ff8800', kill: '#ff0055', 
    emp: '#00ffff', 'insta-kill': '#ffd700'
};

// --- MAZO EXPANDIDO (21 CARTAS) ---
const mazo = [
    { id: 'tkb', nombre: 'TK-BIO', power: 20, tipo: 'damage', desc: 'Pulso EM.' },
    { id: 'fln', nombre: 'FALLA NEURONAL', power: 15, tipo: 'damage', desc: 'Ataque mental.' },
    { id: 'vml', nombre: 'VASO MEDIO LLENO', power: 25, tipo: 'heal', desc: 'Estabilidad.' },
    { id: 'shd', nombre: 'ESCUDO FW', power: 0, tipo: 'shield', desc: 'Bloqueo total.' },
    { id: 'vrs', nombre: 'VIRUS.EXE', power: 30, tipo: 'damage', desc: 'Corrupción.' },
    { id: 'drn', nombre: 'DRENAJE', power: 15, tipo: 'drain', desc: 'Roba energía.' },
    { id: 'ovr', nombre: 'OVERCLOCK', power: 45, tipo: 'risky', desc: 'Daño crítico.' },
    { id: 'ydb', nombre: 'EXECUTE', power: 100, tipo: 'kill', desc: 'You Ded Bro.' },
    { id: 'emp', nombre: 'PULSO EMP', power: 10, tipo: 'emp', desc: 'Anula escudos.' },
    { id: 'rcy', nombre: 'RECYCLE', power: 10, tipo: 'heal', desc: 'Optimización.' },
    { id: 'ptc', nombre: 'PATCH-7', power: 35, tipo: 'heal', desc: 'Reparación sector.' },
    { id: 'slayer', nombre: 'SLAYER.EXE', power: 30, tipo: 'damage', desc: 'Subrutina agresiva.' },
    { id: 'ghost', nombre: 'GHOST CODE', power: 0, tipo: 'shield', desc: 'Intangibilidad.' },
    { id: 'nova', nombre: 'SUPERNOVA', power: 50, tipo: 'damage', desc: 'Explosión datos.' },
    { id: 'reboot', nombre: 'REBOOT', power: 15, tipo: 'heal', desc: 'Reinicia defensas.' },
    { id: 'spike', nombre: 'DATA SPIKE', power: 25, tipo: 'damage', desc: 'Pico tensión.' },
    { id: 'zero', nombre: 'PUNTO CERO', power: 0, tipo: 'emp', desc: 'Reseteo buffers.' },
    { id: 'void', nombre: 'VOID BOMB', power: 35, tipo: 'risky', desc: 'Daño/Aturdir.' },
    { id: 'leech', nombre: 'LEECH IT', power: 20, tipo: 'drain', desc: 'Parásito.' },
    { id: 'mirror', nombre: 'MIRROR', power: 10, tipo: 'damage', desc: 'Reflejo menor.' },
    { id: 'org', nombre: 'ORIGEN', power: 999, tipo: 'insta-kill', desc: 'BORRADO TOTAL.' }
];

async function bootSequenceDKS() {
    const log = document.getElementById('terminal-log');
    if (!log) return;
    for (let i = 0; i <= 100; i++) {
        const line = document.createElement('p');
        line.style.fontSize = "10px";
        line.style.color = "#00ff41";
        line.innerText = `> [DKS_CORE] LOADING SECTOR 0x${Math.random().toString(16).slice(2,8).toUpperCase()}... ${i}%`;
        log.appendChild(line);
        log.scrollTop = log.scrollHeight;
        if (i % 10 === 0) await new Promise(r => setTimeout(r, 40));
    }
    setTimeout(() => document.getElementById('loading-screen').style.display = 'none', 1000);
}

// --- AUTENTICACIÓN ---
onAuthStateChanged(auth, (user) => {
    const loginOverlay = document.getElementById('login-overlay');
    const nameInput = document.getElementById('player-name');
    
    if (user) {
        currentUser = user;
        console.log("Acceso concedido a Kurogane:", user.displayName);
        if (loginOverlay) loginOverlay.style.display = 'none';
        
        if(nameInput) {
            nameInput.value = user.displayName;
            nameInput.disabled = true;
        }

        actualizarPerfilKurogane(user);
        cargarDatosJugador(user.uid);
    } else {
        currentUser = null;
        if (loginOverlay) loginOverlay.style.display = 'flex';
        console.log("Esperando autenticación...");
    }
});

function cargarDatosJugador(uid) {
    get(ref(db, `leaderboard/${uid}`)).then(snap => {
        if(snap.exists()) state.miXP = snap.val().xp || 0;
        window.actualizarInterfazRango("player-display", currentUser.displayName, state.miXP);
    });
}

function actualizarPerfilKurogane(user) {
    const userNameEl = document.querySelector('.user-name');
    const userImgEl = document.getElementById('player-google-img');
    if (userNameEl) userNameEl.innerText = user.displayName.split(' ')[0];
    if (userImgEl) {
        userImgEl.src = user.photoURL;
        userImgEl.style.display = 'block';
    }
}

async function cerrarSesionKurogane() {
    try { await signOut(auth); location.reload(); } catch (e) { console.error(e); }
}

// --- SELECTOR DE CLASE ---
window.seleccionarClase = (nombre, elemento) => {
    claseElegida = nombre;
    document.querySelectorAll('.clase-card').forEach(el => el.classList.remove('selected'));
    elemento.classList.add('selected');
    playSound('alerta');
};

// --- ABORTAR / SALIR ---
async function abortarEnlace() {
    if (confirm("¿Confirmar desconexión del sistema? Perderás el progreso.")) {
        if (salaID) {
            const path = (miRol === 'player1') ? `salas/${salaID}` : `salas/${salaID}/player2`;
            await remove(ref(db, path));
        }
        location.reload();
    }
}

// --- EMOTES ---
window.enviarEmote = async (msg) => {
    if (!salaID || state.turno === 'terminado') return;
    await update(ref(db, `salas/${salaID}`), {
        ultimoEmote: { msg: msg, autor: miRol, time: Date.now() }
    });
    mostrarEmote(msg, true);
};

// --- AUDIO ---
function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    if (type === 'alerta') {
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        oscillator.start(); oscillator.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'daño') {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setTargetAtTime(100, audioCtx.currentTime, 0.1);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        oscillator.stop(audioCtx.currentTime + 0.3);
    }
}

// --- MATCHMAKING ---
async function iniciarConexion(pinRequerido = null) {
    if (!currentUser) return alert("Identidad DKS no vinculada. Usa el botón de Google.");
    
    try {
        esSalaPrivada = (pinRequerido !== null);
        state.maxCorduraSelf = (claseElegida === "Tank") ? 125 : 100;
        state.cordura = state.maxCorduraSelf;
        if (claseElegida === "Hacker") state.maxCartas = 6;

        const snapshot = await get(ref(db, 'salas'));
        let salaDisponible = null;

        if (snapshot.exists()) {
            const salas = snapshot.val();
            for (let id in salas) {
                const s = salas[id];
                const matchPin = (s.pin == pinRequerido);
                if (!s.player2 && s.estado === 'esperando' && matchPin) {
                    salaDisponible = id; 
                    break;
                }
            }
        }

        const playerData = { 
            nombre: currentUser.displayName, 
            uid: currentUser.uid,
            xp: state.miXP,
            cordura: state.cordura, 
            maxCordura: state.maxCorduraSelf, 
            clase: claseElegida, 
            escudoActivo: false 
        };

        if (salaDisponible) {
            salaID = salaDisponible;
            miRol = 'player2';
            await update(ref(db, `salas/${salaID}`), { player2: playerData, estado: 'jugando' });
            onDisconnect(ref(db, `salas/${salaID}/player2`)).remove();
        } else {
            const nuevaSalaRef = push(ref(db, 'salas'));
            salaID = nuevaSalaRef.key;
            miRol = 'player1';
            await set(nuevaSalaRef, {
                player1: playerData,
                turno: 'player1',
                cartasRestantes: 20,
                estado: 'esperando',
                pin: pinRequerido
            });
            onDisconnect(nuevaSalaRef).remove();
        }

        document.getElementById('lobby-overlay').style.display = 'none';
        document.getElementById('btn-abandonar').style.display = 'block';
        init(); 
    } catch (e) { console.error(e); }
}

// --- JUEGO CORE ---
function init() {
    renderManoInicial();
    escucharCambios();
    updateUI();
    const mazoVis = document.getElementById('mazo-visual');
    if (mazoVis) mazoVis.onclick = () => { if (state.turno === miRol) robarCartaDelMazo(); };
}

function renderManoInicial() {
    const mano = document.getElementById('mano');
    if (!mano) return;
    mano.innerHTML = '';
    const num = (claseElegida === "Hacker") ? 5 : 4;
    for(let i=0; i < num; i++) { if (state.cartasRestantes > 0) { state.cartasRestantes--; crearCartaEnMano(); } }
}

function robarCartaDelMazo() {
    const mano = document.getElementById('mano');
    if (state.cartasRestantes <= 0 || (mano && mano.children.length >= state.maxCartas)) return;
    state.cartasRestantes--; crearCartaEnMano(); updateUI();
}

function crearCartaEnMano() {
    const mano = document.getElementById('mano');
    if(!mano) return;

    // --- LÓGICA DE PROBABILIDAD (2 de 40) ---
    let randomCard;
    let chance = Math.floor(Math.random() * 30);
    if (chance < 2) {
        randomCard = mazo.find(c => c.id === 'org'); // ORIGEN
    } else {
        const comunes = mazo.filter(c => c.id !== 'org');
        randomCard = comunes[Math.floor(Math.random() * comunes.length)];
    }

    const cardDiv = document.createElement('div');
    cardDiv.className = 'carta draw-animation'; 
    cardDiv.setAttribute('data-tipo', randomCard.tipo); // Para el brillo CSS
    cardDiv.innerHTML = `<div class="card-name">${randomCard.nombre}</div><div class="card-desc">${randomCard.descripcion}</div>`;
    cardDiv.onclick = () => { if (state.turno === miRol) jugarCarta(randomCard, cardDiv); };
    mano.appendChild(cardDiv);
}

async function jugarCarta(carta, elementoOriginal) {
    if (state.turno !== miRol) return;

    // --- RESTRICCIÓN DE "YOU DED BRO" (Límite 3) ---
    if (carta.id === 'ydb') {
        if (usosExecute >= 3) {
            alert("SISTEMA DKS: Límite de ejecuciones alcanzado.");
            return;
        }
        usosExecute++;
    }

    const target = (miRol === 'player1') ? 'player2' : 'player1';
    let powerFinal = (claseElegida === "Berserker" && carta.tipo === 'damage') ? carta.power * 1.2 : carta.power;
    
    // --- PREPARAR CAMBIOS PARA FIREBASE (AQUÍ SE REPARA EL UNDEFINED) ---
    let cambios = { 
        turno: target, 
        ultimaCarta: { 
            nombre: carta.nombre, 
            desc: carta.desc,      // Enviamos la descripción
            autor: miRol, 
            tipo: carta.tipo, 
            power: powerFinal,
            color: COLORES_TIPO[carta.tipo] || '#00ff41' // Enviamos el color
        } 
    };

    // --- LÓGICA DE EFECTOS ---
    if (carta.tipo === 'damage') cambios[`${target}/cordura`] = Math.max(0, state.corduraEnemigo - powerFinal);
    else if (carta.tipo === 'heal') cambios[`${miRol}/cordura`] = Math.min(state.maxCorduraSelf, state.cordura + carta.power);
    else if (carta.tipo === 'shield') cambios[`${miRol}/escudoActivo`] = true;
    else if (carta.tipo === 'drain') {
        cambios[`${target}/cordura`] = Math.max(0, state.corduraEnemigo - carta.power);
        cambios[`${miRol}/cordura`] = Math.min(state.maxCorduraSelf, state.cordura + carta.power);
    } else if (carta.tipo === 'risky') {
        cambios[`${target}/cordura`] = Math.max(0, state.corduraEnemigo - 45);
        cambios[`${miRol}/cordura`] = Math.max(0, state.cordura - 15);
    } else if (carta.tipo === 'kill') {
        cambios[`${target}/cordura`] = (state.corduraEnemigo <= 40) ? 0 : Math.max(0, state.corduraEnemigo - 10);
    } else if (carta.tipo === 'emp') {
        cambios[`${target}/escudoActivo`] = false;
        cambios[`${target}/cordura`] = Math.max(0, state.corduraEnemigo - 10);
    } else if (carta.tipo === 'insta-kill') {
        cambios[`${target}/cordura`] = 0;
    }

    // --- ELIMINAR CARTA FÍSICA Y ACTUALIZAR DB ---
    elementoOriginal.remove();
    await update(ref(db, `salas/${salaID}`), cambios);
}

function escucharCambios() {
    onValue(ref(db, `salas/${salaID}`), async (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        const p1 = data.player1;
        const p2 = data.player2;
        const datosYo = (miRol === 'player1') ? p1 : p2;
        const datosRival = (miRol === 'player1') ? p2 : p1;

        // --- RENDERIZADO DE MESA DUAL ---
        if (data.ultimaCarta) {
            renderMesaDual(data.ultimaCarta);
        }

        // Lógica de Escudo
        if (datosYo.escudoActivo && data.ultimaCarta && data.ultimaCarta.autor !== miRol && ['damage', 'risky', 'drain', 'kill', 'insta-kill'].includes(data.ultimaCarta.tipo)) {
            await update(ref(db, `salas/${salaID}/${miRol}`), { escudoActivo: false, cordura: state.cordura });
            return; 
        }

        const corduraAnterior = state.cordura;
        state.cordura = datosYo.cordura;
        state.maxCorduraSelf = datosYo.maxCordura || 100;
        
        if(datosRival) {
            state.corduraEnemigo = datosRival.cordura;
            state.maxCorduraEnemy = datosRival.maxCordura || 100;
        }

        // --- LÓGICA DE VICTORIA SEGURA (SOLUCIONA EL BUG) ---
        if (state.corduraEnemigo <= 0 && !data.victoriaReclamada && !victoriaRegistrada) {
            victoriaRegistrada = true;
            // Marcamos la sala como finalizada en Firebase inmediatamente
            await update(ref(db, `salas/${salaID}`), { victoriaReclamada: true, estado: 'finalizado' });
            
            registrarVictoria(); // Función que suma XP/Victorias al perfil
            mostrarKO("SISTEMA ENEMIGO NEUTRALIZADO");
        } 
        else if (state.cordura <= 0 && !victoriaRegistrada) {
            victoriaRegistrada = true;
            mostrarKO("TU NÚCLEO HA SIDO BORRADO");
        }

        // Efecto visual de daño
        if (state.cordura < corduraAnterior) {
            const container = document.getElementById('game-container');
            container?.classList.add('glitch-active');
            playSound('daño');
            setTimeout(() => container?.classList.remove('glitch-active'), 300);
        }

        // Emotes
        if (data.ultimoEmote && data.ultimoEmote.autor !== miRol && data.ultimoEmote.time > ultimoTimestampEmote) {
            ultimoTimestampEmote = data.ultimoEmote.time;
            mostrarEmote(data.ultimoEmote.msg, false);
        }

        state.turno = data.turno;
        
        // Actualizar Rangos DKS
        if (p1) window.actualizarInterfazRango(miRol==='player1'?"player-display":"enemy-display", p1.nombre, p1.xp || 0);
        if (p2) window.actualizarInterfazRango(miRol==='player2'?"player-display":"enemy-display", p2.nombre, p2.xp || 0);
        
        updateUI();
    });
}

// --- FUNCIÓN DE APOYO PARA LA MESA (Asegúrate de tenerla) ---
function renderMesaDual(info) {
    const mesa = document.getElementById('table-area');
    if (!mesa) return;

    // Buscamos si ya existe el slot para ese autor, si no, lo creamos
    let slot = document.getElementById(`slot-${info.autor}`);
    if (!slot) {
        slot = document.createElement('div');
        slot.id = `slot-${info.autor}`;
        mesa.appendChild(slot);
    }

    // Aplicamos clase según si soy yo o el rival
    const esMia = info.autor === miRol;
    slot.className = `carta-jugada ${esMia ? 'mesa-yo' : 'mesa-rival'}`;
    
    // Aplicamos el color del tipo de carta
    slot.style.borderColor = info.color || '#00ff41';
    slot.style.boxShadow = `0 0 15px ${info.color || '#00ff41'}`;
    
    slot.innerHTML = `
        <div style="font-size: 9px; opacity: 0.7;">${esMia ? 'TU ACCIÓN' : 'RIVAL'}</div>
        <div style="color: ${info.color}; font-weight: bold;">${info.nombre}</div>
    `;
}

// --- UI Y TABLAS ---
function updateUI() {
    const actionText = document.getElementById('action-text');
    const container = document.getElementById('game-container');
    const hpSelf = document.getElementById('hp-self');
    const hpEnemy = document.getElementById('hp-enemy');
    const deckCnt = document.getElementById('deck-count');

    if(hpSelf) hpSelf.style.width = `${(state.cordura / state.maxCorduraSelf) * 100}%`;
    if(hpEnemy) hpEnemy.style.width = `${(state.corduraEnemigo / state.maxCorduraEnemy) * 100}%`;
    if(deckCnt) deckCnt.innerText = state.cartasRestantes;

    const esCritico = (state.cordura / state.maxCorduraSelf) < 0.3;
    if (esCritico && state.cordura > 0) {
        container?.classList.add('critical-sanity');
        toggleHeartbeat(true);
    } else {
        container?.classList.remove('critical-sanity');
        toggleHeartbeat(false);
    }

    if (state.corduraEnemigo <= 0 && state.turno !== 'terminado') {
        state.turno = 'terminado';
        if (!victoriaRegistrada) { registrarVictoria(); victoriaRegistrada = true; }
        mostrarKO("SISTEMA ENEMIGO ELIMINADO");
        mostrarReiniciar();
        mostrarTablaRecords();
    } else if (state.cordura <= 0 && state.turno !== 'terminado') {
        state.turno = 'terminado';
        mostrarKO("CONEXIÓN PERDIDA...");
        mostrarReiniciar();
        mostrarTablaRecords();
    } else if (state.turno !== 'terminado') {
        if (actionText) actionText.innerText = (state.turno === miRol) ? "TU TURNO" : "ESPERANDO OPONENTE...";
    }
}

async function registrarVictoria() {
    if (esSalaPrivada || !currentUser) return; 
    const refRec = ref(db, `leaderboard/${currentUser.uid}`);
    const snap = await get(refRec);
    
    let v = 0, xpActual = 0;
    if (snap.exists()) {
        v = snap.val().victorias || 0;
        xpActual = snap.val().xp || 0;
    }

    const nuevaXP = xpActual + 100;
    const rangoAnterior = obtenerDatosRango(xpActual);
    const rangoNuevo = obtenerDatosRango(nuevaXP);

    if (rangoNuevo.nombre !== rangoAnterior.nombre) {
        window.animarAscensoRango(rangoNuevo);
    }

    await update(refRec, { 
        nombre: currentUser.displayName, 
        victorias: (v + 1), 
        xp: nuevaXP,
        last: Date.now() 
    });
}

function mostrarKO(msg) {
    const ko = document.createElement('div');
    ko.className = 'ko-screen';
    ko.innerText = msg;
    document.body.appendChild(ko);
    playSound('daño');
}

async function mostrarTablaRecords() {
    const snap = await get(ref(db, 'leaderboard'));
    const list = document.getElementById('leaderboard-list');
    if (!list || !snap.exists()) return;

    const lista = Object.values(snap.val())
        .filter(u => u && u.nombre)
        .sort((a, b) => (b.victorias || 0) - (a.victorias || 0));

    list.innerHTML = ''; 
    lista.slice(0, 5).forEach((u, i) => {
        let p = i===0?"👑 ":i===1?"🥈 ":i===2?"🥉 ":"   ";
        list.innerHTML += `<div class="record-entry"><span>${p}#${i+1}</span><span>${u.nombre}</span><span>${u.victorias} V</span></div>`;
    });
    document.getElementById('leaderboard-container')?.classList.add('leaderboard-show');
}

function mostrarReiniciar() {
    const log = document.getElementById('terminal-log');
    if (log) log.innerHTML += `<br><span id="btn-restart" onclick="location.reload()" style="color:cyan; cursor:pointer;">[ REINICIAR SISTEMA ]</span>`;
}

function mostrarEmote(msg, esMio) {
    const target = esMio ? '.player-stats.self' : '.player-stats.enemy';
    const area = document.querySelector(target);
    if (!area) return;
    const rect = area.getBoundingClientRect();
    const popup = document.createElement('div');
    popup.className = 'emote-clash';
    popup.innerText = msg;
    popup.style.left = `${rect.left + 20}px`;
    popup.style.top = `${rect.top - 40}px`;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 2500);
}

// --- RANGOS Y UI ---
const RANGOS_SISTEMA = [
    { nombre: "Recluta", minXP: 0, icono: "🔰", colorAura: "#808080" },
    { nombre: "Hacker", minXP: 500, icono: "💻", colorAura: "#00ff41" },
    { nombre: "Script Kiddie", minXP: 1200, icono: "⚠️", colorAura: "#ffae00" },
    { nombre: "Espectro", minXP: 2200, icono: "👁️", colorAura: "#00ffff" },
    { nombre: "Titán", minXP: 3500, icono: "🔯", colorAura: "#ff00ff" },
    { nombre: "Omnipotente", minXP: 5000, icono: "🌌", colorAura: "#ff0000" },
    { nombre: "Humilde", minXP: 7500, icono: "💀", colorAura: "#ffffff" }
];

function obtenerDatosRango(xpActual) {
    for (let i = RANGOS_SISTEMA.length - 1; i >= 0; i--) {
        if (xpActual >= RANGOS_SISTEMA[i].minXP) return RANGOS_SISTEMA[i];
    }
    return RANGOS_SISTEMA[0];
}

window.actualizarInterfazRango = async function(targetId, nombre, xp) {
    const rango = obtenerDatosRango(xp);
    const contenedor = document.getElementById(targetId);
    if (!contenedor) return;

    const snap = await get(ref(db, 'leaderboard'));
    let prefijo = "", claseEspecial = "";
    
    if (snap.exists()) {
        const lista = Object.values(snap.val()).sort((a, b) => b.victorias - a.victorias);
        const index = lista.findIndex(u => u.nombre === nombre);
        if (index === 0) { prefijo = "👑 "; claseEspecial = "color:#ffcc00; font-weight:900; text-shadow: 0 0 10px gold;"; }
        else if (index === 1) { prefijo = "🥈 "; claseEspecial = "color:#d1d1d1;"; }
        else if (index === 2) { prefijo = "🥉 "; claseEspecial = "color:#cd7f32;"; }
    }

    contenedor.innerHTML = `
        <div class="kurogane-aura" style="border-left: 3px solid ${rango.colorAura}; padding-left: 8px; display: flex; align-items: center; gap: 8px;">
            <span style="text-shadow: 0 0 10px ${rango.colorAura}; font-size: 1.2em;">${rango.icono}</span>
            <div style="display: flex; flex-direction: column;">
                <span style="white-space: nowrap; ${claseEspecial} font-size: 12px; letter-spacing: 1px;">
                    ${prefijo}${nombre.toUpperCase()}
                </span>
                <span style="color: ${rango.colorAura}; font-size: 9px; font-weight: bold; opacity: 0.8;">
                    [ ${rango.nombre} ]
                </span>
            </div>
        </div>
    `;
};

window.animarAscensoRango = function(datosRango) {
    const anim = document.createElement('div');
    anim.className = "rank-up-overlay";
    anim.style = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10000; font-family: 'Courier New', monospace; color: white; transition: opacity 1s;`;
    anim.innerHTML = `<h2 style="color: cyan; letter-spacing: 5px; animation: blink 0.5s infinite;">¡SISTEMA ACTUALIZADO!</h2><div style="font-size: 100px; text-shadow: 0 0 30px ${datosRango.colorAura}; margin: 20px;">${datosRango.icono}</div><h1 style="color: ${datosRango.colorAura}; border: 1px solid ${datosRango.colorAura}; padding: 10px 30px;">${datosRango.nombre.toUpperCase()}</h1><p style="margin-top:20px; letter-spacing:3px;">RANGO DE COMBATE ALCANZADO</p>`;
    document.body.appendChild(anim);
    playSound('alerta');
    setTimeout(() => { anim.style.opacity = "0"; setTimeout(() => anim.remove(), 1000); }, 4000);
};

// --- LATIDO ---
let heartbeatInterval = null;
function toggleHeartbeat(active) {
    if (active && !heartbeatInterval) {
        heartbeatInterval = setInterval(() => {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(60, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(); osc.stop(audioCtx.currentTime + 0.4);
        }, 1000);
    } else if (!active && heartbeatInterval) {
        clearInterval(heartbeatInterval); heartbeatInterval = null;
    }
}

// --- EVENTOS ---
document.addEventListener('DOMContentLoaded', () => {
    const safeSetClick = (id, fn) => {
        const el = document.getElementById(id);
        if (el) el.onclick = fn;
    };

    safeSetClick('btn-conectar', () => iniciarConexion(null));
    safeSetClick('btn-login-google', async () => {
        try { await signInWithPopup(auth, provider); } catch(e) { console.error("Error Auth:", e); }
    });
    safeSetClick('btn-privada', () => {
        const pin = document.getElementById('room-pin')?.value;
        if (!pin || pin.length < 4) return alert("PIN de 4 dígitos.");
        iniciarConexion(pin);
    });
    safeSetClick('btn-abandonar', abortarEnlace);
    safeSetClick('btn-ver-records', mostrarTablaRecords);
    safeSetClick('btn-cerrar-records', () => {
        const lb = document.getElementById('leaderboard-container');
        if (lb) lb.classList.remove('leaderboard-show');
    });
});
