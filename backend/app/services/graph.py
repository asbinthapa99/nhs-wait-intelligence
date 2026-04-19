import networkx as nx
from sqlalchemy.orm import Session
from ..models import Region

def rank_hospital_centrality(db: Session, specialty: str = None) -> dict:
    """
    Constructs a Knowledge Graph of the NHS Network to determine which specific
    administrative regions hold load-bearing "Centrality" in patient flow.
    """
    regions = db.query(Region).all()
    if not regions:
        return {"error": "No regions found"}

    # Initialize directed Graph
    G = nx.DiGraph()

    # Load Nodes
    for r in regions:
        # Assuming population acts as gravity weight
        G.add_node(r.name, population=r.population)

    # In a full flow model, Edges represent patient transfers between regions.
    # Because we lack exact live transfer numbers, we build synthetic edges
    # drawing paths from highly deprived regions to nearby sustainable ones.
    
    # Ex: Connecting low-deprivation nodes (receivers) to high-deprivation nodes
    for source in regions:
        for target in regions:
            if source.id != target.id:
                # Flow edge: if target has much lower deprivation, patients migrate
                if target.deprivation_index < source.deprivation_index:
                    G.add_edge(source.name, target.name, weight=source.deprivation_index - target.deprivation_index)

    # Run complex Graph Math Algorithms
    pagerank_scores = nx.pagerank(G, weight='weight')
    
    # Calculate Betweenness Centrality (identifies bottlenecks in the network)
    betweenness = nx.betweenness_centrality(G, weight='weight')

    return {
        "most_critical_hub": max(pagerank_scores, key=pagerank_scores.get),
        "worst_bottleneck": max(betweenness, key=betweenness.get),
        "pagerank_distribution": pagerank_scores
    }
