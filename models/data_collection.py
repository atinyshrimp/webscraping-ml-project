import requests
from flask import jsonify
import os
import json
from dotenv import load_dotenv
load_dotenv()

GOOGLE_PLACES_API_URL = "https://places.googleapis.com/v1/places:searchNearby"

class NearbyLocations():
    """A class to handle the retrieval and processing of nearby location data.

    Attributes:
        lat (float): Latitude of the central location.
        lon (float): Longitude of the central location.
        is_test (bool): Whether to use test data instead of making API requests.
        data (list): The raw data of places fetched from the API or test file.
        _locations (list): Cached list of location coordinates.
        _reviews (list): Cached list of reviews for all locations.

    Methods:
        locations: Returns a list of coordinates for all places.
        reviews: Returns a list of reviews for all places.
        get_highly_rated(min_rating): Returns places with ratings greater than or equal to `min_rating`.
    """
    
    def __init__(self, lat, lon, is_test=True):
        """Initializes the NearbyLocations object.

        Args:
            lat (float): Latitude of the central location.
            lon (float): Longitude of the central location.
            is_test (bool): Whether to use test data instead of making API requests.
        """
        self.lat = lat
        self.lon = lon
        self.is_test = is_test
        self.data = self.__get_data()
        
        # Lazy-loaded properties
        self._locations = None
        self._reviews = None
        
    def __get_data(self):
        """Fetches nearby places data either from a test file or the Google Places API.

        Returns:
            list: A list of places fetched from the API or test file.
        """
        if (self.is_test):
            with open("static/json/nearby_test.json", encoding="utf8") as file:
                data = json.load(file)
            return data["places"]
            
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
                "includedPrimaryTypes": self.__get_location_types(),
                "locationRestriction": {
                    "circle": {
                        "center": {
                            "latitude": self.lat,
                            "longitude": self.lon
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
    
    def __get_location_types(self):
        """Returns a list of location types supported by the Google Places API and relevant to the project

        Returns:
            list: A list of types (string) of locations.
        """
        locations = []
        with open("static/txt/location_types.txt") as file:
            for line in file:
                locations.append(line.strip('\n'))
                
        return locations
    
    @property
    def locations(self):
        """Returns a list of coordinates for all places.

        Returns:
            list: A list of coordinates (latitude and longitude) for all places.
        """
        if self._locations is None:
            self._locations = [place["location"] for place in self.data]
        return self._locations
    
    @property
    def reviews(self):
        """Returns a list of reviews for all places.

        Returns:
            list: A list of reviews for all places, or an empty list if no reviews are available.
        """
        if self._reviews is None:
            self._reviews = [place.get("reviews", []) for place in self.data]
        return self._reviews