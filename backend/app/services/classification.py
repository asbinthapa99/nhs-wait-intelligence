import xgboost as xgb
import numpy as np

def train_breach_classifier(X_train: np.ndarray, y_train: np.ndarray):
    """
    Trains a Gradient Boosted Tree to predict whether a Trust will breach
    statutory waiting time limits next quarter.
    
    X_train: Features (historical trend volatility, funding, capacity)
    y_train: Binary labels (1 = breached, 0 = stable)
    """
    dtrain = xgb.DMatrix(X_train, label=y_train)
    
    params = {
        'max_depth': 4,
        'eta': 0.1,
        'objective': 'binary:logistic',
        'eval_metric': 'logloss'
    }
    
    model = xgb.train(params, dtrain, num_boost_round=100)
    return model

def predict_breach_probability(model: xgb.Booster, features: list) -> float:
    """Returns probability (0.0 to 1.0) of imminent breach."""
    dtest = xgb.DMatrix(np.array([features]))
    prediction = model.predict(dtest)
    return float(prediction[0])
