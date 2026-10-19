import { Request, Response } from "express";
import { EmployeService } from "./employe.service"
import { CreateEmployeDTO, UpdateEmployeDTO } from './employe.dto';

export class EmployeController {

    private service = new EmployeService();

    async getAll(req: Request, res: Response) {
        try {

            const employes = await this.service.getAll();
            res.status(200).json(employes);

        } catch (error) {
            console.log(error)
            res.status(500).json({message:'Erreur lors de la recuperation des employes',error});

        }
    }

    async getById(req: Request, res: Response) {
        try {

            const id = req.params.id as string;
            const employe = await this.service.getById(id);

            if(!employe) {

                return res.status(404).json({message:'Employe introuvable'});

            }

            res.status(200).json(employe);

        } catch (error) {

            res.status(500).json({message:'Erreur lors de la recuperation de l\'employe',error})

        }
    }

    async create(req: Request, res: Response) {
        try {

            const data : CreateEmployeDTO = req.body;
            // badgeId is optional from the client (frontend may not send it)
            if (data.badgeId) {
                const employeExiste = await this.service.getBadgeId(data.badgeId);
                if (employeExiste) {
                    return res.status(409).json("badgeId existe");
                }
            }
            
            const employe = await this.service.create(data);

            res.status(201).json({message:"creation emplloye reussi",employe});

        } catch (error) {
            console.log(error)

            res.status(500).json({message:'Impossible de creer un employer',error});

        }
    }    

    async update(req: Request, res: Response) {
        try {
            
            const employe = await this.service.update(req.params.id as string, req.body);

            res.status(200).json(employe);

        } catch (error) {

            res.status(500).json({message : "Impossible de mettre a jour employe", error});

        }
    }    

    async delete(req: Request, res: Response) {
        try {

            const employe =             await this.service.delete(req.params.id as string);

            res.status(200).json({message:"Suppression employe reussi",employe});

        } catch (error) {

            res.status(500).json({message : "Impossible de supprimer l'employe", error});

        }
    }

}