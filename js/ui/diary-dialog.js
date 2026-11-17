/**
 * Diálogo modal para registrar o editar una película en "Ya vi" (calificación y etiquetas).
 */

let dialogElement = null;
let formElement = null;
let titleElement = null;
let itemNameElement = null;
let currentItem = null;
let saveCallback = null;

/**
 * Abre el diálogo para calificar un título.
 * @param {object} item
 * @param {object|null} existingEntry
 * @param {(item: object, rating: number, tags: string[]) => void} onSave
 */
export function openDiaryDialog(item, existingEntry, onSave) {
  if (!dialogElement) return;

  currentItem = item;
  saveCallback = onSave;

  const title = item.title || item.name || 'Título sin nombre';
  if (titleElement) {
    titleElement.textContent = existingEntry ? 'Editar registro' : 'La vi';
  }
  if (itemNameElement) {
    itemNameElement.textContent = title;
  }

  formElement.querySelectorAll('[name="rating"]').forEach(radio => {
    radio.checked = String(existingEntry?.rating || '') === radio.value;
  });

  formElement.querySelectorAll('[name="tag"]').forEach(box => {
    box.checked = Boolean(existingEntry?.tags?.includes(box.value));
  });

  dialogElement.showModal();
}

/**
 * Cierra el diálogo modal.
 */
export function closeDiaryDialog() {
  if (dialogElement && dialogElement.open) {
    dialogElement.close();
  }
  currentItem = null;
}

/**
 * Inicializa el diálogo modal y sus manejadores de eventos.
 */
export function initDiaryDialog() {
  dialogElement = document.querySelector('#diary-dialog');
  formElement = document.querySelector('#diary-form');
  titleElement = document.querySelector('#diary-form-title');
  itemNameElement = document.querySelector('#diary-item-name');

  if (!dialogElement || !formElement) return;

  formElement.addEventListener('submit', event => {
    event.preventDefault();
    if (!currentItem) return;

    const ratingInput = formElement.querySelector('[name="rating"]:checked');
    const rating = Number(ratingInput?.value);
    if (!rating) return;

    const tags = [...formElement.querySelectorAll('[name="tag"]:checked')].map(box => box.value);

    if (typeof saveCallback === 'function') {
      saveCallback(currentItem, rating, tags);
    }

    closeDiaryDialog();
  });

  document.querySelectorAll('#diary-close, #diary-cancel').forEach(button => {
    button.addEventListener('click', closeDiaryDialog);
  });

  dialogElement.addEventListener('click', event => {
    if (event.target === dialogElement) {
      closeDiaryDialog();
    }
  });
}
