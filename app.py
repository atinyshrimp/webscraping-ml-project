from flask import Flask, render_template, request, jsonify
from models.data_collection import NearbyLocations
import requests

# Create a Flask application instance
app = Flask(__name__)

# URL for the Photon API (used for search functionality)
PHOTON_API_URL = "https://photon.komoot.io/api/"

@app.route('/')
def home():
    """Renders the home page.

    Returns:
        A rendered HTML template (base.html).
    """
    return render_template('base.html')

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

@app.route("/nearby", methods=["GET"])
def get_nearby_places():
    """Fetches nearby locations based on the provided latitude and longitude.

    Query Parameters:
        lat (float): The latitude of the central location.
        lon (float): The longitude of the central location.

    Returns:
        JSON:
            - On success: A list of nearby places retrieved from the NearbyLocations class.
            - On error: An error message and a status code.
    """
    # Get latitude and longitude from the query parameters
    latitude = request.args.get("lat")
    longitude = request.args.get("lon")

    if not latitude or not longitude:
        # Return an error if either latitude or longitude is missing
        return jsonify({"error": "Latitude and longitude are required"}), 400

    # Instantiate the NearbyLocations class and fetch nearby places
    nl = NearbyLocations(latitude, longitude)
    return jsonify(nl.data)

if __name__ == "__main__":
    app.run(debug=True)
