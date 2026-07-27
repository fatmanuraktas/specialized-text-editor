/* ==========================================================================
   TEXTINATION - Modern Web Yazar Editörü & Polisiye Pano App Engine
   ========================================================================== */

class TextinationApp {
  constructor() {
    this.currentBookTitle = null;
    this.currentBookTab = 'editor';
    this.draggedNode = null;
    this.dragOffset = { x: 0, y: 0 };
    this.activeRelationFilters = {
      Aile: true,
      Arkadaşlık: true,
      Aşk: true,
      Düşmanlık: true
    };

    // Preset prompts for writing exercises
    this.promptsPool = [
      "Eski bir kütüphanede bulduğun haritanın üzerinde adın yazıyordu. Olaylar nasıl gelişir?",
      "Kasabanın tek saat kulesi gece yarısından sonra tersine işlemeye başlar...",
      "Yıllar önce kaybolan ikiz kardeşinden gelen isimsiz bir mektup aldın.",
      "Gecenin son treninde sadece sen ve yüzünü gizleyen bir yolcu var.",
      "Bir tabloya her baktığında içindeki detayların yer değiştirdiğini fark ediyorsun."
    ];

    // Initialize application state
    this.loadState();
    this.initEventListeners();
    this.applyTheme();
    this.renderCurrentView();
  }

  /* ------------------------------------------------------------------------
     STATE MANAGEMENT & LOCAL STORAGE PERSISTENCE
     ------------------------------------------------------------------------ */
  loadState() {
    const saved = localStorage.getItem('textination_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.userProfile = parsed.userProfile;
        this.savedBooks = parsed.savedBooks;
        this.characterTemplates = parsed.characterTemplates;
        this.bookPersons = parsed.bookPersons;
        this.bookRelations = parsed.bookRelations;
        this.locations = parsed.locations || this.getDefaultLocations();
        this.isDarkMode = parsed.isDarkMode || false;
        return;
      } catch (e) {
        console.error("Failed to parse saved state", e);
      }
    }

    // Default state derived from PyQt6 yazar_editoru.py
    this.isDarkMode = false;
    this.userProfile = {
      name: "Antigravity Yazar",
      email: "yazar@textination.com",
      bio: "Textination üzerinde hikayeler kaleme alan tutkulu bir yazar.",
      avatarPath: ""
    };

    this.savedBooks = [
      {
        title: "Zamanın Ötesinde",
        subject: "Gelecek ile geçmiş arasında sıkışan bir dedektifin öyküsü.",
        cover: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop",
        author: "Antigravity Yazar",
        content: "Gecenin karanlığı şehri kapladığında, eski saatin tiktakları yankılanıyordu. Dedektif Ahmet Yılmaz, masasının üzerindeki sararmış dosyaları karıştırırken sokaktan gelen hafif adımları duydu. Her şey o gizemli saatin durduğu an başlamıştı..."
      },
      {
        title: "Sisli Şehir",
        subject: "Gizemli olayların yaşandığı kasabada geçen macera.",
        cover: "https://images.unsplash.com/photo-1485871981521-5b1017957861?q=80&w=800&auto=format&fit=crop",
        author: "Antigravity Yazar",
        content: "Kasabaya ilk kar düşüp yoğun bir sis kapladığında, herkes kütüphanenin ışıklarının ansızın söndüğünü fark etti. Doktor Canan Şahin, elindeki fenerle kütüphaneye doğru adımlarken sisin arasından fısıltılar yükseliyordu..."
      }
    ];

    this.characterTemplates = [
      {
        id: "tpl_1",
        trait: "İçine kapanık memur",
        age: "32",
        gender: "Erkek",
        job: "Kütüphaneci",
        demographics: "Kentli orta sınıf",
        politics: "Apolitik",
        bio: "Kurallara bağlı, sessiz, eski haritalar konusunda uzman bir kamu çalışanı.",
        color: "#3498DB"
      },
      {
        id: "tpl_2",
        trait: "Hırslı akademisyen",
        age: "29",
        gender: "Kadın",
        job: "Biyokimya Araştırmacısı",
        demographics: "Üst orta sınıf",
        politics: "Sosyal Demokrat",
        bio: "Kendi laboratuvarını kurmak isteyen idealist bilim insanı.",
        color: "#E74C3C"
      },
      {
        id: "tpl_3",
        trait: "Eski tüfek dedektif",
        age: "55",
        gender: "Erkek",
        job: "Emekli Polis",
        demographics: "Geleneksel mahalle sakini",
        politics: "Muhafazakar",
        bio: "Yılların birikimiyle insanları ilk bakışta çözen tecrübeli gözlemci.",
        color: "#27AE60"
      }
    ];

