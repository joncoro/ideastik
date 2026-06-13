import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function getPilarColor(tipo) {
  const colors = {
    autoridad: 'bg-pillar-autoridad',
    conexion: 'bg-pillar-conexion',
    venta: 'bg-pillar-venta',
    prueba_social: 'bg-pillar-prueba_social',
    educacion: 'bg-pillar-educacion',
  };
  return colors[tipo] || 'bg-gray-400';
}

export function getPilarBorder(tipo) {
  const colors = {
    autoridad: 'border-pillar-autoridad',
    conexion: 'border-pillar-conexion',
    venta: 'border-pillar-venta',
    prueba_social: 'border-pillar-prueba_social',
    educacion: 'border-pillar-educacion',
  };
  return colors[tipo] || 'border-gray-400';
}

export function getPilarText(tipo) {
  const colors = {
    autoridad: 'text-pillar-autoridad',
    conexion: 'text-pillar-conexion',
    venta: 'text-pillar-venta',
    prueba_social: 'text-pillar-prueba_social',
    educacion: 'text-pillar-educacion',
  };
  return colors[tipo] || 'text-gray-600';
}