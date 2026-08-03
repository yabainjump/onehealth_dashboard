export interface CeeacCountry {
  readonly code: string;
  readonly name: string;
  readonly center: readonly [latitude: number, longitude: number];
  readonly coordinateSpread: number;
  readonly adminAreas: readonly [string, string, string, string, string];
}

export const CEEAC_COUNTRIES: readonly CeeacCountry[] = [
  {
    code: 'AO',
    name: 'Angola',
    center: [-12.5, 18.5],
    coordinateSpread: 2.1,
    adminAreas: ['Luanda', 'Huambo', 'Huíla', 'Malanje', 'Uíge'],
  },
  {
    code: 'BI',
    name: 'Burundi',
    center: [-3.4, 29.9],
    coordinateSpread: 0.35,
    adminAreas: ['Bujumbura', 'Gitega', 'Ngozi', 'Kirundo', 'Cibitoke'],
  },
  {
    code: 'CM',
    name: 'Cameroun',
    center: [5.7, 12.7],
    coordinateSpread: 1.25,
    adminAreas: ['Centre', 'Extrême-Nord', 'Est', 'Littoral', 'Sud'],
  },
  {
    code: 'CF',
    name: 'République centrafricaine',
    center: [6.6, 20.9],
    coordinateSpread: 1.4,
    adminAreas: ['Bangui', "Ombella-M'Poko", 'Lobaye', 'Nana-Mambéré', 'Haute-Kotto'],
  },
  {
    code: 'TD',
    name: 'Tchad',
    center: [15.4, 18.7],
    coordinateSpread: 2.1,
    adminAreas: ["N'Djamena", 'Lac', 'Logone Oriental', 'Ouaddaï', 'Mayo-Kebbi Est'],
  },
  {
    code: 'CG',
    name: 'Congo',
    center: [-0.7, 15.2],
    coordinateSpread: 1.15,
    adminAreas: ['Brazzaville', 'Pointe-Noire', 'Cuvette', 'Niari', 'Likouala'],
  },
  {
    code: 'CD',
    name: 'République démocratique du Congo',
    center: [-3.2, 23.6],
    coordinateSpread: 2.25,
    adminAreas: ['Kinshasa', 'Nord-Kivu', 'Sud-Kivu', 'Kongo Central', 'Haut-Katanga'],
  },
  {
    code: 'GQ',
    name: 'Guinée équatoriale',
    center: [1.6, 10.4],
    coordinateSpread: 0.45,
    adminAreas: ['Bioko Norte', 'Litoral', 'Centro Sur', 'Kié-Ntem', 'Wele-Nzas'],
  },
  {
    code: 'GA',
    name: 'Gabon',
    center: [-0.8, 11.6],
    coordinateSpread: 0.9,
    adminAreas: ['Estuaire', 'Ogooué-Ivindo', 'Haut-Ogooué', 'Woleu-Ntem', 'Moyen-Ogooué'],
  },
  {
    code: 'RW',
    name: 'Rwanda',
    center: [-1.9, 29.9],
    coordinateSpread: 0.28,
    adminAreas: ['Kigali', 'Province de l’Est', 'Province de l’Ouest', 'Province du Nord', 'Province du Sud'],
  },
  {
    code: 'ST',
    name: 'São Tomé-et-Príncipe',
    center: [0.3, 6.7],
    coordinateSpread: 0.18,
    adminAreas: ['Água Grande', 'Mé-Zóchi', 'Lobata', 'Cantagalo', 'Príncipe'],
  },
] as const;

export const DEMO_REFERENCE_DATE = new Date('2026-08-02T12:00:00.000Z');
