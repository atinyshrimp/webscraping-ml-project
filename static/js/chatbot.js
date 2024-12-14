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

	chatbotSendButton.addEventListener("click", () => {
		const userMessage = chatbotInput.value.trim();

		if (userMessage) {
			// Simulated chatbot response
			chatbotResponse.innerHTML = `<p>You: ${userMessage}</p><p>Bot: Sorry, I'm not configured yet!</p>`;
			chatbotInput.value = ""; // Clear input
		}
	});
});
