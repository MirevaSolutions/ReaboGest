import { Request, Response } from "express";
import { AuthService } from "./auth.service";

export class AuthController {

    private service : AuthService;
    constructor() {
      this.service = new AuthService()
    }

    async register(req: Request, res: Response) {
        try{
            const user = await this.service.register(req.body);
            res.status(200).json(user)
        } catch (error: any) {
            console.log("ERREUR REGISTER:", error)
            res.status(400).json({message: 'Erreur lors de la registration', 
                error: error.message||error})
        }
    }

    async login(req: Request, res: Response) {
        try {

            const { email, password } = req.body;

            const result = await this.service.login({ email, password });

            res.status(200).json(result);

        }catch (error : any) {
            console.log(error)
            res.status(400).json({message: 'Erreur lors de la connexion', error: error.message})
        }
    }
}