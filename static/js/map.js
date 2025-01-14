/** Map.js - Handles map display, search functionality, and dynamic restaurant results.
 *
 *
 * Features:
 * - Initializes a Leaflet map with OpenStreetMap tiles.
 * - Dynamically fetches nearby places and renders them as cards.
 * - Updates the map with markers, circles, and popup information.
 * - Highlights map markers when hovering over restaurant cards.
 * - Provides a dynamic search bar with suggestion functionality.
 */

// Element References
const input = document.getElementById("search-input");
const testButton = document.getElementById("test-button");
const resultsContainer = document.getElementById("search-results");
const radiusRange = document.getElementById("radius-range");
const radiusLabel = document.getElementById("selected-radius");
const restaurantList = document.getElementById("restaurant-list");
const openNowCheckbox = document.getElementById("open-now");

// Global Variables
let currentLat, currentLon; // Stores the currently selected latitude and longitude
let map; // Reference to the Leaflet map instance
let baseMaps; // Object to store base layers
let overlayMaps; // Object to store overlay layers
let places = [];
let recommendedPlaces;
let selectedPriceRange = [];
let selectedCuisineTypes = [];
let minReviewScore = 4;
let maxReviewScore = 5;

/** Initialize the Map */
document.addEventListener("DOMContentLoaded", () => {
    // Enable Bootstrap tooltips
    const tooltipTriggerList = document.querySelectorAll(
        '[data-bs-toggle="tooltip"]'
    );
    const tooltipList = [...tooltipTriggerList].map(
        (tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl)
    );

    // Initialize the map
    map = L.map("map").setView([0, 0], 2); // Default world view

    // Define base layers
    L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        { attribution: "© OpenStreetMap contributors, © CARTO" }
    ).addTo(map);

    // Store base layers
    baseMaps = {};

    // Initialize overlay maps
    overlayMaps = {};

    // Fetch heatmap data and initialize layer
    fetchHeatmapData();

    // Event Listeners
    setupSearchInput();

    // Add event listener for clear filters button
    document
        .querySelector(".clear-filters")
        .addEventListener("click", resetFilters);

    setupRadiusInput();
    setupPriceFilter();
    setupRatingFilter();

    // Default radius value
    radiusRange.value = 10;

    openNowCheckbox.addEventListener("change", async () => {
        renderRestaurantCards(places);
    });

    document.getElementById("sort-options").addEventListener("change", () => {
        // Trigger re-render with the current list of places
        renderRestaurantCards(places);
    });

    // Add event listener for add cuisine button
    document
        .getElementById("add-cuisine-button")
        .addEventListener("click", () => {
            document
                .getElementById("cuisine-options")
                .classList.toggle("hidden");
        });
});

/** Fetch nearby places and update the map and UI.
 *
 * @param {number} lat - Latitude of the selected location.
 * @param {number} lon - Longitude of the selected location.
 * @param {number} radius - Search radius in kilometers.
 */
async function fetchNearbyPlaces(lat, lon, radius) {
    try {
        const response = await fetch(
            `/search_nearby?lat=${lat}&lon=${lon}&radius=${radius}`
        );
        const fetchedPlaces = await response.json();
        places = fetchedPlaces;
        console.table(places);

        // Render restaurant cards
        renderRestaurantCards(places);

        // // Update map: clear old markers, add circle, and add new markers
        // updateMapMarkers(places, lat, lon, radius);
    } catch (error) {
        console.error("Error fetching nearby places:", error);
    }
}

