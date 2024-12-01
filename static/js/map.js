const input = document.getElementById("search-input");
const testButton = document.getElementById("test-button");
const resultsContainer = document.getElementById("search-results");

document.addEventListener("DOMContentLoaded", () => {
	// Initialize the map centered at a default location
	const map = L.map("map").setView([48.8566, 2.3522], 12); // Paris as default

	// Add the OpenStreetMap tiles
	L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
		attribution:
			'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
	}).addTo(map);

	// Function to update map markers based on locations
	const updateMap = (lat, lon, locations) => {
		// Clear existing markers
		map.eachLayer((layer) => {
			if (layer instanceof L.Marker || layer instanceof L.Circle) {
				map.removeLayer(layer);
			}
		});

		// Add a circle to the map
		try {
			L.circle([lat, lon], {
				color: "red",
				fillColor: "#f03",
				fillOpacity: 0.5,
				radius: 500,
			}).addTo(map);
			console.log("Circle added at:", lat, lon);
		} catch (err) {
			console.error("Error adding circle:", err);
		}

		// Add markers for each location
		locations.forEach((loc) => {
			const [lon, lat] = [loc.location.longitude, loc.location.latitude];
			L.marker([lat, lon], { riseOnHover: true })
				.addTo(map)
				.bindPopup(`<b>${loc.displayName.text}</b>`);
		});

		// Fit map bounds to markers
		const bounds = L.latLngBounds(
			locations.map((loc) => [loc.location.latitude, loc.location.longitude])
		);
		map.fitBounds(bounds);
	};

	const getLocation = async (
		lat = 48.86739085085168,
		lon = 2.3346872797624187
	) => {
		console.log(typeof lat, typeof lon);

		// Fetch nearby locations
		const nearbyResponse = await fetch(`/nearby?lat=${lat}&lon=${lon}`);

		const nearbyResults = await nearbyResponse.json();

		// Display found locations
		console.log("Nearby places:", nearbyResults);

		// Update the map with nearby locations
		updateMap(lat, lon, nearbyResults);

		alert(`Found ${nearbyResults.length} places around Maru Café!`);
	};

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

					input.value = selectedName; // Fill the input with the selected suggestion
					resultsContainer.innerHTML = ""; // Clear the suggestions
					// window.alert(`${latitude}, ${longitude}`);

					// await getLocation(latitude, longitude);
					await getLocation();
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
	testButton.addEventListener("click", async () => {
		await getLocation();
	});
});
