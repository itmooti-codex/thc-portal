(function () {
  const defaults = window.THCPortalDefaults || {};
  const API_ENDPOINT = defaults.apiEndpoint;
  const API_KEY = defaults.apiKey;
  const PATIENT_ID = defaults.patientId != null ? String(defaults.patientId) : null;
  const APPOINTMENT_ID = defaults.appointmentId != null ? String(defaults.appointmentId) : null;
  const AUTHOR_ID = defaults.loggednInUserId != null
    ? String(defaults.loggednInUserId)
    : (defaults.doctorId != null ? String(defaults.doctorId) : null);

  const CREATE_MUTATION = `mutation createClinicalNote($payload: ClinicalNoteCreateInput = null) {
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

  const UPDATE_MUTATION = `mutation updateClinicalNote(
  $id: ThcClinicalNoteID
  $payload: ClinicalNoteUpdateInput = null
) {
  updateClinicalNote(
    query: [{ where: { id: $id } }]
    payload: $payload
  ) {
    content
  }
}`;

  const editorHost = document.getElementById('clinical-note-editor');
  const statusEl = document.querySelector('[data-note-status]');
  if (!editorHost) return;

  function setStatus(text) {
    if (!statusEl) return;
    if (!text) {
      statusEl.hidden = true;
      return;
    }
    statusEl.hidden = false;
    statusEl.textContent = text;
  }

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

  function normalizeScriptValue(value) {
    return (value == null ? '' : String(value))
      .replace(/\u2014/g, '')
      .trim();
  }

  function isPlaceholderToken(value) {
    if (!value) return false;
    return /\[[^\]]+\]/.test(value);
  }

  function isBlankScriptValue(value) {
    let normalized = normalizeScriptValue(value);
    if (!normalized) return true;
    const lower = normalized.toLowerCase();
    if (lower === 'null' || lower === 'undefined' || lower === 'na' || lower === 'n/a' || lower === 'none') {
      return true;
    }
    normalized = normalized.replace(/\bout of\b/gi, ' ');
    normalized = normalized.replace(/\s+/g, ' ').trim();
    if (!normalized) return true;
    return !/[0-9a-z]/i.test(normalized);
  }

  function shouldRemoveScriptCard(card) {
    if (!card) return false;
    const valueNodes = card.querySelectorAll('.js-empty-dash, .js-null-to-dash');
    if (!valueNodes.length) return false;
    for (const node of valueNodes) {
      const text = node.textContent || '';
      if (isPlaceholderToken(text)) {
        return false;
      }
      if (!isBlankScriptValue(text)) {
        return false;
      }
    }
    return true;
  }

  function removeScriptCard(card) {
    if (!card) return;
    const parent = card.parentElement;
    card.remove();
    if (parent && parent.classList && parent.classList.contains('js-script-grid')) {
      if (!parent.querySelector('.js-script-card')) {
        parent.remove();
      }
    }
  }

  function pruneEmptyScriptCards(target) {
    if (!target) return;
    const cards = new Set();
    if (target.nodeType === 1 && target.classList.contains('js-script-card')) {
      cards.add(target);
    }
    if (target.querySelectorAll) {
      target.querySelectorAll('.js-script-card').forEach((card) => cards.add(card));
    }
    cards.forEach((card) => {
      if (!card.isConnected) return;
      if (shouldRemoveScriptCard(card)) {
        removeScriptCard(card);
      }
    });
  }

  function deriveFileName(link, fallback) {
    if (fallback) {
      const trimmed = fallback.trim();
      if (trimmed) return trimmed;
    }
    if (!link) return '';
    try {
      const url = new URL(link, window.location.origin);
      const pathname = url.pathname || '';
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length) {
        return decodeURIComponent(segments[segments.length - 1]);
      }
    } catch (err) {
      // ignore URL parsing issues
    }
    return link;
  }

  function parseUploadValue(rawValue) {
    if (!rawValue) return null;
    const trimmed = rawValue.trim();
    if (!trimmed) return null;
    if (isPlaceholderToken(trimmed)) return null;
    const normalized = trimmed.replace(/\u2014/g, '').trim();
    if (!normalized) return null;
    if (/^(null|undefined|n\/?.?a|none)$/i.test(normalized)) return null;

    let payload = null;
    if (normalized.startsWith('{') && normalized.endsWith('}')) {
      try {
        payload = JSON.parse(normalized);
      } catch (err) {
        return null;
      }
    } else if (/^https?:\/\//i.test(normalized)) {
      payload = { link: normalized };
    } else {
      return null;
    }

    if (!payload || typeof payload !== 'object') return null;
    const link = typeof payload.link === 'string' ? payload.link.trim() : '';
    if (!link) return null;
    const name = deriveFileName(link, typeof payload.name === 'string' ? payload.name : '');
    if (!name) return null;
    return { link, name };
  }

  function ensureUploadLink(row) {
    let linkEl = row.querySelector('[data-note-upload-link]');
    if (!linkEl) {
      linkEl = document.createElement('a');
      linkEl.setAttribute('data-note-upload-link', '');
      // linkEl.className = 'inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-500 underline';
      linkEl.className = 'px-4 py-2 rounded-md bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition text-nowrap w-max';
      
      linkEl.target = '_blank';
      linkEl.rel = 'noopener noreferrer';
      row.appendChild(linkEl);
    }
    return linkEl;
  }

  function renderUploadRows(target) {
    if (!target) return;
    const rows = new Set();
    if (target.nodeType === 1 && target.hasAttribute('data-note-upload-row')) {
      rows.add(target);
    }
    if (target.querySelectorAll) {
      target.querySelectorAll('[data-note-upload-row]').forEach((row) => rows.add(row));
    }

    rows.forEach((row) => {
      const placeholder = row.querySelector('[data-note-upload]');
      if (!placeholder) return;
      const raw = (placeholder.textContent || '').trim();
      if (row.dataset.noteUploadRaw === raw && row.dataset.noteUploadHydrated === 'true') {
        return;
      }

      row.dataset.noteUploadRaw = raw;
      const info = parseUploadValue(raw);
      const linkEl = row.querySelector('[data-note-upload-link]');

      if (!info) {
        if (linkEl) linkEl.remove();
        placeholder.hidden = false;
        row.hidden = true;
        row.classList.add('hidden');
        row.dataset.noteUploadHydrated = 'false';
        return;
      }

      const link = ensureUploadLink(row);
      link.href = info.link;
      link.textContent = info.name;
      link.title = info.name;
      placeholder.hidden = true;
      row.hidden = false;
      row.classList.remove('hidden');
      row.dataset.noteUploadHydrated = 'true';
    });
  }

  async function executeMutation(query, variables) {
    if (!API_ENDPOINT || !API_KEY) {
      throw new Error('API endpoint or key not configured.');
    }
    const res = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': API_KEY,
      },
      body: JSON.stringify({ query, variables }),
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

  async function createClinicalNote(payload) {
    const data = await executeMutation(CREATE_MUTATION, { payload });
    return data && data.createClinicalNote ? data.createClinicalNote : null;
  }

  async function updateClinicalNote(id, payload) {
    if (id == null) {
      throw new Error('Cannot update clinical note without an id.');
    }
    const resolvedId = typeof id === 'string' && /^\d+$/.test(id) ? Number(id) : id;
    return executeMutation(UPDATE_MUTATION, { id: resolvedId, payload });
  }

  let editorInstance = null;
  let inFlight = false;
  let pendingSave = false;
  let currentNoteId = null;
  let lastSavedHtml = null;

  function saveIfNeeded(html) {
    const cleaned = cleanHtml(html);
    const plain = htmlToPlain(cleaned);
    if (!plain) {
      setStatus('');
      return;
    }

    if (currentNoteId && cleaned === lastSavedHtml) {
      setStatus('');
      return;
    }

    if (inFlight) {
      pendingSave = true;
      return;
    }

    inFlight = true;
    pendingSave = false;
    setStatus('Saving…');

    (async () => {
      try {
        if (!currentNoteId) {
          const nowSeconds = Math.floor(Date.now() / 1000);
          const payload = {
            content: cleaned,
            title: 'Consult Notes',
            appointment_id: APPOINTMENT_ID,
            patient_id: PATIENT_ID,
            author_id: AUTHOR_ID,
            date_created: nowSeconds,
          };
          const note = await createClinicalNote(payload);
          if (note && note.id != null) {
            currentNoteId = String(note.id);
          }
          lastSavedHtml = cleaned;
        } else {
          await updateClinicalNote(currentNoteId, { content: cleaned });
          lastSavedHtml = cleaned;
        }
        setStatus('Saved');
        setTimeout(() => setStatus(''), 2000);
      } catch (err) {
        console.error('Failed to save clinical note', err);
        setStatus('Failed to save');
      } finally {
        inFlight = false;
        if (pendingSave && editorInstance) {
          pendingSave = false;
          saveIfNeeded(editorInstance.getData());
        }
      }
    })();
  }

  const EditorConstructor = (window.CKEDITOR && window.CKEDITOR.ClassicEditor) ? window.CKEDITOR.ClassicEditor : window.ClassicEditor;

  EditorConstructor
    .create(editorHost, {
      placeholder: 'Write a new clinical note…',
      toolbar: {
        items: [
          'bold',
          'italic',
          'underline',
          'link',
          'bulletedList',
          '|',
          'alignment'
        ],
        shouldNotGroupWhenFull: true,
      },
      alignment: {
        options: ['left', 'center', 'right', 'justify'],
      },
      removePlugins: [
        'CKBox',
        'CKFinder',
        'EasyImage',
        'RealTimeCollaborativeComments',
        'RealTimeCollaborativeTrackChanges',
        'RealTimeCollaborativeRevisionHistory',
        'PresenceList',
        'Comments',
        'TrackChanges',
        'TrackChangesData',
        'RevisionHistory',
        'Pagination',
        'WProofreader',
        'MathType',
        'SlashCommand',
        'Template',
        'DocumentOutline',
        'FormatPainter',
        'GrammarChecker',
        'AIAssistant',
        'CaseChange',
        'ExportPdf',
        'ExportWord',
        'Title',
        'MultiLevelList',
        'TableOfContents',
        'PasteFromOfficeEnhanced'
      ],
      heading: {
        options: [
          { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' }
        ]
      }
    })
    .then((editor) => {
      editorInstance = editor;
      setStatus('');
      editor.model.document.on('change:data', () => {
        setStatus('');
      });
      editor.ui.focusTracker.on('change:isFocused', (evt, name, isFocused) => {
        if (!isFocused) {
          saveIfNeeded(editor.getData());
        }
      });
    })
    .catch((err) => {
      console.error('Failed to initialize editor', err);
    });

  const savedNotesList = document.getElementById('clinical-notes-list');
  if (savedNotesList) {
    pruneEmptyScriptCards(savedNotesList);
    renderUploadRows(savedNotesList);
    if ('MutationObserver' in window) {
      let isProcessing = false;
      const observer = new MutationObserver((mutations) => {
        if (isProcessing) return;
        isProcessing = true;
        try {
          const candidates = new Set();
          mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
              mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) {
                  candidates.add(node);
                  const uploadRow = node.closest && node.closest('[data-note-upload-row]');
                  if (uploadRow) {
                    candidates.add(uploadRow);
                  }
                }
              });
              if (mutation.target && mutation.target.nodeType === 1) {
                candidates.add(mutation.target);
                const uploadRow = mutation.target.closest('[data-note-upload-row]');
                if (uploadRow) {
                  candidates.add(uploadRow);
                }
              }
            } else if (mutation.type === 'characterData') {
              const parent = mutation.target && mutation.target.parentElement;
              if (parent) {
                const card = parent.closest('.js-script-card');
                if (card) {
                  candidates.add(card);
                }
                const uploadRow = parent.closest('[data-note-upload-row]');
                if (uploadRow) {
                  candidates.add(uploadRow);
                }
              }
            }
          });
          if (!candidates.size) return;
          candidates.add(savedNotesList);
          candidates.forEach((candidate) => {
            pruneEmptyScriptCards(candidate);
            renderUploadRows(candidate);
          });
        } finally {
          isProcessing = false;
        }
      });
      observer.observe(savedNotesList, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
  }
})();