/** Checks if a restaurant is currently open based on its opening hours.
 *
 *
 * @param {Array} openingHours - Array of opening periods, each containing:
 *   - open: { day: number, hour: number, minute: number }
 *   - close: { day: number, hour: number, minute: number }
 *   where day is 0-6 (Sunday-Saturday), hour is 0-23, minute is 0-59
 *
 * @returns {boolean} True if the restaurant is currently open, false otherwise
 *
 * @example
 * const openingHours = [
 *   {
 *     open: { day: 1, hour: 12, minute: 15 },
 *     close: { day: 1, hour: 14, minute: 0 }
 *   }
 * ];
 * isCurrentlyOpen(openingHours); // returns true if current time is Monday 13:00
 *
 * @throws {TypeError} If openingHours is not an array
 * @returns {boolean} False if openingHours is null, undefined, or empty
 */
function isCurrentlyOpen(openingHours) {
    if (!openingHours || !Array.isArray(openingHours)) return false;

    const now = new Date();
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Filter periods for current day
    const todaysPeriods = openingHours.filter(
        (period) => period.open.day === currentDay
    );

    // Check if current time falls within any period
    return todaysPeriods.some((period) => {
        const openTime = period.open.hour * 60 + period.open.minute;
        const closeTime = period.close.hour * 60 + period.close.minute;
        const currentTime = currentHour * 60 + currentMinute;

        return currentTime >= openTime && currentTime <= closeTime;
    });
}

/** Render the restaurant cards in the UI.
 *
 * @param {Array} places - List of places returned from the server.
 */
function renderRestaurantCards(places) {
    // Sorting based on user selection
    const sortBy = document.getElementById("sort-options").value;
    console.log(places.google_opening_hours);
    let sortedPlaces = [...places]; // Create a copy to avoid mutating the original array
    const emptyPlaceholder = document.getElementById("empty-placeholder");

    // Show placeholder if no places are returned
    if (places.length === 0) {
        restaurantList.innerHTML = ""; // Clear any existing content
        restaurantList.style.display = "none"; // Hide restaurant list
        emptyPlaceholder.style.display = "block"; // Show placeholder
        return;
    }

    restaurantList.style.display = "flex"; // Show restaurant list
    emptyPlaceholder.style.display = "none"; // Hide placeholder

    // Sort the places based on user selection
    if (sortBy === "rating") {
        sortedPlaces.sort(
            (a, b) => (b.google_rating || 0) - (a.google_rating || 0)
        );
    } else if (sortBy === "price") {
        sortedPlaces.sort(
            (a, b) => (a.priceCategory || 0) - (b.priceCategory || 0)
        );
    } else if (sortBy === "distance" && currentLat && currentLon) {
        // Sort by distance if latitude and longitude are available
        sortedPlaces.sort((a, b) => {
            const distA = calculateDistance(
                currentLat,
                currentLon,
                a.latitude,
                a.longitude
            );
            const distB = calculateDistance(
                currentLat,
                currentLon,
                b.latitude,
                b.longitude
            );
            return distA - distB;
        });
    } else if (sortBy === "recommendations") {
        // Sort by chatbot recommendations
        sortedPlaces = [...recommendedPlaces];
    }

    let filteredPlaces = [...sortedPlaces];
    console.table(filteredPlaces);

    // Filter for open restaurants if checkbox is checked
    if (openNowCheckbox.checked) {
        filteredPlaces = filteredPlaces.filter((place) =>
            isCurrentlyOpen(place.google_opening_hours)
        );
    }

    // Filter by selected price range
    if (selectedPriceRange.length > 0) {
        filteredPlaces = filteredPlaces.filter((place) =>
            selectedPriceRange.includes(place.priceCategory)
        );
    }

    // Filter by selected cuisine types
    if (selectedCuisineTypes.length > 0) {
        filteredPlaces = filteredPlaces.filter((place) =>
            selectedCuisineTypes.includes(place.type)
        );
    }

    // Filter by review score range
    filteredPlaces = filteredPlaces.filter(
        (place) =>
            place.google_rating >= minReviewScore &&
            place.google_rating <= maxReviewScore
    );

    console.table(filteredPlaces);
    restaurantList.innerHTML = filteredPlaces
        .map(
            (place) => `
            <div class="restaurant-card" data-lat="${
                place.latitude
            }" data-lon="${place.longitude}">
                <!-- Restaurant Image -->
                <img src="${
                    place.img || "https://via.placeholder.com/300x200"
                }" alt="${place.name}" />

                <!-- Direction Icon -->
                <div class="card-icons">
                    <a href="${place.google_directions_link}" target="_blank">
                        <i class="fa-regular fa-map"></i>
                    </a>
                </div>

                <!-- Restaurant Content -->
                <div class="restaurant-content" >
                    <div ${
                        place.distinctions > 0 ? "" : "style='display: none;'"
                    }>
                        <span class="distinction">${"✿".repeat(
                            place.distinctions != -1 ? place.distinctions : 0
                        )}</span>
                    </div>
                    <h3>${place.name}</h3>
                    <p>${place.google_address}</p>
                    <p>⭐ ${place.google_rating || "N/A"}</p>
                    <p class="tags">${"$".repeat(place.priceCategory || 3)} · ${
                place.type || "Cuisine"
            }</p>
                </div>
			<a href=${
                place.website_uri
                    ? place.website_uri
                    : `https://www.google.com/search?q=${`${place.name} ${place.location}`
                          .split(" ")
                          .join("+")}`
            } class="link" target="_blank"></a>
            </div>`
        )
        .join("");

    // Update map markers based on the filtered places
    updateMapMarkers(
        filteredPlaces,
        currentLat,
        currentLon,
        parseInt(radiusRange.value)
    );

    // Show or hide the add cuisine button based on places length
    const addCuisineButton = document.getElementById("add-cuisine-button");
    if (places.length > 0) {
        addCuisineButton.classList.remove("hidden");
    } else {
        addCuisineButton.classList.add("hidden");
    }

    // Call setupCuisineFilter to update cuisine type buttons
    setupCuisineFilter(places);
}

