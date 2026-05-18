import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(data: {
    username: string;
    email: string;
    lockProfile?: boolean;
    unlockKey?: string;
  }): Promise<User> {
    const isLocked = !!data.lockProfile;
    const salt = isLocked ? randomBytes(16).toString('hex') : null;
    const hash = isLocked && data.unlockKey
      ? scryptSync(data.unlockKey, salt!, 64).toString('hex')
      : null;

    const user = this.userRepository.create({
      username: data.username,
      email: data.email,
      isLocked,
      unlockKeySalt: salt,
      unlockKeyHash: hash,
    });
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

  async deleteWithConfirmation(
    id: string,
    confirmationEmail: string,
  ): Promise<{ deleted: boolean }> {
    const user = await this.findOne(id);
    if (!user) throw new NotFoundException('User not found');
    if (user.email !== confirmationEmail) {
      throw new Error('Confirmation text does not match profile email');
    }
    await this.userRepository.delete(id);
    return { deleted: true };
  }

  async verifyUnlockKey(id: string, unlockKey: string): Promise<{ valid: boolean }> {
    const user = await this.findOne(id);
    if (!user || !user.isLocked || !user.unlockKeyHash || !user.unlockKeySalt) {
      return { valid: false };
    }

    const derived = scryptSync(unlockKey, user.unlockKeySalt, 64).toString('hex');
    const left = Buffer.from(user.unlockKeyHash, 'hex');
    const right = Buffer.from(derived, 'hex');
    if (left.length !== right.length) return { valid: false };
    return { valid: timingSafeEqual(left, right) };
  }
}
