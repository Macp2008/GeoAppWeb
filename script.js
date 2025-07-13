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

    // 2. Configuración de la API de Google Geocoding
    // ¡¡¡TU CLAVE DE API DE GOOGLE REAL ESTÁ AQUÍ!!!
    const GOOGLE_GEOCODING_API_KEY = "AIzaSyDpPUWJNLYYRNGEgPuYcTuxE4aJrJnEOLQ"; 
    const GOOGLE_GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode/json";

    // 3. Variable para almacenar los puntos de referencia
    let referencePoints = [];

    // --- Funciones Auxiliares ---

    // Función para cargar los puntos de referencia desde points.json
    async function loadReferencePoints() {
        try {
            const response = await fetch('points.json'); // Intenta cargar desde el mismo directorio
            if (!response.ok) {
                throw new Error(`Error HTTP al cargar points.json: ${response.status}`);
            }
            referencePoints = await response.json();
            console.log(`Cargados ${referencePoints.length} puntos de referencia.`);
        } catch (error) {
            console.error("Error al cargar los puntos de referencia:", error);
            alert("No se pudieron cargar los puntos de referencia. Asegúrate de que 'points.json' esté en la misma carpeta y sea válido.");
        }
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

    // --- Función Principal: Geocodificar y Comparar ---

    async function geocodeAndCompare() {
        const address = addressInput.value.trim(); // Obtener la dirección y limpiar espacios

        // 4. Validar la entrada
        if (!address) {
            alert("Por favor, introduce una dirección para buscar.");
            return;
        }

        // 5. Limpiar resultados anteriores y mostrar indicador de carga
        formattedAddressSpan.textContent = "Cargando...";
        latitudeSpan.textContent = "";
        longitudeSpan.textContent = "";
        isWithinRadiusSpan.textContent = "";
        matchedPointsList.innerHTML = "<li>Buscando coincidencias...</li>"; // Reiniciar la lista
        loadingIndicator.classList.remove('hidden'); // Mostrar indicador

        // Construir la URL de la API de Geocodificación
        const geocodeUrl = `${GOOGLE_GEOCODING_URL}?address=${encodeURIComponent(address)}&key=${GOOGLE_GEOCODING_API_KEY}`;

        try {
            // Realizar la solicitud a la API de Google
            const response = await fetch(geocodeUrl);
            const data = await response.json();

            // Manejar errores de la API de Google
            if (data.status !== 'OK') {
                alert(`Error al geocodificar la dirección: ${data.status} - ${data.error_message || 'Error desconocido'}`);
                formattedAddressSpan.textContent = "Error";
                loadingIndicator.classList.add('hidden'); // Ocultar indicador
                return;
            }

            // Extraer las coordenadas y la dirección formateada
            const location = data.results[0].geometry.location;
            const lat = location.lat;
            const lng = location.lng;
            const formattedAddress = data.results[0].formatted_address;

            // Mostrar coordenadas y dirección formateada en la UI
            formattedAddressSpan.textContent = formattedAddress;
            latitudeSpan.textContent = lat.toFixed(6); // Limitar decimales para mayor legibilidad
            longitudeSpan.textContent = lng.toFixed(6); // Limitar decimales para mayor legibilidad

            // 6. Comparar con los puntos de referencia
            let isWithinAnyRadius = false;
            const matched = [];

            if (referencePoints.length === 0) {
                console.warn("No se cargaron puntos de referencia para comparar.");
            }

            for (const point of referencePoints) {
                const distance = haversineDistance(lat, lng, point.latitude, point.longitude);
                
                // --- LÍNEAS DE DEPURACIÓN AÑADIDAS ---
                console.log(`--- Iniciando comparación para punto con ID: ${point.id} ---`);
                console.log(`  Coordenadas del punto de referencia: Lat=${point.latitude}, Lng=${point.longitude}`);
                console.log(`  Radio del punto de referencia: ${point.radius} metros`);
                console.log(`  Coordenadas buscadas (de Google): Lat=${lat.toFixed(6)}, Lng=${lng.toFixed(6)}`);
                console.log(`  Distancia calculada (Haversine): ${distance.toFixed(2)} metros`);
                console.log(`  ¿Distancia (${distance.toFixed(2)}m) <= Radio (${point.radius}m)? ${distance <= point.radius}`);
                console.log(`----------------------------------------------------------------`);
                // ------------------------------------

                if (distance <= point.radius) {
                    isWithinAnyRadius = true;
                    matched.push({
                        id: point.id,
                        distance: Math.round(distance), // Distancia redondeada a metros
                        radius: point.radius
                    });
                }
            }

            // Mostrar el resultado de la coincidencia
            isWithinRadiusSpan.textContent = isWithinAnyRadius ? "Sí" : "No";

            // Mostrar los puntos coincidentes en la lista
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

        } catch (error) {
            console.error("Error en la solicitud o el procesamiento:", error);
            alert("Ocurrió un error inesperado. Revisa la consola del navegador para más detalles.");
            formattedAddressSpan.textContent = "Error";
            latitudeSpan.textContent = "N/A";
            longitudeSpan.textContent = "N/A";
            isWithinRadiusSpan.textContent = "N/A";
            matchedPointsList.innerHTML = "<li>Error al buscar coincidencias.</li>";
        } finally {
            loadingIndicator.classList.add('hidden'); // Ocultar indicador al finalizar
        }
    }

    // --- Event Listeners y Carga Inicial ---

    // Asignar la función al clic del botón
    searchButton.addEventListener('click', geocodeAndCompare);

    // Cargar los puntos de referencia cuando la página se carga por completo
    loadReferencePoints(); 
});
