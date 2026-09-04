import { ServiceCategory } from '../../models/service.dto';

export const SERVICES_LITERALS = {
  title: 'Servicios y bonos',
  subtitle: 'Catálogo comercial del estudio',
  newService: 'Nuevo servicio',
  newBono: 'Nuevo bono',
  edit: 'Editar',
  delete: 'Eliminar',
  save: 'Guardar',
  cancel: 'Cancelar',
  emptyServices: 'Sin servicios',
  emptyBonos: 'Este servicio no tiene bonos',
  name: 'Nombre',
  category: 'Categoría',
  allowsSingleSession: 'Permite sesión suelta',
  singleSessionPrice: 'Precio sesión suelta',
  sessionCount: 'Sesiones',
  price: 'Precio',
  description: 'Descripción',
  bonosTitle: 'Bonos del servicio',
  serviceEditor: 'Servicio',
  bonoEditor: 'Bono',
  yes: 'Sí',
  no: 'No',
  errorRequired: 'Completa los campos obligatorios.',
  errorSave: 'No se ha podido guardar.',
} as const;

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  'entrenamiento-personal': 'Entrenamiento personal',
  hipopresivos: 'Hipopresivos',
  masaje: 'Masaje',
};
