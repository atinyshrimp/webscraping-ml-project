const input = document.getElementById("search-input");
const testButton = document.getElementById("test-button");
const resultsContainer = document.getElementById("search-results");
const radiusRange = document.getElementById("radius-range");
const radiusLabel = document.getElementById("selected-radius");

let currentLat, currentLon;

document.addEventListener("DOMContentLoaded", () => {
	// Initialize the map centered at a default location
	const map = L.map("map").setView([0, 0], 2); // Initial world view

	// Add the OpenStreetMap tiles
	L.tileLayer(
		"https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
		{
			attribution: "© OpenStreetMap contributors, © CARTO",
		}
	).addTo(map);

	// Function to fetch places within a radius
	async function fetchNearbyPlaces(lat, lon, radius) {
		try {
			const response = await fetch(
				`/search_nearby?lat=${lat}&lon=${lon}&radius=${radius}`
			);
			const places = await response.json();
			console.table(places);

			// Update results list
			const results = document.getElementsByClassName("results")[0];
			results.innerHTML = places
				.map(
					(place) => `
				<li class="result-item" data-lat="${place.latitude || 0}" data-lon="${
						place.longitude || 0
					}">
					<h4>${place.name || "Unknown Name"}</h4>
					<p>${place.type}</p>
					<p>${place.google_address || "Address not available"}</p>
					<p>⭐ ${place.google_rating || "N/A"} (${
						place.distinctions != -1 ? place.distinctions : 0
					} Michelin Stars)</p>
					<a href="${place.website_uri || "#"}" target="_blank">Website</a>
				</li>
			`
				)
				.join("");

			// Clear existing markers
			map.eachLayer((layer) => {
				if (layer instanceof L.Marker || layer instanceof L.Circle) {
					map.removeLayer(layer);
				}
			});

			// Add a circle to the map to visualize the radius
			L.circle([lat, lon], {
				color: "red",
				fillColor: "#f03",
				fillOpacity: 0.2,
				radius: radius * 1e3,
			}).addTo(map);

			// Update map with markers
			places.forEach((place) => {
				const marker = L.marker([place.latitude, place.longitude])
					.addTo(map)
					.bindPopup(
						`<strong>${place.name}</strong><br>${place.location} • ${place.type}<br>⭐ ${place.google_rating}`
					);
			});

			// Fit map to markers
			const bounds = places.map((place) =>
				L.latLng(place.latitude, place.longitude)
			);
			map.fitBounds(bounds);
		} catch (error) {
			console.error("Error fetching nearby places:", error);
		}
	}

	const handleInputChange = async () => {
		const query = input.value;

		if (query.length < 3) {
			resultsContainer.innerHTML = "";
			return;
		}

		try {
			const response = await fetch(`/search?q=${query}`);
			const results = await response.json();

			resultsContainer.innerHTML = results
				.map(
					(result) =>
						`<li class="suggestion-item"
							data-lat="${result.geometry.coordinates[1]}" 
							data-lon="${result.geometry.coordinates[0]}"
							data-name="${result.properties.name}"
						>
							${result.properties.name}, ${
							result.properties.city || result.properties.country
						}
						</li>`
				)
				.join("");

			// Attach click listeners to each suggestion
			document.querySelectorAll(".suggestion-item").forEach((item) => {
				item.addEventListener("click", async (event) => {
					// Get data from the clicked item
					const selectedName = event.target.dataset.name;
					const latitude = parseFloat(event.target.dataset.lat);
					const longitude = parseFloat(event.target.dataset.lon);
					const radius = parseInt(
						document.getElementById("radius-range").value
					);

					input.value = selectedName; // Fill the input with the selected suggestion
					resultsContainer.innerHTML = ""; // Clear the suggestions
					// window.alert(`${latitude}, ${longitude}`);

					currentLat = latitude;
					currentLon = longitude;

					console.log(
						`${selectedName} located at (${currentLat}, ${currentLon})`
					);

					await fetchNearbyPlaces(latitude, longitude, radius);
				});
			});
		} catch (err) {
			console.error("Error fetching search results:", err);
		}
	};

	const debounce = (func, delay) => {
		let timeout;
		return (...args) => {
			clearTimeout(timeout);
			timeout = setTimeout(() => func(...args), delay);
		};
	};

	const debouncedHandleInputChange = debounce(handleInputChange, 300);

	input.addEventListener("input", debouncedHandleInputChange);
	radiusRange.addEventListener("input", () => {
		radiusLabel.innerText = radiusRange.value;
	});
	radiusRange.value = 10;
	radiusRange.addEventListener("change", async () => {
		if (currentLat && currentLon) {
			await fetchNearbyPlaces(
				currentLat,
				currentLon,
				parseInt(radiusRange.value)
			);
		}
	});
});
