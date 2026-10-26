import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { vi } from 'vitest';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;
  let app: TestingModule;
  let query: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    query = vi.fn();
    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, { provide: DataSource, useValue: { query } }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  afterEach(async () => {
    await app?.close();
  });

  describe('getHello', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
      expect(query).not.toHaveBeenCalled();
    });
  });

  describe('checkDb', () => {
    it('should execute the database health query and return its result', async () => {
      const result = [{ result: 1 }];
      query.mockResolvedValueOnce(result);

      await expect(appController.checkDb()).resolves.toEqual(result);
      expect(query).toHaveBeenCalledExactlyOnceWith('SELECT 1 as result');
    });

    it('should propagate database errors', async () => {
      const error = new Error('Database unavailable');
      query.mockRejectedValueOnce(error);

      await expect(appController.checkDb()).rejects.toBe(error);
      expect(query).toHaveBeenCalledExactlyOnceWith('SELECT 1 as result');
    });
  });
});
