// =====================================================================================
// SCRIPT.JS COMPLETO Y UNIFICADO
// Incluye:
// 1. Inicialización y visualización del mapa de Google Maps.
// 2. Carga y dibujo de puntos de referencia (círculos y marcadores) desde points.json.
// 3. Funcionalidad de geocodificación para direcciones ingresadas por el usuario.
// 4. Marcador y centrado del mapa en la dirección geocodificada.
// 5. Comparación de la dirección geocodificada con los puntos de referencia.
// 6. Lógica para procesar una dirección recibida a través de parámetros de URL (para MacroDroid).
// 7. Salida JSON simple en un div oculto cuando la dirección viene de la URL.
// =====================================================================================

// Variables globales para el mapa y los elementos que dibujaremos
let map;
let referenceCircles = []; // Almacena los objetos Circle de Google Maps (para puntos de referencia)
let currentMarker = null; // Almacena el objeto Marker de Google Maps (para la dirección buscada)

// =====================================================================================
// FUNCIÓN DE INICIALIZACIÓN DEL MAPA (LLAMADA POR GOOGLE MAPS API)
// Esta función es llamada automáticamente por el script de la API de Google Maps
// cuando se ha cargado completamente (ver el <script> tag en tu index.html con callback=initMap).
// DEBE ESTAR FUERA DE document.addEventListener('DOMContentLoaded').
// =====================================================================================
function initMap() {
    // Coordenadas iniciales del mapa (ej. Medellín, Colombia). Ajusta a tu preferencia.
    const initialLocation = { lat: 6.2442, lng: -75.5812 }; 
    
    // Inicializa el mapa en el div con id="map"
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 12, // Nivel de zoom inicial
        center: initialLocation, // Centro inicial del mapa
    });

    // Una vez que el mapa está listo, cargamos y mostramos los puntos de referencia
    // Esta función también maneja la carga del JSON y luego llama a displayReferencePointsOnMap.
    loadReferencePointsAndDisplayOnMap();
}

