/* ==========================================================================
   TEXTINATION WEB APPLICATION SCRIPT
   ========================================================================== */

class ImagefictionApp {
  constructor() {
    this.currentBookTitle = null;
    this.currentBookTab = 'editor';
    this.serverOffline = false;

    // Corkboard Node Dragging State
    this.draggedNode = null;
    this.dragOffset = { x: 0, y: 0 };

    // Canvas Panning & Zooming State
    this.zoomLevel = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };

    // Editor Scale & Zoom State
    this.editorZoomLevel = 1.0;

    // Caret / cursor tracking
    this.caretBlinkInterval = null;
    this.isTyping = false;
    this.typingTimeout = null;

    // Analytics tracking
    this.bookAnalytics = JSON.parse(localStorage.getItem('imagefiction_analytics') || '{}');

    this.activeRelationFilters = {
      Aile: true,
      Arkadaşlık: true,
      Aşk: true,
      Düşmanlık: true
    };

    // Initialize Web Audio API Context
    this.initAudioContext();

    // Initialize state & listeners
    this.loadState();
    this.initEventListeners();
    this.applyTheme();
    this.renderCurrentView('Kitaplarım');
  }

  isServerAvailable() {
    if (window.location.protocol === 'file:' || !window.location.hostname) {
      return false;
    }
    if (this.serverOffline) return false;
    return true;
  }

  /* ------------------------------------------------------------------------
     1. WEB AUDIO API SOUND EFFECTS SYSTEM
     ------------------------------------------------------------------------ */
  initAudioContext() {
    this.audioCtx = null;
  }

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  playClickSound(freq = 460, type = 'sine', duration = 0.04) {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + duration);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio context fallbacks silently
    }
  }

  playPopSound() {
    this.playClickSound(580, 'triangle', 0.06);
  }

  playZoomSound() {
    this.playClickSound(340, 'sine', 0.05);
  }

  /* ------------------------------------------------------------------------
     2. STATE MANAGEMENT & LOCAL STORAGE PERSISTENCE
     ------------------------------------------------------------------------ */
  loadState() {
    const saved = localStorage.getItem('imagefiction_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.userProfile = parsed.userProfile;
        this.savedBooks = parsed.savedBooks;
        this.bookPersons = parsed.bookPersons;
        this.bookRelations = parsed.bookRelations;
        this.isDarkMode = parsed.isDarkMode || false;
        this.cursorPositions = parsed.cursorPositions || {};

        // Strip any external Unsplash image URLs from savedBooks in user's localStorage
        if (Array.isArray(this.savedBooks)) {
          let stateUpdated = false;
          this.savedBooks.forEach(b => {
            if (b.cover && (b.cover.includes('unsplash.com') || b.cover.startsWith('http'))) {
              b.cover = "";
              stateUpdated = true;
            }
          });
          if (stateUpdated) this.saveState();
        }

        return;
      } catch (e) {
        console.error("State parse error", e);
      }
    }

    this.isDarkMode = false;
    this.cursorPositions = {};
    this.userProfile = {
      name: "Yazar",
      email: "yazar@imge.com",
      bio: "İMGE platformunda hikayeler kurgulayan ve karakter ilişkilerini haritalandıran tutkulu yazar.",
      avatarPath: ""
    };

    this.savedBooks = [
      {
        title: "Zamanın Ötesinde",
        subject: "Gelecek ile geçmiş arasında sıkışan bir dedektifin öyküsü.",
        cover: "",
        author: "Yazar",
        content: "Gecenin karanlığı şehri kapladığında, eski saatin tiktakları yankılanıyordu. Dedektif Ahmet Yılmaz, masasının üzerindeki sararmış dosyaları karıştırırken sokaktan gelen hafif adımları duydu. Her şey o gizemli saatin durduğu an başlamıştı..."
      },
      {
        title: "Sisli Şehir",
        subject: "Gizemli olayların yaşandığı kasabada geçen bir macera.",
        cover: "",
        author: "Yazar",
        content: "Kasabaya ilk kar düşüp yoğun bir sis kapladığında, herkes kütüphanenin ışıklarının ansızın söndüğünü fark etti. Doktor Canan Şahin, elindeki fenerle kütüphaneye doğru adımlarken sisin arasından fısıltılar yükseliyordu..."
      }
    ];

    this.bookPersons = [
      { id: "p1", name: "Ahmet Yılmaz", book_title: "Zamanın Ötesinde", trait: "Analitik & Soğukkanlı", age: "Yetişkin (26-45)", gender: "Erkek", job: "Dedektif", bio: "Geceleri saha araştırması yapan tecrübeli araştırmacı dedektif.", color: "#1b4332", x: 180, y: 220 },
      { id: "p2", name: "Zeynep Kaya", book_title: "Zamanın Ötesinde", trait: "Hırslı & Kararlı", age: "Yetişkin (26-45)", gender: "Kadın", job: "İtirafçı", bio: "Vakadaki anahtar delilleri inceleyen biyokimya uzmanı.", color: "#9e2a2b", x: 520, y: 200 },
      { id: "p3", name: "Mehmet Demir", book_title: "Zamanın Ötesinde", trait: "Gizemli & Ketum", age: "Kıdemli (60+)", gender: "Erkek", job: "Sırdaş", bio: "Ahmet'in eski danışmanı ve sahaflar çarşısı işletmecisi.", color: "#40916c", x: 300, y: 520 },
      { id: "p4", name: "Elif Demir", book_title: "Zamanın Ötesinde", trait: "Maceracı & Cesur", age: "Genç (18-25)", gender: "Kadın", job: "Tanık", bio: "Olay yerinde ilk görülen ve gizli kayıtlar tutan genç gazeteci.", color: "#b08968", x: 680, y: 480 },

      { id: "p5", name: "Canan Şahin", book_title: "Sisli Şehir", trait: "Analitik & Soğukkanlı", age: "Yetişkin (26-45)", gender: "Kadın", job: "Dedektif", bio: "Kasabadaki sırları çözmeye kararlı hekim.", color: "#1b4332", x: 220, y: 240 },
      { id: "p6", name: "Burak Şahin", book_title: "Sisli Şehir", trait: "Melankolik & İçe Kapanık", age: "Yetişkin (26-45)", gender: "Erkek", job: "Şüpheli", bio: "Canan'ın öz kardeşi ve eski eczacı.", color: "#9e2a2b", x: 560, y: 240 },
      { id: "p7", name: "Deniz Arslan", book_title: "Sisli Şehir", trait: "Gizemli & Ketum", age: "Yetişkin (26-45)", gender: "Erkek", job: "Sırdaş", bio: "Canan ile ortak hareket eden saha araştırmacısı.", color: "#40916c", x: 380, y: 500 }
    ];

    this.bookRelations = [
      { id: "r1", from_id: "p1", to_id: "p2", type: "Aşk", book_title: "Zamanın Ötesinde" },
      { id: "r2", from_id: "p1", to_id: "p3", type: "Aile", book_title: "Zamanın Ötesinde" },
      { id: "r3", from_id: "p3", to_id: "p4", type: "Aile", book_title: "Zamanın Ötesinde" },
      { id: "r4", from_id: "p1", to_id: "p4", type: "Aile", book_title: "Zamanın Ötesinde" },
      { id: "r5", from_id: "p2", to_id: "p4", type: "Arkadaşlık", book_title: "Zamanın Ötesinde" },

      { id: "r6", from_id: "p5", to_id: "p6", type: "Aile", book_title: "Sisli Şehir" },
      { id: "r7", from_id: "p5", to_id: "p7", type: "Aşk", book_title: "Sisli Şehir" }
    ];

    this.saveState();
  }

  saveState() {
    const data = {
      userProfile: this.userProfile,
      savedBooks: this.savedBooks,
      bookPersons: this.bookPersons,
      bookRelations: this.bookRelations,
      isDarkMode: this.isDarkMode,
      customCorpusText: this.customCorpusText,
      ragHybridMode: this.ragHybridMode,
      cursorPositions: this.cursorPositions || {}
    };
    localStorage.setItem('imagefiction_state', JSON.stringify(data));
  }

  /* ------------------------------------------------------------------------
     3. NAVIGATION & THEME CONTROLLER
     ------------------------------------------------------------------------ */
  showScreen(screenId) {
    console.log("➡️ [İMGE] Ekran Değiştirildi ->", screenId);
    this.playClickSound();

    if (this.isServerAvailable()) {
      fetch(`/api/log?event=Ekran_Degistirildi_${screenId}`).catch(() => { this.serverOffline = true; });
    }

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add('active');
      if (screenId === 'main-screen') {
        this.renderCurrentView('Kitaplarım');
      }
    }
  }

  handleGoogleLogin() {
    this.playPopSound();
    this.showToast("Google ile giriş yapıldı.");
    this.showScreen('main-screen');
  }

  toggleSidebar() {
    this.playClickSound();
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
  }

  toggleTheme() {
    this.playClickSound();
    this.isDarkMode = !this.isDarkMode;
    this.applyTheme();
    this.saveState();
  }

  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.isDarkMode ? 'dark' : 'light');
    const container = document.getElementById('theme-icon-svg');
    if (container) {
      container.innerHTML = this.isDarkMode 
        ? `<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2" fill="none"/><line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" stroke-width="2"/><line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" stroke-width="2"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" stroke-width="2"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" stroke-width="2"/><line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" stroke-width="2"/><line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" stroke-width="2"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" stroke-width="2"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" stroke-width="2"/></svg>`
        : `<svg class="svg-icon" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2" fill="none"/></svg>`;
    }
  }

  navigate(segmentName) {
    this.playClickSound();
    if (this.isServerAvailable()) {
      fetch(`/api/log?event=Sekme_Tiklandi_${encodeURIComponent(segmentName)}`).catch(() => { this.serverOffline = true; });
    }
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-segment') === segmentName);
    });

    document.getElementById('current-page-title').textContent = segmentName;
    document.getElementById('view-book-workspace').style.display = 'none';

    const viewMap = {
      'Kitaplarım': 'view-books',
      'Karakterler': 'view-templates',
      'Profil': 'view-profile'
    };

    Object.values(viewMap).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });



    const activeViewId = viewMap[segmentName] || 'view-books';
    const activeEl = document.getElementById(activeViewId);
    if (activeEl) activeEl.style.display = 'block';

    this.renderCurrentView(segmentName);
  }

  renderCurrentView(segmentName = 'Kitaplarım') {
    if (['Kitaplarım', 'Yazma'].includes(segmentName)) {
      this.renderBooksGrid();
    }
    if (segmentName === 'Profil') this.renderProfileView();
    if (segmentName === 'Karakterler') this.renderTemplatesGrid();
  }

  /* ------------------------------------------------------------------------
     4. KITAPLARIM GRID & CONTEXT MENU
     ------------------------------------------------------------------------ */
  renderBooksGrid() {
    const container = document.getElementById('books-grid-container');
    if (!container) return;

    let html = `
      <div class="book-card book-card-create" onclick="app.openModal('modal-new-book')">
        <div class="plus-icon-circle">+</div>
        <div style="font-weight: 700; font-family: var(--font-heading);">Yeni Kitap Oluştur</div>
      </div>
    `;

    const defaultGradients = [
      'linear-gradient(135deg, #1b4332, #40916c)',
      'linear-gradient(135deg, #2b2d42, #4a4e69)',
      'linear-gradient(135deg, #5c2018, #9e2a2b)',
      'linear-gradient(135deg, #2c3e50, #34495e)',
      'linear-gradient(135deg, #3d2b1f, #8c6d58)'
    ];

    this.savedBooks.forEach((book, idx) => {
      const isExternalUrl = book.cover && (book.cover.startsWith('http') || book.cover.includes('unsplash.com'));
      const grad = defaultGradients[idx % defaultGradients.length];
      const coverBg = (book.cover && !isExternalUrl)
        ? `background-image: url('${book.cover}')`
        : `background: ${grad}`;

      html += `
        <div class="book-card">
          <button class="book-menu-btn" onclick="app.toggleBookContextMenu(event, '${this.escapeQuotes(book.title)}')" title="Seçenekler">
            <svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
          </button>

          <div class="book-context-menu" id="menu-${this.slugify(book.title)}">
            <button class="menu-item-btn" onclick="app.openEditBookModal(event, '${this.escapeQuotes(book.title)}')">
              <svg class="svg-icon" viewBox="0 0 24 24"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="currentColor" stroke-width="2" fill="none"/></svg>
              <span>Düzenle</span>
            </button>
            <button class="menu-item-btn" onclick="app.openBookWorkspaceDirect(event, '${this.escapeQuotes(book.title)}', 'relations')">
              <svg class="svg-icon" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="6" cy="12" r="3" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="18" cy="19" r="3" stroke="currentColor" stroke-width="2" fill="none"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" stroke="currentColor" stroke-width="2"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" stroke="currentColor" stroke-width="2"/></svg>
              <span>İlişkiyi Görüntüle</span>
            </button>
            <button class="menu-item-btn danger" onclick="app.deleteBookDirect(event, '${this.escapeQuotes(book.title)}')">
              <svg class="svg-icon" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="2" fill="none"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2" fill="none"/></svg>
              <span>Sil</span>
            </button>
          </div>

          <div class="book-card-inner" onclick="app.openBookWorkspace('${this.escapeQuotes(book.title)}')">
            <div class="book-cover" style="${coverBg}">
              <div class="book-cover-title">${this.escapeHtml(book.title)}</div>
            </div>
            <div class="book-info">
              <p class="book-subject">${this.escapeHtml(book.subject || '')}</p>
              <span class="book-author-tag">
                <svg class="svg-icon" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2" fill="none"/></svg>
                ${this.escapeHtml(book.author || 'Yazar')}
              </span>
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  toggleBookContextMenu(event, bookTitle) {
    event.stopPropagation();
    this.playClickSound();
    const menuId = `menu-${this.slugify(bookTitle)}`;
    const menu = document.getElementById(menuId);
    
    document.querySelectorAll('.book-context-menu').forEach(m => {
      if (m.id !== menuId) m.classList.remove('active');
    });

    if (menu) menu.classList.toggle('active');
  }

  handleCoverFileSelect(event, previewId, hiddenInputId) {
    const file = event.target.files[0];
    if (!file) return;

    this.playPopSound();
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const preview = document.getElementById(previewId);
      const hiddenInput = document.getElementById(hiddenInputId);

      if (preview) {
        preview.src = dataUrl;
        preview.style.display = 'block';
      }
      if (hiddenInput) {
        hiddenInput.value = dataUrl;
      }
      const fileLabel = document.getElementById('new-book-file-label');
      if (fileLabel) fileLabel.textContent = `Yüklendi: ${file.name}`;
    };
    reader.readAsDataURL(file);
  }

  openModal(modalId) {
    this.playClickSound();
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  }

  closeModal(modalId) {
    this.playClickSound();
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }

  createBook() {
    const titleInput = document.getElementById('new-book-title');
    const subjectInput = document.getElementById('new-book-subject');
    const coverDataInput = document.getElementById('new-cover-data');

    const title = titleInput.value.trim();
    if (!title) {
      this.showToast("Lütfen bir kitap başlığı girin.");
      return;
    }

    this.playPopSound();
    const coverUrl = coverDataInput.value || "";

    const newBook = {
      title: title,
      subject: subjectInput.value.trim(),
      genre: (document.getElementById('new-book-genre') || {}).value || '',
      cover: coverUrl,
      author: this.userProfile.name,
      content: `${title}\n\nHikayenize buraya yazarak başlayın...`
    };

    this.savedBooks.push(newBook);
    this.saveState();
    this.closeModal('modal-new-book');
    this.renderBooksGrid();
    this.showToast(`"${title}" oluşturuldu.`);

    titleInput.value = '';
    subjectInput.value = '';
    coverDataInput.value = '';
    const preview = document.getElementById('new-cover-preview');
    if (preview) preview.style.display = 'none';

    this.openBookWorkspace(title);
  }

  openEditBookModal(event, bookTitle) {
    event.stopPropagation();
    this.closeAllContextMenus();
    this.openBookWorkspace(bookTitle, 'settings');
  }

  openBookWorkspaceDirect(event, bookTitle, tabName) {
    event.stopPropagation();
    this.closeAllContextMenus();
    this.openBookWorkspace(bookTitle, tabName);
  }

  deleteBookDirect(event, bookTitle) {
    event.stopPropagation();
    this.closeAllContextMenus();
    if (!confirm(`"${bookTitle}" kitabını silmek istediğinize emin misiniz?`)) return;

    this.playPopSound();
    this.savedBooks = this.savedBooks.filter(b => b.title !== bookTitle);
    this.bookPersons = this.bookPersons.filter(p => p.book_title !== bookTitle);
    this.bookRelations = this.bookRelations.filter(r => r.book_title !== bookTitle);

    this.saveState();
    this.renderBooksGrid();
    this.showToast("Kitap silindi.");
  }

  closeAllContextMenus() {
    document.querySelectorAll('.book-context-menu').forEach(m => m.classList.remove('active'));
  }

  /* ------------------------------------------------------------------------
     5. SINGLE BOOK WORKSPACE (YAZMA + İLİŞKİ HARİTASI)
     ------------------------------------------------------------------------ */
  openBookWorkspace(bookTitle, targetTab = 'editor') {
    const book = this.savedBooks.find(b => b.title === bookTitle);
    if (!book) return;

    this.currentBookTitle = bookTitle;

    document.querySelectorAll('.view-page').forEach(el => el.style.display = 'none');
    const ws = document.getElementById('view-book-workspace');
    ws.style.display = 'block';

    document.getElementById('current-page-title').textContent = `Kitap: ${bookTitle}`;

    // Clean reset editor pages container to single page
    const pagesContainer = document.getElementById('editor-pages-container');
    if (pagesContainer) {
      pagesContainer.innerHTML = `
        <div class="paper-sheet" data-page="1">
          <div class="paper-sheet-header">
            <span>Sayfa 1</span>
          </div>
          <div class="paper-sheet-content" id="rich-editor-content" contenteditable="true" data-page-index="0" oninput="app.onEditorInput()"></div>
          <div class="paper-sheet-footer">
            <span>İMGE Taslak</span>
          </div>
        </div>
      `;
      // Add keydown handler for cross-page navigation on first page
      const firstPageContent = pagesContainer.querySelector('.paper-sheet-content');
      if (firstPageContent) {
        firstPageContent.addEventListener('keydown', (e) => this.handleEditorKeydown(e, firstPageContent));
      }
    }

    this.setEditorText(book.content || '');

    document.getElementById('setting-book-title').value = book.title;
    document.getElementById('setting-book-subject').value = book.subject || '';
    document.getElementById('setting-cover-data').value = book.cover || '';

    this.switchBookTab(targetTab);

    if (targetTab === 'editor') {
      this.onEditorInput();
      // Initialize caret for editor
      setTimeout(() => {
        this.initCaret();
        
        // Restore cursor position if saved
        const savedPos = (this.cursorPositions || {})[bookTitle];
        const container = document.getElementById('editor-pages-container');
        let targetEditor = document.getElementById('rich-editor-content');
        
        if (savedPos && savedPos.pageIndex > 0 && container) {
          const pages = container.querySelectorAll('.paper-sheet-content');
          if (pages[savedPos.pageIndex]) {
            targetEditor = pages[savedPos.pageIndex];
          }
        }

        if (targetEditor) {
          targetEditor.focus();
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(targetEditor);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
          this.updateCaretPosition();
        }

        // Restore scroll position or scroll to caret
        if (savedPos && savedPos.scrollY) {
          setTimeout(() => {
            window.scrollTo({ top: savedPos.scrollY, behavior: 'instant' });
          }, 50);
        } else {
          this.scrollToCaretIfNeeded();
        }
      }, 150);
    }
  }

  setEditorText(text) {
    const editor = document.getElementById('rich-editor-content');
    if (!editor) return;
    if (!text || !text.trim()) {
      editor.innerHTML = '<p><br></p>';
      return;
    }

    // Check if the content is already HTML (saved with paragraph structure)
    if (text.trim().startsWith('<')) {
      editor.innerHTML = text;
    } else {
      // Legacy plain text: convert to paragraphs, preserving all line breaks
      const lines = text.split('\n');
      let html = '';
      let currentParagraph = '';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim() === '') {
          // Empty line = paragraph break
          if (currentParagraph) {
            html += `<p>${this.escapeHtml(currentParagraph)}</p>`;
            currentParagraph = '';
          }
          html += '<p><br></p>'; // Preserve the empty line as empty paragraph
        } else {
          if (currentParagraph) {
            currentParagraph += ' ' + line.trim();
          } else {
            currentParagraph = line.trim();
          }
        }
      }
      if (currentParagraph) {
        html += `<p>${this.escapeHtml(currentParagraph)}</p>`;
      }
      editor.innerHTML = html || '<p><br></p>';
    }
  }

  closeBookWorkspace() {
    this.playClickSound();
    this.saveCurrentBookText();
    this.navigate('Kitaplarım');
  }

  switchBookTab(tabName) {
    this.playClickSound();
    this.currentBookTab = tabName;
    const panes = {
      'editor': 'subtab-editor',
      'corkboard': 'subtab-corkboard',
      'relations': 'subtab-corkboard',
      'characters': 'subtab-characters',
      'settings': 'subtab-settings'
    };

    Object.values(panes).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    const targetId = panes[tabName];
    if (targetId) {
      const el = document.getElementById(targetId);
      if (el) el.style.display = 'block';
    }

    document.querySelectorAll('.book-tab-btn').forEach(btn => {
      const tabAttr = btn.getAttribute('data-tab');
      btn.classList.toggle('active', 
        tabAttr === tabName || 
        (tabName === 'corkboard' && tabAttr === 'relations')
      );
    });

    if (tabName === 'corkboard' || tabName === 'relations') {
      this.renderCorkboard();
    }
    if (tabName === 'characters') {
      this.renderBookCharactersGrid();
    }
  }

  formatText(command, value = null) {
    this.playClickSound();
    document.execCommand(command, false, value);
    this.onEditorInput();
  }

  findInBook() {
    this.playClickSound();
    const textToFind = prompt("Aranacak kelime veya cümleyi girin:");
    if (textToFind) {
      const found = window.find(textToFind, false, false, true, false, true, false);
      if (found) {
        this.updateCaretPosition();
      } else {
        this.showToast("Kelime bulunamadı.");
      }
    }
  }

  async checkGrammar() {
    this.playClickSound();
    const btn = document.getElementById('btn-spellcheck');
    if (btn) btn.innerHTML = "Denetleniyor...";

    const editor = document.getElementById('editor-pages-container');
    if (!editor) return;
    
    let fullText = "";
    let textNodes = [];
    
    function walk(node) {
      if (node.nodeType === 3) {
        const len = node.nodeValue.length;
        textNodes.push({ node: node, start: fullText.length, end: fullText.length + len });
        fullText += node.nodeValue;
      } else if (node.nodeType === 1) {
        if (node.id === 'editor-ghost-text' || node.classList.contains('spell-error')) {
          for (let child of node.childNodes) walk(child);
        } else {
          for (let child of node.childNodes) walk(child);
          if (['P', 'DIV', 'BR'].includes(node.tagName)) {
             fullText += "\n";
          }
        }
      }
    }
    
    this.clearSpellErrors();
    const pages = editor.querySelectorAll('.paper-sheet-content');
    pages.forEach(p => walk(p));

    if (!fullText.trim()) {
      if (btn) btn.innerHTML = "Yazım Denetimi";
      return;
    }

    try {
      const response = await fetch('https://api.languagetoolplus.com/v2/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          text: fullText,
          language: 'tr'
        })
      });
      
      const data = await response.json();
      this.highlightGrammarErrors(data.matches, textNodes);
      
    } catch (err) {
      console.error(err);
      this.showToast("Yazım denetimi sunucusuna ulaşılamadı.");
    }
    if (btn) btn.innerHTML = "Yazım Denetimi";
  }

  clearSpellErrors() {
    const editor = document.getElementById('editor-pages-container');
    if (!editor) return;
    const spans = editor.querySelectorAll('.spell-error');
    spans.forEach(span => {
      const parent = span.parentNode;
      while(span.firstChild) parent.insertBefore(span.firstChild, span);
      parent.removeChild(span);
    });
    const pages = editor.querySelectorAll('.paper-sheet-content');
    pages.forEach(p => p.normalize());
  }

  highlightGrammarErrors(matches, textNodes) {
    if (!matches || matches.length === 0) {
      this.showToast("Hata bulunamadı, metniniz harika!");
      return;
    }
    
    this.showToast(`${matches.length} hata bulundu. Üzerine tıklayarak düzeltebilirsiniz.`);
    
    const sortedMatches = matches.sort((a,b) => b.offset - a.offset);
    
    for (let match of sortedMatches) {
       const errStart = match.offset;
       const errEnd = match.offset + match.length;
       
       const startNodeObj = textNodes.find(n => errStart >= n.start && errStart < n.end);
       if (!startNodeObj) continue;
       
       const node = startNodeObj.node;
       const localStart = errStart - startNodeObj.start;
       const localEnd = Math.min(errEnd - startNodeObj.start, node.nodeValue.length);
       
       const beforeText = node.nodeValue.substring(0, localStart);
       const errorText = node.nodeValue.substring(localStart, localEnd);
       const afterText = node.nodeValue.substring(localEnd);
       
       const span = document.createElement('span');
       span.className = 'spell-error';
       span.textContent = errorText;
       const replacements = match.replacements.map(r => r.value).slice(0,5).join('|');
       span.setAttribute('data-replacements', replacements);
       span.setAttribute('data-message', match.message);
       span.onclick = (e) => this.showSpellMenu(e, span);
       
       const parent = node.parentNode;
       if (beforeText) parent.insertBefore(document.createTextNode(beforeText), node);
       parent.insertBefore(span, node);
       if (afterText) parent.insertBefore(document.createTextNode(afterText), node);
       
       parent.removeChild(node);
    }
  }

  showSpellMenu(e, spanElement) {
    e.preventDefault();
    e.stopPropagation();
    
    let menu = document.getElementById('spell-context-menu');
    if (!menu) {
      menu = document.createElement('div');
      menu.id = 'spell-context-menu';
      menu.className = 'spell-menu';
      document.body.appendChild(menu);
      
      document.addEventListener('click', () => {
         if (menu.style.display === 'flex') menu.style.display = 'none';
      });
    }
    
    menu.innerHTML = '';
    
    const msg = spanElement.getAttribute('data-message');
    const title = document.createElement('div');
    title.className = 'spell-menu-title';
    title.textContent = msg;
    menu.appendChild(title);
    
    const reps = spanElement.getAttribute('data-replacements');
    if (reps) {
       const suggestions = reps.split('|');
       suggestions.forEach(sug => {
         const item = document.createElement('div');
         item.className = 'spell-menu-item';
         item.textContent = sug;
         item.onclick = () => {
           const textNode = document.createTextNode(sug);
           spanElement.parentNode.replaceChild(textNode, spanElement);
           this.onEditorInput();
         };
         menu.appendChild(item);
       });
    }
    
    const ignoreItem = document.createElement('div');
    ignoreItem.className = 'spell-menu-item';
    ignoreItem.style.color = 'var(--accent-secondary)';
    ignoreItem.textContent = "Çizgiyi Kaldır (Yoksay)";
    ignoreItem.onclick = () => {
       const textNode = document.createTextNode(spanElement.textContent);
       spanElement.parentNode.replaceChild(textNode, spanElement);
    };
    menu.appendChild(ignoreItem);
    
    menu.style.display = 'flex';
    const rect = spanElement.getBoundingClientRect();
    menu.style.top = `${rect.bottom + window.scrollY + 5}px`;
    menu.style.left = `${rect.left + window.scrollX}px`;
  }


  getPureEditorText() {
    const container = document.getElementById('editor-pages-container');
    if (!container) {
      const single = document.getElementById('rich-editor-content');
      return single ? single.innerText : '';
    }

    const pages = container.querySelectorAll('.paper-sheet-content');
    const texts = [];
    pages.forEach(p => {
      const clone = p.cloneNode(true);
      const ghost = clone.querySelector('#editor-ghost-text');
      if (ghost) ghost.remove();
      const txt = clone.innerText || '';
      if (txt.trim()) texts.push(txt.trim());
    });

    return texts.join('\n\n');
  }

  // Get HTML content preserving paragraph structure
  getEditorHtml() {
    const container = document.getElementById('editor-pages-container');
    if (!container) {
      const single = document.getElementById('rich-editor-content');
      return single ? single.innerHTML : '';
    }

    const pages = container.querySelectorAll('.paper-sheet-content');
    const htmlParts = [];
    pages.forEach(p => {
      const clone = p.cloneNode(true);
      const ghost = clone.querySelector('#editor-ghost-text');
      if (ghost) ghost.remove();
      const html = clone.innerHTML || '';
      if (html.trim() && html.trim() !== '<p><br></p>') htmlParts.push(html);
    });

    return htmlParts.join('');
  }

  clearGhostSuggestion() {
    const ghost = document.getElementById('editor-ghost-text');
    if (ghost) {
      ghost.remove();
    }
  }

  showGhostSuggestion(text) {
    this.clearGhostSuggestion();
    const activeEl = document.activeElement;
    const editor = (activeEl && activeEl.classList.contains('paper-sheet-content'))
      ? activeEl
      : document.querySelector('.paper-sheet-content');

    if (!editor || !text) return;

    const ghost = document.createElement('span');
    ghost.id = 'editor-ghost-text';
    ghost.className = 'editor-ghost-text';
    ghost.contentEditable = 'false';
    ghost.dataset.suggestionText = text;
    ghost.innerHTML = ` ${this.escapeHtml(text)} <span class="ghost-tab-badge">Tab ↹</span>`;

    editor.appendChild(ghost);
  }

  acceptGhostSuggestion() {
    const activeEl = document.activeElement;
    const ghost = document.getElementById('editor-ghost-text');
    if (!ghost) return;

    const editor = (activeEl && activeEl.classList.contains('paper-sheet-content')) 
      ? activeEl 
      : (ghost.parentElement || document.querySelector('.paper-sheet-content'));
      
    if (!editor) return;

    this.playPopSound();
    const textToAccept = ghost.dataset.suggestionText || '';
    ghost.remove();

    if (textToAccept) {
      const currentText = editor.innerText.trimEnd();
      editor.innerText = currentText ? currentText + " " + textToAccept + " " : textToAccept + " ";

      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(editor);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);

      this.showToast("✨ Tahmin kabul edildi (Tab ↹)");
      this.onEditorInput();
    }
  }



  handlePageOverflow() {
    const container = document.getElementById('editor-pages-container');
    if (!container || container.offsetWidth === 0) return;

    const sheets = Array.from(container.querySelectorAll('.paper-sheet'));
    let cursorMoved = false;

    for (let i = 0; i < sheets.length; i++) {
      const sheet = sheets[i];
      const pageEl = sheet.querySelector('.paper-sheet-content');
      if (!pageEl) continue;

      let loopGuard = 0;
      // When text height exceeds page boundary, overflow into next page sheet
      while (pageEl.scrollHeight > pageEl.clientHeight && pageEl.clientHeight > 0 && loopGuard < 200) {
        loopGuard++;
        let nextSheet = sheets[i + 1];
        if (!nextSheet) {
          const newSheetNum = sheets.length + 1;
          nextSheet = document.createElement('div');
          nextSheet.className = 'paper-sheet';
          nextSheet.dataset.page = newSheetNum;
          nextSheet.innerHTML = `
            <div class="paper-sheet-header" ondblclick="app.editHeaderFooter(this, 'header')" contenteditable="false">
              <span class="header-text">${this.escapeHtml(this.getGlobalHeaderContent())}</span>
            </div>
            <div class="paper-sheet-content" contenteditable="true" data-page-index="${sheets.length}"></div>
            <div class="paper-sheet-footer" ondblclick="app.editHeaderFooter(this, 'footer')" contenteditable="false">
              <span class="footer-text">${this.escapeHtml(this.getGlobalFooterContent())}</span>
              <span class="page-number-display">Sayfa ${newSheetNum}</span>
            </div>
          `;
          container.appendChild(nextSheet);

          const newContent = nextSheet.querySelector('.paper-sheet-content');
          newContent.addEventListener('input', () => this.onEditorInput());
          newContent.addEventListener('keydown', (e) => this.handleEditorKeydown(e, newContent));
          sheets.push(nextSheet);
        }

        const nextPageEl = nextSheet.querySelector('.paper-sheet-content');
        const lastChild = pageEl.lastChild;
        if (!lastChild) break;

        if (lastChild.id === 'editor-ghost-text') {
          this.clearGhostSuggestion();
          continue;
        }

        // Track if cursor was in the moved content
        const sel = window.getSelection();
        const cursorInMovedNode = sel && sel.rangeCount > 0 && lastChild.contains(sel.getRangeAt(0).startContainer);

        if (lastChild.nodeType === Node.ELEMENT_NODE && lastChild.tagName === 'P' && lastChild.childNodes.length > 0) {
            lastChild.normalize(); // Ensure contiguous text nodes are merged
            
            let nextP = nextPageEl.firstChild;
            if (!nextP || nextP.tagName !== 'P' || !nextP.classList.contains('split-node')) {
                nextP = document.createElement('p');
                nextP.className = 'split-node';
                if (nextPageEl.firstChild) {
                    nextPageEl.insertBefore(nextP, nextPageEl.firstChild);
                } else {
                    nextPageEl.appendChild(nextP);
                }
            }

            const nodeToMove = lastChild.lastChild;
            if (nodeToMove) {
                if (nodeToMove.nodeType === Node.TEXT_NODE) {
                    let text = nodeToMove.textContent;
                    // Match the last full word (with its preceding whitespace if any) to prevent word splitting
                    let match = text.match(/(\s+\S+|\S+)\s*$/);
                    let splitIndex = (match && match.index > 0) ? match.index : 0;
                    
                    if (splitIndex > 0) {
                        nodeToMove.textContent = text.substring(0, splitIndex);
                        let splitText = document.createTextNode(text.substring(splitIndex));
                        if (nextP.firstChild) {
                            nextP.insertBefore(splitText, nextP.firstChild);
                        } else {
                            nextP.appendChild(splitText);
                        }
                    } else {
                        if (nextP.firstChild) {
                            nextP.insertBefore(nodeToMove, nextP.firstChild);
                        } else {
                            nextP.appendChild(nodeToMove);
                        }
                    }
                } else {
                    if (nextP.firstChild) {
                        nextP.insertBefore(nodeToMove, nextP.firstChild);
                    } else {
                        nextP.appendChild(nodeToMove);
                    }
                }
            }
            
            if (lastChild.childNodes.length === 0 || (lastChild.childNodes.length === 1 && lastChild.firstChild.nodeType === Node.TEXT_NODE && lastChild.firstChild.textContent === '')) {
                lastChild.remove();
            }
        } else {
            if (nextPageEl.firstChild) {
                nextPageEl.insertBefore(lastChild, nextPageEl.firstChild);
            } else {
                nextPageEl.appendChild(lastChild);
            }
        }

        if (cursorInMovedNode) {
          cursorMoved = true;
          setTimeout(() => {
            nextPageEl.focus();
            const range = document.createRange();
            const s = window.getSelection();
            const targetP = nextPageEl.firstChild;
            if (targetP) {
                range.selectNodeContents(targetP);
                range.collapse(false); // Go to the end of the newly pushed paragraph
                s.removeAllRanges();
                s.addRange(range);
            }
            this.updateCaretPosition();
          }, 10);
        }
      }
    }

    // Clean up empty trailing pages (keep Page 1)
    const allSheets = Array.from(container.querySelectorAll('.paper-sheet'));
    for (let s = allSheets.length - 1; s >= 1; s--) {
      const sheet = allSheets[s];
      const contentEl = sheet.querySelector('.paper-sheet-content');
      const text = (contentEl ? contentEl.innerText : '').trim();
      if (!text && document.activeElement !== contentEl) {
        sheet.remove();
      }
    }

    // Update statusbar page count and page numbers
    const finalSheets = container.querySelectorAll('.paper-sheet');
    const activePageCount = finalSheets.length;
    finalSheets.forEach((sheet, idx) => {
      const pageNumEl = sheet.querySelector('.page-number-display');
      if (pageNumEl) pageNumEl.textContent = `Sayfa ${idx + 1}`;
      sheet.dataset.page = idx + 1;
    });

    const statPage = document.getElementById('stat-page-count');
    if (statPage) statPage.textContent = `${activePageCount}`;
  }

  // Handle keydown in editor pages for cross-page navigation
  handleEditorKeydown(e, pageEl) {
    // When pressing Down arrow or Enter at the end of a page, move to next page
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      
      const range = sel.getRangeAt(0);
      // Check if cursor is at the end of this page
      const isAtEnd = range.collapsed && this.isCursorAtEnd(pageEl);
      
      if (isAtEnd) {
        const nextPage = this.getNextPage(pageEl);
        if (nextPage) {
          e.preventDefault();
          nextPage.focus();
          const newRange = document.createRange();
          newRange.setStart(nextPage, 0);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
          this.updateCaretPosition();
          this.scrollToCaretIfNeeded(true);
        }
      }
    }
    
    // When pressing Up arrow or Backspace at the start of a page, move to previous page
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'Backspace') {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      
      const range = sel.getRangeAt(0);
      const isAtStart = range.collapsed && this.isCursorAtStart(pageEl);
      
      if (isAtStart) {
        const prevPage = this.getPreviousPage(pageEl);
        if (prevPage) {
          e.preventDefault();
          prevPage.focus();
          const newRange = document.createRange();
          newRange.selectNodeContents(prevPage);
          newRange.collapse(false); // Go to end of previous page
          sel.removeAllRanges();
          sel.addRange(newRange);
          this.updateCaretPosition();
          this.scrollToCaretIfNeeded(true);
          
          if (e.key === 'Backspace' && pageEl.innerText.trim() === '') {
            setTimeout(() => this.handlePageOverflow(), 10);
          }
        }
      }
    }
  }

  isCursorAtEnd(el) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    const range = sel.getRangeAt(0);
    const testRange = document.createRange();
    testRange.selectNodeContents(el);
    testRange.setStart(range.endContainer, range.endOffset);
    return testRange.toString().trim() === '';
  }

  isCursorAtStart(el) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    const range = sel.getRangeAt(0);
    const testRange = document.createRange();
    testRange.selectNodeContents(el);
    testRange.setEnd(range.startContainer, range.startOffset);
    return testRange.toString().trim() === '';
  }

  getNextPage(currentPageEl) {
    const sheet = currentPageEl.closest('.paper-sheet');
    if (!sheet) return null;
    const nextSheet = sheet.nextElementSibling;
    if (!nextSheet || !nextSheet.classList.contains('paper-sheet')) return null;
    return nextSheet.querySelector('.paper-sheet-content');
  }

  getPreviousPage(currentPageEl) {
    const sheet = currentPageEl.closest('.paper-sheet');
    if (!sheet) return null;
    const prevSheet = sheet.previousElementSibling;
    if (!prevSheet || !prevSheet.classList.contains('paper-sheet')) return null;
    return prevSheet.querySelector('.paper-sheet-content');
  }

  onEditorInput() {
    this.clearGhostSuggestion();

    // Signal typing state for caret
    this.isTyping = true;
    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.isTyping = false;
      this.updateCaretPosition();
    }, 500);

    if (this.overflowFrame) cancelAnimationFrame(this.overflowFrame);
    this.overflowFrame = requestAnimationFrame(() => {
      this.handlePageOverflow();
      this.updateCaretPosition();
      this.scrollToCaretIfNeeded();
    });

    const text = this.getPureEditorText();
    const normalizedText = text.trim().replace(/\s+/g, ' ');
    const words = normalizedText ? normalizedText.split(' ').length : 0;
    
    // Count story characters (persons) instead of text characters
    const personsCount = this.bookPersons ? this.bookPersons.filter(p => p.book_title === this.currentBookTitle).length : 0;

    const elWords = document.getElementById('stat-word-count');
    const elChars = document.getElementById('stat-char-count'); // Actually displays persons count now
    if (elWords) elWords.textContent = words.toLocaleString();
    if (elChars) elChars.textContent = personsCount.toString();

    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveCurrentBookText();
    }, 1000);
  }

  saveCurrentBookText() {
    if (!this.currentBookTitle) return;
    const book = this.savedBooks.find(b => b.title === this.currentBookTitle);
    if (book) {
      const oldContent = book.content || '';
      // Save HTML to preserve paragraph structure
      book.content = this.getEditorHtml();

      // Save cursor/scroll position
      if (!this.cursorPositions) this.cursorPositions = {};
      this.cursorPositions[this.currentBookTitle] = {
        scrollY: window.scrollY,
        pageIndex: this.getActivePageIndex()
      };

      this.saveState();

      // Track analytics
      this.trackBookChange(this.currentBookTitle, oldContent, book.content);
      
      const status = document.getElementById('editor-autosave-status');
      if (status) {
        status.textContent = 'Otomatik Kaydedildi';
        status.style.opacity = '1';
        setTimeout(() => { status.style.opacity = '0.7'; }, 2000);
      }
    }
  }

  getActivePageIndex() {
    const activeEl = document.activeElement;
    if (activeEl && activeEl.classList.contains('paper-sheet-content')) {
      return parseInt(activeEl.dataset.pageIndex) || 0;
    }
    return 0;
  }

  toggleFocusMode() {
    this.playClickSound();
    const container = document.getElementById('editor-container');
    container.classList.toggle('focus-mode');
    this.showToast(container.classList.contains('focus-mode') ? "Odak Modu Açıldı" : "Odak Modu Kapatıldı");
  }

  exportCurrentBookText() {
    // Legacy fallback — exports as TXT
    this.exportAs('txt');
  }

  toggleExportMenu(event) {
    event.stopPropagation();
    this.playClickSound();
    const menu = document.getElementById('export-dropdown-menu');
    if (menu) menu.classList.toggle('active');
  }

  closeExportMenu() {
    const menu = document.getElementById('export-dropdown-menu');
    if (menu) menu.classList.remove('active');
  }

  exportAs(format) {
    this.playPopSound();
    this.closeExportMenu();
    if (!this.currentBookTitle) return;

    this.saveCurrentBookText();
    const book = this.savedBooks.find(b => b.title === this.currentBookTitle);
    if (!book) return;

    switch (format) {
      case 'pdf':  this.exportAsPDF(book); break;
      case 'docx': this.exportAsDOCX(book); break;
      case 'txt':  this.exportAsTXT(book); break;
      case 'html': this.exportAsHTML(book); break;
      default:     this.exportAsTXT(book); break;
    }
  }

  /* -- TXT Export -- */
  exportAsTXT(book) {
    const htmlContent = book.content || '';
    const temp = document.createElement('div');
    temp.innerHTML = htmlContent;
    const plainText = temp.innerText || temp.textContent || '';

    const blob = new Blob([plainText], { type: 'text/plain;charset=utf-8' });
    this.downloadBlob(blob, `${book.title}.txt`);
    this.showToast("Metin .txt olarak indirildi.");
  }

  /* -- HTML Export -- */
  exportAsHTML(book) {
    const htmlContent = book.content || '';
    const fullHtml = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(book.title)}</title>
  <style>
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      max-width: 700px;
      margin: 2rem auto;
      padding: 0 1.5rem;
      line-height: 1.8;
      color: #2b2d42;
      background: #fdfbf7;
    }
    h1 {
      font-size: 2rem;
      border-bottom: 2px solid #40916c;
      padding-bottom: 0.5rem;
      color: #1b4332;
    }
    .meta { color: #888; font-size: 0.9rem; margin-bottom: 2rem; }
    p { margin-bottom: 1rem; text-indent: 1.5rem; }
  </style>
</head>
<body>
  <h1>${this.escapeHtml(book.title)}</h1>
  <p class="meta">Yazar: ${this.escapeHtml(book.author || 'Yazar')} — İMGE ile dışa aktarıldı</p>
  <div>${htmlContent}</div>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    this.downloadBlob(blob, `${book.title}.html`);
    this.showToast("Metin .html olarak indirildi.");
  }

  /* -- DOCX Export (Word uyumlu HTML-based .doc) -- */
  exportAsDOCX(book) {
    const htmlContent = book.content || '';
    const docContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:w="urn:schemas-microsoft-com:office:word"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>${this.escapeHtml(book.title)}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body {
            font-family: 'Calibri', 'Arial', sans-serif;
            font-size: 12pt;
            line-height: 1.6;
            color: #222;
          }
          h1 {
            font-size: 22pt;
            color: #1b4332;
            border-bottom: 1pt solid #40916c;
            padding-bottom: 6pt;
          }
          p { margin-bottom: 6pt; text-indent: 24pt; }
          .meta { color: #888; font-size: 10pt; margin-bottom: 18pt; }
        </style>
      </head>
      <body>
        <h1>${this.escapeHtml(book.title)}</h1>
        <p class="meta">Yazar: ${this.escapeHtml(book.author || 'Yazar')}</p>
        <div>${htmlContent}</div>
      </body>
      </html>`;

    const blob = new Blob(['\ufeff' + docContent], {
      type: 'application/msword'
    });
    this.downloadBlob(blob, `${book.title}.doc`);
    this.showToast("Metin .doc (Word) olarak indirildi.");
  }

  /* -- PDF Export (Tarayıcı Yazdırma Motoru) -- */
  exportAsPDF(book) {
    const htmlContent = book.content || '';

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.showToast("Açılır pencere engellendi. Lütfen tarayıcınızda izin verin.");
      return;
    }

    printWindow.document.write(`<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>${this.escapeHtml(book.title)} — PDF</title>
  <style>
    @page {
      size: A4;
      margin: 25mm 20mm 20mm 20mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Georgia', 'Times New Roman', 'Noto Serif', serif;
      font-size: 12pt;
      line-height: 1.8;
      color: #2b2d42;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .pdf-container {
      max-width: 700px;
      margin: 0 auto;
      padding: 2rem;
    }
    .pdf-title {
      font-size: 24pt;
      font-weight: 700;
      color: #1b4332;
      margin-bottom: 0.3rem;
      letter-spacing: -0.5px;
    }
    .pdf-author {
      font-size: 10pt;
      color: #888;
      margin-bottom: 0.8rem;
    }
    .pdf-divider {
      border: none;
      border-top: 2px solid #40916c;
      margin-bottom: 1.5rem;
    }
    .pdf-content p {
      margin-bottom: 0.8rem;
      text-indent: 1.5rem;
      text-align: justify;
      orphans: 3;
      widows: 3;
    }
    .pdf-content p:first-child {
      text-indent: 0;
    }
    .pdf-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 8pt;
      color: #aaa;
      padding: 8px 0;
      border-top: 1px solid #e0e0e0;
    }
    @media screen {
      body { background: #f5f5f5; padding: 2rem; }
      .pdf-container {
        background: #fff;
        box-shadow: 0 2px 20px rgba(0,0,0,0.1);
        border-radius: 8px;
        padding: 3rem;
        max-width: 800px;
      }
      .pdf-print-hint {
        text-align: center;
        padding: 1rem;
        margin-bottom: 1.5rem;
        background: #e8f5e9;
        border-radius: 8px;
        font-family: sans-serif;
        font-size: 10pt;
        color: #2e7d32;
      }
      .pdf-print-hint strong { display: block; margin-bottom: 4px; }
    }
    @media print {
      .pdf-print-hint { display: none !important; }
      .pdf-container { padding: 0; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="pdf-container">
    <div class="pdf-print-hint">
      <strong>📄 PDF olarak kaydetmek için:</strong>
      Yazdır penceresinde hedef olarak "PDF olarak kaydet" seçeneğini seçin.
    </div>
    <h1 class="pdf-title">${this.escapeHtml(book.title)}</h1>
    <p class="pdf-author">Yazar: ${this.escapeHtml(book.author || 'Yazar')}</p>
    <hr class="pdf-divider">
    <div class="pdf-content">${htmlContent}</div>
    <div class="pdf-footer">İMGE — Dijital Yazarlık Platformu</div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  <\/script>
</body>
</html>`);
    printWindow.document.close();
    this.showToast('PDF yazdırma penceresi açıldı. "PDF olarak kaydet" seçeneğini kullanın.');
  }

  /* -- Download Helper -- */
  downloadBlob(blob, filename) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 5000);
  }

  saveBookSettings() {
    this.playPopSound();
    if (!this.currentBookTitle) return;
    const book = this.savedBooks.find(b => b.title === this.currentBookTitle);
    if (!book) return;

    const newTitle = document.getElementById('setting-book-title').value.trim();
    if (newTitle && newTitle !== this.currentBookTitle) {
      this.bookPersons.forEach(p => { if (p.book_title === this.currentBookTitle) p.book_title = newTitle; });
      this.bookRelations.forEach(r => { if (r.book_title === this.currentBookTitle) r.book_title = newTitle; });
      book.title = newTitle;
      this.currentBookTitle = newTitle;
    }

    book.subject = document.getElementById('setting-book-subject').value.trim();
    const coverData = document.getElementById('setting-cover-data').value;
    if (coverData) book.cover = coverData;

    this.saveState();
    this.showToast("Kitap ayarları kaydedildi.");
    document.getElementById('current-page-title').textContent = `Kitap: ${this.currentBookTitle}`;
  }

  deleteCurrentBook() {
    if (!confirm(`"${this.currentBookTitle}" kitabını silmek istediğinize emin misiniz?`)) return;
    this.savedBooks = this.savedBooks.filter(b => b.title !== this.currentBookTitle);
    this.bookPersons = this.bookPersons.filter(p => p.book_title !== this.currentBookTitle);
    this.bookRelations = this.bookRelations.filter(r => r.book_title !== this.currentBookTitle);

    this.saveState();
    this.showToast("Kitap silindi.");
    this.closeBookWorkspace();
  }

  /* ------------------------------------------------------------------------
     6. İLİŞKİ HARİTASI (CANVAS PANNING & SCALE ZOOM SYSTEM)
     ------------------------------------------------------------------------ */
  renderCorkboard() {
    const nodesLayer = document.getElementById('corkboard-nodes-layer');
    if (!nodesLayer) return;

    nodesLayer.innerHTML = '';
    const persons = this.bookPersons.filter(p => p.book_title === this.currentBookTitle);

    persons.forEach(p => {
      const node = document.createElement('div');
      node.className = 'person-node';
      node.style.left = `${p.x || 200}px`;
      node.style.top = `${p.y || 200}px`;
      node.setAttribute('data-id', p.id);

      const initial = p.name ? p.name[0].toUpperCase() : 'K';

      node.innerHTML = `
        <div class="person-pin"></div>
        <div class="person-avatar" style="background-color: ${p.color || '#1b4332'};">
          ${initial}
        </div>
        <div class="person-name">${this.escapeHtml(p.name)}</div>
        <div class="person-trait">(${this.escapeHtml(p.job || 'Kişi')})</div>
      `;

      node.addEventListener('mousedown', (e) => this.startDragNode(e, p, node));
      node.addEventListener('dblclick', () => this.openEditPersonModal(p));

      nodesLayer.appendChild(node);
    });

    this.applyViewportTransform();
    this.drawRelationLines();
    this.renderCorkboardLegend();
  }

  startDragNode(e, personData, nodeElement) {
    e.stopPropagation();
    this.playPopSound();
    this.draggedNode = { data: personData, element: nodeElement };
    
    const parentRect = document.getElementById('corkboard-viewport').getBoundingClientRect();
    
    this.dragOffset = {
      x: (e.clientX - parentRect.left) / this.zoomLevel - personData.x,
      y: (e.clientY - parentRect.top) / this.zoomLevel - personData.y
    };

    const onMouseMove = (moveEvent) => {
      if (!this.draggedNode) return;

      const currentParentRect = document.getElementById('corkboard-viewport').getBoundingClientRect();
      const x = (moveEvent.clientX - currentParentRect.left) / this.zoomLevel - this.dragOffset.x;
      const y = (moveEvent.clientY - currentParentRect.top) / this.zoomLevel - this.dragOffset.y;

      personData.x = Math.max(20, Math.min(x, 2800));
      personData.y = Math.max(20, Math.min(y, 2200));

      nodeElement.style.left = `${personData.x}px`;
      nodeElement.style.top = `${personData.y}px`;

      this.drawRelationLines();
    };

    const onMouseUp = () => {
      if (this.draggedNode) {
        this.saveState();
        this.draggedNode = null;
      }
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  initCanvasPanning() {
    const container = document.getElementById('corkboard-container');
    if (!container) return;

    container.addEventListener('mousedown', (e) => {
      if (e.target.closest('.corkboard-toolbar') || e.target.closest('.corkboard-zoom-bar') || e.target.closest('.person-node')) {
        return;
      }

      this.isPanning = true;
      this.panStart = { x: e.clientX - this.panX, y: e.clientY - this.panY };
      container.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isPanning) return;
      this.panX = e.clientX - this.panStart.x;
      this.panY = e.clientY - this.panStart.y;
      this.applyViewportTransform();
    });

    window.addEventListener('mouseup', () => {
      if (this.isPanning) {
        this.isPanning = false;
        if (container) container.style.cursor = 'grab';
      }
    });

    // Mouse Wheel Zooming
    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      this.adjustZoom(delta);
    }, { passive: false });
  }

  adjustZoom(delta) {
    this.playZoomSound();
    this.zoomLevel = Math.max(0.4, Math.min(1.8, this.zoomLevel + delta));
    this.applyViewportTransform();
  }

  resetZoomAndPan() {
    this.playPopSound();
    this.zoomLevel = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.applyViewportTransform();
  }

  applyViewportTransform() {
    const viewport = document.getElementById('corkboard-viewport');
    if (viewport) {
      viewport.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoomLevel})`;
    }
    const display = document.getElementById('zoom-value-display');
    if (display) {
      display.textContent = `${Math.round(this.zoomLevel * 100)}%`;
    }
  }

  drawRelationLines() {
    const svg = document.getElementById('corkboard-svg');
    if (!svg) return;

    svg.innerHTML = '';

    const relations = this.bookRelations.filter(r => r.book_title === this.currentBookTitle);
    const activePersons = this.bookPersons.filter(p => p.book_title === this.currentBookTitle);

    relations.forEach(rel => {
      if (!this.activeRelationFilters[rel.type]) return;

      const pFrom = activePersons.find(p => p.id === rel.from_id);
      const pTo = activePersons.find(p => p.id === rel.to_id);

      if (pFrom && pTo) {
        const x1 = (pFrom.x || 200) + 70;
        const y1 = (pFrom.y || 200) + 50;
        const x2 = (pTo.x || 200) + 70;
        const y2 = (pTo.y || 200) + 50;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('class', `relation-line ${rel.type}`);

        svg.appendChild(line);

        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        // Background rect behind the label for readability
        const labelText = rel.type;
        const textWidth = labelText.length * 7 + 16;
        const textHeight = 20;

        const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bgRect.setAttribute('x', midX - textWidth / 2);
        bgRect.setAttribute('y', midY - textHeight / 2);
        bgRect.setAttribute('width', textWidth);
        bgRect.setAttribute('height', textHeight);
        bgRect.setAttribute('class', 'relation-label-bg');
        svg.appendChild(bgRect);

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', midX);
        text.setAttribute('y', midY);
        text.setAttribute('class', 'relation-label');
        text.textContent = labelText;

        svg.appendChild(text);
      }
    });
  }

  renderCorkboardLegend() {
    const container = document.getElementById('corkboard-container');
    if (!container) return;

    // Remove existing legend if any
    const existing = container.querySelector('.corkboard-legend');
    if (existing) existing.remove();

    const legendColors = {
      'Aile': '#2d6a4f',
      'Arkadaşlık': '#40916c',
      'Aşk': '#b08968',
      'Düşmanlık': '#9e2a2b'
    };

    const legend = document.createElement('div');
    legend.className = 'corkboard-legend';
    legend.id = 'corkboard-legend';

    let itemsHtml = '';
    for (const [type, color] of Object.entries(legendColors)) {
      itemsHtml += `
        <div class="legend-item">
          <span class="legend-line" style="background-color: ${color};"></span>
          <span>${type}</span>
        </div>
      `;
    }

    legend.innerHTML = `
      <div class="corkboard-legend-header" id="legend-drag-handle">
        <span>İlişki Türleri</span>
        <button class="corkboard-legend-close" onclick="app.closeCorkboardLegend()" title="Kapat">✕</button>
      </div>
      <div class="corkboard-legend-body">
        ${itemsHtml}
      </div>
    `;

    container.appendChild(legend);
    this.initLegendDrag(legend);
  }

  closeCorkboardLegend() {
    const legend = document.getElementById('corkboard-legend');
    if (legend) legend.classList.add('hidden');
  }

  showCorkboardLegend() {
    const legend = document.getElementById('corkboard-legend');
    if (legend) legend.classList.remove('hidden');
  }

  initLegendDrag(legendEl) {
    const handle = legendEl.querySelector('#legend-drag-handle');
    if (!handle) return;

    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    handle.addEventListener('mousedown', (e) => {
      if (e.target.closest('.corkboard-legend-close')) return;
      isDragging = true;
      const rect = legendEl.getBoundingClientRect();
      const parentRect = legendEl.parentElement.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const parentRect = legendEl.parentElement.getBoundingClientRect();
      let newLeft = e.clientX - parentRect.left - offsetX;
      let newTop = e.clientY - parentRect.top - offsetY;

      // Keep within parent bounds
      newLeft = Math.max(0, Math.min(newLeft, parentRect.width - legendEl.offsetWidth));
      newTop = Math.max(0, Math.min(newTop, parentRect.height - legendEl.offsetHeight));

      legendEl.style.left = `${newLeft}px`;
      legendEl.style.top = `${newTop}px`;
      legendEl.style.right = 'auto';
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  toggleRelationFilter(type, badgeEl) {
    this.playClickSound();
    this.activeRelationFilters[type] = !this.activeRelationFilters[type];
    badgeEl.classList.toggle('active', this.activeRelationFilters[type]);
    this.drawRelationLines();
  }

  /* ------------------------------------------------------------------------
     7. KARAKTERLER KLASÖRÜ & STRUCTURED PERSON CREATION
     ------------------------------------------------------------------------ */
  renderTemplatesGrid() {
    const container = document.getElementById('templates-grid-container');
    if (!container) return;
    const filterSelect = document.getElementById('templates-filter-select');
    
    // Sadece ilk seferde veya listeye yeni kitap eklendiğinde select'i güncelle:
    // Alfabetik sıra:
    const sortedBooks = [...this.savedBooks].sort((a,b) => a.title.localeCompare(b.title));
    const currentFilter = filterSelect ? filterSelect.value : 'Tümü';
    
    if (filterSelect) {
      let optionsHtml = '<option value="Tümü">Tümü</option>';
      sortedBooks.forEach(b => {
        const titleEscaped = this.escapeHtml(b.title);
        optionsHtml += `<option value="${titleEscaped}" ${currentFilter === titleEscaped ? 'selected' : ''}>${titleEscaped}</option>`;
      });
      filterSelect.innerHTML = optionsHtml;
    }

    const activeFilter = filterSelect ? filterSelect.value : 'Tümü';

    let html = '';
    
    let filteredPersons = this.bookPersons;
    if (activeFilter !== 'Tümü') {
      filteredPersons = this.bookPersons.filter(p => p.book_title === activeFilter);
    }
    
    filteredPersons.forEach(person => {
      const bookDisplay = person.book_title ? `Kitap: ${this.escapeHtml(person.book_title)}` : 'Henüz bir kitap belirtilmemiş';
      html += `
        <div class="template-card" onclick="app.openDossierSheetModal('${person.id}')">
          <span class="template-badge" style="background-color: ${person.color || '#1b4332'};">${this.escapeHtml(person.job || 'Kişi')}</span>
          <h4 style="font-family: var(--font-heading); font-size: 1.15rem; color: var(--text-primary);">${this.escapeHtml(person.name)}</h4>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">${this.escapeHtml(person.trait || '')}</p>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: auto; display: flex; justify-content: space-between;">
            <span>${bookDisplay}</span>
            <span>Detayları Gör →</span>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  renderBookCharactersGrid() {
    const container = document.getElementById('book-characters-grid-container');
    if (!container) return;

    const persons = this.bookPersons.filter(p => p.book_title === this.currentBookTitle);
    if (persons.length === 0) {
      container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.9rem; padding: 1rem;">Bu kitaba henüz karakter eklenmedi. Yukarıdaki "+ Yeni Karakter Ekle" butonuna tıklayarak ekleyebilirsiniz.</div>';
      return;
    }

    let html = '';
    persons.forEach(person => {
      html += `
        <div class="template-card" onclick="app.openDossierSheetModal('${person.id}')">
          <span class="template-badge" style="background-color: ${person.color || '#1b4332'};">${this.escapeHtml(person.job || 'Kişi')}</span>
          <h4 style="font-family: var(--font-heading); font-size: 1.15rem; color: var(--text-primary);">${this.escapeHtml(person.name)}</h4>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">${this.escapeHtml(person.trait || '')}</p>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: auto; display: flex; justify-content: space-between;">
            <span>${this.escapeHtml(person.gender || '')} • ${this.escapeHtml(person.age || '')}</span>
            <span>Detayları Gör →</span>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  openDossierSheetModal(personId) {
    this.playClickSound();
    const person = this.bookPersons.find(p => p.id === personId);
    if (!person) return;

    document.getElementById('dossier-name').textContent = person.name;
    document.getElementById('dossier-job').textContent = person.job || '-';
    document.getElementById('dossier-age').textContent = person.age || '-';
    document.getElementById('dossier-trait').textContent = person.trait || '-';
    document.getElementById('dossier-gender').textContent = person.gender || '-';
    document.getElementById('dossier-bio').textContent = person.bio || 'Biyografi bilgisi girilmemiş.';
    document.getElementById('dossier-author-note').textContent = person.authorNote || 'Yazar notu girilmemiş.';
    document.getElementById('dossier-book-tag').textContent = `Ait Olduğu Kitap: ${person.book_title}`;
    document.getElementById('modal-dossier-sheet').dataset.personId = personId;

    this.openModal('modal-dossier-sheet');
  }

  editPersonFromDossier() {
    const sheet = document.getElementById('modal-dossier-sheet');
    const personId = sheet.dataset.personId;
    if (!personId) return;
    const person = this.bookPersons.find(p => p.id === personId);
    if (person) {
      this.closeModal('modal-dossier-sheet');
      this.openEditPersonModal(person);
    }
  }

  openCreatePersonModal(isGlobal = false) {
    document.getElementById('modal-person-title').textContent = isGlobal ? 'Yeni Karakter Oluştur' : 'İlişki Haritasına Kişi Ekle';
    document.getElementById('person-id').value = '';
    document.getElementById('person-name').value = '';
    document.getElementById('person-job').value = '';
    document.getElementById('person-age').value = '';
    document.getElementById('person-trait').value = '';
    document.getElementById('person-gender-select').value = 'Erkek';
    document.getElementById('person-bio').value = '';
    document.getElementById('person-author-note').value = '';

    const bookGroup = document.getElementById('person-book-group');
    const bookSelect = document.getElementById('person-book-select');
    const importGroup = document.getElementById('person-import-group');
    const importSelect = document.getElementById('person-import-select');

    let optionsHtml = '<option value="">Henüz bir kitap belirtilmemiş</option>';
    this.savedBooks.forEach(b => {
      optionsHtml += `<option value="${this.escapeHtml(b.title)}">${this.escapeHtml(b.title)}</option>`;
    });
    if (bookSelect) bookSelect.innerHTML = optionsHtml;

    if (isGlobal) {
      if (bookGroup) bookGroup.style.display = 'block';
      if (bookSelect) bookSelect.value = '';
      if (importGroup) importGroup.style.display = 'none';
    } else {
      if (bookGroup) bookGroup.style.display = 'none';
      if (bookSelect) bookSelect.value = this.currentBookTitle || '';
      
      if (importGroup && importSelect) {
        importGroup.style.display = 'block';
        const unassigned = this.bookPersons.filter(p => !p.book_title);
        if (unassigned.length === 0) {
          importSelect.innerHTML = '<option value="">Atanmamış karakter yok</option>';
          importSelect.disabled = true;
        } else {
          let importHtml = '<option value="">Karakter Seçin...</option>';
          unassigned.forEach(p => {
            importHtml += `<option value="${p.id}">${this.escapeHtml(p.name)} (${this.escapeHtml(p.job || 'Kişi')})</option>`;
          });
          importSelect.innerHTML = importHtml;
          importSelect.disabled = false;
        }
      }
    }

    const btnDelete = document.getElementById('btn-delete-person');
    if (btnDelete) btnDelete.style.display = 'none';

    this.openModal('modal-person');
  }

  openEditPersonModal(person) {
    document.getElementById('modal-person-title').textContent = 'Kişi Detaylarını Düzenle';
    document.getElementById('person-id').value = person.id;
    document.getElementById('person-name').value = person.name;
    document.getElementById('person-job').value = person.job || '';
    document.getElementById('person-age').value = person.age || '';
    document.getElementById('person-trait').value = person.trait || '';
    document.getElementById('person-gender-select').value = person.gender || 'Erkek';
    document.getElementById('person-bio').value = person.bio || '';
    document.getElementById('person-author-note').value = person.authorNote || '';

    const bookGroup = document.getElementById('person-book-group');
    const bookSelect = document.getElementById('person-book-select');
    const importGroup = document.getElementById('person-import-group');
    
    let optionsHtml = '<option value="">Henüz bir kitap belirtilmemiş</option>';
    this.savedBooks.forEach(b => {
      optionsHtml += `<option value="${this.escapeHtml(b.title)}">${this.escapeHtml(b.title)}</option>`;
    });
    if (bookSelect) bookSelect.innerHTML = optionsHtml;
    
    if (bookGroup) bookGroup.style.display = 'block';
    if (bookSelect) bookSelect.value = person.book_title || '';
    if (importGroup) importGroup.style.display = 'none';

    const btnDelete = document.getElementById('btn-delete-person');
    if (btnDelete) btnDelete.style.display = 'inline-block';

    this.openModal('modal-person');
  }

  deletePersonFromModal() {
    const id = document.getElementById('person-id').value;
    if (!id) return;

    if (!confirm("Bu kişiyi ve ona bağlı tüm ilişkileri silmek istediğinize emin misiniz?")) return;

    this.playPopSound();
    this.bookPersons = this.bookPersons.filter(p => p.id !== id);
    this.bookRelations = this.bookRelations.filter(r => r.from_id !== id && r.to_id !== id);

    this.saveState();
    this.closeModal('modal-person');

    if (this.currentBookTab === 'corkboard' || this.currentBookTab === 'relations') {
      this.renderCorkboard();
    }
    this.renderTemplatesGrid();
    this.showToast("Kişi haritadan silindi.");
  }

  savePerson() {
    const id = document.getElementById('person-id').value;
    const name = document.getElementById('person-name').value.trim();
    
    if (!name) {
      this.showToast("Kişi adı boş bırakılamaz.");
      return;
    }

    this.playPopSound();
    const job = document.getElementById('person-job').value.trim();
    const age = document.getElementById('person-age').value.trim();
    const trait = document.getElementById('person-trait').value.trim();
    const gender = document.getElementById('person-gender-select').value;
    const color = '#1b4332'; // Default color for backward compatibility in corkboard
    const bio = document.getElementById('person-bio').value.trim();
    const authorNote = document.getElementById('person-author-note').value.trim();

    const bookSelectElement = document.getElementById('person-book-select');
    const bookTitle = bookSelectElement ? bookSelectElement.value : (this.currentBookTitle || '');

    if (id) {
      const p = this.bookPersons.find(item => item.id === id);
      if (p) {
        p.name = name;
        p.job = job;
        p.age = age;
        p.trait = trait;
        p.gender = gender;
        p.color = color;
        p.bio = bio;
        p.authorNote = authorNote;
        p.book_title = bookTitle;
      }
    } else {
      const newP = {
        id: 'p_' + Date.now(),
        name: name,
        book_title: bookTitle,
        job: job,
        age: age,
        trait: trait,
        gender: gender,
        color: color,
        bio: bio,
        authorNote: authorNote,
        x: 240 + Math.random() * 300,
        y: 200 + Math.random() * 200
      };
      this.bookPersons.push(newP);
    }

    this.saveState();
    this.closeModal('modal-person');

    if (this.currentBookTab === 'corkboard' || this.currentBookTab === 'relations') {
      this.renderCorkboard();
    }
    this.renderTemplatesGrid();
    this.renderBookCharactersGrid();
    this.showToast("Kişi bilgileri kaydedildi.");
  }

  importPersonFromSelect() {
    if (!this.currentBookTitle) return;
    const importSelect = document.getElementById('person-import-select');
    if (!importSelect || !importSelect.value) {
      this.showToast("Lütfen eklenecek karakteri seçin.");
      return;
    }
    
    const personId = importSelect.value;
    const p = this.bookPersons.find(x => x.id === personId);
    if (p) {
      p.book_title = this.currentBookTitle;
      this.saveState();
      this.closeModal('modal-person');
      this.renderBookCharactersGrid();
      this.renderTemplatesGrid();
      if (this.currentBookTab === 'corkboard' || this.currentBookTab === 'relations') {
        this.renderCorkboard();
      }
      this.showToast(`${p.name} başarıyla bu kitaba eklendi.`);
    }
  }

  openCreateRelationModal() {
    const persons = this.bookPersons.filter(p => p.book_title === this.currentBookTitle);
    if (persons.length < 2) {
      this.showToast("İlişki kurabilmek için haritada en az 2 kişi bulunmalıdır.");
      return;
    }

    const selectFrom = document.getElementById('relation-from');
    const selectTo = document.getElementById('relation-to');

    selectFrom.innerHTML = persons.map(p => `<option value="${p.id}">${this.escapeHtml(p.name)}</option>`).join('');
    selectTo.innerHTML = persons.map(p => `<option value="${p.id}">${this.escapeHtml(p.name)}</option>`).join('');

    this.renderExistingRelationsList();
    this.openModal('modal-relation');
  }

  renderExistingRelationsList() {
    const container = document.getElementById('existing-relations-list');
    if (!container) return;

    const relations = this.bookRelations.filter(r => r.book_title === this.currentBookTitle);
    if (relations.length === 0) {
      container.innerHTML = '<div style="font-size: 0.85rem; color: var(--text-muted); padding: 0.25rem;">Henüz tanımlı ilişki yok.</div>';
      return;
    }

    let html = '';
    relations.forEach(r => {
      const fromP = this.bookPersons.find(p => p.id === r.from_id);
      const toP = this.bookPersons.find(p => p.id === r.to_id);
      const fromName = fromP ? fromP.name : 'Bilinmeyen';
      const toName = toP ? toP.name : 'Bilinmeyen';

      html += `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.3rem 0; border-bottom: 1px dashed var(--border-color); font-size: 0.85rem;">
          <span><strong>${this.escapeHtml(fromName)}</strong> ↔ <strong>${this.escapeHtml(toName)}</strong> (${this.escapeHtml(r.type)})</span>
          <button style="background: none; border: none; color: #e63946; cursor: pointer; font-size: 0.8rem; font-weight: 600;" onclick="app.deleteRelation('${r.id}')">Sil</button>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  deleteRelation(id) {
    this.playPopSound();
    this.bookRelations = this.bookRelations.filter(r => r.id !== id);
    this.saveState();
    this.renderExistingRelationsList();
    this.renderCorkboard();
    this.showToast("İlişki silindi.");
  }

  saveRelation() {
    const fromId = document.getElementById('relation-from').value;
    const toId = document.getElementById('relation-to').value;
    const type = document.getElementById('relation-type').value;

    if (fromId === toId) {
      this.showToast("Bir kişi kendisiyle ilişkilendirilemez.");
      return;
    }

    this.playPopSound();
    const newRel = {
      id: 'r_' + Date.now(),
      from_id: fromId,
      to_id: toId,
      type: type,
      book_title: this.currentBookTitle
    };

    this.bookRelations.push(newRel);
    this.saveState();
    this.closeModal('modal-relation');
    this.renderCorkboard();
    this.showToast(`İlişki (${type}) eklendi.`);
  }

  /* ------------------------------------------------------------------------
     8. PROFIL VIEW
     ------------------------------------------------------------------------ */
  renderProfileView() {
    document.getElementById('profile-display-name').textContent = this.userProfile.name;
    document.getElementById('profile-display-email').textContent = this.userProfile.email;
    document.getElementById('profile-avatar-display').textContent = this.userProfile.name ? this.userProfile.name[0].toUpperCase() : 'A';

    document.getElementById('profile-input-name').value = this.userProfile.name;
    document.getElementById('profile-input-email').value = this.userProfile.email;
    document.getElementById('profile-input-bio').value = this.userProfile.bio || '';
  }

  saveProfile() {
    this.playPopSound();
    const name = document.getElementById('profile-input-name').value.trim();
    const email = document.getElementById('profile-input-email').value.trim();
    const bio = document.getElementById('profile-input-bio').value.trim();

    if (!name) return;

    this.userProfile.name = name;
    this.userProfile.email = email;
    this.userProfile.bio = bio;

    if (this.savedBooks && this.savedBooks.length > 0) {
      this.savedBooks.forEach(book => {
        book.author = name;
      });
    }

    this.saveState();

    document.getElementById('header-user-name').textContent = name;
    document.getElementById('header-user-initial').textContent = name[0].toUpperCase();

    this.renderProfileView();
    this.renderBooksGrid();
    this.showToast("Profil bilgileriniz güncellendi.");
  }

  /* ------------------------------------------------------------------------
     9. UTILITIES & EVENT LISTENERS
     ------------------------------------------------------------------------ */
  showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${this.escapeHtml(message)}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /* ------------------------------------------------------------------------
     CARET / CURSOR MANAGEMENT
     ------------------------------------------------------------------------ */
  initCaret() {
    // Create the blinking caret element if not exists
    if (!document.getElementById('editor-caret')) {
      const caret = document.createElement('div');
      caret.id = 'editor-caret';
      caret.className = 'editor-caret';
      caret.innerHTML = '<div class="caret-line"></div>';
      document.body.appendChild(caret);
    }
    this.startCaretBlink();
  }

  startCaretBlink() {
    if (this.caretBlinkInterval) clearInterval(this.caretBlinkInterval);
    const caret = document.getElementById('editor-caret');
    if (!caret) return;
    caret.classList.add('blinking');
  }

  updateCaretPosition() {
    const caret = document.getElementById('editor-caret');
    if (!caret) return;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      caret.style.display = 'none';
      return;
    }

    // Only show caret when editor is focused
    const activeEl = document.activeElement;
    const isEditorFocused = activeEl && activeEl.classList.contains('paper-sheet-content');
    if (!isEditorFocused) {
      caret.style.display = 'none';
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (rect.width === 0 && rect.height === 0 && rect.left === 0 && rect.top === 0) {
      // For empty elements or exact text node boundaries, getBoundingClientRect returns 0
      // We use a temporary zero-width character span to find the exact coordinates
      const span = document.createElement('span');
      span.appendChild(document.createTextNode('\u200b')); // zero-width space
      
      // Preserve range state
      const startContainer = range.startContainer;
      const startOffset = range.startOffset;
      
      try {
        range.insertNode(span);
        const spanRect = span.getBoundingClientRect();
        
        caret.style.display = 'block';
        caret.style.left = `${spanRect.left + window.scrollX}px`;
        caret.style.top = `${spanRect.top + window.scrollY}px`;
        caret.style.height = `${spanRect.height || 24}px`;
        
        // Clean up
        span.remove();
        
        // Restore range
        const newRange = document.createRange();
        newRange.setStart(startContainer, startOffset);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
      } catch (err) {
        caret.style.display = 'none';
      }
    } else {
      caret.style.display = 'block';
      caret.style.left = `${rect.left + (range.collapsed ? 0 : rect.width) + window.scrollX}px`;
      caret.style.top = `${rect.top + window.scrollY}px`;
      caret.style.height = `${rect.height || 24}px`;
    }

    // Toggle blinking based on typing state
    if (this.isTyping) {
      caret.classList.remove('blinking');
      caret.classList.add('solid');
    } else {
      caret.classList.remove('solid');
      caret.classList.add('blinking');
    }
  }

  scrollToCaretIfNeeded(force = false) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    
    // Check if user has explicitly asked to stop typing
    if (!this.isTyping && !force) return;

    try {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // If the selection has no bounds, it might be an empty text node
      if (rect.top === 0 && rect.bottom === 0) {
        let node = range.startContainer;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
        if (node && node.getBoundingClientRect) {
          const nodeRect = node.getBoundingClientRect();
          this.scrollRectIntoView(nodeRect);
        }
        return;
      }
      
      this.scrollRectIntoView(rect);
    } catch (e) {
      // Ignore
    }
  }

  scrollRectIntoView(rect) {
    const viewportHeight = window.innerHeight;
    const headerOffset = 60; // top-navbar height
    const padding = 100; // padding to keep caret from being exactly at the edge

    if (rect.bottom > viewportHeight - padding) {
      // Scroll down
      window.scrollBy({ top: rect.bottom - viewportHeight + padding, left: 0, behavior: 'smooth' });
    } else if (rect.top < headerOffset + padding) {
      // Scroll up
      window.scrollBy({ top: rect.top - headerOffset - padding, left: 0, behavior: 'smooth' });
    }
  }

  /* ------------------------------------------------------------------------
     EDITOR ZOOM & HEADER/FOOTER SYNC
     ------------------------------------------------------------------------ */
  adjustEditorZoom(delta) {
    this.playClickSound();
    this.editorZoomLevel = Math.max(0.5, Math.min(2.5, this.editorZoomLevel + delta));
    this.applyEditorZoom();
  }

  resetEditorZoom() {
    this.playClickSound();
    this.editorZoomLevel = 1.0;
    this.applyEditorZoom();
  }

  applyEditorZoom() {
    const container = document.getElementById('editor-pages-container');
    const display = document.getElementById('editor-zoom-display');
    if (container) {
      container.style.transform = `scale(${this.editorZoomLevel})`;
    }
    if (display) {
      display.textContent = `${Math.round(this.editorZoomLevel * 100)}%`;
    }
  }

  getGlobalHeaderContent() {
    return this.globalHeader || "Üst Bilgi Ekle (Çift Tıkla)";
  }

  getGlobalFooterContent() {
    return this.globalFooter || "İMGE Taslak";
  }

  editHeaderFooter(element, type) {
    this.playClickSound();
    element.contentEditable = "true";
    element.focus();
    
    // Select all text inside
    const range = document.createRange();
    const sel = window.getSelection();
    // Assuming the text is in a span inside the header/footer
    const targetSpan = element.querySelector(type === 'header' ? '.header-text' : '.footer-text');
    if (targetSpan) {
      range.selectNodeContents(targetSpan);
      sel.removeAllRanges();
      sel.addRange(range);
    }

    const onBlur = () => {
      element.contentEditable = "false";
      element.removeEventListener('blur', onBlur);
      const newText = targetSpan ? targetSpan.innerText.trim() : element.innerText.trim();
      this.syncHeaderFooter(newText, type);
    };

    const onKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        element.blur(); // Triggers onBlur
      }
    };

    element.addEventListener('blur', onBlur);
    element.addEventListener('keydown', onKeyDown, { once: true });
  }

  syncHeaderFooter(newText, type) {
    if (type === 'header') {
      this.globalHeader = newText || "Üst Bilgi";
      document.querySelectorAll('.paper-sheet-header .header-text').forEach(el => el.textContent = this.globalHeader);
    } else {
      this.globalFooter = newText || "Alt Bilgi";
      document.querySelectorAll('.paper-sheet-footer .footer-text').forEach(el => el.textContent = this.globalFooter);
    }
  }

  hideCaret() {
    const caret = document.getElementById('editor-caret');
    if (caret) caret.style.display = 'none';
  }

  /* ------------------------------------------------------------------------
     ANALYTICS & STATISTICS SYSTEM
     ------------------------------------------------------------------------ */
  trackBookChange(bookTitle, oldContent, newContent) {
    if (!this.bookAnalytics[bookTitle]) {
      this.bookAnalytics[bookTitle] = {
        totalEdits: 0,
        wordCountHistory: [],
        lastEditDate: null,
        createdDate: new Date().toISOString(),
        sessions: []
      };
    }

    const analytics = this.bookAnalytics[bookTitle];
    const oldText = this.stripHtmlForCount(oldContent);
    const newText = this.stripHtmlForCount(newContent);
    const oldWordCount = oldText.trim() ? oldText.trim().split(/\s+/).length : 0;
    const newWordCount = newText.trim() ? newText.trim().split(/\s+/).length : 0;

    analytics.totalEdits++;
    analytics.lastEditDate = new Date().toISOString();
    analytics.wordCountHistory.push({
      timestamp: new Date().toISOString(),
      wordCount: newWordCount,
      delta: newWordCount - oldWordCount
    });

    // Keep only last 100 entries
    if (analytics.wordCountHistory.length > 100) {
      analytics.wordCountHistory = analytics.wordCountHistory.slice(-100);
    }

    this.saveAnalytics();
  }

  stripHtmlForCount(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return tmp.innerText || '';
  }

  saveAnalytics() {
    localStorage.setItem('imagefiction_analytics', JSON.stringify(this.bookAnalytics));
  }

  openAnalyticsPanel() {
    this.playClickSound();
    const modal = document.getElementById('modal-analytics');
    if (modal) {
      this.renderAnalyticsContent();
      modal.classList.add('active');
    }
  }

  closeAnalyticsPanel() {
    this.playClickSound();
    const modal = document.getElementById('modal-analytics');
    if (modal) modal.classList.remove('active');
  }

  renderAnalyticsContent() {
    const container = document.getElementById('analytics-content');
    if (!container) return;

    // Calculate total stats across all books
    let totalWords = 0;
    let totalEdits = 0;
    let totalChars = 0;

    const bookStats = [];

    this.savedBooks.forEach(book => {
      const text = this.stripHtmlForCount(book.content || '');
      const normalizedText = text.trim().replace(/\s+/g, ' ');
      const words = normalizedText ? normalizedText.split(' ').length : 0;
      
      const personsCount = this.bookPersons ? this.bookPersons.filter(p => p.book_title === book.title).length : 0;
      
      totalWords += words;
      totalChars += personsCount;

      const analytics = this.bookAnalytics[book.title] || { totalEdits: 0, wordCountHistory: [], lastEditDate: null };
      totalEdits += analytics.totalEdits;

      // Calculate today's word delta
      const today = new Date().toDateString();
      let todayDelta = 0;
      if (analytics.wordCountHistory) {
        analytics.wordCountHistory.forEach(entry => {
          if (new Date(entry.timestamp).toDateString() === today) {
            todayDelta += (entry.delta || 0);
          }
        });
      }

      bookStats.push({
        title: book.title,
        words,
        chars: personsCount,
        edits: analytics.totalEdits,
        lastEdit: analytics.lastEditDate,
        todayDelta,
        pages: Math.ceil(words / 250) || 1
      });
    });

    // Build HTML
    let html = `
      <div class="analytics-summary">
        <div class="analytics-stat-card">
          <div class="analytics-stat-value">${totalWords.toLocaleString()}</div>
          <div class="analytics-stat-label">Toplam Kelime</div>
        </div>
        <div class="analytics-stat-card">
          <div class="analytics-stat-value">${totalChars.toLocaleString()}</div>
          <div class="analytics-stat-label">Toplam Kişi</div>
        </div>
        <div class="analytics-stat-card">
          <div class="analytics-stat-value">${totalEdits.toLocaleString()}</div>
          <div class="analytics-stat-label">Toplam Düzenleme</div>
        </div>
        <div class="analytics-stat-card">
          <div class="analytics-stat-value">${this.savedBooks.length}</div>
          <div class="analytics-stat-label">Toplam Kitap</div>
        </div>
      </div>

      <h4 class="analytics-section-title">Kitap Bazlı İstatistikler</h4>
      <div class="analytics-table-wrapper">
        <table class="analytics-table">
          <thead>
            <tr>
              <th>Kitap</th>
              <th>Kelime</th>
              <th>Kişi</th>
              <th>Sayfa</th>
              <th>Bugün</th>
              <th>Düzenleme</th>
              <th>Son Düzenleme</th>
            </tr>
          </thead>
          <tbody>
    `;

    bookStats.forEach(stat => {
      const deltaClass = stat.todayDelta > 0 ? 'positive' : stat.todayDelta < 0 ? 'negative' : '';
      const deltaText = stat.todayDelta > 0 ? `+${stat.todayDelta}` : stat.todayDelta === 0 ? '—' : `${stat.todayDelta}`;
      const lastEditStr = stat.lastEdit
        ? new Date(stat.lastEdit).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
        : 'Henüz yok';

      html += `
        <tr>
          <td class="analytics-book-name">${this.escapeHtml(stat.title)}</td>
          <td>${stat.words.toLocaleString()}</td>
          <td>${stat.chars.toLocaleString()}</td>
          <td>${stat.pages}</td>
          <td class="analytics-delta ${deltaClass}">${deltaText}</td>
          <td>${stat.edits}</td>
          <td class="analytics-date">${lastEditStr}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>

      <h4 class="analytics-section-title">Kelime İlerleme Grafiği</h4>
      <div class="analytics-chart" id="analytics-chart"></div>
    `;

    container.innerHTML = html;

    // Render simple bar chart
    this.renderAnalyticsChart(bookStats);
  }

  renderAnalyticsChart(bookStats) {
    const chartContainer = document.getElementById('analytics-chart');
    if (!chartContainer) return;

    const maxWords = Math.max(...bookStats.map(s => s.words), 1);

    let chartHtml = '<div class="chart-bars">';
    bookStats.forEach(stat => {
      const pct = (stat.words / maxWords * 100).toFixed(1);
      chartHtml += `
        <div class="chart-bar-group">
          <div class="chart-bar-label">${this.escapeHtml(stat.title)}</div>
          <div class="chart-bar-track">
            <div class="chart-bar-fill" style="width: ${pct}%">
              <span>${stat.words.toLocaleString()}</span>
            </div>
          </div>
        </div>
      `;
    });
    chartHtml += '</div>';

    chartContainer.innerHTML = chartHtml;
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  escapeQuotes(str) {
    if (!str) return '';
    return String(str).replace(/'/g, "\\'");
  }

  slugify(str) {
    if (!str) return 'slug';
    return String(str).toLowerCase().replace(/[^a-z0-9]/g, '-');
  }

  initEventListeners() {
    this.initCanvasPanning();

    window.addEventListener('resize', () => {
      if (this.currentBookTab === 'corkboard' || this.currentBookTab === 'relations') {
        this.drawRelationLines();
      }
    });

    // Track cursor position changes for caret
    document.addEventListener('selectionchange', () => {
      this.updateCaretPosition();
    });

    document.addEventListener('keydown', (e) => {
      // Work with any focused paper-sheet-content, not just the first one
      const activeEl = document.activeElement;
      const isEditor = activeEl && activeEl.classList.contains('paper-sheet-content');
      if (!isEditor) return;

      const ghost = document.getElementById('editor-ghost-text');
      if (ghost) {
        if (e.key === 'Tab') {
          e.preventDefault();
          this.acceptGhostSuggestion();
        } else if (!['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) {
          this.clearGhostSuggestion();
        }
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.book-menu-btn') && !e.target.closest('.book-context-menu')) {
        this.closeAllContextMenus();
      }
      if (!e.target.closest('.export-dropdown-wrapper')) {
        this.closeExportMenu();
      }
      
      if (e.target.closest('button') || e.target.closest('.filter-badge') || e.target.closest('.nav-item') || e.target.closest('.book-card')) {
        this.playClickSound();
      }

      // Update caret when clicking in editor
      if (e.target.closest('.paper-sheet-content')) {
        setTimeout(() => this.updateCaretPosition(), 10);
      }
    });

    // Handle scroll - update caret position on scroll
    window.addEventListener('scroll', () => {
      this.updateCaretPosition();
    });
  }
}

// Instant Initialization
window.app = new ImagefictionApp();

