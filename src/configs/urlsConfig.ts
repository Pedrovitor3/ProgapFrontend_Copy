import { domainNameDesv, domainNameProd } from './sistemaConfig';
export const urlsServices = {
  SIGUWS: 'https://siguws.ssp.go.gov.br/',
  LEGADOWS: 'https://legadows.ssp.go.gov.br/',
  SSOWS: 'https://ssows.ssp.go.gov.br/',
  BACKENDWS: 'URLBACKENDPROD',
};
export let ambiente = '';

if (window.location.hostname === domainNameProd) {
  urlsServices.SIGUWS = 'https://siguws.ssp.go.gov.br/';
  urlsServices.LEGADOWS = 'https://legadows.ssp.go.gov.br/';
  urlsServices.SSOWS = 'https://ssows.ssp.go.gov.br/';
  urlsServices.BACKENDWS = 'https://progapws.policiacivil.go.gov.br';
  ambiente = 'PROD';
} else {
  urlsServices.SIGUWS = 'https://siguws-h.ssp.go.gov.br/';
  urlsServices.LEGADOWS = 'https://legadows-h.ssp.go.gov.br/';
  urlsServices.SSOWS = 'https://ssows-h.ssp.go.gov.br/';
  urlsServices.BACKENDWS = 'https://progapws-homo.policiacivil.go.gov.br';
  ambiente = 'HOMO';
  if (window.location.hostname.indexOf(domainNameDesv) > -1) {
    //PARA DESENVOLVIMENTO
    urlsServices.BACKENDWS = 'http://localhost:3000';
    //urlsServices.SSOWS = 'https://ssows-h.ssp.go.gov.br/';
    //urlsServices.BACKENDWS = 'https://progapws-homo.policiacivil.go.gov.br'
    // urlsServices.BACKEND = 'URLBACKENDHOMO'
  }
}
