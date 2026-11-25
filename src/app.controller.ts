import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';
import {
  ApiAppControllerDocs,
  ApiDatabaseHealthDocs,
  ApiGreetingDocs,
  ApiHealthDocs,
} from './common/swagger/app.swagger.js';

@Controller()
@ApiAppControllerDocs()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiHealthDocs()
  getHealth() {
    return this.appService.getHealth();
  }

  @Get()
  @ApiGreetingDocs()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('debug/db')
  @ApiDatabaseHealthDocs()
  checkDb(): any {
    return this.appService.checkDb();
  }
}
