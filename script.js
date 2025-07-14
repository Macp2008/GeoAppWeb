// =====================================================================================
// SCRIPT.JS COMPLETO Y UNIFICADO (con clave API y logs de depuración)
// =====================================================================================

// Variables globales para el mapa y los datos
let map;
let referenceCircles = []; 
let currentMarker = null; 
let referencePoints = []; // Esta variable almacena los puntos cargados de points.json

// =====================================================================================
// Configuración de la API de Google (GLOBAL) - TU CLAVE API YA ESTÁ INSERTADA
// =====================================================================================
const GOOGLE_GEOCODING_API_KEY = "AIzaSyDpPUWJNLYYRNGEgPuYcTuxE4aJrJnEOLQ"; 
const GOOGLE_GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode/json";

// =====================================================================================
// FUNCIONES GLOBALES (ACCESIBLES DESDE CUALQUIER PARTE DEL SCRIPT)
// =====================================================================================

// Función de inicialización del mapa (llamada por Google Maps API)
function initMap() {
    // Coordenadas iniciales del mapa (Medellín, Colombia)
    const initialLocation = { lat: 6.2442, lng: -75.5812 }; 
    
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 12,
        center: initialLocation,
    });

    // Carga los puntos de referencia una vez que el mapa está listo
    loadReferencePointsAndDisplayOnMap();
}

// Carga los puntos de referencia desde points.json y los dibuja en el mapa
async function loadReferencePointsAndDisplayOnMap() {
    try {
        const response = await fetch('points.json'); 
        if (!response.ok) {
            throw new Error(`Error HTTP al cargar points.json: ${response.status} - ${response.statusText}`);
        }
        const data = await response.json(); 
        
        if (Array.isArray(data)) {
            referencePoints = data; // Asigna los puntos cargados a la variable global
            console.log(`Cargados ${referencePoints.length} puntos de referencia.`);
            displayReferencePointsOnMap(); 
        } else {
            console.error("El archivo points.json no devolvió un array como se esperaba. Estructura incorrecta.");
            referencePoints = []; 
        }

    } catch (error) {
        console.error("Error al cargar los puntos de referencia:", error);
        alert("No se pudieron cargar los puntos de referencia. Asegúrate de que 'points.json' esté en la misma carpeta y sea un JSON válido con la estructura esperada (un array de objetos).");
        referencePoints = [];
    }
}

// Dibuja los círculos y marcadores de los puntos de referencia en el mapa
function displayReferencePointsOnMap() {
    referenceCircles.forEach(circle => circle.setMap(null)); // Limpia círculos anteriores
    referenceCircles = []; 

    if (!map) {
        console.warn("El objeto 'map' aún no ha sido inicializado. No se pueden dibujar los puntos de referencia.");
        return;
    }

    referencePoints.forEach(point => {
        const center = { lat: point.data.center.lat, lng: point.data.center.lng };
        const radius = point.data.radius;

        const cityCircle = new google.maps.Circle({
            strokeColor: "#FF0000",
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: "#FF0000",
            fillOpacity: 0.35,
            map: map,
            center: center,
            radius: radius,
        });
        referenceCircles.push(cityCircle);

        const infoWindow = new google.maps.InfoWindow({
            content: `<strong>ID:</strong> ${point.id || 'N/A'}<br><strong>Tipo:</strong> ${point.zoneType || 'N/A'}<br><strong>Radio:</strong> ${radius} m<br>Lat: ${center.lat.toFixed(6)}, Lng: ${center.lng.toFixed(6)}`,
        });
        cityCircle.addListener("click", () => {
            infoWindow.open(map, cityCircle);
        });
    });
    console.log(`Dibujados ${referencePoints.length} círculos de referencia en el mapa.`);
}

// Calcula la distancia entre dos coordenadas usando la fórmula de Haversine
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Radio de la Tierra en metros
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance; // Distancia en metros
}

