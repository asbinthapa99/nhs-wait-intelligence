import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sqlalchemy.orm import Session
from ..models import ProcessedMetric, Region

def get_trust_clusters(db: Session, n_clusters: int = 3):
    """
    Unsupervised K-Means clustering to mathematically group Region behaviors.
    Extracts underlying structural inequality patterns.
    """
    # Fetch latest metrics joined with spatial rules
    results = db.query(ProcessedMetric, Region).join(Region).all()
    if not results:
        return {"clusters": [], "error": "No data available."}
    
    # 1. Feature Extraction
    features = []
    metadata = []
    
    for metric, region in results:
        features.append([
            region.deprivation_index,
            metric.pct_over_18_weeks,
            metric.backlog_rate_per_100k
        ])
        metadata.append({
            "region_id": region.region_code,
            "region_name": region.name
        })
    
    X = np.array(features)
    
    # 2. Standardization
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # 3. Clustering
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init='auto')
    labels = kmeans.fit_predict(X_scaled)
    
    # 4. Packaging
    clusters_output = {i: [] for i in range(n_clusters)}
    for label, meta in zip(labels, metadata):
        clusters_output[int(label)].append(meta["region_name"])
        
    return {
        "algorithm": "K-Means",
        "n_clusters": n_clusters,
        "features": ["deprivation", "pct_over_18_weeks", "backlog_density"],
        "clusters": clusters_output
    }
