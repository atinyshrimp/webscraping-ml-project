/** chatbot.js - Handles the chatbot interface on the frontend.
 *
 * Features:
 * - Toggle chatbot modal
 * - Handle chatbot input
 * - Display user and bot messages
 * - Send user messages to the Flask API
 * - Setup the chatbot by calling the setup endpoint
 */

document.addEventListener("DOMContentLoaded", async () => {
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
			displayUserMessage(userMessage);
			chatbotInput.value = ""; // Clear input
			chatbotResponse.scrollTop = chatbotResponse.scrollHeight; // Scroll to the bottom

			const ids = places.map((place) => place.id); // Get restaurants' IDs
			const data = await sendMessageToChatbot(userMessage, ids);
			displayBotMessage(data.response);
		}
	});

	await setupChatbot();
});

/** Displays the user's message in the chatbot response area.
 *
 * @param {string} message - The user's message.
 */
function displayUserMessage(message) {
	const chatbotResponse = document.getElementById("chatbot-response");
	const userMessageElement = document.createElement("div");
	userMessageElement.classList.add("user-message");
	userMessageElement.textContent = message;
	chatbotResponse.appendChild(userMessageElement);
}

/** Sends the user's message to the Flask API and returns the response.
 *
 * @param {string} message - The user's message.
 * @param {Array} restaurantIds - List of restaurant IDs.
 * @returns {Promise<Object>} - The response from the Flask API.
 */
async function sendMessageToChatbot(message, restaurantIds) {
	const response = await fetch("/chatbot", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ message, restaurants: restaurantIds }),
	});
	return await response.json();
}

/** Displays the bot's message in the chatbot response area.
 *
 * @param {string} message - The bot's message.
 */
function displayBotMessage(message) {
	const chatbotResponse = document.getElementById("chatbot-response");
	const botMessageElement = document.createElement("div");
	botMessageElement.classList.add("bot-message");
	botMessageElement.innerHTML = message.replace(/\n/g, "<br>");
	chatbotResponse.appendChild(botMessageElement);
	chatbotResponse.scrollTop = chatbotResponse.scrollHeight; // Scroll to the bottom
}

/** Sets up the chatbot by calling the setup endpoint. */
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
