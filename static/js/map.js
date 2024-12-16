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

// Global Variables
let currentLat, currentLon; // Stores the currently selected latitude and longitude
let map; // Reference to the Leaflet map instance
let places = [];

/** Initialize the Map */
document.addEventListener("DOMContentLoaded", () => {
	// Set up the map centered on a default location
	map = L.map("map").setView([0, 0], 2); // Initial world view

	// Load OpenStreetMap tiles using Carto Light theme
	L.tileLayer(
		"https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
		{
			attribution: "© OpenStreetMap contributors, © CARTO",
		}
	).addTo(map);

	// Event Listeners
	setupSearchInput();
	setupRadiusInput();

	// Default radius value
	radiusRange.value = 10;

	document.getElementById("sort-options").addEventListener("change", () => {
		// Trigger re-render with the current list of places
		renderRestaurantCards(places);
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

/** Render the restaurant cards in the UI.
 *
 * @param {Array} places - List of places returned from the server.
 */
function renderRestaurantCards(places) {
	// Sorting based on user selection
	const sortBy = document.getElementById("sort-options").value;
	const sortedPlaces = [...places]; // Create a copy to avoid mutating the original array

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
	}

	restaurantList.innerHTML = sortedPlaces
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
                <div class="restaurant-content">
                    <div>
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
			<a href=${place.website_uri} class="link" target="_blank"></a>
            </div>`
		)
		.join("");

	updateMapMarkers(
		sortedPlaces,
		currentLat,
		currentLon,
		parseInt(radiusRange.value)
	);
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
		if (layer instanceof L.Marker || layer instanceof L.Circle) {
			map.removeLayer(layer);
		}
	});

	// Add a circle to the map
	L.circle([lat, lon], {
		color: "red",
		fillColor: "#f03",
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

/** Attach event listeners for the search bar input.
 *
 */
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