    this.bookPersons = [
      // Zamanın Ötesinde
      { id: "p1", name: "Ahmet Yılmaz", book_title: "Zamanın Ötesinde", trait: "İçine kapanık memur", age: "32", gender: "Erkek", job: "Araştırmacı Dedektif", bio: "Geceleri saha araştırması yapan eski memur.", color: "#3498DB", x: 120, y: 150 },
      { id: "p2", name: "Zeynep Kaya", book_title: "Zamanın Ötesinde", trait: "Hırslı akademisyen", age: "29", gender: "Kadın", job: "Biyokimyager", bio: "Vakadaki anahtar delilleri inceleyen uzman.", color: "#E74C3C", x: 380, y: 120 },
      { id: "p3", name: "Mehmet Demir", book_title: "Zamanın Ötesinde", trait: "Eski tüfek dedektif", age: "55", gender: "Erkek", job: "Kütüphaneci", bio: "Ahmet'in amcası ve danışmanı.", color: "#27AE60", x: 220, y: 350 },
      { id: "p4", name: "Elif Demir", book_title: "Zamanın Ötesinde", trait: "Genç gazeteci", age: "24", gender: "Kadın", job: "Muhabir", bio: "Mehmet'in kızı ve olayın izini süren muhabir.", color: "#F39C12", x: 480, y: 320 },

      // Sisli Şehir
      { id: "p5", name: "Canan Şahin", book_title: "Sisli Şehir", trait: "Gizemli kasaba doktoru", age: "34", gender: "Kadın", job: "Doktor", bio: "Kasabadaki sırları çözen hekim.", color: "#9B59B6", x: 160, y: 180 },
      { id: "p6", name: "Burak Şahin", book_title: "Sisli Şehir", trait: "Canan'ın kardeşi", age: "28", gender: "Erkek", job: "Eczacı", bio: "Canan'ın öz kardeşi.", color: "#1ABC9C", x: 420, y: 180 },
      { id: "p7", name: "Deniz Arslan", book_title: "Sisli Şehir", trait: "Araştırmacı gazeteci", age: "31", gender: "Erkek", job: "Gazeteci", bio: "Canan ile ortak hareket eden gazeteci.", color: "#E67E22", x: 290, y: 360 }
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

    this.locations = this.getDefaultLocations();
    this.saveState();
  }

