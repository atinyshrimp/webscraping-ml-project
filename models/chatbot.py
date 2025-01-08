import pandas as pd
from sentence_transformers import SentenceTransformer, util
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline

class Chatbot():
    def __init__(self):
        """Initializes the Chatbot class and loads necessary data and models."""
        self.__load_reviews()
        self.__restaurants = pd.read_csv('data/processed/restaurants_with_reddit_reviews.csv')
        self.__candidate_labels = ['recommendation', 'details', 'other']
        
        self.__recommendations = []
        self.__embedder = None
        self.__intent_classifier = None
        self.__summarizer = None
        
        self.__tokenizer = None
        self.__model = None
        self.history = None

    def setup(self):
        """Sets up the necessary models for the chatbot."""
        self.__embedder = SentenceTransformer('sentence-transformers/all-mpnet-base-v2')
        self.__intent_classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
        self.__summarizer = pipeline('summarization', model="facebook/bart-large-cnn", tokenizer="facebook/bart-large-cnn")
        
        self.__tokenizer = AutoTokenizer.from_pretrained("microsoft/DialoGPT-medium")
        self.__model = AutoModelForCausalLM.from_pretrained("microsoft/DialoGPT-medium")            
    
    def chat(self, message, restaurants=None):
        """Handles the chat interaction with the user.

        Args:
            message (str): The user's message.
            restaurants (list, optional): List of restaurants to provide context.

        Returns:
            str: The chatbot's response.
        """
        # Check for specific keywords or intents
    
        intent = self.__get_intent(message)
        print(intent)
        
        response, history = self.__handle_intent(intent, message, self.history, restaurants)
        self.history = history
        content = {}
        
        if response:
            if intent == 'recommendation':
                content["recommendations"] = self.__recommendations.to_dict(orient="records")            
        else: 
            # Fallback to conversational model
            new_user_input_ids = self.__tokenizer.encode(message + self.__tokenizer.eos_token, return_tensors='pt')
            bot_input_ids = torch.cat([self.history, new_user_input_ids], dim=-1) if self.history is not None else new_user_input_ids
            self.history = self.__model.generate(bot_input_ids, max_length=1000, pad_token_id=self.__tokenizer.eos_token_id)
            response = self.__tokenizer.decode(self.history[:, bot_input_ids.shape[-1]:][0], skip_special_tokens=True)
            
        content["response"] = response
        return content
    
    def reset(self):
        """Resets the chat history."""
        self.history = None
        return "Chat history has been reset."
    
    # Function to convert string to tensor
    def __string_to_tensor(self, tensor_string):
        """Converts a string representation of a tensor to a PyTorch tensor.

        Args:
            tensor_string (str): The string representation of the tensor.

        Returns:
            torch.Tensor: The converted PyTorch tensor.
        """
        # Remove 'tensor([' and '])' and split into components
        tensor_string = tensor_string.replace('tensor([', '').replace('])', '')

        # Split the string into individual numeric components
        numbers = [float(x) for x in tensor_string.split(',')]

        # Convert to PyTorch tensor
        return torch.tensor(numbers)

    def __load_reviews(self):
        """Loads restaurant reviews from a CSV file."""
        self.data = pd.read_csv('data/processed/reviews.csv')
        self.data['embedding'] = self.data['embedding'].apply(self.__string_to_tensor)
        # print(self.data['embedding'].head())
        
    def __get_intent(self, query):
        """Determines the intent of the user's message.

        Args:
            query (str): The user's message.

        Returns:
            dict: The detected intent and its confidence score.
        """
        # Check for specific estaurant/entity names
        if self.__extract_entity(query, 'restaurant_name'):
            return 'details'
        
        label = self.__intent_classifier(query, candidate_labels=self.__candidate_labels)['labels'][0]
        return label
    
    # Recommend by similarity
    def __recommend_with_embedding(self, query, subset=None, top_n=5):
        """Recommends restaurants based on the similarity of embeddings.

        Args:
            query (str): The user's query.
            subset (list, optional): Subset of restaurant IDs to consider.
            top_n (int, optional): Number of top recommendations to return.

        Returns:
            pd.DataFrame: DataFrame containing the top recommended restaurants.
        """
        query_embedding = self.__embedder.encode(query, convert_to_tensor=True)
        recommended_reviews = self.data.copy()
        if subset:
            recommended_reviews = recommended_reviews[recommended_reviews['restaurant_id'].isin(subset)]
        recommended_reviews['similarity'] = recommended_reviews['embedding'].apply(
            lambda x: util.cos_sim(query_embedding, x).item()
        )
        # print(recommended_reviews)
        recommended_reviews = recommended_reviews[recommended_reviews['similarity'] > 0]
        recommended_reviews = recommended_reviews.drop_duplicates(subset=['restaurant_name'])
        recommended_reviews = recommended_reviews.merge(self.__restaurants, left_on='restaurant_id', right_on='id', how='left')
        recommended_reviews = recommended_reviews.drop(columns=['text', 'restaurant_name', 'reddit_reviews', 'embedding'])
        self.__recommendations = recommended_reviews.nlargest(top_n, 'similarity')
    
    # Define responses for each intent
    def __handle_intent(self, intent, user_input, history, restaurants):
        """Handles the user's intent and generates a response.

        Args:
            intent (str): The detected intent.
            user_input (str): The user's message.
            history (list): The conversation history.
            restaurants (list, optional): List of restaurants to provide context.

        Returns:
            tuple: The chatbot's response and updated conversation history.
        """
        if intent == 'recommendation':
            if restaurants:
                # Use the recommendation logic
                self.__recommend_with_embedding(user_input, subset=restaurants, top_n=3)
                if self.__recommendations.empty:
                    response = "I couldn't find any recommendations similar enough. Try again with different preferences."
                else:
                    response = "Based on your preferences, here are some recommendations:\n"
                    for _, row in self.__recommendations.iterrows():
                        response += f"{row['name']} located in {row['location']}, {row['country']}\n"
            else:
                response = "I'd be glad to assist you but you must search for restaurants nearby first."
            return response, history
        
        elif intent == 'details':
            # Extract restaurant name from input and fetch details
            restaurant_name = self.__extract_entity(user_input, 'restaurant_name')
            details = self.__fetch_restaurant_details(restaurant_name) 
            if details:
                response = details
            else:
                response = f"Sorry, I couldn't find details for {restaurant_name}."
            return response, history

        else:
            response = "I'm sorry, I didn't understand that. Could you rephrase?"
            return None, history
        
    def __extract_entity(self, user_input, entity_type):
        """Extracts an entity from the user's input.

        Args:
            user_input (str): The user's message.
            entity_type (str): The type of entity to extract.

        Returns:
            str: The extracted entity, if found.
        """
        # Simple keyword matching for restaurant names
        if entity_type == 'restaurant_name':
            for restaurant in self.data['restaurant_name'].unique():
                if restaurant.lower() in user_input.lower():
                    return restaurant
        return None
        
    def __fetch_restaurant_details(self, restaurant_name):
        """Fetches details for a specific restaurant.

        Args:
            restaurant_name (str): The name of the restaurant.

        Returns:
            str: The restaurant details.
        """
        details = self.data[self.data['restaurant_name'].str.lower() == restaurant_name.lower()]
        details['text'] = details['text'].fillna('')
        if not details.empty:
            MAX_LENGTH = 2**11
            all_reviews = "\n".join(details['text'].tolist())[:MAX_LENGTH]
            all_reviews = f"Information about the restaurant {restaurant_name}:\n" + all_reviews
            try:
                summary = self.__summarizer(all_reviews, max_length=100, min_length=20, do_sample=False)
                return summary[0]['summary_text']
            except IndexError as e:
                print(f"IndexError: {e}")
                print(f"Input to summarizer: {all_reviews}")
                return None