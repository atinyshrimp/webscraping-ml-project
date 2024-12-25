document.addEventListener("DOMContentLoaded", () => {
	// Toggle Chatbot Modal
	const chatbotModal = document.getElementById("chatbot-modal");
	const toggleChatbotButton = document.getElementById("toggle-chatbot");
	const closeChatbotButton = document.getElementById("close-chatbot");

	toggleChatbotButton.addEventListener("click", () => {
		chatbotModal.classList.toggle("hidden");
	});

	closeChatbotButton.addEventListener("click", () => {
		chatbotModal.classList.add("hidden");
	});

	// Handle Chatbot Input
	const chatbotInput = document.getElementById("chatbot-input");
	const chatbotSendButton = document.getElementById("chatbot-send");
	const chatbotResponse = document.getElementById("chatbot-response");

	chatbotSendButton.addEventListener("click", async () => {
		const userMessage = chatbotInput.value.trim();

		if (userMessage) {
			// Display user message
			const userMessageElement = document.createElement("div");
			userMessageElement.classList.add("user-message");
			userMessageElement.textContent = userMessage;
			chatbotResponse.appendChild(userMessageElement);

			// Clear input
			chatbotInput.value = "";

			// Get restaurants' IDs
			const ids = places.map((place) => place.id);

			// Send user message to the Flask API
			const response = await fetch("/chatbot", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ message: userMessage, restaurants: ids }),
			});
			const data = await response.json();

			// Display bot response
			const botMessageElement = document.createElement("div");
			botMessageElement.classList.add("bot-message");
			botMessageElement.textContent = data.response;
			chatbotResponse.appendChild(botMessageElement);

			chatbotResponse.scrollTop = chatbotResponse.scrollHeight; // Scroll to the bottom
		}
	});
	setupChatbot();
});

async function setupChatbot() {
	try {
		const response = await fetch("/setup_chatbot", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
		});
		const data = await response.json();
		console.log("Setup chat response:", data);
	} catch (error) {
		console.error("Error calling setup chat endpoint:", error);
	}
}
