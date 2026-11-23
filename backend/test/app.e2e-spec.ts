/// <reference types="jest" />
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.JWT_ACCESS_SECRET =
      'very_long_access_secret_key_at_least_32_characters';
    process.env.JWT_REFRESH_SECRET =
      'very_long_refresh_secret_key_at_least_32_characters';
    process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  afterEach(async () => {
    await app.close();
  });
});
