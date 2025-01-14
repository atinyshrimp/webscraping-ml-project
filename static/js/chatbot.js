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

    // Handle Chatbot Reset
    const chatbotResetButton = document.getElementById("chatbot-reset");
    chatbotResetButton.addEventListener("click", async () => {
        resetChatbot();
    });

    // Handle Chatbot Input
    const chatbotInput = document.getElementById("chatbot-input");
    const chatbotSendButton = document.getElementById("chatbot-send");

    chatbotSendButton.addEventListener("click", async () => {
        const userMessage = chatbotInput.value.trim();

        if (userMessage) {
            displayUserMessage(userMessage);
            chatbotInput.value = ""; // Clear input

            const ids = places.map((place) => place.id); // Get restaurants' IDs
            const data = await sendMessageToChatbot(userMessage, ids);
            console.table(data);
            displayBotMessage(data.response);
            addRecommendationsToSortingOptions();
            displayRecommendations(data.recommendations);
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
    scrollToBottom();
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
    scrollToBottom();
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
        if (response.ok) {
            const toggleChatbotButton =
                document.getElementById("toggle-chatbot");
            toggleChatbotButton.style.display = "inline-block"; // Show chatbot button
        }
    } catch (error) {
        console.error("Error calling setup chat endpoint:", error);
    }
}

/** Scrolls to the bottom of the chatbot response area. */
function scrollToBottom() {
    const chatbotResponse = document.getElementById("chatbot-response");
    chatbotResponse.scrollTop = chatbotResponse.scrollHeight; // Scroll to the bottom
}

/** Adds chatbot recommendations to the sorting options. */
function addRecommendationsToSortingOptions() {
    const sortingOptions = document.getElementById("sort-options");
    const existingOption = Array.from(sortingOptions.options).find(
        (option) => option.value === "recommendations"
    );

    if (!existingOption) {
        const recommendationOption = document.createElement("option");
        recommendationOption.value = "recommendations";
        recommendationOption.textContent = "Chatbot Recommendations";
        sortingOptions.appendChild(recommendationOption);

        // Sort by chatbot recommendations when selected
        recommendationOption.addEventListener("change", () => {
            // Trigger re-render with the current list of places
            renderRestaurantCards(places);
        });
    }
}

function displayRecommendations(recommendations) {
    recommendedPlaces = recommendations;
    const sortingOptions = document.getElementById("sort-options");
    sortingOptions.value = "recommendations";
    renderRestaurantCards(places);
}

/** Resets the chatbot by clearing the chatbot response area and input. */
async function resetChatbot() {
    // Clear chatbot response area
    const chatbotResponse = document.getElementById("chatbot-response");
    chatbotResponse.innerHTML = "";

    // Reset chatbot input
    const chatbotInput = document.getElementById("chatbot-input");
    chatbotInput.value = "";

    // Reset chatbot recommendations
    recommendedPlaces = [];

    // Reset sorting options
    const sortingOptions = document.getElementById("sort-options");
    sortingOptions.value = "distance";
    // Fetch and display default locations
    await fetchNearbyPlaces(
        currentLat,
        currentLon,
        parseInt(radiusRange.value)
    );

    // Reset chatbot history on the server side
    await fetch("/reset_chatbot", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
    });
}

// Example queries for each chatbot functionality
const exampleQueries = [
    "Recommend a romantic restaurant in NYC",
    "Tell me about Luigi's Trattoria",
    "What are people saying about Bella Roma?",
];

// Display example queries in the chatbot input placeholder
const chatbotInput = document.getElementById("chatbot-input");
chatbotInput.placeholder = "Try asking: " + exampleQueries.join(" | ");
