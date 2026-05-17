import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UsersService } from './users.service';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @MessagePattern('user_create')
  create(@Payload() data: { username: string; email: string }) {
    return this.usersService.create(data);
  }

  @MessagePattern('user_find_all')
  findAll() {
    return this.usersService.findAll();
  }

  @MessagePattern('user_find_one')
  findOne(@Payload() id: string) {
    return this.usersService.findOne(id);
  }

  @MessagePattern('user_update')
  update(
    @Payload() payload: { id: string; data: { username?: string; email?: string } },
  ) {
    return this.usersService.update(payload.id, payload.data);
  }

  @MessagePattern('user_delete')
  remove(@Payload() id: string) {
    return this.usersService.remove(id);
  }

  @MessagePattern('ping')
  ping() {
    return 'pong';
  }
}