  getDefaultLocations() {
    return [
      { title: "Tarihi Saat Kulesi", desc: "Sisli gecelerde tiktak sesleri tüm kasabada yankılanır.", img: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=800&auto=format&fit=crop" },
      { title: "Eski Sahaflar Çarşısı", desc: "Tozlu raflar ve sararmış elyazmalarının kokusu hakimdir.", img: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=800&auto=format&fit=crop" },
      { title: "Liman Feneri", desc: "Denizden gelen fırtınada dalgaların dövdüğü kayalıkların tepesinde.", img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop" }
    ];
  }

  saveState() {
    const data = {
      userProfile: this.userProfile,
      savedBooks: this.savedBooks,
      characterTemplates: this.characterTemplates,
      bookPersons: this.bookPersons,
      bookRelations: this.bookRelations,
      locations: this.locations,
      isDarkMode: this.isDarkMode
    };
    localStorage.setItem('textination_state', JSON.stringify(data));
  }

  /* ------------------------------------------------------------------------
     NAVIGATION & SCREEN CONTROLLER
     ------------------------------------------------------------------------ */
  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) target.classList.add('active');
  }

  handleGoogleLogin() {
    this.showToast("Google ile hızlı giriş yapıldı! Hoş geldiniz.");
    this.showScreen('main-screen');
  }

  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    this.applyTheme();
    this.saveState();
  }

  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.isDarkMode ? 'dark' : 'light');
    const icon = document.getElementById('theme-icon');
    if (icon) icon.textContent = this.isDarkMode ? '☀️' : '🌙';
  }

  navigate(segmentName) {
    // Update active state in sidebar
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-segment') === segmentName);
    });

    document.getElementById('current-page-title').textContent = segmentName;

    // Hide single book workspace if active
    document.getElementById('view-book-workspace').style.display = 'none';

    // Hide all view pages
    const viewMap = {
      'Kitaplarım': 'view-books',
      'Profil': 'view-profile',
      'Karakter Dosyası': 'view-templates',
      'Yazma Egzersizi': 'view-exercise',
      'Mekan Fotoğrafları': 'view-locations',
      'Asistan Yazar': 'view-assistant',
      'İlham Alıntıları': 'view-quotes'
    };

    Object.values(viewMap).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    const activeViewId = viewMap[segmentName];
    if (activeViewId) {
      const activeEl = document.getElementById(activeViewId);
      if (activeEl) activeEl.style.display = 'block';
    }

    this.renderCurrentView(segmentName);
  }

  renderCurrentView(segmentName = 'Kitaplarım') {
    if (segmentName === 'Kitaplarım') this.renderBooksGrid();
    if (segmentName === 'Profil') this.renderProfileView();
    if (segmentName === 'Karakter Dosyası') this.renderTemplatesGrid();
    if (segmentName === 'Mekan Fotoğrafları') this.renderLocationsGrid();
    if (segmentName === 'İlham Alıntıları') this.renderQuotesGrid();
  }

  /* ------------------------------------------------------------------------
     1. KITAPLARIM (MY BOOKS) GRID & CREATION
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

    this.savedBooks.forEach(book => {
      const coverBg = book.cover 
        ? `background-image: url('${book.cover}')`
        : `background: linear-gradient(135deg, #6366f1, #ec4899)`;

      html += `
        <div class="book-card" onclick="app.openBookWorkspace('${this.escapeQuotes(book.title)}')">
          <div class="book-cover" style="${coverBg}">
            <div class="book-cover-title">${this.escapeHtml(book.title)}</div>
          </div>
          <div class="book-info">
            <p class="book-subject">${this.escapeHtml(book.subject || '')}</p>
            <span class="book-author-tag">✍️ ${this.escapeHtml(book.author || 'Yazar')}</span>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }

  createBook() {
    const titleInput = document.getElementById('new-book-title');
    const subjectInput = document.getElementById('new-book-subject');
    const coverInput = document.getElementById('new-book-cover');

    const title = titleInput.value.trim();
    if (!title) {
      this.showToast("Lütfen bir kitap başlığı girin.");
      return;
    }

    const newBook = {
      title: title,
      subject: subjectInput.value.trim(),
      cover: coverInput.value.trim(),
      author: this.userProfile.name,
      content: `${title}\n\nHikayenize buraya yazarak başlayın...`
    };

    this.savedBooks.push(newBook);
    this.saveState();
    this.closeModal('modal-new-book');
    this.renderBooksGrid();
    this.showToast(`"${title}" başarıyla oluşturuldu!`);

    titleInput.value = '';
    subjectInput.value = '';
    coverInput.value = '';

    this.openBookWorkspace(title);
  }

  /* ------------------------------------------------------------------------
     2. SINGLE BOOK WORKSPACE (EDITOR + CORKBOARD + SETTINGS)
     ------------------------------------------------------------------------ */
  openBookWorkspace(bookTitle) {
    const book = this.savedBooks.find(b => b.title === bookTitle);
    if (!book) return;

    this.currentBookTitle = bookTitle;

    // Hide main view pages and show workspace
    document.querySelectorAll('.view-page').forEach(el => el.style.display = 'none');
    const ws = document.getElementById('view-book-workspace');
    ws.style.display = 'block';

    document.getElementById('current-page-title').textContent = `Kitap: ${bookTitle}`;

    // Load content into editor
    const editor = document.getElementById('rich-editor-content');
    editor.innerText = book.content || '';
    this.onEditorInput();

    // Populate Settings tab fields
    document.getElementById('setting-book-title').value = book.title;
    document.getElementById('setting-book-subject').value = book.subject || '';
    document.getElementById('setting-book-cover').value = book.cover || '';

    // Default to editor subtab
    this.switchBookTab('editor');
  }

  closeBookWorkspace() {
    this.saveCurrentBookText();
    this.navigate('Kitaplarım');
  }

  switchBookTab(tabName) {
    this.currentBookTab = tabName;
    const tabs = ['editor', 'corkboard', 'settings'];
    tabs.forEach(t => {
      const pane = document.getElementById(`subtab-${t}`);
      if (pane) pane.style.display = (t === tabName) ? (t === 'editor' ? 'flex' : 'block') : 'none';
    });

    // Update active tab buttons
    document.querySelectorAll('.book-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.includes(tabName === 'editor' ? 'Yazım' : tabName === 'corkboard' ? 'Polisiye' : 'Ayarları'));
    });

    if (tabName === 'corkboard') {
      this.renderCorkboard();
    }
  }

  /* ------------------------------------------------------------------------
     RICH TEXT EDITOR ACTIONS
     ------------------------------------------------------------------------ */
  formatText(command) {
    document.execCommand(command, false, null);
    this.onEditorInput();
  }

  onEditorInput() {
    const editor = document.getElementById('rich-editor-content');
    const text = editor.innerText || '';
    
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;

    document.getElementById('stat-word-count').textContent = words;
    document.getElementById('stat-char-count').textContent = chars;

    // Trigger debounced auto-save
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveCurrentBookText();
    }, 1000);
  }

  saveCurrentBookText() {
    if (!this.currentBookTitle) return;
    const book = this.savedBooks.find(b => b.title === this.currentBookTitle);
    if (book) {
      const editor = document.getElementById('rich-editor-content');
      book.content = editor.innerText;
      this.saveState();
      
      const status = document.getElementById('editor-autosave-status');
      if (status) {
        status.textContent = '✓ Otomatik Kaydedildi';
        status.style.opacity = '1';
        setTimeout(() => { status.style.opacity = '0.7'; }, 2000);
      }
    }
  }

  toggleFocusMode() {
    const container = document.getElementById('editor-container');
    container.classList.toggle('focus-mode');
    this.showToast(container.classList.contains('focus-mode') ? "Focus Mode Açıldı (Çıkmak için tekrar basınız)" : "Focus Mode Kapatıldı");
  }

  exportCurrentBookText() {
    if (!this.currentBookTitle) return;
    const book = this.savedBooks.find(b => b.title === this.currentBookTitle);
    const content = book ? book.content : '';

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${this.currentBookTitle}.txt`;
    link.click();
    this.showToast("Kitap metni .txt olarak indirildi.");
  }

  saveBookSettings() {
    if (!this.currentBookTitle) return;
    const book = this.savedBooks.find(b => b.title === this.currentBookTitle);
    if (!book) return;

    const newTitle = document.getElementById('setting-book-title').value.trim();
    if (newTitle && newTitle !== this.currentBookTitle) {
      // Update book title in references
      this.bookPersons.forEach(p => { if (p.book_title === this.currentBookTitle) p.book_title = newTitle; });
      this.bookRelations.forEach(r => { if (r.book_title === this.currentBookTitle) r.book_title = newTitle; });
      book.title = newTitle;
      this.currentBookTitle = newTitle;
    }

    book.subject = document.getElementById('setting-book-subject').value.trim();
    book.cover = document.getElementById('setting-book-cover').value.trim();

    this.saveState();
    this.showToast("Kitap ayarları güncellendi.");
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
     3. POLİSİYE PANO (INTERACTIVE CORKBOARD & DYNAMIC SVG HARİTASI)
     ------------------------------------------------------------------------ */
  renderCorkboard() {
    const nodesLayer = document.getElementById('corkboard-nodes-layer');
    if (!nodesLayer) return;

    nodesLayer.innerHTML = '';

    // Filter persons belonging to current active book
    const persons = this.bookPersons.filter(p => p.book_title === this.currentBookTitle);

    persons.forEach(p => {
      const node = document.createElement('div');
      node.className = 'person-node';
      node.style.left = `${p.x || 150}px`;
      node.style.top = `${p.y || 150}px`;
      node.setAttribute('data-id', p.id);

      const initial = p.name ? p.name[0].toUpperCase() : 'K';

      node.innerHTML = `
        <div class="person-pin">📌</div>
        <div class="person-avatar" style="background-color: ${p.color || '#3498db'};">
          ${initial}
        </div>
        <div class="person-name">${this.escapeHtml(p.name)}</div>
        ${p.trait ? `<div class="person-trait">(${this.escapeHtml(p.trait)})</div>` : ''}
      `;

      // Add drag and double click listeners
      node.addEventListener('mousedown', (e) => this.startDragNode(e, p, node));
      node.addEventListener('dblclick', () => this.openEditPersonModal(p));

      nodesLayer.appendChild(node);
    });

    this.drawRelationLines();
  }

  startDragNode(e, personData, nodeElement) {
    if (e.target.closest('.person-pin') || e.target.closest('.person-avatar') || e.target.closest('.person-name')) {
      this.draggedNode = { data: personData, element: nodeElement };
      const rect = nodeElement.getBoundingClientRect();
      const parentRect = document.getElementById('corkboard-container').getBoundingClientRect();
      this.dragOffset = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };

      const onMouseMove = (moveEvent) => {
        if (!this.draggedNode) return;
        const x = moveEvent.clientX - parentRect.left - this.dragOffset.x;
        const y = moveEvent.clientY - parentRect.top - this.dragOffset.y;

        personData.x = Math.max(10, Math.min(x, parentRect.width - 120));
        personData.y = Math.max(10, Math.min(y, parentRect.height - 120));

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
        // Node center coordinates (node width ~110px, height ~100px)
        const x1 = (pFrom.x || 150) + 55;
        const y1 = (pFrom.y || 150) + 40;
        const x2 = (pTo.x || 150) + 55;
        const y2 = (pTo.y || 150) + 40;

        // Create Line
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('class', `relation-line ${rel.type}`);

        svg.appendChild(line);

        // Relation Label text at midpoint
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
    this.activeRelationFilters[type] = !this.activeRelationFilters[type];
    badgeEl.classList.toggle('active', this.activeRelationFilters[type]);
    this.drawRelationLines();
  }

  openCreatePersonModal() {
    document.getElementById('modal-person-title').textContent = 'Polisiye Panosuna Kişi Ekle';
    document.getElementById('person-id').value = '';
    document.getElementById('person-name').value = '';
    document.getElementById('person-trait').value = '';
    document.getElementById('person-age').value = '';
    document.getElementById('person-gender').value = '';
    document.getElementById('person-job').value = '';
    document.getElementById('person-color').value = '#3498db';
    document.getElementById('person-bio').value = '';

    this.openModal('modal-person');
  }

  openEditPersonModal(person) {
    document.getElementById('modal-person-title').textContent = 'Kişi Detaylarını Düzenle';
    document.getElementById('person-id').value = person.id;
    document.getElementById('person-name').value = person.name;
    document.getElementById('person-trait').value = person.trait || '';
    document.getElementById('person-age').value = person.age || '';
    document.getElementById('person-gender').value = person.gender || '';
    document.getElementById('person-job').value = person.job || '';
    document.getElementById('person-color').value = person.color || '#3498db';
    document.getElementById('person-bio').value = person.bio || '';

    this.openModal('modal-person');
  }

  savePerson() {
    const id = document.getElementById('person-id').value;
    const name = document.getElementById('person-name').value.trim();
    if (!name) {
      this.showToast("Kişi adı boş bırakılamaz.");
      return;
    }

    if (id) {
      // Edit existing person
      const p = this.bookPersons.find(item => item.id === id);
      if (p) {
        p.name = name;
        p.trait = document.getElementById('person-trait').value.trim();
        p.age = document.getElementById('person-age').value.trim();
        p.gender = document.getElementById('person-gender').value.trim();
        p.job = document.getElementById('person-job').value.trim();
        p.color = document.getElementById('person-color').value;
        p.bio = document.getElementById('person-bio').value.trim();
      }
    } else {
      // Create new person
      const newP = {
        id: 'p_' + Date.now(),
        name: name,
        book_title: this.currentBookTitle,
        trait: document.getElementById('person-trait').value.trim(),
        age: document.getElementById('person-age').value.trim(),
        gender: document.getElementById('person-gender').value.trim(),
        job: document.getElementById('person-job').value.trim(),
        color: document.getElementById('person-color').value,
        bio: document.getElementById('person-bio').value.trim(),
        x: 200 + Math.random() * 200,
        y: 150 + Math.random() * 150
      };
      this.bookPersons.push(newP);
    }

    this.saveState();
    this.closeModal('modal-person');
    this.renderCorkboard();
    this.showToast("Kişi bilgileri kaydedildi.");
  }

  openCreateRelationModal() {
    const persons = this.bookPersons.filter(p => p.book_title === this.currentBookTitle);
    if (persons.length < 2) {
      this.showToast("İlişki kurabilmek için panoda en az 2 kişi bulunmalıdır.");
      return;
    }

    const selectFrom = document.getElementById('relation-from');
    const selectTo = document.getElementById('relation-to');

    selectFrom.innerHTML = persons.map(p => `<option value="${p.id}">${this.escapeHtml(p.name)}</option>`).join('');
    selectTo.innerHTML = persons.map(p => `<option value="${p.id}">${this.escapeHtml(p.name)}</option>`).join('');

    this.openModal('modal-relation');
  }

  saveRelation() {
    const fromId = document.getElementById('relation-from').value;
    const toId = document.getElementById('relation-to').value;
    const type = document.getElementById('relation-type').value;

    if (fromId === toId) {
      this.showToast("Bir kişi kendisiyle ilişkilendirilemez.");
      return;
    }

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
     4. PROFIL (PROFILE) VIEW
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
     5. KARAKTER DOSYASI (TEMPLATES & DRAFT BANK)
     ------------------------------------------------------------------------ */
  renderTemplatesGrid() {
    const container = document.getElementById('templates-grid-container');
    if (!container) return;

    let html = '';
    this.characterTemplates.forEach(tpl => {
      html += `
        <div class="template-card">
          <span class="template-badge" style="background-color: ${tpl.color || '#6366f1'};">${this.escapeHtml(tpl.trait)}</span>
          <h4 style="font-family: var(--font-heading); font-size: 1.1rem;">${this.escapeHtml(tpl.job || 'Meslek Belirtilmemiş')}</h4>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">${this.escapeHtml(tpl.bio || '')}</p>
          <div style="font-size: 0.8rem; color: var(--text-muted);">
            <span>Demografi: ${this.escapeHtml(tpl.demographics || 'Belirtilmedi')}</span> | 
            <span>Yaş: ${this.escapeHtml(tpl.age || '-')}</span>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  openCreateTemplateModal() {
    const trait = prompt("Şablon Karakter Tipi (Örn: Korkusuz Gazeteci):");
    if (!trait) return;

    const newTpl = {
      id: 'tpl_' + Date.now(),
      trait: trait,
      age: "30",
      gender: "Belirtilmedi",
      job: "Araştırmacı",
      demographics: "Kentli",
      bio: "Kullanıcı tarafından oluşturulan ilham şablonu.",
      color: "#ec4899"
    };

    this.characterTemplates.push(newTpl);
    this.saveState();
    this.renderTemplatesGrid();
    this.showToast("Yeni karakter şablonu eklendi.");
  }

  /* ------------------------------------------------------------------------
     6. YAZMA EGZERSİZİ (WRITING EXERCISES)
     ------------------------------------------------------------------------ */
  generateRandomPrompt() {
    const random = this.promptsPool[Math.floor(Math.random() * this.promptsPool.length)];
    document.getElementById('exercise-prompt-text').textContent = `"${random}"`;
  }

  updateExerciseStats() {
    const text = document.getElementById('exercise-text-area').value || '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    document.getElementById('exercise-word-count').textContent = words;
  }

  saveExerciseDraft() {
    this.showToast("Egzersiz taslağınız kaydedildi! ✍️");
  }

  /* ------------------------------------------------------------------------
     7. MEKAN FOTOĞRAFLARI (LOCATION MOODBOARD)
     ------------------------------------------------------------------------ */
  renderLocationsGrid() {
    const container = document.getElementById('locations-grid-container');
    if (!container) return;

    let html = '';
    this.locations.forEach(loc => {
      html += `
        <div class="location-card">
          <div class="location-img" style="background-image: url('${loc.img}');"></div>
          <div class="location-content">
            <h4 style="font-family: var(--font-heading); font-size: 1.05rem;">${this.escapeHtml(loc.title)}</h4>
            <p style="font-size: 0.85rem; color: var(--text-secondary);">${this.escapeHtml(loc.desc)}</p>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  openAddLocationModal() {
    this.openModal('modal-location');
  }

  saveLocation() {
    const title = document.getElementById('loc-title').value.trim();
    const desc = document.getElementById('loc-desc').value.trim();
    let img = document.getElementById('loc-img').value.trim();

    if (!title) return;
    if (!img) img = "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop";

    this.locations.push({ title, desc, img });
    this.saveState();
    this.closeModal('modal-location');
    this.renderLocationsGrid();
    this.showToast("Mekan ilhamı eklendi.");
  }

  /* ------------------------------------------------------------------------
     8. ASİSTAN YAZAR (AI CO-PILOT ASSISTANT)
     ------------------------------------------------------------------------ */
  askAssistant(query) {
    document.getElementById('ai-user-prompt').value = query;
    this.runAssistantQuery();
  }

  runAssistantQuery() {
    const promptText = document.getElementById('ai-user-prompt').value.trim();
    if (!promptText) return;

    const box = document.getElementById('ai-response-box');
    box.style.display = 'block';
    box.innerHTML = `<em>Textination AI üretiliyor... ✨</em>`;

    setTimeout(() => {
      let response = "";
      if (promptText.includes('karakter') || promptText.includes('Gothic')) {
        response = `<strong>✨ 3 Gothic Karakter Fikri:</strong><br><br>
        1. <strong>Valerie Vance (Saat Ustası):</strong> Eski saatin içinde saklı gizli pusulayı koruyan, gümüş gözlü zanaatkar.<br>
        2. <strong>Gabriel Thorne (Nefesli Çalgı Yapımcısı):</strong> Gece vakti enstrüman çaldığında kasabadaki sisin yön değiştirdiği söylenen münzevi.<br>
        3. <strong>Serafina Black (Nadir Kitaplar Koleksiyoneri):</strong> Kütüphanedeki yasaklı elyazmalarını çözen hırslı araştırmacı.`;
      } else if (promptText.includes('ters köşe') || promptText.includes('twist')) {
        response = `<strong>⚡ Polisiye Ters Köşe Senaryosu:</strong><br><br>
        Dedektif, aylardır peşinde olduğu gizemli suç ortağının aslında kendi geçmişte yaşadığı hafıza kaybı sırasında unuttuğu eski kimliği olduğunu keşfeder. Vaka dosyasındaki mühürlü deliller, kendi el yazısıyla yazılmıştır!`;
      } else {
        response = `<strong>✨ Atmosferik Mekan Betimlemesi:</strong><br><br>
        "Gecenin yoğun sisi limana çöktüğünde, deniz fenerinin zayıf ışığı sadece dalgaların köpüklerini aydınlatıyordu. Ahşap iskelenin gıcırtıları, rüzgarın ıslığıyla birleşip kasabaya doğru fısıldıyordu..."`;
      }

      box.innerHTML = response;
    }, 600);
  }

  /* ------------------------------------------------------------------------
     9. İLHAM ALINTILARI (INSPIRATIONAL QUOTES)
     ------------------------------------------------------------------------ */
  renderQuotesGrid() {
    const container = document.getElementById('quotes-grid-container');
    if (!container) return;

    const quotes = [
      { text: "İlk taslak sadece kendinize hikayeyi anlatmanızdır.", author: "Terry Pratchett" },
      { text: "Yazarlık, gecenin bir yarısı kendi yarattığınız dünyada kaybolmaktır.", author: "Virginia Woolf" },
      { text: "Eğer okumaya vaktiniz yoksa, yazmaya da vaktiniz (veya araçlarınıza) yok demektir.", author: "Stephen King" },
      { text: "Kelime kelime, sayfa sayfa bir dünya inşa edilir.", author: "Haruki Murakami" }
    ];

    let html = '';
    quotes.forEach(q => {
      html += `
        <div class="quote-card">
          <div class="quote-body">"${this.escapeHtml(q.text)}"</div>
          <div class="quote-author">— ${this.escapeHtml(q.author)}</div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  /* ------------------------------------------------------------------------
     UI UTILITIES & TOAST ALERTS
     ------------------------------------------------------------------------ */
  showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>ℹ️</span> <span>${this.escapeHtml(message)}</span>`;

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

  initEventListeners() {
    // Window resize event re-draws SVG lines
    window.addEventListener('resize', () => {
      if (this.currentBookTab === 'corkboard') {
        this.drawRelationLines();
      }
    });
  }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
  window.app = new TextinationApp();
});
