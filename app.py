from flask import Flask, render_template, request, jsonify
import requests
import pandas as pd
import math
import json
from models.chatbot import Chatbot

# Create a Flask application instance
app = Flask(__name__)
chatbot = Chatbot()

# URL for the Photon API (used for search functionality)
PHOTON_API_URL = "https://photon.komoot.io/api/"

# Load CSV data
data = pd.read_csv("data/processed/expanded_restaurants_google_places.csv")

@app.route('/')
def home():
    """Renders the home page.

    Returns:
        A rendered HTML template (base.html).
    """
    return render_template('base.html')

@app.route('/restaurant_locations', methods=['GET']) # GET request to fetch global restaurant data
def get_global_restaurants():
    """Returns a list of restaurant locations with latitude and longitude.

    Returns:
        JSON: List of restaurant locations with latitude and longitude.
    """
    return jsonify(data[['name', 'latitude', 'longitude']].to_dict(orient='records'))

@app.route("/setup_chatbot", methods=["POST"])
def setup_chatbot():
    """Sets up the chatbot.

    Returns:
        JSON response indicating success or failure.
    """
    try:
        chatbot.setup()
        return jsonify({"message": "Chatbot setup successful"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/reset_chatbot", methods=["POST"])
def reset_chatbot():
    chatbot.reset()
    return jsonify({"status": "success"})

# Haversine formula to calculate distance
def haversine(lat1, lon1, lat2, lon2):
    """Calculates the great-circle distance between two points on the Earth's surface.

    Args:
        lat1 (float): Latitude of the first point.
        lon1 (float): Longitude of the first point.
        lat2 (float): Latitude of the second point.
        lon2 (float): Longitude of the second point.

    Returns:
        float: Distance between the two points in kilometers.
    """
    R = 6371  # Earth radius in kilometers
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c  # Distance in kilometers

@app.route("/search_nearby", methods=["GET"])
def search_nearby():
    """Searches for nearby places within a specified radius.

    Query Parameters:
        lat (float): Latitude of the center point.
        lon (float): Longitude of the center point.
        radius (float): Radius in kilometers (default is 5 km).

    Returns:
        JSON: List of places within the specified radius.
    """
    try:
        # Get query parameters
        latitude = float(request.args.get("lat"))
        longitude = float(request.args.get("lon"))
        radius = float(request.args.get("radius", 5))  # Default radius: 5 km

        # Filter places within the radius
        def is_within_radius(row):
            distance = haversine(latitude, longitude, row["latitude"], row["longitude"])
            return distance <= radius

        filtered_data = data[data.apply(is_within_radius, axis=1)]

        # Clean up invalid or NaN fields in the data
        def clean_record(record):
            for key, value in record.items():
                # Replace NaN or non-finite numbers with None
                if pd.isna(value) or (isinstance(value, float) and not math.isfinite(value)):
                    record[key] = None
                # Ensure JSON strings are properly escaped
                elif isinstance(value, str) and value.startswith('"') and value.endswith('"'):
                    try:
                        record[key] = json.loads(value)
                    except json.JSONDecodeError:
                        record[key] = None
            
            record["google_opening_hours"] = json.loads(record["google_opening_hours"])
            return record

        # Sanitize each row in the filtered data
        sanitized_data = [clean_record(row) for row in filtered_data.to_dict(orient="records")]

        return jsonify(sanitized_data)

    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/search", methods=["GET"])
def search():
    """Searches for locations using the Photon API based on a user query.

    Query Parameters:
        q (str): The search query provided by the user. Must be at least 3 characters long.

    Returns:
        JSON:
            - On success: A list of location features returned by the Photon API.
            - On error: An error message and a status code.
    """
    query = request.args.get("q", "")
    if len(query) < 3:
        # Return an error if the query is too short
        return jsonify({"error": "Query too short"}), 400

    try:
        # Make a GET request to the Photon API with the search query
        response = requests.get(PHOTON_API_URL, params={"q": query, "lang": "en"})
        response.raise_for_status()
        data = response.json()

        # Return the features (location results) from the API response
        return jsonify(data["features"])
    except requests.RequestException as e:
        # Handle errors during the API request
        return jsonify({"error": str(e)}), 500

@app.route("/chatbot", methods=["POST"])
def chatbot_endpoint():
    """Handles chatbot interactions.

    Request JSON:
        message (str): The user's message to the chatbot.
        restaurants (list): List of restaurants to provide context to the chatbot.

    Returns:
        JSON: The chatbot's response.
    """
    data = request.json
    user_message = data.get('message')
    restaurants = data.get('restaurants')
    if user_message:
        response = chatbot.chat(user_message, restaurants)
        return jsonify(response)
    return jsonify({'response': 'Sorry, I did not understand that.'})

if __name__ == "__main__":
    app.run(debug=True)
