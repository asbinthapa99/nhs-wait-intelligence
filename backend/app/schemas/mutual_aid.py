from pydantic import BaseModel

class TrustLoadData(BaseModel):
    name: str
    wait: int
    load: str

class MutualAidPairing(BaseModel):
    id: str
    specialty: str
    source: TrustLoadData
    dest: TrustLoadData
    patientsToMove: int
    weeksSavedPerPatient: int
    distanceMiles: int
    costSavedEst: int
    impact: str

class MutualAidResponse(BaseModel):
    pairings: list[MutualAidPairing]
