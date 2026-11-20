import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';
import {
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { z } from 'zod';
import { apiErrorResponseSchema } from './common/filter/errors/api-error.schema.js';

@Controller()
@ApiTags('App')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get the API greeting' })
  @ApiProduces('text/html')
  @ApiOkResponse({ type: String, example: 'Hello World!' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('debug/db')
  @ApiOperation({ summary: 'Check the database connection' })
  @ApiOkResponse({
    standardSchema: z.array(z.object({ result: z.number().int() })),
    example: [{ result: 1 }],
  })
  @ApiInternalServerErrorResponse({
    description: 'INTERNAL_ERROR',
    standardSchema: apiErrorResponseSchema,
  })
  checkDb(): any {
    return this.appService.checkDb();
  }
}
