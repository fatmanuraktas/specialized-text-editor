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
    this.userProfile = {
      name: "Yazar",
      email: "yazar@imagefiction.com",
      bio: "Imagefiction platformunda hikayeler kurgulayan ve karakter ilişkilerini haritalandıran tutkulu yazar.",
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
      ragHybridMode: this.ragHybridMode
    };
    localStorage.setItem('imagefiction_state', JSON.stringify(data));
  }

  /* ------------------------------------------------------------------------
     3. NAVIGATION & THEME CONTROLLER
     ------------------------------------------------------------------------ */
  showScreen(screenId) {
    console.log("➡️ [Imagefiction] Ekran Değiştirildi ->", screenId);
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
      'Yazma': 'view-books',
      'İlişki Haritası': 'view-books',
      'Karakterler': 'view-templates',
      'Profil': 'view-profile'
    };

    Object.values(viewMap).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    if (['Yazma'].includes(segmentName)) {
      if (this.savedBooks.length > 0) {
        const bookToOpen = (this.currentBookTitle && this.savedBooks.some(b => b.title === this.currentBookTitle))
          ? this.currentBookTitle
          : this.savedBooks[0].title;
        this.openBookWorkspace(bookToOpen, 'editor');
        return;
      }
    }

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
            <span>Imagefiction Taslak</span>
          </div>
        </div>
      `;
    }

    this.setEditorText(book.content || '');

    document.getElementById('setting-book-title').value = book.title;
    document.getElementById('setting-book-subject').value = book.subject || '';
    document.getElementById('setting-cover-data').value = book.cover || '';

    this.switchBookTab(targetTab);

    if (targetTab === 'editor') {
      this.onEditorInput();
    }
  }

  setEditorText(text) {
    const editor = document.getElementById('rich-editor-content');
    if (!editor) return;
    if (!text || !text.trim()) {
      editor.innerHTML = '<p><br></p>';
      return;
    }

    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    if (paragraphs.length > 0) {
      editor.innerHTML = paragraphs.map(p => `<p>${this.escapeHtml(p)}</p>`).join('');
    } else {
      editor.innerHTML = `<p>${this.escapeHtml(text)}</p>`;
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
      if (el) el.style.display = (tabName === 'editor' ? 'flex' : 'block');
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

  formatText(command) {
    this.playClickSound();
    document.execCommand(command, false, null);
    this.onEditorInput();
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

    for (let i = 0; i < sheets.length; i++) {
      const sheet = sheets[i];
      const pageEl = sheet.querySelector('.paper-sheet-content');
      if (!pageEl) continue;

      let loopGuard = 0;
      // When text height exceeds page boundary, overflow into next page sheet
      while (pageEl.scrollHeight > pageEl.clientHeight && pageEl.clientHeight > 0 && loopGuard < 40) {
        loopGuard++;
        let nextSheet = sheets[i + 1];
        if (!nextSheet) {
          const newSheetNum = sheets.length + 1;
          nextSheet = document.createElement('div');
          nextSheet.className = 'paper-sheet';
          nextSheet.dataset.page = newSheetNum;
          nextSheet.innerHTML = `
            <div class="paper-sheet-header">
              <span>Sayfa ${newSheetNum}</span>
            </div>
            <div class="paper-sheet-content" contenteditable="true" data-page-index="${sheets.length}"></div>
            <div class="paper-sheet-footer">
              <span>Imagefiction Taslak</span>
            </div>
          `;
          container.appendChild(nextSheet);

          const newContent = nextSheet.querySelector('.paper-sheet-content');
          newContent.addEventListener('input', () => this.onEditorInput());
          sheets.push(nextSheet);
        }

        const nextPageEl = nextSheet.querySelector('.paper-sheet-content');
        const lastChild = pageEl.lastChild;
        if (!lastChild || pageEl.childNodes.length <= 1) break;

        if (lastChild.id === 'editor-ghost-text') {
          this.clearGhostSuggestion();
          continue;
        }

        if (nextPageEl.firstChild) {
          nextPageEl.insertBefore(lastChild, nextPageEl.firstChild);
        } else {
          nextPageEl.appendChild(lastChild);
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

    // Update statusbar page count
    const activePageCount = container.querySelectorAll('.paper-sheet').length;
    const statPage = document.getElementById('stat-page-count');
    if (statPage) statPage.textContent = `${activePageCount}`;
  }

  onEditorInput() {
    this.clearGhostSuggestion();

    this.handlePageOverflow();

    const text = this.getPureEditorText();
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;

    const elWords = document.getElementById('stat-word-count');
    const elChars = document.getElementById('stat-char-count');
    if (elWords) elWords.textContent = words.toLocaleString();
    if (elChars) elChars.textContent = chars.toLocaleString();

    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveCurrentBookText();
    }, 1000);
  }

  saveCurrentBookText() {
    if (!this.currentBookTitle) return;
    const book = this.savedBooks.find(b => b.title === this.currentBookTitle);
    if (book) {
      book.content = this.getPureEditorText();
      this.saveState();
      
      const status = document.getElementById('editor-autosave-status');
      if (status) {
        status.textContent = 'Otomatik Kaydedildi';
        status.style.opacity = '1';
        setTimeout(() => { status.style.opacity = '0.7'; }, 2000);
      }
    }
  }

  toggleFocusMode() {
    this.playClickSound();
    const container = document.getElementById('editor-container');
    container.classList.toggle('focus-mode');
    this.showToast(container.classList.contains('focus-mode') ? "Odak Modu Açıldı" : "Odak Modu Kapatıldı");
  }

  exportCurrentBookText() {
    this.playPopSound();
    if (!this.currentBookTitle) return;
    const book = this.savedBooks.find(b => b.title === this.currentBookTitle);
    const content = book ? book.content : '';

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${this.currentBookTitle}.txt`;
    link.click();
    this.showToast("Metin .txt olarak indirildi.");
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

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', midX);
        text.setAttribute('y', midY);
        text.setAttribute('class', 'relation-label');
        text.textContent = rel.type;

        svg.appendChild(text);
      }
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

    let html = '';
    this.bookPersons.forEach(person => {
      html += `
        <div class="template-card" onclick="app.openDossierSheetModal('${person.id}')">
          <span class="template-badge" style="background-color: ${person.color || '#1b4332'};">${this.escapeHtml(person.job || 'Kişi')}</span>
          <h4 style="font-family: var(--font-heading); font-size: 1.15rem; color: var(--text-primary);">${this.escapeHtml(person.name)}</h4>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">${this.escapeHtml(person.trait || '')}</p>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: auto; display: flex; justify-content: space-between;">
            <span>Kitap: ${this.escapeHtml(person.book_title)}</span>
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
    document.getElementById('dossier-book-tag').textContent = `Ait Olduğu Kitap: ${person.book_title}`;

    this.openModal('modal-dossier-sheet');
  }

  openCreatePersonModal() {
    document.getElementById('modal-person-title').textContent = 'İlişki Haritasına Kişi Ekle';
    document.getElementById('person-id').value = '';
    document.getElementById('person-name').value = '';
    document.getElementById('person-job-select').value = 'Dedektif';
    document.getElementById('person-age-select').value = 'Yetişkin (26-45)';
    document.getElementById('person-trait-select').value = 'Analitik & Soğukkanlı';
    document.getElementById('person-gender-select').value = 'Erkek';
    document.getElementById('person-color-select').value = '#1b4332';
    document.getElementById('person-bio').value = '';

    const btnDelete = document.getElementById('btn-delete-person');
    if (btnDelete) btnDelete.style.display = 'none';

    this.openModal('modal-person');
  }

  openEditPersonModal(person) {
    document.getElementById('modal-person-title').textContent = 'Kişi Detaylarını Düzenle';
    document.getElementById('person-id').value = person.id;
    document.getElementById('person-name').value = person.name;
    document.getElementById('person-job-select').value = person.job || 'Dedektif';
    document.getElementById('person-age-select').value = person.age || 'Yetişkin (26-45)';
    document.getElementById('person-trait-select').value = person.trait || 'Analitik & Soğukkanlı';
    document.getElementById('person-gender-select').value = person.gender || 'Erkek';
    document.getElementById('person-color-select').value = person.color || '#1b4332';
    document.getElementById('person-bio').value = person.bio || '';

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
    const job = document.getElementById('person-job-select').value;
    const age = document.getElementById('person-age-select').value;
    const trait = document.getElementById('person-trait-select').value;
    const gender = document.getElementById('person-gender-select').value;
    const color = document.getElementById('person-color-select').value;
    const bio = document.getElementById('person-bio').value.trim();

    const bookTitle = this.currentBookTitle || (this.savedBooks[0] ? this.savedBooks[0].title : 'Vaka');

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
    this.showToast("Kişi bilgileri kaydedildi.");
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

    this.saveState();

    document.getElementById('header-user-name').textContent = name;
    document.getElementById('header-user-initial').textContent = name[0].toUpperCase();

    this.renderProfileView();
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

    document.addEventListener('keydown', (e) => {
      const editor = document.getElementById('rich-editor-content');
      if (!editor || document.activeElement !== editor) return;

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
      
      if (e.target.closest('button') || e.target.closest('.filter-badge') || e.target.closest('.nav-item') || e.target.closest('.book-card')) {
        this.playClickSound();
      }
    });
  }
}

// Instant Initialization
window.app = new ImagefictionApp();

