export interface BookingSettingsDto {
  id: string;
  nextDayCutoffTime: string;
  defaultLocation: string;
}

export type BookingSettingsWriteDto = Omit<BookingSettingsDto, 'id'>;
