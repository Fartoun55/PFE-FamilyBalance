// Vérifie la configuration SMTP du fichier .env (sans afficher aucun identifiant).
//   npm run check:smtp                   -> connexion + authentification uniquement
//   npm run check:smtp -- vous@exemple.com -> envoie en plus un e-mail de test
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const nodemailer = require('nodemailer');

const mask = (email) => String(email || '').replace(/^(.).*(@.*)$/, '$1***$2');

const main = async () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  const missing = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'].filter((key) => !process.env[key]);
  if (missing.length) {
    console.error(`Variables manquantes dans .env : ${missing.join(', ')}`);
    process.exit(1);
  }

  console.log(`Serveur : ${host}:${port} — compte : ${mask(user)}`);
  const transport = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });

  try {
    await transport.verify();
    console.log('OK : connexion et authentification SMTP acceptées.');
  } catch (error) {
    console.error(`ÉCHEC : ${error.code || ''} ${String(error.response || error.message).split('\n')[0]}`);
    if (error.code === 'EAUTH' && /gmail/i.test(host)) {
      console.error(
        'Gmail refuse les identifiants. Créez un mot de passe d\'application sur ' +
          'https://myaccount.google.com/apppasswords (validation en deux étapes Google requise), ' +
          'copiez-le dans SMTP_PASS (16 lettres, sans espaces) puis redémarrez le backend.'
      );
    }
    process.exit(1);
  }

  const to = process.argv[2];
  if (to) {
    await transport.sendMail({
      from: process.env.SMTP_FROM || user,
      to,
      subject: 'Test SMTP FamilyBalance',
      text: 'Cet e-mail confirme que l\'envoi des e-mails FamilyBalance fonctionne.',
    });
    console.log(`OK : e-mail de test envoyé à ${mask(to)}.`);
  }
};

main();