// =====================================================================================
// FUNCIÓN PRINCIPAL: GEOCODIFICAR Y COMPARAR
// Puede ser llamada con una dirección (desde URL para MacroDroid) o leerla del input.
// =====================================================================================
async function geocodeAndCompare(addressToSearch = null) {
    // Obtener referencias a los elementos DOM
    const addressInput = document.getElementById('addressInput');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const formattedAddressSpan = document.getElementById('formattedAddress');
    const latitudeSpan = document.getElementById('latitude');
    const longitudeSpan = document.getElementById('longitude');
    const isWithinRadiusSpan = document.getElementById('isWithinRadius');
    const matchedPointsList = document.getElementById('matchedPointsList');
    const macroDroidOutputDiv = document.getElementById('macroDroidOutput');

    const address = addressToSearch || addressInput.value.trim(); 

    if (!address) {
        alert("Por favor, introduce una dirección para buscar.");
        console.warn("Función geocodeAndCompare llamada sin dirección."); // LOG DE DEPURACIÓN
        if (addressToSearch) {
             macroDroidOutputDiv.textContent = JSON.stringify({ error: true, message: "No address provided." });
        }
        return;
    }

    formattedAddressSpan.textContent = "Cargando...";
    latitudeSpan.textContent = "";
    longitudeSpan.textContent = "";
    isWithinRadiusSpan.textContent = "";
    matchedPointsList.innerHTML = "<li>Buscando coincidencias...</li>";
    loadingIndicator.classList.remove('hidden');

    console.log(`Iniciando geocodificación para: ${address}`); // LOG DE DEPURACIÓN
    const geocodeUrl = `${GOOGLE_GEOCODING_URL}?address=${encodeURIComponent(address)}&key=${GOOGLE_GEOCODING_API_KEY}`;

    try {
        const response = await fetch(geocodeUrl);
        const data = await response.json();

        if (data.status !== 'OK') {
            console.error(`Error al geocodificar la dirección: ${data.status} - ${data.error_message || 'Error desconocido'}`); // LOG DE DEPURACIÓN
            alert(`Error al geocodificar la dirección: ${data.status} - ${data.error_message || 'Error desconocido'}`);
            formattedAddressSpan.textContent = "Error";
            if (addressToSearch) { 
                macroDroidOutputDiv.textContent = JSON.stringify({ error: true, message: data.status });
            }
            return;
        }

        const location = data.results[0].geometry.location;
        const lat = location.lat;
        const lng = location.lng;
        const formattedAddress = data.results[0].formatted_address;

        formattedAddressSpan.textContent = formattedAddress;
        latitudeSpan.textContent = lat.toFixed(6);
        longitudeSpan.textContent = lng.toFixed(6);

        console.log(`Dirección geocodificada: Lat=${lat.toFixed(6)}, Lng=${lng.toFixed(6)}`); // LOG DE DEPURACIÓN

        // Mostrar marcador de la dirección buscada en el mapa
        if (map) {
            if (currentMarker) {
                currentMarker.setMap(null);
            }
            currentMarker = new google.maps.Marker({
                position: { lat: lat, lng: lng },
                map: map,
                title: formattedAddress,
                icon: { url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png" } // Icono de punto azul más fiable
            });
            map.setCenter({ lat: lat, lng: lng });
            map.setZoom(14);
            console.log("Marcador de dirección añadido al mapa."); // LOG DE DEPURACIÓN
        } else {
            console.warn("Mapa no inicializado, no se puede añadir marcador."); // LOG DE DEPURACIÓN
        }

        // Comparar con los puntos de referencia
        let isWithinAnyRadius = false;
        const matched = [];

        if (referencePoints.length === 0) {
            matchedPointsList.innerHTML = "<li>No hay puntos de referencia cargados para comparar.</li>";
            console.warn("No hay puntos de referencia cargados para comparación."); // LOG DE DEPURACIÓN
        } else {
            for (const point of referencePoints) {
                const pointLat = point.data.center.lat;
                const pointLng = point.data.center.lng;
                const pointRadius = point.data.radius;

                const distance = haversineDistance(lat, lng, pointLat, pointLng);
                
                if (distance <= pointRadius) {
                    isWithinAnyRadius = true;
                    matched.push({
                        id: point.id || 'N/A',
                        distance: Math.round(distance),
                        radius: pointRadius
                    });
                }
            }

            isWithinRadiusSpan.textContent = isWithinAnyRadius ? "Sí" : "No";

            matchedPointsList.innerHTML = '';
            if (matched.length > 0) {
                matched.forEach(match => {
                    const listItem = document.createElement('li');
                    listItem.textContent = `ID: ${match.id}, Distancia: ${match.distance} m (Radio: ${match.radius} m)`;
                    matchedPointsList.appendChild(listItem);
                });
                console.log(`Coincidencias encontradas: ${matched.length}`); // LOG DE DEPURACIÓN
            } else {
                const listItem = document.createElement('li');
                listItem.textContent = "Ningún punto de referencia coincide.";
                matchedPointsList.appendChild(listItem);
                console.log("No se encontraron coincidencias."); // LOG DE DEPURACIÓN
            }
        }

        // SALIDA PARA MACRODROID (JSON en el div oculto)
        // Solo genera la salida JSON si la dirección fue pasada como argumento (desde URL)
        if (addressToSearch) { 
            const outputForMacroDroid = {
                isWithinRadius: isWithinAnyRadius,
                matchedPointsCount: matched.length,
                matchedPointIds: matched.map(p => p.id),
                formattedAddress: formattedAddress, // Añadido para depuración en MacroDroid
                latitude: lat.toFixed(6), // Añadido para depuración
                longitude: lng.toFixed(6) // Añadido para depuración
            };
            macroDroidOutputDiv.textContent = JSON.stringify(outputForMacroDroid);
            console.log("MacroDroid Output (JSON en div oculto):", outputForMacroDroid); // LOG DE DEPURACIÓN
        } else {
            console.log("No es una solicitud de MacroDroid, no se genera JSON en div oculto."); // LOG DE DEPURACIÓN
        }


    } catch (error) {
        console.error("Error en la solicitud o el procesamiento:", error); // LOG DE DEPURACIÓN
        alert("Ocurrió un error inesperado. Revisa la consola del navegador para más detalles.");
        formattedAddressSpan.textContent = "Error";
        latitudeSpan.textContent = "N/A";
        longitudeSpan.textContent = "N/A";
        isWithinRadiusSpan.textContent = "N/A";
        matchedPointsList.innerHTML = "<li>Error al buscar coincidencias.</li>";
        if (addressToSearch) {
            macroDroidOutputDiv.textContent = JSON.stringify({ error: true, message: error.message });
        }
    } finally {
        loadingIndicator.classList.add('hidden');
        console.log("Proceso geocodificación finalizado."); // LOG DE DEPURACIÓN
    }
}

// =====================================================================================
// LÓGICA DE INICIALIZACIÓN DEL DOM (Esto se ejecuta cuando el HTML está cargado)
// =====================================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Obtener referencias a elementos HTML que siempre estarán presentes
    const searchButton = document.getElementById('searchButton');
    const addressInput = document.getElementById('addressInput');

    // Lógica para MacroDroid: procesar dirección si viene en la URL
    const urlParams = new URLSearchParams(window.location.search);
    console.log("URL de la página:", window.location.href); // LOG DE DEPURACIÓN
    const addressFromUrl = urlParams.get('address');
    console.log("Valor de 'addressFromUrl' (desde URL):", addressFromUrl); // LOG DE DEPURACIÓN

    if (addressFromUrl) {
        console.log("Se detectó 'addressFromUrl'. Procediendo a geocodificar..."); // LOG DE DEPURACIÓN
        addressInput.value = decodeURIComponent(addressFromUrl);
        // Retraso opcional para dar tiempo a la API de Google Maps a inicializarse completamente
        // Esto puede ser útil si la geocodificación falla antes de que el mapa esté listo
        setTimeout(() => {
            geocodeAndCompare(addressFromUrl);
        }, 500); // Espera 500 milisegundos (0.5 segundos)

    } else {
        console.log("No se detectó 'address' en la URL. Esperando entrada manual."); // LOG DE DEPURACIÓN
    }

    // Event listener para el botón de búsqueda manual
    searchButton.addEventListener('click', () => {
        console.log("Botón 'Buscar y Comparar' clickeado."); // LOG DE DEPURACIÓN
        geocodeAndCompare();
    });
});
