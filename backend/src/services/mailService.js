const nodemailer = require('nodemailer');
const { env } = require('../config/env');

const hasSmtpConfig = () => Boolean(env.smtpHost && env.smtpUser && env.smtpPass);

const isSmtpAuthError = (error) => {
  const message = String(error?.message || '');
  const code = String(error?.code || '');

  return (
    code === 'EAUTH' ||
    /535\s*5\.7\.8/i.test(message) ||
    /username and password not accepted/i.test(message)
  );
};

const createTransport = () => {
  if (!hasSmtpConfig()) {
    return null;
  }

  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });
};

// Un e-mail non envoyé ne doit jamais passer inaperçu : on l'écrit dans les journaux
// du serveur (sans aucun identifiant SMTP).
const logMailFailure = (subject, reason) => {
  // eslint-disable-next-line no-console
  console.error(`[mail] E-mail non envoyé (« ${subject} ») : ${reason}`);
};

const sendMailOrFallback = async (buildMessage, fallbackResult) => {
  const transport = createTransport();

  if (!transport) {
    logMailFailure(buildMessage().subject, 'SMTP non configuré (SMTP_HOST, SMTP_USER et SMTP_PASS requis).');
    return fallbackResult;
  }

  try {
    await transport.sendMail(buildMessage());
    // fallbackResult est étalé EN PREMIER : il porte sent:false et un message d'échec
    // (utilisés seulement si l'envoi échoue plus bas). Un envoi réussi doit toujours
    // écraser ces valeurs avec sent:true — l'ordre inverse (constaté ici) faisait qu'un
    // e-mail bel et bien envoyé remontait quand même comme "non envoyé" à l'appelant.
    return {
      ...fallbackResult,
      sent: true,
      message: 'E-mail envoyé avec succès.',
    };
  } catch (error) {
    if (env.nodeEnv !== 'production' && isSmtpAuthError(error)) {
      logMailFailure(
        buildMessage().subject,
        `identifiants SMTP refusés par le serveur (${error.code || 'EAUTH'}). Avec Gmail : générer un nouveau mot de passe d'application et le mettre dans SMTP_PASS.`
      );
      return fallbackResult;
    }

    throw error;
  }
};

const sendResetPasswordEmail = async ({ to, resetUrl, firstName }) => {
  const transport = createTransport();

  if (!transport) {
    throw new Error('SMTP non configuré. Configure un compte SMTP réel pour envoyer le lien de réinitialisation.');
  }

  try {
    await transport.sendMail({
      from: env.smtpFrom,
      to,
      subject: 'Réinitialisation du mot de passe FamilyBalance',
      text: `Bonjour ${firstName || ''},\n\nPour réinitialiser votre mot de passe, cliquez sur ce lien : ${resetUrl}\n\nCe lien expire dans 1 heure.\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
      html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
        <h2>Réinitialisation du mot de passe FamilyBalance</h2>
        <p>Bonjour ${firstName || ''},</p>
        <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous :</p>
        <p>
          <a href="${resetUrl}" style="background:#0b57d0;color:#fff;padding:12px 18px;text-decoration:none;border-radius:8px;display:inline-block;">
            Réinitialiser mon mot de passe
          </a>
        </p>
        <p>Ce lien expire dans 1 heure.</p>
        <p>Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.</p>
      </div>
    `,
    });
  } catch (error) {
    if (isSmtpAuthError(error)) {
      throw new Error("Impossible d'envoyer l'e-mail de réinitialisation. Vérifie la configuration SMTP.");
    }

    throw new Error("Impossible d'envoyer l'e-mail de réinitialisation. Vérifie la configuration SMTP.");
  }

  return {
    sent: true,
    message: 'E-mail de réinitialisation envoyé.',
    resetUrl,
  };
};

const sendEmailVerificationEmail = async ({ to, verifyUrl, firstName }) => {
  const fallbackResult = {
    sent: false,
    message: 'SMTP non configuré ou invalide. Le lien de vérification a été généré localement.',
    verifyUrl,
    sentResult: {
      sent: false,
      message: 'SMTP non configuré ou invalide. Le lien de vérification a été généré localement.',
      verifyUrl,
    },
  };

  return sendMailOrFallback(
    () => ({
      from: env.smtpFrom,
      to,
      subject: 'Confirmez votre adresse e-mail FamilyBalance',
      text: `Bonjour ${firstName || ''},\n\nBienvenue sur FamilyBalance. Confirmez votre adresse e-mail en cliquant sur ce lien : ${verifyUrl}\n\nCe lien expire dans 24 heures.\n\nSi vous n'etes pas a l'origine de cette inscription, ignorez ce message.`,
      html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
        <h2>Confirmation de votre adresse e-mail</h2>
        <p>Bonjour ${firstName || ''},</p>
        <p>Bienvenue sur FamilyBalance. Cliquez sur le bouton ci-dessous pour activer votre compte :</p>
        <p>
          <a href="${verifyUrl}" style="background:#0b57d0;color:#fff;padding:12px 18px;text-decoration:none;border-radius:8px;display:inline-block;">
            Confirmer mon adresse e-mail
          </a>
        </p>
        <p>Ce lien expire dans 24 heures.</p>
        <p>Si vous n'etes pas a l'origine de cette inscription, ignorez simplement cet e-mail.</p>
      </div>
    `,
    }),
    fallbackResult.sentResult
  );
};

const sendMfaCodeEmail = async ({ to, code, firstName }) => {
  const result = await sendMfaCodeEmailOrFallback({ to, code, firstName });

  // Développement uniquement : sans e-mail, le code est écrit dans la console du serveur
  // pour pouvoir terminer la connexion. Jamais en production.
  if (!result.sent && env.nodeEnv !== 'production') {
    // eslint-disable-next-line no-console
    console.warn(`[mail] [développement] Code MFA pour ${to} : ${code}`);
  }

  return result;
};

const sendMfaCodeEmailOrFallback = async ({ to, code, firstName }) => {
  const fallbackResult = {
    sent: false,
    message: 'SMTP non configuré ou invalide. Le code MFA a été généré localement.',
    code,
    sentResult: {
      sent: false,
      message: 'SMTP non configuré ou invalide. Le code MFA a été généré localement.',
      code,
    },
  };

  return sendMailOrFallback(
    () => ({
      from: env.smtpFrom,
      to,
      subject: 'Votre code MFA FamilyBalance',
      text: `Bonjour ${firstName || ''},\n\nVotre code de sécurité FamilyBalance est : ${code}\n\nCe code expire dans 10 minutes.\n\nSi vous n'êtes pas à l'origine de cette connexion, ignorez cet e-mail.`,
      html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1f2937;">
        <h2>Code MFA FamilyBalance</h2>
        <p>Bonjour ${firstName || ''},</p>
        <p>Voici votre code de vérification à usage unique :</p>
        <p style="font-size: 28px; letter-spacing: 4px; font-weight: 700; color: #0b57d0;">${code}</p>
        <p>Ce code expire dans 10 minutes.</p>
        <p>Si vous n'êtes pas à l'origine de cette connexion, ignorez simplement cet e-mail.</p>
      </div>
    `,
    }),
    fallbackResult.sentResult
  );
};

module.exports = {
  sendResetPasswordEmail,
  sendEmailVerificationEmail,
  sendMfaCodeEmail,
};