// =====================================================================================
// FUNCIÓN PRINCIPAL AL CARGAR EL CONTENIDO DEL DOM
// Todo el código que interactúa con el HTML y los listeners va aquí.
// =====================================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Obtener referencias a los elementos HTML
    const addressInput = document.getElementById('addressInput');
    const searchButton = document.getElementById('searchButton');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const formattedAddressSpan = document.getElementById('formattedAddress');
    const latitudeSpan = document.getElementById('latitude');
    const longitudeSpan = document.getElementById('longitude');
    const isWithinRadiusSpan = document.getElementById('isWithinRadius');
    const matchedPointsList = document.getElementById('matchedPointsList');
    const macroDroidOutputDiv = document.getElementById('macroDroidOutput'); // Referencia al div para MacroDroid

    // 2. Configuración de la API de Google Geocoding
    // ¡¡¡RECUERDA QUE TU CLAVE DE API DE GOOGLE REAL DEBE IR AQUÍ!!!
    // Asegúrate de que esta clave tenga habilitadas la "Maps JavaScript API" y la "Geocoding API".
    const GOOGLE_GEOCODING_API_KEY = "TU_CLAVE_API_DE_GOOGLE"; // <-- ¡IMPORTANTE! Reemplaza con tu clave real.
    const GOOGLE_GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode/json";

    // 3. Variable para almacenar los puntos de referencia (se llenará desde points.json)
    let referencePoints = [];

    // =====================================================================================
    // LÓGICA PARA MACRODROID (PROCESAR DIRECCIÓN DESDE LA URL)
    // =====================================================================================
    const urlParams = new URLSearchParams(window.location.search);
    const addressFromUrl = urlParams.get('address');

    if (addressFromUrl) {
        // Si hay una dirección en el parámetro 'address' de la URL,
        // la ponemos en el input y ejecutamos la búsqueda automáticamente.
        addressInput.value = decodeURIComponent(addressFromUrl); // Decodificar por si tiene caracteres especiales
        geocodeAndCompare(addressFromUrl); // Llamar a la función de geocodificación con esta dirección
    }

    // =====================================================================================
    // FUNCIONES AUXILIARES
    // =====================================================================================

    // Función para cargar los puntos de referencia desde points.json
    // y, una vez cargados, mostrarlos en el mapa.
    async function loadReferencePointsAndDisplayOnMap() {
        try {
            const response = await fetch('points.json'); // Carga desde el mismo directorio
            if (!response.ok) {
                throw new Error(`Error HTTP al cargar points.json: ${response.status} - ${response.statusText}`);
            }
            referencePoints = await response.json(); 
            
            if (Array.isArray(referencePoints)) {
                console.log(`Cargados ${referencePoints.length} puntos de referencia.`);
                // Llama a la función para dibujar los puntos en el mapa
                displayReferencePointsOnMap(); 
            } else {
                console.error("El archivo points.json no devolvió un array como se esperaba. Estructura incorrecta.");
                referencePoints = []; // Aseguramos que sea un array vacío para evitar errores.
            }

        } catch (error) {
            console.error("Error al cargar los puntos de referencia:", error);
            alert("No se pudieron cargar los puntos de referencia. Asegúrate de que 'points.json' esté en la misma carpeta y sea un JSON válido con la estructura esperada (un array de objetos).");
            referencePoints = [];
        }
    }

    // Función para dibujar los puntos de referencia (círculos y marcadores) en el mapa.
    function displayReferencePointsOnMap() {
        // Limpiar círculos anteriores para evitar duplicados si la función se llama de nuevo
        referenceCircles.forEach(circle => circle.setMap(null));
        referenceCircles = []; // Vaciar el array de círculos guardados

        // Verificar que el mapa esté inicializado antes de intentar dibujar
        if (!map) {
            console.warn("El objeto 'map' aún no ha sido inicializado. No se pueden dibujar los puntos de referencia.");
            return;
        }

        referencePoints.forEach(point => {
            // Accedemos a las coordenadas y radio anidados en 'data' y 'data.center'
            const center = { lat: point.data.center.lat, lng: point.data.center.lng };
            const radius = point.data.radius;

            // Crear un círculo para cada punto de referencia
            const cityCircle = new google.maps.Circle({
                strokeColor: "#FF0000", // Color del borde (rojo)
                strokeOpacity: 0.8,      // Opacidad del borde
                strokeWeight: 2,         // Grosor del borde
                fillColor: "#FF0000",    // Color de relleno (rojo)
                fillOpacity: 0.35,       // Opacidad de relleno
                map: map,                // El mapa donde se dibujará
                center: center,          // Centro del círculo
                radius: radius,          // Radio del círculo en metros
            });
            referenceCircles.push(cityCircle); // Guardar el objeto Circle para poder gestionarlo después

            // Opcional: Añadir un InfoWindow (ventana emergente de información) al hacer clic en el círculo
            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <strong>ID:</strong> ${point.id || 'N/A'}<br>
                    <strong>Tipo:</strong> ${point.zoneType || 'N/A'}<br>
                    <strong>Radio:</strong> ${radius} m<br>
                    Lat: ${center.lat.toFixed(6)}, Lng: ${center.lng.toFixed(6)}
                `,
            });
            // Al hacer clic en el círculo, muestra el InfoWindow
            cityCircle.addListener("click", () => {
                infoWindow.open(map, cityCircle);
            });
        });
        console.log(`Dibujados ${referencePoints.length} círculos de referencia en el mapa.`);
    }

    // Función para calcular la distancia entre dos puntos (Fórmula de Haversine)
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
    // FUNCIÓN PRINCIPAL: GEOCODIFICAR Y COMPARAR (también maneja la visualización en mapa)
    // Acepta un argumento 'addressToSearch' para usarlo directamente,
    // o toma el valor del input si no se proporciona el argumento.
    // =====================================================================================
    async function geocodeAndCompare(addressToSearch = null) {
        // Usa la dirección del argumento si está disponible, de lo contrario, usa la del input
        const address = addressToSearch || addressInput.value.trim(); 

        if (!address) {
            alert("Por favor, introduce una dirección para buscar.");
            return;
        }

        // Limpiar resultados anteriores y mostrar indicador de carga
        formattedAddressSpan.textContent = "Cargando...";
        latitudeSpan.textContent = "";
        longitudeSpan.textContent = "";
        isWithinRadiusSpan.textContent = "";
        matchedPointsList.innerHTML = "<li>Buscando coincidencias...</li>";
        loadingIndicator.classList.remove('hidden');

        // Construir la URL de la API de Geocodificación de Google
        const geocodeUrl = `${GOOGLE_GEOCODING_URL}?address=${encodeURIComponent(address)}&key=${GOOGLE_GEOCODING_API_KEY}`;

        try {
            const response = await fetch(geocodeUrl);
            const data = await response.json();

            // Manejar errores de la API de Google Geocoding
            if (data.status !== 'OK') {
                alert(`Error al geocodificar la dirección: ${data.status} - ${data.error_message || 'Error desconocido'}`);
                formattedAddressSpan.textContent = "Error";
                loadingIndicator.classList.add('hidden');
                // Si viene de URL y hay error, podemos limpiar la salida de MacroDroid
                if (addressToSearch) { // Si la llamada vino por URL (MacroDroid)
                    macroDroidOutputDiv.textContent = JSON.stringify({ error: true, message: data.status });
                }
                return;
            }

            // Extraer las coordenadas y la dirección formateada del resultado de la geocodificación
            const location = data.results[0].geometry.location;
            const lat = location.lat;
            const lng = location.lng;
            const formattedAddress = data.results[0].formatted_address;

            // Mostrar coordenadas y dirección formateada en la interfaz de usuario
            formattedAddressSpan.textContent = formattedAddress;
            latitudeSpan.textContent = lat.toFixed(6);
            longitudeSpan.textContent = lng.toFixed(6);

            // --- MOSTRAR MARCADOR DE LA DIRECCIÓN BUSCADA EN EL MAPA ---
            if (map) { // Solo si el mapa está inicializado
                if (currentMarker) {
                    currentMarker.setMap(null); // Eliminar el marcador anterior si existe
                }
                currentMarker = new google.maps.Marker({
                    position: { lat: lat, lng: lng }, // Coordenadas de la dirección buscada
                    map: map,                      // El mapa donde se dibujará
                    title: formattedAddress,       // Título al pasar el ratón
                    icon: { // Puedes personalizar el icono si lo deseas
                        url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png" // Icono de punto azul de Google
                    }
                });
                map.setCenter({ lat: lat, lng: lng }); // Centrar el mapa en la dirección buscada
                map.setZoom(14); // Ajustar el zoom para una vista cercana
            } else {
                console.warn("Mapa no inicializado, no se pudo mostrar el marcador de la dirección buscada.");
            }


            // 6. Comparar con los puntos de referencia
            let isWithinAnyRadius = false;
            const matched = [];

            if (referencePoints.length === 0) {
                console.warn("No se cargaron puntos de referencia para comparar.");
                matchedPointsList.innerHTML = "<li>No hay puntos de referencia cargados para comparar.</li>";
            } else {
                for (const point of referencePoints) {
                    // Acceder a las propiedades correctas del punto anidadas en 'data'
                    const pointLat = point.data.center.lat;
                    const pointLng = point.data.center.lng;
                    const pointRadius = point.data.radius;

                    const distance = haversineDistance(lat, lng, pointLat, pointLng);
                    
                    // console.log para depuración, puedes comentar estas líneas si no las necesitas en producción
                    console.log(`--- Comparando con punto (ID: ${point.id || 'N/A'}) ---`);
                    console.log(`  Punto Ref: Lat=${pointLat}, Lng=${pointLng}, Radio=${pointRadius}m`);
                    console.log(`  Dirección: Lat=${lat.toFixed(6)}, Lng=${lng.toFixed(6)}`);
                    console.log(`  Distancia: ${distance.toFixed(2)}m`);
                    console.log(`  ¿Dentro?: ${distance <= pointRadius}`);
                    console.log(`--------------------------------------------------`);

                    if (distance <= pointRadius) {
                        isWithinAnyRadius = true;
                        matched.push({
                            id: point.id || 'N/A', // Usará 'N/A' si la propiedad 'id' no está definida
                            distance: Math.round(distance), // Distancia redondeada a metros
                            radius: pointRadius
                        });
                    }
                }

                // Mostrar el resultado de la coincidencia en la UI
                isWithinRadiusSpan.textContent = isWithinAnyRadius ? "Sí" : "No";

                // Mostrar los puntos coincidentes en la lista de la UI
                matchedPointsList.innerHTML = ''; // Limpiar la lista anterior
                if (matched.length > 0) {
                    matched.forEach(match => {
                        const listItem = document.createElement('li');
                        listItem.textContent = `ID: ${match.id}, Distancia: ${match.distance} m (Radio: ${match.radius} m)`;
                        matchedPointsList.appendChild(listItem);
                    });
                } else {
                    const listItem = document.createElement('li');
                    listItem.textContent = "Ningún punto de referencia coincide.";
                    matchedPointsList.appendChild(listItem);
                }
            } // Fin del else (si referencePoints.length > 0)

            // =====================================================================================
            // SALIDA PARA MACRODROID (si la dirección vino de la URL)
            // Esto coloca un JSON en un div oculto para que MacroDroid pueda leerlo.
            // =====================================================================================
            if (addressToSearch) { // Solo genera la salida JSON si la dirección fue pasada como argumento (desde URL)
                const outputForMacroDroid = {
                    isWithinRadius: isWithinAnyRadius,
                    matchedPointsCount: matched.length,
                    matchedPointIds: matched.map(p => p.id) // Opcional: lista de IDs de puntos coincidentes
                };
                // Escribir el JSON stringificado en el div oculto
                macroDroidOutputDiv.textContent = JSON.stringify(outputForMacroDroid);
                console.log("MacroDroid Output:", outputForMacroDroid); // También se imprime en la consola para depuración
            }

        } catch (error) {
            console.error("Error en la solicitud o el procesamiento:", error);
            alert("Ocurrió un error inesperado. Revisa la consola del navegador para más detalles.");
            formattedAddressSpan.textContent = "Error";
            latitudeSpan.textContent = "N/A";
            longitudeSpan.textContent = "N/A";
            isWithinRadiusSpan.textContent = "N/A";
            matchedPointsList.innerHTML = "<li>Error al buscar coincidencias.</li>";
            // Manejo de error para MacroDroid si la dirección vino de la URL
            if (addressToSearch) {
                macroDroidOutputDiv.textContent = JSON.stringify({ error: true, message: error.message });
            }
        } finally {
            loadingIndicator.classList.add('hidden'); // Ocultar el indicador de carga al finalizar
        }
    }

    // =====================================================================================
    // EVENT LISTENERS
    // =====================================================================================

    // Asignar la función geocodeAndCompare al clic del botón 'Buscar y Comparar'
    // Cuando el botón se presiona, llama a geocodeAndCompare sin argumentos,
    // y la función tomará el valor del addressInput.
    searchButton.addEventListener('click', () => geocodeAndCompare());

    // NOTA IMPORTANTE: La función loadReferencePointsAndDisplayOnMap()
    // NO se llama directamente aquí dentro de DOMContentLoaded.
    // Se llama desde initMap(), que es activada por el script de la API de Google Maps
    // cuando la página se carga y el mapa está listo.
});

// =====================================================================================
// FIN DEL SCRIPT
// =====================================================================================
