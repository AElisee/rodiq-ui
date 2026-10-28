// Point d'entrée pour Passenger (cPanel « Setup Node.js App ») : sert le build Next de production.
// Voir ../GUIDE-DEPLOIEMENT-CPANEL.md
// En CommonJS (require) : Passenger charge le fichier de démarrage avec require(), sans passer par le build Next
/* eslint-disable @typescript-eslint/no-require-imports */
const { createServer } = require("node:http");
const next = require("next");

const app = next({ dev: false });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(process.env.PORT || 3000);
});
