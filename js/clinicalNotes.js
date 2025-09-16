(function () {
  const defaults = window.THCPortalDefaults || {};
  const API_ENDPOINT = defaults.apiEndpoint;
  const API_KEY = defaults.apiKey;
  const PATIENT_ID = defaults.patientId != null ? String(defaults.patientId) : null;
  const APPOINTMENT_ID = defaults.appointmentId != null ? String(defaults.appointmentId) : null;
  const AUTHOR_ID = defaults.loggednInUserId != null
    ? String(defaults.loggednInUserId)
    : (defaults.doctorId != null ? String(defaults.doctorId) : null);

  const mutation = `mutation createClinicalNote($payload: ClinicalNoteCreateInput = null) {
  createClinicalNote(payload: $payload) {
    id
    content
    title
    appointment_id
    author_id
    patient_id
    date_created
  }
}`;

  const wrap = document.querySelector('[data-note-new]');
  if (!wrap) return;

  const toolbar = wrap.querySelector('[data-note-toolbar]');
  const surface = wrap.querySelector('[data-note-surface]');
  const status = wrap.querySelector('[data-note-status]');

  if (!surface) return;

  let savedRange = null;

  function setStatus(text) {
    if (!status) return;
    if (!text) {
      status.hidden = true;
      return;
    }
    status.hidden = false;
    status.textContent = text;
  }

  function updateEmptyState() {
    const text = surface.textContent.replace(/\u00a0/g, ' ').trim();
    surface.setAttribute('data-empty', text ? 'false' : 'true');
  }

  function saveSelection() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!surface.contains(range.commonAncestorContainer)) return;
    savedRange = range.cloneRange();
  }

  function restoreSelection() {
    if (!savedRange) return;
    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(savedRange);
  }

  function bindToolbar() {
    if (!toolbar) return;
    toolbar.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('mousedown', (evt) => {
        evt.preventDefault();
        surface.focus({ preventScroll: true });
        restoreSelection();
        const action = btn.dataset.action;
        if (!action) return;
        if (action === 'link') {
          let url = window.prompt('Enter URL');
          if (!url) return;
          if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
          document.execCommand('createLink', false, url);
          return;
        }
        if (action === 'bullet') {
          document.execCommand('insertUnorderedList');
          return;
        }
        document.execCommand(action);
        saveSelection();
      });
    });
  }

  bindToolbar();
  updateEmptyState();

  let inFlight = false;
  let pending = false;

  function cleanHtml(html) {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    temp.querySelectorAll('script,style').forEach((node) => node.remove());
    return temp.innerHTML.trim();
  }

  function htmlToPlain(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html || '';
    return temp.textContent.replace(/\u00a0/g, ' ').trim();
  }

  function extractTitle(html) {
    const text = htmlToPlain(html);
    if (!text) return 'Clinical note';
    return text.split(/\n|\r/).map((part) => part.trim()).filter(Boolean)[0]?.slice(0, 120) || 'Clinical note';
  }

  async function sendMutation(payload) {
    if (!API_ENDPOINT || !API_KEY) {
      throw new Error('API endpoint or key not configured.');
    }
    const res = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': API_KEY,
      },
      body: JSON.stringify({ query: mutation, variables: { payload } }),
    });
    const json = await res.json();
    if (json.errors) {
      const message = json.errors[0] && json.errors[0].message ? json.errors[0].message : 'GraphQL error';
      const err = new Error(message);
      err.details = json.errors;
      throw err;
    }
    return json.data;
  }

  async function createNote() {
    if (inFlight) {
      pending = true;
      return;
    }

    const cleaned = cleanHtml(surface.innerHTML);
    if (!htmlToPlain(cleaned)) {
      setStatus('');
      return;
    }

    inFlight = true;
    pending = false;
    setStatus('Saving…');

   try {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const payload = {
        content: cleaned,
        title: extractTitle(cleaned),
        appointment_id: APPOINTMENT_ID,
        patient_id: PATIENT_ID,
        author_id: AUTHOR_ID,
        date_created: nowSeconds,
      };
      await sendMutation(payload);
      surface.innerHTML = '';
      updateEmptyState();
      setStatus('Saved');
      window.setTimeout(() => setStatus(''), 2000);
    } catch (err) {
      console.error('Failed to create clinical note', err);
      setStatus('Failed to save');
    } finally {
      inFlight = false;
      if (pending) {
        pending = false;
        createNote();
      }
    }
  }

  surface.addEventListener('input', () => {
    updateEmptyState();
    if (!htmlToPlain(surface.innerHTML)) {
      setStatus('');
    }
    saveSelection();
  });

  surface.addEventListener('blur', () => {
    updateEmptyState();
    createNote();
  });

  surface.addEventListener('mouseup', saveSelection);
  surface.addEventListener('keyup', saveSelection);
  document.addEventListener('selectionchange', saveSelection);
})();
