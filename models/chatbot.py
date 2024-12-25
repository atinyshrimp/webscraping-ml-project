import pandas as pd
from sentence_transformers import SentenceTransformer, util
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline

class Chatbot():
    def __init__(self):
        self.__load_reviews()
        self.__restaurants = pd.read_csv('data/processed/restaurants_with_reddit_reviews.csv')
        self.__embedder = None
        self.__intent_classifier = None
        self.__summarizer = None
        
        self.__tokenizer = None
        self.__model = None
        self.history = None

        
    def setup(self):
        self.__embedder = SentenceTransformer('distilbert-base-nli-mean-tokens')
        self.__intent_classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
        self.__summarizer = pipeline('summarization', model="t5-small", tokenizer="t5-small")
        
        self.__tokenizer = AutoTokenizer.from_pretrained("microsoft/DialoGPT-medium")
        self.__model = AutoModelForCausalLM.from_pretrained("microsoft/DialoGPT-medium")
        self.history = None
            
    
    def chat(self, message, restaurants=None):
        # Check for specific keywords or intents
    
        intent = self.__get_intent(message)
        print(intent)
        
        response, history = self.__handle_intent(intent, message, self.history, restaurants)
        self.history = history
        if response:
            return response
        # if intent == 'recommend restaurant':
        #     # Get recommendations
        #     recommendations = recommend_with_embedding(user_input, top_n=3)
        #     response = recommendations.to_string(index=False)
        #     return response, history
        
        # Fallback to conversational model
        new_user_input_ids = self.__tokenizer.encode(message + self.__tokenizer.eos_token, return_tensors='pt')
        bot_input_ids = torch.cat([history, new_user_input_ids], dim=-1) if history is not None else new_user_input_ids
        self.history = self.__model.generate(bot_input_ids, max_length=1000, pad_token_id=self.__tokenizer.eos_token_id)
        response = self.__tokenizer.decode(history[:, bot_input_ids.shape[-1]:][0], skip_special_tokens=True)
        return response
    
    def reset(self):
        self.history = None
        return "Chat history has been reset."
    
    # Function to convert string to tensor
    def __string_to_tensor(self, tensor_string):
        # Remove 'tensor(' and ')' and split into components
        tensor_string = tensor_string.replace('tensor([', '').replace('])', '')
        # Split the string into individual numeric components
        numbers = [float(x) for x in tensor_string.split(',')]
        # Convert to PyTorch tensor
        return torch.tensor(numbers)

    def __load_reviews(self):
        self.data = pd.read_csv('data/processed/reviews.csv')
        self.data['embedding'] = self.data['embedding'].apply(self.__string_to_tensor)
        
    def __get_intent(self, query):
        candidate_labels = ['recommend restaurant', 'get details', 'get reviews', 'get hours', 'help', 'goodbye', 'chitchat', 'other']
        intent = self.__intent_classifier(query, candidate_labels=candidate_labels)
        label = self.__intent_classifier(query, candidate_labels=candidate_labels)['labels'][0]
        score = intent['scores'][0]
        return label
    
    # Recommend by similarity
    def __recommend_with_embedding(self, query, subset=None, top_n=5):
        query_embedding = self.__embedder.encode(query, convert_to_tensor=True)
        recommended_reviews = self.data.copy()
        if subset:
            recommended_reviews = recommended_reviews[recommended_reviews['restaurant_id'].isin(subset)]
        recommended_reviews['similarity'] = recommended_reviews['embedding'].apply(
            lambda x: util.cos_sim(query_embedding, x).item()
        )
        recommended_reviews = recommended_reviews.groupby('restaurant_id').mean(numeric_only=True).reset_index()
        print(recommended_reviews)
        recommended_reviews = recommended_reviews[recommended_reviews['similarity'] > 0]
        return recommended_reviews.sort_values(by='similarity', ascending=False).head(top_n)
    
    # Define responses for each intent
    def __handle_intent(self, intent, user_input, history, restaurants):
        if intent == 'recommend restaurant':
            if restaurants:
                # Use the recommendation logic
                recommendations = self.__recommend_with_embedding(user_input, subset=restaurants, top_n=3)
                if recommendations.empty:
                    response = "I couldn't find any recommendations similar enough. Try again with different preferences."
                else:
                    response = "Based on your preferences, here are some recommendations:\n"
                    for idx, row in recommendations.iterrows():
                        response += f"{idx + 1}. {row['restaurant_name']} - Similarity: {row['similarity']:.2f}\n"
            else:
                response = "I'd be glad to assist you but you must search for restaurants nearby first."
            return response, history
        
        elif intent == 'get details':
            # Extract restaurant name from input and fetch details
            restaurant_name = self.__extract_entity(user_input, 'restaurant_name')
            details = self.__fetch_restaurant_details(restaurant_name)  # Assume function defined elsewhere
            if details:
                response = f"Here are the details for {restaurant_name}:\n{details}"
            else:
                response = f"Sorry, I couldn't find details for {restaurant_name}."
            return response, history

        elif intent == 'get reviews':
            # Extract restaurant name and fetch reviews
            restaurant_name = self.__extract_entity(user_input, 'restaurant_name')
            reviews = self.__fetch_restaurant_reviews(restaurant_name)  # Assume function defined elsewhere
            if reviews:
                response = f"Here are some reviews for {restaurant_name}:\n" + "\n".join(reviews[:3])
            else:
                response = f"Sorry, I couldn't find reviews for {restaurant_name}."
            return response, history

        elif intent == 'get hours':
            # Extract restaurant name and fetch hours
            restaurant_name = self.__extract_entity(user_input, 'restaurant_name')
            hours = self.__fetch_opening_hours(restaurant_name)  # Assume function defined elsewhere
            if hours:
                response = f"{restaurant_name} is open during these hours:\n{hours}"
            else:
                response = f"Sorry, I couldn't find the hours for {restaurant_name}."
            return response, history

        elif intent == 'help':
            response = ("I can assist you with the following:\n"
                        "- Recommend a restaurant\n"
                        "- Get details about a specific restaurant\n"
                        "- Fetch reviews\n"
                        "- Check opening hours\n"
                        "How can I assist you today?")
            return response, history

        elif intent == 'goodbye':
            response = "Goodbye! Let me know if I can assist you again."
            return response, history
        
        # elif intent == 'chitchat':
        #     return None, history # Placeholder for chitchat logic

        else:
            response = "I'm sorry, I didn't understand that. Could you rephrase?"
            return response, history
        
    def __extract_entity(self, user_input, entity_type):
        # Example: Simple keyword matching for restaurant names
        if entity_type == 'restaurant_name':
            for restaurant in self.data['restaurant_name'].unique():
                if restaurant.lower() in user_input.lower():
                    return restaurant
        return None
        
    def __fetch_restaurant_details(self, restaurant_name):
        details = self.data[self.data['restaurant_name'].str.lower() == restaurant_name.lower()]
        details['text'] = details['text'].fillna('')
        if not details.empty:
            all_reviews = "\n".join(details['text'].tolist())
            all_reviews = f"Information about the restaurant {restaurant_name}:\n" + all_reviews
            summary = self.__summarizer(all_reviews, max_length=100, min_length=20, do_sample=False)
            return summary[0]['summary_text']
            # return details.iloc[0].to_dict()  # Return details as a dictionary
        return None

    def __fetch_restaurant_reviews(self, restaurant_name):
        reviews = self.data[self.data['restaurant_name'].str.lower() == restaurant_name.lower()]['text'].tolist()
        return reviews if reviews else None

    def __fetch_opening_hours(self, restaurant_name):
        hours = self.__restaurants[self.__restaurants['name'].str.lower() == restaurant_name.lower()]['google_opening_hours'].values
        return hours[0] if len(hours) > 0 else None

