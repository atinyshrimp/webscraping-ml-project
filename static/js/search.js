const input = document.getElementById("search-input");
const resultsContainer = document.getElementById("search-results");

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
				const selectedName = event.target.dataset.name; // Get the name from the clicked item
				const latitude = event.target.dataset.lat;
				const longitude = event.target.dataset.lon;

				input.value = selectedName; // Fill the input with the selected suggestion
				resultsContainer.innerHTML = ""; // Clear the suggestions
				window.alert(`${latitude}, ${longitude}`);

				// Fetch nearby locations
				const nearbyResults = await fetch(
					`/nearby?lat=${latitude}&lon=${longitude}`
				);

				// Display found locations
				console.log("Nearby places:", nearbyResults);
				alert(`Found ${nearbyResults.length} places around ${selectedName}!`);
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
