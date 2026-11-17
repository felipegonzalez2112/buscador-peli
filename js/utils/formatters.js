/**
 * Utilidades de formateo y sanitización para la interfaz.
 */

/**
 * Escapa caracteres especiales de HTML para prevenir inyecciones.
 * @param {string|number} value
 * @returns {string}
 */
export function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

/**
 * Formatea una fecha ISO en formato legible en español (Argentina).
 * @param {string} value
 * @returns {string}
 */
export function formatRatingDate(value) {
  if (!value) return 'Fecha no disponible';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Fecha no disponible'
    : date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
}
