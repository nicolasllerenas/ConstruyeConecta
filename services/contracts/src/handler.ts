import 'reflect-metadata';
import { createServerlessHandler } from '@cc/platform';
import { AppModule } from './app.module.js';

export default createServerlessHandler(AppModule);
