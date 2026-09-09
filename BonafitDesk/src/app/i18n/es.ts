export const LOGIN_LITERALS = {
  brand: 'Bonafit',
  title: 'Iniciar sesión',
  subtitle: 'Accede con tu email y contraseña',
  email: 'Email',
  password: 'Contraseña',
  submit: 'Entrar',
  invalidCredentials: 'Email o contraseña incorrectos.',
  errorRequired: 'Completa email y contraseña.',
} as const;

export const CHANGE_PASSWORD_LITERALS = {
  title: 'Cambiar contraseña',
  subtitle: 'Elige una contraseña nueva para continuar',
  currentPassword: 'Contraseña actual',
  newPassword: 'Nueva contraseña',
  submit: 'Guardar',
  errorRequired: 'Completa ambos campos. La nueva contraseña debe tener al menos 8 caracteres.',
  errorSave: 'No se ha podido cambiar la contraseña.',
} as const;

export const CONFIRM_LITERALS = {
  confirm: 'Confirmar',
  cancel: 'Cancelar',
} as const;

export const ADMIN_LITERALS = {
  brand: 'Bonafit',
  logout: 'Salir',
  menu: 'Menú',
  profileMenu: 'Cuenta',
  settings: 'Ajustes',
  calendar: 'Calendario',
  clients: 'Clientes',
  services: 'Servicios',
  forms: 'Formularios',
} as const;

export const CLIENT_LITERALS = {
  brand: 'Bonafit',
  logout: 'Salir',
  menu: 'Menú',
  profileMenu: 'Cuenta',
  settings: 'Ajustes',
  profile: 'Datos personales',
  bonos: 'Bonos',
  catalog: 'Catálogo',
  agenda: 'Agenda',
  forms: 'Formularios',
} as const;
