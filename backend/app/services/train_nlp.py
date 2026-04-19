import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer, Trainer, TrainingArguments
from datasets import Dataset

"""
Deep Learning Transfer Training Loop (PyTorch).
Fine-tunes the base DistilBERT model directly on NHS Care Quality Commission reviews 
to teach it localized medical vocabulary ("trolley wait", "long RTT", etc).
"""

def fine_tune_cqc_sentiment_model(training_data: list[dict]):
    """
    Expects training_data as [{"text": "Terrible trolley waits...", "label": 0}, {"text": "Excellent care...", "label": 1}]
    """
    model_id = "distilbert-base-uncased"
    tokenizer = AutoTokenizer.from_pretrained(model_id)
    model = AutoModelForSequenceClassification.from_pretrained(model_id, num_labels=2)
    
    # 1. Dataset prep
    ds = Dataset.from_list(training_data)
    
    def tokenize_function(examples):
        return tokenizer(examples["text"], padding="max_length", truncation=True)
    
    tokenized_ds = ds.map(tokenize_function, batched=True)
    
    # 2. Split dataset
    train_test = tokenized_ds.train_test_split(test_size=0.2)
    
    # 3. Training Arguments 
    training_args = TrainingArguments(
        output_dir="./app/models/fine_tuned_cqc",
        evaluation_strategy="epoch",
        learning_rate=2e-5,
        per_device_train_batch_size=8,
        num_train_epochs=3,
        weight_decay=0.01,
        logging_dir='./logs',
        # Use CPU if CUDA not available
        no_cuda=not torch.cuda.is_available() 
    )

    # 4. Initialize PyTorch Trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_test["train"],
        eval_dataset=train_test["test"],
        tokenizer=tokenizer,
    )
    
    print("Initiating local Gradient Descent fine-tuning on NHS vocab...")
    trainer.train()
    
    # Save the custom weights
    trainer.save_model("./app/models/fine_tuned_cqc")
    print("Fine-tuning completed. Custom weights saved.")
