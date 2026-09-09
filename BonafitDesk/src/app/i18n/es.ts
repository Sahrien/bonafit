export const LOGIN_LITERALS = {
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

export const ADMIN_LITERALS = {
  homeTitle: 'Panel de control',
  homeSubtitle: 'Elige un módulo para continuar',
  logout: 'Salir',
  back: 'Volver al menú',
  calendarTitle: 'Calendario',
  calendarDescription: 'Citas, entrenadores y horarios',
  clientsTitle: 'Clientes',
  clientsDescription: 'Fichas y seguimiento uno a uno',
  servicesTitle: 'Servicios y bonos',
  servicesDescription: 'Catálogo comercial del estudio',
  formsTitle: 'Formularios y encuestas',
  formsDescription: 'Preguntas para clientes y sus respuestas',
} as const;

export const CLIENT_LITERALS = {
  brand: 'Bonafit',
  logout: 'Salir',
  profile: 'Datos personales',
  bonos: 'Bonos contratados',
  catalog: 'Catálogo',
  agenda: 'Agenda',
  forms: 'Formularios',
} as const;
