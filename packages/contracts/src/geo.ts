export interface District {
  name: string;
  latitude: number;
  longitude: number;
}

export const LIMA_DISTRICTS: readonly District[] = [
  { name: 'Ate', latitude: -12.0262, longitude: -76.9186 },
  { name: 'Barranco', latitude: -12.1436, longitude: -77.0203 },
  { name: 'Bellavista', latitude: -12.0621, longitude: -77.1283 },
  { name: 'Breña', latitude: -12.0587, longitude: -77.0506 },
  { name: 'Callao', latitude: -12.0566, longitude: -77.1181 },
  { name: 'Carabayllo', latitude: -11.8922, longitude: -77.0269 },
  { name: 'Cercado de Lima', latitude: -12.0464, longitude: -77.0428 },
  { name: 'Chorrillos', latitude: -12.1747, longitude: -77.0244 },
  { name: 'Comas', latitude: -11.9375, longitude: -77.0594 },
  { name: 'El Agustino', latitude: -12.0403, longitude: -76.9994 },
  { name: 'Independencia', latitude: -11.9931, longitude: -77.0544 },
  { name: 'Jesús María', latitude: -12.0772, longitude: -77.0486 },
  { name: 'La Molina', latitude: -12.0868, longitude: -76.9275 },
  { name: 'La Perla', latitude: -12.0694, longitude: -77.1097 },
  { name: 'La Victoria', latitude: -12.0653, longitude: -77.0172 },
  { name: 'Lince', latitude: -12.0861, longitude: -77.0361 },
  { name: 'Los Olivos', latitude: -11.9692, longitude: -77.0708 },
  { name: 'Lurigancho-Chosica', latitude: -11.9361, longitude: -76.6972 },
  { name: 'Lurín', latitude: -12.2744, longitude: -76.8706 },
  { name: 'Magdalena del Mar', latitude: -12.0917, longitude: -77.0689 },
  { name: 'Miraflores', latitude: -12.1211, longitude: -77.0297 },
  { name: 'Pachacámac', latitude: -12.2311, longitude: -76.8606 },
  { name: 'Pueblo Libre', latitude: -12.0756, longitude: -77.0628 },
  { name: 'Puente Piedra', latitude: -11.8667, longitude: -77.0767 },
  { name: 'Rímac', latitude: -12.0289, longitude: -77.0269 },
  { name: 'San Borja', latitude: -12.1078, longitude: -77.0006 },
  { name: 'San Isidro', latitude: -12.0972, longitude: -77.0367 },
  { name: 'San Juan de Lurigancho', latitude: -11.9792, longitude: -77.0006 },
  { name: 'San Juan de Miraflores', latitude: -12.1581, longitude: -76.9711 },
  { name: 'San Luis', latitude: -12.0758, longitude: -76.9958 },
  { name: 'San Martín de Porres', latitude: -12.0283, longitude: -77.0569 },
  { name: 'San Miguel', latitude: -12.0772, longitude: -77.0914 },
  { name: 'Santa Anita', latitude: -12.0433, longitude: -76.9711 },
  { name: 'Santiago de Surco', latitude: -12.1339, longitude: -76.9939 },
  { name: 'Surquillo', latitude: -12.1136, longitude: -77.0167 },
  { name: 'Ventanilla', latitude: -11.8747, longitude: -77.1278 },
  { name: 'Villa El Salvador', latitude: -12.2133, longitude: -76.9369 },
  { name: 'Villa María del Triunfo', latitude: -12.1611, longitude: -76.9389 },
];

export function distanceKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latDelta = radians(to.latitude - from.latitude);
  const lngDelta = radians(to.longitude - from.longitude);
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(lngDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
