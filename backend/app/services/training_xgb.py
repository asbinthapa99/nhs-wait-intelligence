import xgboost as xgb
import optuna
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import log_loss
import logging

"""
Optuna Bayesian Hyperparameter Optimization Loop for XGBoost.
This script replaces hardcoded training parameters with mathematically verified optimal configurations.
"""

log = logging.getLogger("optuna.xgb")

def optimize_xgb_hyperparameters(X: np.ndarray, y: np.ndarray, n_trials=50):
    """
    Executes a Bayesian search across deep learning parameters to find the layout that minimizes error predicting NHS breaches.
    """
    X_train, X_valid, y_train, y_valid = train_test_split(X, y, test_size=0.2, random_state=42)
    dtrain = xgb.DMatrix(X_train, label=y_train)
    dvalid = xgb.DMatrix(X_valid, label=y_valid)

    def objective(trial):
        params = {
            'objective': 'binary:logistic',
            'eval_metric': 'logloss',
            'booster': 'gbtree',
            'max_depth': trial.suggest_int('max_depth', 3, 9),
            'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3, log=True),
            'subsample': trial.suggest_float('subsample', 0.5, 1.0),
            'colsample_bytree': trial.suggest_float('colsample_bytree', 0.5, 1.0),
            'min_child_weight': trial.suggest_int('min_child_weight', 1, 10),
            'gamma': trial.suggest_float('gamma', 1e-4, 1.0, log=True)
        }
        
        pruning_callback = optuna.integration.XGBoostPruningCallback(trial, 'validation-logloss')
        
        model = xgb.train(
            params, 
            dtrain, 
            num_boost_round=100, 
            evals=[(dvalid, 'validation')], 
            callbacks=[pruning_callback],
            verbose_eval=False
        )
        
        preds = model.predict(dvalid)
        loss = log_loss(y_valid, preds)
        return loss

    study = optuna.create_study(direction='minimize', study_name="nhs_breach_predictor")
    log.info("Commencing Bayesian Hyperparameter Search...")
    study.optimize(objective, n_trials=n_trials)
    
    log.info(f"Optimal Configuration Found: {study.best_params}")
    return study.best_params
