export interface CreateEmployeDTO {
    nom: string;
    prenom: string;
    badgeId: string;
    tauxHoraire: number;
    volumeMensuelObligatoire: number;
    chantierId: string;
}

export interface UpdateEmployeDTO {
    nom?: string;
    prenom?: string;
    badgeId?: string;
    tauxHoraire?: number;
    volumeMensuelObligatoire?: number;
    chantierId?: string;

}