import { Test, TestingModule } from '@nestjs/testing';
import { CronController } from './cron.controller';
import { CronService } from './cron.service';

describe('CronController', () => {
  let cronController: CronController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [CronController],
      providers: [CronService],
    }).compile();

    cronController = app.get<CronController>(CronController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(cronController.getHello()).toBe('Hello World!');
    });
  });
});
