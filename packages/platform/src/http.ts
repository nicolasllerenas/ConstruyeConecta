import 'reflect-metadata';
import { type INestApplication, Logger, type Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { type Express, type Request, type Response } from 'express';
import helmet from 'helmet';

async function createApp(rootModule: Type<unknown>, server: Express): Promise<INestApplication> {
  const app = await NestFactory.create(rootModule, new ExpressAdapter(server), {
    logger: ['error', 'warn'],
  });
  app.use(helmet());
  server.disable('x-powered-by');
  return app;
}

export function createServerlessHandler(rootModule: Type<unknown>) {
  let ready: Promise<Express> | undefined;
  const start = async () => {
    const server = express();
    const app = await createApp(rootModule, server);
    await app.init();
    return server;
  };
  return async (request: Request, response: Response) => {
    ready ??= start();
    const server = await ready;
    server(request, response);
  };
}

export async function listen(rootModule: Type<unknown>, port: number): Promise<void> {
  const app = await createApp(rootModule, express());
  await app.listen(port);
  new Logger(rootModule.name).log(`listening on ${port}`);
}
