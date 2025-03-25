import { Test, TestingModule } from '@nestjs/testing';

import { PublicController } from './public.controller';

describe('PublicController', () => {
  let publicController: PublicController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [PublicController],
    }).compile();

    publicController = app.get<PublicController>(PublicController);
  });

  describe('ping', () => {
    it('should return pong', () => {
      expect(publicController.ping()).toBe('pong');
    });
  });
});
