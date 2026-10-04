const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/;

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');

const validatePassword = (password) => {
  if (!strongPasswordRegex.test(password)) {
    return 'Le mot de passe doit contenir au moins 10 caractères, une majuscule, une minuscule et un chiffre.';
  }

  return null;
};

const validateRegisterInput = (payload = {}) => {
  const errors = [];
  const role = normalizeString(payload.role || 'parent').toLowerCase();
  const email = normalizeString(payload.email).toLowerCase();
  const password = normalizeString(payload.password);
  const confirmPassword = normalizeString(payload.confirmPassword);
  const firstName = normalizeString(payload.firstName);
  const lastName = normalizeString(payload.lastName);
  const phone = normalizeString(payload.phone);
  const adminRegistrationKey = normalizeString(
    payload.adminRegistrationKey || payload.adminRegistrarionKey
  );

  if (!firstName) errors.push('Le prénom est obligatoire.');
  if (!lastName) errors.push('Le nom est obligatoire.');
  if (!emailRegex.test(email)) errors.push('Adresse email invalide.');
  if (!password) errors.push('Le mot de passe est obligatoire.');
  else {
    const passwordError = validatePassword(password);
    if (passwordError) errors.push(passwordError);
  }

  if (!confirmPassword) {
    errors.push('La confirmation du mot de passe est obligatoire.');
  } else if (confirmPassword !== password) {
    errors.push('La confirmation du mot de passe ne correspond pas.');
  }

  if (!['parent', 'adolescent', 'specialist', 'admin'].includes(role)) {
    errors.push('Le rôle doit être parent, adolescent, specialist ou admin.');
  }

  if (role === 'admin' && !adminRegistrationKey) {
    errors.push("La clé d'inscription admin est obligatoire.");
  }

  if (role === 'specialist') {
    const specialistProfile = payload.specialistProfile || {};
    if (!normalizeString(specialistProfile.specialization)) {
      errors.push('La spécialisation du spécialiste est obligatoire.');
    }
    if (!normalizeString(specialistProfile.licenseNumber)) {
      errors.push('Le numéro de licence du spécialiste est obligatoire.');
    }
  }

  if (role === 'adolescent') {
    const adolescentProfile = payload.adolescentProfile || {};
    if (!normalizeString(adolescentProfile.parentId)) {
      errors.push('Le parent de rattachement est obligatoire pour un compte adolescent.');
    }
    if (!normalizeString(adolescentProfile.birthDate)) {
      errors.push('La date de naissance est obligatoire pour un compte adolescent.');
    }
    if (adolescentProfile.consentGiven !== true) {
      errors.push('Le consentement doit être explicite pour un compte adolescent.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      phone: phone || undefined,
      role,
      adminRegistrationKey: adminRegistrationKey || undefined,
      specialistProfile: payload.specialistProfile || undefined,
      adolescentProfile: payload.adolescentProfile || undefined,
    },
  };
};

const validateLoginInput = (payload = {}) => {
  const errors = [];
  const email = normalizeString(payload.email).toLowerCase();
  const password = normalizeString(payload.password);

  if (!emailRegex.test(email)) errors.push('Adresse email invalide.');
  if (!password) errors.push('Le mot de passe est obligatoire.');

  return {
    isValid: errors.length === 0,
    errors,
    value: { email, password },
  };
};

const validateChangePasswordInput = (payload = {}) => {
  const errors = [];
  const currentPassword = normalizeString(payload.currentPassword);
  const newPassword = normalizeString(payload.newPassword);

  if (!currentPassword) errors.push('Le mot de passe actuel est obligatoire.');
  if (!newPassword) errors.push('Le nouveau mot de passe est obligatoire.');
  else {
    const passwordError = validatePassword(newPassword);
    if (passwordError) errors.push(passwordError);
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: { currentPassword, newPassword },
  };
};

const validatePasswordResetRequestInput = (payload = {}) => {
  const errors = [];
  const email = normalizeString(payload.email).toLowerCase();

  if (!emailRegex.test(email)) errors.push('Adresse email invalide.');

  return {
    isValid: errors.length === 0,
    errors,
    value: { email },
  };
};

const validatePasswordResetConfirmInput = (payload = {}) => {
  const errors = [];
  const token = normalizeString(payload.token);
  const newPassword = normalizeString(payload.newPassword);

  if (!token) errors.push('Le token de réinitialisation est obligatoire.');
  if (!newPassword) errors.push('Le nouveau mot de passe est obligatoire.');
  else {
    const passwordError = validatePassword(newPassword);
    if (passwordError) errors.push(passwordError);
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: { token, newPassword },
  };
};

const validateEmailVerificationInput = (payload = {}) => {
  const errors = [];
  const token = normalizeString(payload.token);

  if (!token) errors.push('Le token de confirmation est obligatoire.');

  return {
    isValid: errors.length === 0,
    errors,
    value: { token },
  };
};

const validateMfaVerificationInput = (payload = {}) => {
  const errors = [];
  const token = normalizeString(payload.token);
  const code = normalizeString(payload.code);

  if (!token) errors.push('Le token MFA est obligatoire.');
  if (!code) errors.push('Le code MFA est obligatoire.');

  return {
    isValid: errors.length === 0,
    errors,
    value: { token, code },
  };
};

const validateUpdateProfileInput = (payload = {}) => {
  const errors = [];

  const firstName = payload.firstName !== undefined ? normalizeString(payload.firstName) : undefined;
  const lastName = payload.lastName !== undefined ? normalizeString(payload.lastName) : undefined;
  const phone = payload.phone !== undefined ? normalizeString(payload.phone) : undefined;

  if (firstName !== undefined && !firstName) errors.push('Le prénom ne peut pas être vide.');
  if (lastName !== undefined && !lastName) errors.push('Le nom ne peut pas être vide.');

  const value = {
    firstName,
    lastName,
    phone,
  };

  if (payload.specialistProfile !== undefined) {
    const specialistProfile = payload.specialistProfile || {};
    value.specialistProfile = {
      specialization:
        specialistProfile.specialization !== undefined
          ? normalizeString(specialistProfile.specialization)
          : undefined,
      licenseNumber:
        specialistProfile.licenseNumber !== undefined
          ? normalizeString(specialistProfile.licenseNumber)
          : undefined,
      city:
        specialistProfile.city !== undefined ? normalizeString(specialistProfile.city) : undefined,
      tariff:
        specialistProfile.tariff !== undefined && specialistProfile.tariff !== ''
          ? Number(specialistProfile.tariff)
          : undefined,
        languages: Array.isArray(specialistProfile.languages)
          ? specialistProfile.languages.map((item) => normalizeString(item)).filter(Boolean)
          : undefined,
    };

    if (value.specialistProfile.tariff !== undefined && Number.isNaN(value.specialistProfile.tariff)) {
      errors.push('Le tarif doit être un nombre valide.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    value,
  };
};

module.exports = {
  validateRegisterInput,
  validateLoginInput,
  validateChangePasswordInput,
  validatePasswordResetRequestInput,
  validatePasswordResetConfirmInput,
  validateEmailVerificationInput,
  validateMfaVerificationInput,
  validateUpdateProfileInput,
  validatePassword,
};
