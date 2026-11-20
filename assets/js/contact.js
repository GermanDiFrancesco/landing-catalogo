/**
 * contact.js - Lógica del formulario de contacto de Tecnografic S.A.
 * Envía los datos vía POST /api/contact y muestra feedback claro al usuario.
 */

(function () {
  function showFeedback(feedbackEl, type, message) {
    if (!feedbackEl) return;

    const isSuccess = type === 'success';
    feedbackEl.className = isSuccess
      ? 'rounded-xl px-4 py-3 text-sm font-medium border bg-green-50 border-green-200 text-green-800 flex items-start gap-2.5'
      : 'rounded-xl px-4 py-3 text-sm font-medium border bg-red-50 border-red-200 text-red-700 flex items-start gap-2.5';

    const iconClass = isSuccess
      ? 'fa-solid fa-circle-check text-green-600 mt-0.5 shrink-0'
      : 'fa-solid fa-circle-exclamation text-red-600 mt-0.5 shrink-0';

    feedbackEl.innerHTML = '';
    const icon = document.createElement('i');
    icon.className = iconClass;

    const span = document.createElement('span');
    span.textContent = message;

    feedbackEl.appendChild(icon);
    feedbackEl.appendChild(span);
    feedbackEl.classList.remove('hidden');
  }

  function hideFeedback(feedbackEl) {
    if (!feedbackEl) return;
    feedbackEl.classList.add('hidden');
    feedbackEl.innerHTML = '';
  }

  function setSubmittingState(submitBtn, isSubmitting) {
    if (!submitBtn) return;
    submitBtn.disabled = isSubmitting;
    if (isSubmitting) {
      submitBtn.dataset.originalHtml = submitBtn.innerHTML;
      submitBtn.classList.add('opacity-70', 'cursor-not-allowed');
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Enviando...';
    } else {
      submitBtn.classList.remove('opacity-70', 'cursor-not-allowed');
      if (submitBtn.dataset.originalHtml) {
        submitBtn.innerHTML = submitBtn.dataset.originalHtml;
      }
    }
  }

  function initContactPage() {
    const form = document.getElementById('contact-form');
    if (!form || form.dataset.initialized === 'true') return;
    form.dataset.initialized = 'true';

    const submitBtn = document.getElementById('contact-submit-btn');
    const feedbackEl = document.getElementById('contact-feedback');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideFeedback(feedbackEl);

      const formData = new FormData(form);
      const payload = {
        nombre: String(formData.get('nombre') || '').trim(),
        apellido: String(formData.get('apellido') || '').trim(),
        email: String(formData.get('email') || '').trim(),
        telefono: String(formData.get('telefono') || '').trim(),
        mensaje: String(formData.get('mensaje') || '').trim(),
        website: String(formData.get('website') || '').trim()
      };

      if (!payload.nombre || !payload.apellido || !payload.email || !payload.mensaje) {
        showFeedback(feedbackEl, 'error', 'Por favor, completá todos los campos obligatorios.');
        return;
      }

      setSubmittingState(submitBtn, true);

      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        let data = {};
        try {
          data = await response.json();
        } catch {
          data = {};
        }

        if (!response.ok || !data.ok) {
          throw new Error(
            data.error ||
              'No pudimos enviar tu mensaje en este momento. Por favor, intentá nuevamente.'
          );
        }

        form.reset();
        showFeedback(
          feedbackEl,
          'success',
          data.message || '¡Gracias! Tu mensaje fue enviado correctamente.'
        );
      } catch (err) {
        console.error('Error al enviar formulario de contacto:', err);
        showFeedback(
          feedbackEl,
          'error',
          err.message ||
            'Ocurrió un error de conexión. Por favor, intentá nuevamente o escribinos a info@tecnograficsa.com.ar.'
        );
      } finally {
        setSubmittingState(submitBtn, false);
      }
    });
  }

  window.initContactPage = initContactPage;
})();