/** Render selected cuisine types. */
function renderSelectedCuisines() {
    const selectedCuisinesContainer =
        document.getElementById("selected-cuisines");
    selectedCuisinesContainer.innerHTML = selectedCuisineTypes
        .map(
            (cuisine) => `
        <div class="selected-cuisine" data-cuisine="${cuisine}">
            ${cuisine} <span class="remove-cuisine" data-cuisine="${cuisine}">&times;</span>
        </div>
    `
        )
        .join("");

    // Add event listeners for remove buttons
    document.querySelectorAll(".remove-cuisine").forEach((span) => {
        span.addEventListener("click", () => {
            const cuisine = span.dataset.cuisine;
            selectedCuisineTypes = selectedCuisineTypes.filter(
                (c) => c !== cuisine
            );
            renderSelectedCuisines();
            renderRestaurantCards(places);
        });
    });
}

/** Calculate distance between two points (Haversine formula).
 *
 * @param {number} lat1 - Latitude of point 1.
 * @param {number} lon1 - Longitude of point 1.
 * @param {number} lat2 - Latitude of point 2.
 * @param {number} lon2 - Longitude of point 2.
 * @returns {number} Distance in kilometers.
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/** Update the map with new markers and a radius circle.
 *
 * @param {Array} places - List of places to display.
 * @param {number} lat - Latitude of the center location.
 * @param {number} lon - Longitude of the center location.
 * @param {number} radius - Radius to visualize.
 */
