import { prisma } from "../../database/prisma.service"

export class AuthRepository {

    async findUserByEmail(email: string) {
        return prisma.user.findUnique({
            where: { email }
        })
    }

    async createUser(data:any) {
        return prisma.user.create({
            data
        })
    }

}