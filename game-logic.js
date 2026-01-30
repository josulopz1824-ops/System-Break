/**
 * DKS - KUROGANE DIVISION
 * System Break: Ranked & Aura System
 */

// 1. Configuración Maestra de Rangos y Auras
const RANGOS_SISTEMA = [
    { nombre: "Recluta",     minXP: 0,    icono: "🔰", colorAura: "#808080" }, // Gris
    { nombre: "Hacker",      minXP: 500,  icono: "💻", colorAura: "#00ff41" }, // Verde Matrix
    { nombre: "Script Kiddie", minXP: 1200, icono: "⚠️", colorAura: "#ffae00" }, // Naranja
    { nombre: "Espectro",    minXP: 2200, icono: "👁️", colorAura: "#00ffff" }, // Cian Glitch
    { nombre: "Titán",       minXP: 3500, icono: "🔯", colorAura: "#ff00ff" }, // Morado Ocultista
    { nombre: "Omnipotente", minXP: 5000, icono: "🌌", colorAura: "#ff0000" }, // Rojo Poder
    { nombre: "Humilde",     minXP: 7500, icono: "💀", colorAura: "#ffffff" }  // Blanco Puro
];

// 2. Lógica de Cálculo de Rango
function obtenerDatosRango(xpActual) {
    // Buscamos de atrás hacia adelante para encontrar el rango más alto alcanzado
    for (let i = RANGOS_SISTEMA.length - 1; i >= 0; i--) {
        if (xpActual >= RANGOS_SISTEMA[i].minXP) {
            return RANGOS_SISTEMA[i];
        }
    }
    return RANGOS_SISTEMA[0];
}

// 3. Renderizado de Interfaz (Aura y Perfil)
function actualizarPerfilUsuario(nombreUsuario, xpUsuario) {
    const rango = obtenerDatosRango(xpUsuario);
    const contenedor = document.getElementById("player-display");

    if (!contenedor) {
        console.error("No se encontró el elemento 'player-display' en el HTML.");
        return;
    }

    // Aplicamos el diseño con el Aura dinámica
    contenedor.innerHTML = `
        <div class="kurogane-card" style="border: 1px solid ${rango.colorAura}; box-shadow: 0 0 20px ${rango.colorAura}44, inset 0 0 10px ${rango.colorAura}22;">
            <div class="aura-glow" style="background: radial-gradient(circle, ${rango.colorAura}33 0%, transparent 70%);"></div>
            
            <span class="rango-icon" style="text-shadow: 0 0 15px ${rango.colorAura};">
                ${rango.icono}
            </span>
            
            <div class="user-info">
                <span class="user-name">${nombreUsuario}</span>
                <span class="xp-text">${xpUsuario} XP</span>
            </div>

            <div class="rango-tag" style="background-color: ${rango.colorAura};">
                ${rango.nombre}
            </div>
        </div>
    `;
}

// 4. Lógica de Puntos para el PvP contra tu amigo
function calcularXPGanada(miXP, oponenteXP, victoria) {
    const BASE_XP = 25;
    if (victoria) {
        // Bonus si le ganas a alguien de más rango
        const bonus = Math.max(0, Math.floor((oponenteXP - miXP) * 0.1));
        return BASE_XP + bonus;
    } else {
        // Penalización si pierdes contra alguien inferior
        const perdida = Math.max(10, Math.floor((miXP - oponenteXP) * 0.05));
        return -perdida;
    }
}

// --- EJEMPLO DE USO ---
// actualizarPerfilUsuario("Ducky", 0); // Así aparecerás al inicio