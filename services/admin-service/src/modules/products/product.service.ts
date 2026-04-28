import { Injectable } from '@nestjs/common';

@Injectable()
export class ProductService {
    async findAll() {
        return [];
    }

    async findOne(id: string) {
        return null;
    }

    async create() {
        return null;
    }

    async update(id: string) {
        return null;
    }

    async remove(id: string) {
        return;
    }

    async approve(id: string) {
        return null;
    }

    async reject(id: string, reason: string) {
        return null;
    }
}
