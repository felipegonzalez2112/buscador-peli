/**
 * Notificaciones efímeras tipo toast en la interfaz.
 */

const feedbackElement = document.querySelector('#action-feedback');
let feedbackTimeout;

/**
 * Muestra un mensaje flotante temporal de confirmación o aviso.
 * @param {string} message
 * @param {number} [duration=4200]
 */
export function showFeedback(message, duration = 4200) {
  if (!feedbackElement) return;

  feedbackElement.textContent = message;
  feedbackElement.hidden = false;

  clearTimeout(feedbackTimeout);
  feedbackTimeout = setTimeout(() => {
    feedbackElement.hidden = true;
  }, duration);
}
