export const GRID_LITERALS = {
  empty: 'Sin resultados',
  emptyTitle: 'Nada que mostrar',
  actions: 'Acciones',
  previousPage: 'Anterior',
  nextPage: 'Siguiente',
  pageOf: 'Página {page} de {pages}',
  filter: 'Filtrar',
  sortColumn: 'Ordenar {column}',
  sortAsc: '{column} ascendente',
  sortDesc: '{column} descendente',
} as const;

export const PASSWORD_FIELD_LITERALS = {
  show: 'Mostrar contraseña',
  hide: 'Ocultar contraseña',
} as const;

export const LOGIN_LITERALS = {
  brand: 'Bonafit',
  title: 'Iniciar sesión',
  slogan: 'Wellness & Longevity',
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
  errorNewPassword: 'La nueva contraseña debe tener al menos 8 caracteres.',
  errorCurrentPassword: 'La contraseña actual no es correcta.',
  errorSave: 'No se ha podido cambiar la contraseña.',
} as const;

export const CONFIRM_LITERALS = {
  confirm: 'Confirmar',
  cancel: 'Cancelar',
} as const;

export const ADMIN_LITERALS = {
  brand: 'Bonafit',
  roleSubtitle: 'Estudio',
  logout: 'Salir',
  menu: 'Menú',
  profileMenu: 'Cuenta',
  settings: 'Ajustes',
  calendar: 'Calendario',
  schedules: 'Horarios',
  clients: 'Clientes',
  services: 'Servicios',
  forms: 'Formularios',
} as const;

export const CLIENT_LITERALS = {
  brand: 'Bonafit',
  roleSubtitle: 'Portal',
  logout: 'Salir',
  menu: 'Menú',
  profileMenu: 'Cuenta',
  settings: 'Ajustes',
  profile: 'Datos personales',
  bonos: 'Bonos',
  catalog: 'Catálogo',
  agenda: 'Inicio',
  forms: 'Formularios',
} as const;
