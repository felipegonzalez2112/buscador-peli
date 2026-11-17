/**
 * Utilidades para portapapeles y ayuda al usuario al abrir proveedores de streaming.
 */

/**
 * Intento de copia tradicional para navegadores o contextos restringidos.
 * @param {string} text
 * @returns {boolean}
 */
export function legacyCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

/**
 * Copia el título de una película al portapapeles y notifica al usuario con el feedback indicado.
 * @param {string} title
 * @param {string} providerName
 * @param {(message: string) => void} notify
 */
export async function copyMovieTitle(title, providerName, notify) {
  const fallbackSuccess = legacyCopy(title);

  if (!navigator.clipboard?.writeText) {
    notify(fallbackSuccess
      ? `Copiamos “${title}”. Pegalo en ${providerName}.`
      : `Abrí ${providerName} y buscá “${title}”.`);
    return;
  }

  try {
    await navigator.clipboard.writeText(title);
    notify(`Copiamos “${title}”. Pegalo en ${providerName}.`);
  } catch {
    notify(fallbackSuccess
      ? `Copiamos “${title}”. Pegalo en ${providerName}.`
      : `Abrí ${providerName} y buscá “${title}”.`);
  }
}
