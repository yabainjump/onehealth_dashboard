import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * PrimeNG design tokens aligned with the existing One Health visual language.
 * Domain colours (human, animal and environment) remain application tokens;
 * PrimeNG's primary palette is reserved for navigation and actions.
 */
const OneHealthPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#f0f6ff',
      100: '#dce9fb',
      200: '#bdd5f5',
      300: '#91b9eb',
      400: '#5f95dc',
      500: '#3475c5',
      600: '#1c5ead',
      700: '#0f4b95',
      800: '#0b3d7b',
      900: '#082f62',
      950: '#061f42',
    },
    focusRing: {
      width: '3px',
      style: 'solid',
      color: 'rgba(28, 94, 173, 0.28)',
      offset: '2px',
    },
    colorScheme: {
      light: {
        surface: {
          0: '#ffffff',
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
    },
  },
});

export default OneHealthPreset;
