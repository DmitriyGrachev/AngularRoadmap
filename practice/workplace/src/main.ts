import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { App, routes } from './app/app';
bootstrapApplication(App, { providers: [provideRouter(routes)] }).catch(console.error);
