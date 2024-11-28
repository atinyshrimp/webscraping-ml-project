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
					`<li>${result.properties.name}, ${
						result.properties.city || result.properties.country
					}</li>`
			)
			.join("");
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
