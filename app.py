from flask import Flask, render_template, request, jsonify
import models.data_collection as dc
import requests

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('base.html')

PHOTON_API_URL = "https://photon.komoot.io/api/"

@app.route("/search", methods=["GET"])
def search():
    query = request.args.get("q", "")
    if len(query) < 3:
        return jsonify({"error": "Query too short"}), 400

    try:
        # Make a request to the Photon API
        response = requests.get(PHOTON_API_URL, params={"q": query, "lang": "en"})
        response.raise_for_status()
        data = response.json()
        
        # Return the features from Photon API
        return jsonify(data["features"])
    except requests.RequestException as e:
        return jsonify({"error": str(e)}), 500

@app.route("/nearby", methods=["GET"])
def get_nearby_places():
    # Get coordinates from the request
    latitude = request.args.get("lat")
    longitude = request.args.get("lon")
    
    if not latitude or not longitude:
        return jsonify({"error": "Latitude and longitude are required"}), 400
    
    return dc.get_nearby_locations(latitude, longitude)

if __name__ == "__main__":
    app.run(debug=True)