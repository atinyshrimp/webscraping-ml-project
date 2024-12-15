from flask import Flask, render_template, request, jsonify
from models.data_collection import NearbyLocations
import requests
import pandas as pd
import math
import json

# Create a Flask application instance
app = Flask(__name__)

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

# Haversine formula to calculate distance
def haversine(lat1, lon1, lat2, lon2):
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

if __name__ == "__main__":
    app.run(debug=True)
