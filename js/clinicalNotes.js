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
})();