function updateMapMarkers(places, lat, lon, radius) {
    // Clear existing markers and circles
    map.eachLayer((layer) => {
        if (!(layer instanceof L.TileLayer || layer instanceof L.Map)) {
            map.removeLayer(layer);
        }
    });

    // Add a circle to the map
    L.circle([lat, lon], {
        color: "#94BC7D",
        fillColor: "#94BC7D",
        fillOpacity: 0.2,
        radius: radius * 1e3,
    }).addTo(map);

    // Add markers
    const markers = [];
    places.forEach((place) => {
        const marker = L.marker([place.latitude, place.longitude])
            .addTo(map)
            .bindPopup(
                `<strong>${place.name}</strong><br>${place.location} • ${place.type}<br>⭐ ${place.google_rating}`
            );
        markers.push(marker);
    });

    // Add hover interactions
    document.querySelectorAll(".restaurant-card").forEach((card, index) => {
        card.addEventListener("mouseenter", () => {
            // map.setView(markers[index].getLatLng(), 15); // Zoom in
            markers[index].openPopup(); // Show popup
        });

        card.addEventListener("mouseleave", () => {
            markers[index].closePopup();
        });
    });

    // Fit map to markers
    const bounds = places.map((place) =>
        L.latLng(place.latitude, place.longitude)
    );
    map.fitBounds(bounds);
}

/** Create a heatmap layer using Leaflet.
 *
 * @param {Array} places - List of places to visualize.
 * @returns {L.HeatLayer} - Heatmap layer instance.
 */
function createHeatmapLayer(places) {
    const heatmapData = places.map((place) => [
        parseFloat(place.latitude),
        parseFloat(place.longitude),
        1, // Intensity of the heatmap (adjust as needed)
    ]);

    return L.heatLayer(heatmapData, {
        radius: 25, // Radius of influence for each point
        blur: 15, // Smoothness of the heatmap
        maxZoom: 10, // Maximum zoom level for visibility
    });
}

/** Fetch heatmap data and create a heatmap layer on the map.
 * This function is called when the page loads.
 * */
async function fetchHeatmapData() {
    try {
        const response = await fetch(`/restaurant_locations`);
        const allPlaces = await response.json();

        // Create and manage heatmap layer using a layer group
        const heatmapLayer = createHeatmapLayer(allPlaces);

        // Use L.layerGroup to manage the heatmap layer
        const heatmapGroup = L.layerGroup([heatmapLayer]);

        // Add the layer to the overlay maps
        overlayMaps["Restaurant Heatmap"] = heatmapGroup;

        // Add the overlay to the map control
        L.control.layers(baseMaps, overlayMaps).addTo(map);

        // Add the heatmap layer to the map by default (optional)
        heatmapGroup.addTo(map);
    } catch (error) {
        console.error("Error fetching heatmap data:", error);
    }
}

/** Attach event listeners for the search bar input. */
function setupSearchInput() {
    const handleInputChange = async () => {
        const query = input.value;

        if (query.length < 3) {
            resultsContainer.innerHTML = "";
            return;
        }

        try {
            const response = await fetch(`/search?q=${query}`);
            const results = await response.json();

            // Display search suggestions
            resultsContainer.innerHTML = results
                .map(
                    (result) =>
                        `<li class="suggestion-item"
							data-lat="${result.geometry.coordinates[1]}" 
							data-lon="${result.geometry.coordinates[0]}"
							data-name="${result.properties.name}">
							${result.properties.name}, ${
                            result.properties.city || result.properties.country
                        }
						</li>`
                )
                .join("");

            // Handle suggestion click
            document.querySelectorAll(".suggestion-item").forEach((item) => {
                item.addEventListener("click", async (event) => {
                    const selectedName = event.target.dataset.name;
                    currentLat = parseFloat(event.target.dataset.lat);
                    currentLon = parseFloat(event.target.dataset.lon);
                    const radius = parseInt(radiusRange.value);

                    input.value = selectedName;
                    resultsContainer.innerHTML = ""; // Clear suggestions

                    await fetchNearbyPlaces(currentLat, currentLon, radius);
                });
            });
        } catch (err) {
            console.error("Error fetching search results:", err);
        }
    };

    const debouncedInputChange = debounce(handleInputChange, 300);
    input.addEventListener("input", debouncedInputChange);
}

/** Attach event listeners for radius range input.
 *
 */
