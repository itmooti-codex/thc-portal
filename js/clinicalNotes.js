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

  let editorInstance = null;
  let inFlight = false;
  let pendingSave = false;

  function saveIfNeeded(html) {
    const cleaned = cleanHtml(html);
    if (!htmlToPlain(cleaned)) {
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
        if (editorInstance) editorInstance.setData('');
        setStatus('Saved');
        setTimeout(() => setStatus(''), 2000);
      } catch (err) {
        console.error('Failed to create clinical note', err);
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
