import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: "token manquant" });
        }

        // 1. Vérifier le format "Bearer TOKEN"
        const parts = authHeader.split(" ");
        if (parts.length!== 2 || parts[0]!== "Bearer") {
            return res.status(401).json({ message: "Format du token invalide. Utilisez: Bearer TOKEN" });
        }

        if (!parts[1]) {
            return res.status(401).json({ message: "Format du token invalide. Utilisez: Bearer TOKEN" });
        }

        const token = parts[1];

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error("JWT_SECRET manquant dans.env");
            return res.status(500).json({ message: "Erreur serveur: JWT_SECRET manquant" }); // 500 pas 401
        }

        const decoded = jwt.verify(token, secret as string);

        (req as any).user = decoded;
        next();

    } catch (error: any) {
        // Gérer spécifiquement TokenExpiredError
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: "token expiré" });
        }
        return res.status(401).json({ message: "token invalide" });
    }
}