
import { EmployeRepository } from './employe.repository';
import { ChantiersService } from '../chantiers/chantier.service';
import { CreateEmployeDTO, UpdateEmployeDTO } from './employe.dto';

export class EmployeService {

    private repository = new EmployeRepository();
    private chantierService = new ChantiersService();

    async getAll() {
        return this.repository.findAll();
    }

    async getById(id: string) {
        const employe = await this.repository.findById(id);

        if (!employe) {
            throw new Error('Employe introuvable');
        }

        return employe;
    }

    async getBadgeId(uid: string) {
        return this.repository.findBadgeId(uid);
    }

    async create(data: CreateEmployeDTO) {
        await this.chantierService.getById(data.chantierId);

        return this.repository.create(data);
    }

    async update(id: string, data: UpdateEmployeDTO) {
        if (data.chantierId) {
            const chantier = await this.chantierService.getById(data.chantierId);

            if (!chantier) {
                throw new Error('Chantier introuvable');
            }
        }

        return this.repository.update(id, data);
    }

    async delete(id: string) {
        return this.repository.delete(id);
    }
}

