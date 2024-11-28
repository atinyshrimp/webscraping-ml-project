import requests
from flask import jsonify
import os
from dotenv import load_dotenv
load_dotenv()

GOOGLE_PLACES_API_URL = "https://places.googleapis.com/v1/places:searchNearby"

def get_nearby_locations(lat, lon, isTest=True):
    try:
        headers = {
            "Authorization": f"Bearer {os.environ["GOOGLE_PLACES_API_KEY"]}",
            "Content-Type": "application/json",
            "X-Goog-Api-Key": "",
        }
        
        params = {
            "fields": [
                "places.id",
                "places.formattedAddress",
                "places.location",
                "places.rating",
                "places.primaryType",
                "places.googleMapsUri",
                "places.displayName",
                "places.reviews"
            ]
        }

        req_data = {
            "includedPrimaryTypes": ["restaurant"],
            "locationRestriction": {
                "circle": {
                    "center": {
                        "latitude": lat,
                        "longitude": lon
                    },
                    "radius": 500.0
                }
            }
        }
        
        # Make a request to the Google Places API
        response = requests.post(url=GOOGLE_PLACES_API_URL, params=params, data=req_data, headers=headers)
        response.raise_for_status()
        data = response.json()
        
        # Return the places
        return jsonify(data["places"])
    
    except requests.RequestException as e:
        return jsonify({"error": str(e)}), 500