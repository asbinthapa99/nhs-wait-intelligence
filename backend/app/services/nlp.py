import torch
from transformers import pipeline

class CQCSentimentAnalyzer:
    """Singleton instance for HuggingFace Transformers."""
    
    _pipeline = None

    @classmethod
    def get_pipeline(cls):
        if cls._pipeline is None:
            # Loads pre-trained distilbert (downloads ~250MB to memory)
            cls._pipeline = pipeline("sentiment-analysis", model="distilbert-base-uncased-finetuned-sst-2-english")
        return cls._pipeline

def quantify_review(review_text: str) -> dict:
    """
    Ingests unstructured hospital review text and outputs mathematical sentiment.
    """
    analyzer = CQCSentimentAnalyzer.get_pipeline()
    
    # Run through the Deep Learning pipeline
    result = analyzer(review_text[:512])[0]  # truncate to 512 tokens
    
    is_positive = result['label'] == 'POSITIVE'
    confidence = round(result['score'], 3)
    
    return {
        "text_preview": review_text[:50] + "...",
        "sentiment_label": result['label'],
        "confidence_score": confidence,
        "weighted_polarity": confidence if is_positive else -confidence
    }
