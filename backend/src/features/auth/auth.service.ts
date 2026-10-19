import { AuthRepository } from "./auth.repository";
import  bcrypt  from "bcrypt"
import  jwt from "jsonwebtoken"

export class AuthService {
    private repository : AuthRepository;

    constructor() {
        this.repository = new AuthRepository();
    }

    
    async register(data:{ nom: string, email:string, password:string }){

        const existingUser = await this.repository.findUserByEmail(data.email);

        if(existingUser) {
            throw new Error('utilisateur existe deja')
        }

        const hashPassword = await bcrypt.hash(data.password,10)

        const user = await this.repository.createUser({
            nom : data.nom,
            email: data.email,
            password: hashPassword
        })

        return {
            id : user.id,
            nom: user.nom,
            email: user.email
        }
    }


    async login(data:{ email:string, password: string}) {

        const user = await this.repository.findUserByEmail(data.email);

        if(!user) {
            throw new Error("utilisateur introuvable")
        }

        const passwordValid = await bcrypt.compare(data.password, user.password);

        if(!passwordValid) {
            throw new Error("mot de passe incorrect")
        }

        const token = jwt.sign(
            {id: user.id, email: user.email},
            process.env.JWT_SECRET!,
            {expiresIn: "1d" }
        );

        return { token }

    }


}