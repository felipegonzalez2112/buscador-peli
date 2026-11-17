/**
 * Selector interactivo de plataformas de streaming en la configuración.
 */

import { POPULAR_SERVICES } from '../services/providers.js';
import { escapeHTML } from '../utils/formatters.js';

let container = null;
let onToggleCallback = null;
let currentServices = [];

/**
 * Renderiza los chips interactivos de selección de plataformas.
 * @param {Array<string>} [services=currentServices]
 */
export function renderServicesSelector(services = currentServices) {
  currentServices = services;
  if (!container) return;

  const selectedSet = new Set(services);

  container.innerHTML = POPULAR_SERVICES.map(service => {
    const isChecked = selectedSet.has(service.id);
    const serviceName = escapeHTML(service.name);

    return `
      <label class="service-chip" title="${serviceName}">
        <input
          type="checkbox"
          name="user-service"
          value="${escapeHTML(service.id)}"
          ${isChecked ? 'checked' : ''}
          aria-label="${serviceName}"
        >
        <span>${serviceName}</span>
      </label>
    `;
  }).join('');
}

/**
 * Inicializa el selector de servicios de streaming.
 * @param {object} options
 * @param {Array<string>} [options.initialServices=[]]
 * @param {(serviceId: string) => void} options.onToggle
 */
export function initServicesSelector({ initialServices = [], onToggle } = {}) {
  container = document.querySelector('#services-selector');
  onToggleCallback = onToggle;
  currentServices = initialServices;

  if (!container) return;

  renderServicesSelector(initialServices);

  container.addEventListener('change', event => {
    const checkbox = event.target.closest('input[name="user-service"]');
    if (!checkbox) return;

    const serviceId = checkbox.value;
    if (typeof onToggleCallback === 'function') {
      onToggleCallback(serviceId);
    }
  });
}
