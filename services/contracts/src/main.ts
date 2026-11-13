import 'reflect-metadata';
import { listen } from '@cc/platform';
import { AppModule } from './app.module.js';

await listen(AppModule, Number(process.env.PORT));
