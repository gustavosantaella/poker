import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { PricingComponent } from './pages/pricing/pricing.component';
import { PrivacyComponent } from './pages/privacy/privacy.component';
import { ContactComponent } from './pages/contact/contact.component';
import { DeleteDataComponent } from './pages/delete-data/delete-data.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: HomeComponent,
    title: 'PokerPros Management — Mesas cash, torneos y clubs de póker',
  },
  {
    path: 'planes',
    component: PricingComponent,
    title: 'Planes y precios | PokerPros Management',
  },
  {
    path: 'politicas-de-privacidad',
    component: PrivacyComponent,
    title: 'Políticas y privacidad | PokerPros Management',
  },
  {
    path: 'contacto',
    component: ContactComponent,
    title: 'Contáctanos | PokerPros Management',
  },
  {
    path: 'eliminacion-de-datos',
    component: DeleteDataComponent,
    title: 'Eliminación de cuenta y datos | PokerPros Management',
  },
  { path: '**', redirectTo: '' },
];


