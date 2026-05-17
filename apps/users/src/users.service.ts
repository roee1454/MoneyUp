import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(data: { username: string; email: string }): Promise<User> {
    const user = this.userRepository.create(data);
    return this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findOne(id: string): Promise<User | null> {
    return this.userRepository.findOneBy({ id });
  }

  async update(
    id: string,
    data: Partial<{ username: string; email: string }>,
  ): Promise<User> {
    await this.userRepository.update(id, data);
    const updated = await this.findOne(id);
    if (!updated) {
      throw new NotFoundException('User not found');
    }
    return updated;
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    await this.userRepository.delete(id);
    return { deleted: true };
  }
}