function setupRadiusInput() {
    radiusRange.addEventListener("input", () => {
        radiusLabel.innerText = radiusRange.value;
    });

    radiusRange.addEventListener("change", async () => {
        if (currentLat && currentLon) {
            await fetchNearbyPlaces(
                currentLat,
                currentLon,
                parseInt(radiusRange.value)
            );
        }
    });
}

/** Attach event listeners for price filter buttons. */
function setupPriceFilter() {
    // Add event listeners for price range buttons
    document.querySelectorAll(".price-button").forEach((button) => {
        button.addEventListener("click", () => {
            const price = parseInt(button.dataset.price);
            if (selectedPriceRange.includes(price)) {
                selectedPriceRange = selectedPriceRange.filter(
                    (p) => p !== price
                );
                button.classList.remove("active");
            } else {
                selectedPriceRange.push(price);
                button.classList.add("active");
            }
            renderRestaurantCards(places);
        });
    });

    // Initialize tooltips for price filter buttons
    const tooltipTriggerList = [].slice.call(
        document.querySelectorAll('[data-bs-toggle="tooltip"]')
    );
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

/**Function to dynamically create cuisine type filter buttons
 *
 */
function setupCuisineFilter(places) {
    // Get unique cuisine types from places and sort them
    const uniqueCuisines = [
        ...new Set(places.map((place) => place.type).filter(Boolean)),
    ]
        .filter((cuisine) => !selectedCuisineTypes.includes(cuisine))
        .sort();

    // Create filter buttons for each unique cuisine type
    const cuisineOptionsContainer = document.getElementById("cuisine-options");
    cuisineOptionsContainer.innerHTML = uniqueCuisines
        .map(
            (cuisine) => `
        <button class="cuisine-option" data-cuisine="${cuisine}">${cuisine}</button>
    `
        )
        .join("");

    // Add event listeners for cuisine type buttons
    document.querySelectorAll(".cuisine-option").forEach((button) => {
        button.addEventListener("click", () => {
            const cuisine = button.dataset.cuisine;
            if (!selectedCuisineTypes.includes(cuisine)) {
                selectedCuisineTypes.push(cuisine);
                renderSelectedCuisines();
                renderRestaurantCards(places);
            }
        });
    });
}

/** Initialize jQuery UI range slider for rating filter. */
function setupRatingFilter() {
    // Initialize jQuery UI range slider
    $(function () {
        $("#slider-range").slider({
            range: true,
            min: 1,
            max: 5,
            step: 0.1,
            values: [minReviewScore, maxReviewScore],
            slide: function (event, ui) {
                minReviewScore = ui.values[0];
                maxReviewScore = ui.values[1];
                updateReviewScoreLabels();
                renderRestaurantCards(places);
            },
        });
        updateReviewScoreLabels();
    });
}

/** Update review score labels. */
function updateReviewScoreLabels() {
    document.getElementById("min-review-score-label").innerText =
        minReviewScore.toFixed(1);
    document.getElementById("max-review-score-label").innerText =
        maxReviewScore.toFixed(1);
}

/** Reset all filters to their default values. */
function resetFilters() {
    // Reset review score range
    minReviewScore = 4;
    maxReviewScore = 5;
    $("#slider-range").slider("values", [4, 5]);
    updateReviewScoreLabels();

    // Reset price range
    selectedPriceRange = [];
    document.querySelectorAll(".price-button").forEach((button) => {
        button.classList.remove("active");
    });

    // Reset cuisine types
    selectedCuisineTypes = [];
    renderSelectedCuisines();

    // Reset open now checkbox
    document.getElementById("open-now").checked = false;

    // Reset radius range
    radiusRange.value = 10;
    document.getElementById("selected-radius").innerText = 10;

    // Re-render restaurant cards with default filter values
    fetchNearbyPlaces(currentLat, currentLon, parseInt(radiusRange.value));
}

/** Debounce function to improve performance of input handling.
 *
 * @param {Function} func - Function to debounce.
 * @param {number} delay - Delay in milliseconds.
 * @returns {Function}
 */
function debounce(func, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
}
