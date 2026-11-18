/**
 * Diálogo modal para registrar o editar una película en "Ya vi" (calificación y etiquetas).
 * Utiliza la API nativa de formularios (form.elements y FormData) para evitar consultas manuales.
 */

let dialogElement = null;
let formElement = null;
let currentItem = null;
let saveCallback = null;

/**
 * Abre el diálogo para calificar un título.
 * @param {object} item
 * @param {object|null} existingEntry
 * @param {(item: object, rating: number, tags: string[]) => void} onSave
 */
export function openDiaryDialog(item, existingEntry, onSave) {
  if (!dialogElement || !formElement) return;

  currentItem = item;
  saveCallback = onSave;

  const title = item.title || item.name || 'Título sin nombre';
  const titleElement = formElement.querySelector('#diary-form-title');
  const itemNameElement = formElement.querySelector('#diary-item-name');

  if (titleElement) {
    titleElement.textContent = existingEntry ? 'Editar registro' : 'La vi';
  }
  if (itemNameElement) {
    itemNameElement.textContent = title;
  }

  // Asigna el radio de calificación directamente mediante el RadioNodeList nativo
  formElement.elements.rating.value = existingEntry?.rating ? String(existingEntry.rating) : '';

  // Asigna las etiquetas marcadas
  const selectedTags = new Set(existingEntry?.tags || []);
  for (const checkbox of formElement.elements.tag) {
    checkbox.checked = selectedTags.has(checkbox.value);
  }

  dialogElement.showModal();
}

/**
 * Cierra el diálogo modal y limpia el estado.
 */
export function closeDiaryDialog() {
  if (dialogElement?.open) {
    dialogElement.close();
  }
  formElement?.reset();
  currentItem = null;
}

/**
 * Inicializa el diálogo modal y sus manejadores de eventos.
 */
export function initDiaryDialog() {
  dialogElement = document.querySelector('#diary-dialog');
  formElement = dialogElement?.querySelector('#diary-form');

  if (!dialogElement || !formElement) return;

  formElement.addEventListener('submit', event => {
    event.preventDefault();
    if (!currentItem) return;

    // Extracción limpia usando la API nativa FormData
    const formData = new FormData(formElement);
    const rating = Number(formData.get('rating'));
    if (!rating) return;

    const tags = formData.getAll('tag');

    if (typeof saveCallback === 'function') {
      saveCallback(currentItem, rating, tags);
    }

    closeDiaryDialog();
  });

  // Delegación de eventos para cerrar: clic en fondo (backdrop) o botones cancelar / cerrar
  dialogElement.addEventListener('click', event => {
    if (event.target === dialogElement || event.target.closest('#diary-close, #diary-cancel')) {
      closeDiaryDialog();
    }
  });
}
