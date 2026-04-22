from sqlalchemy.orm import Session
from ..schemas.mutual_aid import MutualAidResponse, MutualAidPairing, TrustLoadData

def get_mutual_aid_pairings(db: Session, specialty: str = "All") -> MutualAidResponse:
    # In a fully populated DB, this would query the 'trusts' and 'waiting_lists' tables.
    # Currently, falling back to an algorithmic mock to ensure the API demonstrates the logic.
    mock_pairings = [
        MutualAidPairing(
            id='m1',
            specialty='Orthopaedics',
            source=TrustLoadData(name='University Hospitals Birmingham', wait=24, load='Critical'),
            dest=TrustLoadData(name='South Warwickshire', wait=8, load='Optimal'),
            patientsToMove=250,
            weeksSavedPerPatient=16,
            distanceMiles=22,
            costSavedEst=185000,
            impact='High'
        ),
        MutualAidPairing(
            id='m2',
            specialty='Ophthalmology',
            source=TrustLoadData(name='Manchester University', wait=18, load='High'),
            dest=TrustLoadData(name='Wrightington, Wigan', wait=6, load='Optimal'),
            patientsToMove=120,
            weeksSavedPerPatient=12,
            distanceMiles=28,
            costSavedEst=95000,
            impact='Medium'
        ),
        MutualAidPairing(
            id='m3',
            specialty='Cardiology',
            source=TrustLoadData(name='Barts Health', wait=21, load='Critical'),
            dest=TrustLoadData(name='Homerton University', wait=9, load='Optimal'),
            patientsToMove=85,
            weeksSavedPerPatient=12,
            distanceMiles=4,
            costSavedEst=110000,
            impact='High'
        ),
        MutualAidPairing(
            id='m4',
            specialty='General Surgery',
            source=TrustLoadData(name='Leeds Teaching Hospitals', wait=16, load='High'),
            dest=TrustLoadData(name='Harrogate and District', wait=7, load='Optimal'),
            patientsToMove=150,
            weeksSavedPerPatient=9,
            distanceMiles=15,
            costSavedEst=75000,
            impact='Medium'
        )
    ]
    
    if specialty != "All":
        filtered = [p for p in mock_pairings if p.specialty == specialty]
    else:
        filtered = mock_pairings
        
    return MutualAidResponse(pairings=filtered)
