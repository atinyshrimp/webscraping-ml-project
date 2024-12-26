# Michelin Green Star Recommender

![Michelin Green Star](https://d3h1lg3ksw6i6b.cloudfront.net/media/image/2022/10/11/31d3d763e68745dca54c19db6978db5f_Green-Star-hero-image.jpg)

This project is a **web-based recommendation system** designed to help users discover **MICHELIN Green Star restaurants**, an annual award which highlights restaurants at the forefront of the industry when it comes to their **sustainable practices**.\
It combines data from **Michelin Guide**, **Google Places API**, and **Reddit reviews** to provide personalized restaurant recommendations. The application also features an **interactive chatbot** powered by natural language processing for conversational restaurant suggestions.

## Features

![Landing page](static/img/landing_page.png)

- 🌍 **Interactive Map Display**: Visualize restaurant locations and explore nearby options.
- 🔍 **Advanced Search & Filters**: Search restaurants by location and refine results with criteria such as:
  - Radius
  - Price Range
  - Cuisine Type
  - Ratings Score
- 🎯 **Dynamic Sorting**: Sort results by distance, rating, price, or relevance to your preferences.
- 🤖 **Chatbot Integration**: Interact with "Rekko," the AI-powered chatbot, to receive personalized recommendations.
- 📊 **AI-Powered Recommendations**: Recommendations driven by state-of-the-art embedding models (HuggingFace, SentenceTransformers).
- 🧾 **Review Summarization**: Extract insights from Google Reviews and Reddit discussions to understand restaurant popularity and sentiments.
- 💬 **Conversational UI**: A chatbot integrated seamlessly into the web interface for quick and user-friendly interaction.

## Installation

### Prerequisites

- Python 3.7 or later

### Steps

1. **Clone the repository**:

   ```sh
   git clone https://github.com/atinyshrimp/webscraping-ml-project.git
   cd webscraping-ml-project
   ```

2. **Set up a virtual environment**:

   ```sh
    python -m venv venv
    source venv/bin/activate  # On Windows: `venv\Scripts\activate`
   ```

3. **Install the required packages**:

   ```sh
   pip install -r requirements.txt
   ```

## Usage

1. **Run the Flask application**:

   ```sh
   flask run
   ```

2. **Open the application in your browser**:
   ```
   http://127.0.0.1:5000/
   ```

## Project Structure

```bash
webscraping-ml-project
+---data
|   +---processed
|   |       expanded_restaurants_google_places.csv
|   |       restaurants_with_reddit_reviews.csv
|   |       reviews.csv
|   |
|   \---raw
|           green_star_michelin_restaurants.csv
|           restaurants_google_places_api_raw.csv
|
+---models
|   |   chatbot.py
|   |
|   \---__pycache__
|           chatbot.cpython-312.pyc
|           data_collection.cpython-312.pyc
|
+---notebooks
|       data_collection.ipynb
|       nlp_pipeline.ipynb
|
+---static
|   +---css
|   |       styles.css
|   |
|   +---img
|   |
|   \---js
|           chatbot.js
|           map.js
|
\---templates
        base.html
|   .env
|   .gitignore
|   app.py
|   README.md
|   requirements.txt
|   structure.txt
```

## Data Sources

- **Michelin Guide**: Information about Michelin-starred restaurants with the Green Star distinction.
- **Google Places API**: Details about restaurant locations, ratings, and reviews.
- **Reddit**: Authentic user discussions on restaurant quality and experience.

## Notebooks

- **data_collection.ipynb**: Data extraction and cleaning pipeline.
- **nlp_pipeline.ipynb**: Embedding similarity, and model development.

## Contact

For any inquiries, please [contact me](mailto:joyce.lapilus@gmail.com).

## Acknowledgements

- Data sourced from Google Places API, Michelin Guide, and Reddit.
- Developed as part of the Michelin Green Star Recommender Project.
