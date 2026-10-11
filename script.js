// =========================================================
// ESTADO GLOBAL DA APLICAÇÃO
// =========================================================
let pdfFiles = [];
let draggedIndex = null;

// =========================================================
// REFERÊNCIAS DOS ELEMENTOS DOM
// =========================================================
const fileInput = document.getElementById('file-input');
const dropZone = document.getElementById('drop-zone');
const fileList = document.getElementById('file-list');
const mergeBtn = document.getElementById('merge-btn');

// =========================================================
// INICIALIZAÇÃO DE EVENTOS
// =========================================================
function init() {
    setupUploadZoneEvents();
    setupMergeButtonEvent();
}

// =========================================================
// 1. EVENTOS DA ZONA DE UPLOAD
// =========================================================
function setupUploadZoneEvents() {
    fileInput.addEventListener('change', (e) => {
        addFiles(e.target.files);
        fileInput.value = '';
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
        });
    });

    dropZone.addEventListener('drop', (e) => {
        addFiles(e.dataTransfer.files);
    });
}

// =========================================================
// 2. GERENCIAMENTO DE ARQUIVOS (ADD / REMOVE)
// =========================================================
function addFiles(files) {
    const validFiles = Array.from(files).filter(file => file.type === 'application/pdf');

    if (validFiles.length === 0 && files.length > 0) {
        alert('Por favor, selecione apenas arquivos PDF.');
        return;
    }

    pdfFiles = [...pdfFiles, ...validFiles];
    renderFileList();
}

function removeFile(index) {
    pdfFiles.splice(index, 1);
    renderFileList();
}

// =========================================================
// 3. RENDERIZAÇÃO DA INTERFACE DA LISTA
// =========================================================
function renderFileList() {
    fileList.innerHTML = '';

    if (pdfFiles.length === 0) {
        fileList.innerHTML = '<li class="empty-msg">Nenhum arquivo selecionado ainda.</li>';
        updateMergeButtonState();
        return;
    }

    pdfFiles.forEach((file, index) => {
        const li = createListItem(file, index);
        fileList.appendChild(li);
    });

    updateMergeButtonState();
}

function createListItem(file, index) {
    const li = document.createElement('li');
    li.draggable = true;
    li.dataset.index = index;

    li.innerHTML = `
        <div class="file-info">
            <span style="color: var(--text-muted); margin-right: 4px;">☰</span>
            <span>📄</span>
            <span class="file-name" title="${file.name}">${file.name}</span>
        </div>
        <button class="btn-remove" title="Remover arquivo">&times;</button>
    `;

    // Evento no botão remover
    li.querySelector('.btn-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        removeFile(index);
    });

    // Anexa os eventos de reordenação por Drag & Drop
    attachListDragEvents(li, index);

    return li;
}

function updateMergeButtonState() {
    const count = pdfFiles.length;
    mergeBtn.disabled = count < 2;

    if (count === 0) {
        mergeBtn.textContent = 'Juntar PDFs e Baixar';
    } else if (count === 1) {
        mergeBtn.textContent = 'Selecione pelo menos 2 arquivos';
    } else {
        mergeBtn.textContent = `Juntar ${count} PDFs e Baixar`;
    }
}

// =========================================================
// 4. REORDENAÇÃO DA LISTA (DRAG & DROP)
// =========================================================
function attachListDragEvents(item, index) {
    item.addEventListener('dragstart', (e) => {
        draggedIndex = index;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    });

    item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        document.querySelectorAll('.file-list li').forEach(li => li.classList.remove('drag-over'));
    });

    item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        item.classList.add('drag-over');
    });

    item.addEventListener('dragleave', () => {
        item.classList.remove('drag-over');
    });

    item.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        item.classList.remove('drag-over');

        if (draggedIndex !== null && draggedIndex !== index) {
            const [movedFile] = pdfFiles.splice(draggedIndex, 1);
            pdfFiles.splice(index, 0, movedFile);
            renderFileList();
        }
    });
}

// =========================================================
// 5. PROCESSAMENTO E JUNÇÃO DOS PDFS (PDF-LIB)
// =========================================================
function setupMergeButtonEvent() {
    mergeBtn.addEventListener('click', async () => {
        if (pdfFiles.length < 2) return;

        try {
            mergeBtn.disabled = true;
            mergeBtn.textContent = 'Processando e unindo PDFs...';

            const mergedPdf = await PDFLib.PDFDocument.create();

            for (const file of pdfFiles) {
                const arrayBuffer = await file.arrayBuffer();
                const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
                const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
                copiedPages.forEach(page => mergedPdf.addPage(page));
            }

            const pdfBytes = await mergedPdf.save();
            downloadPDF(pdfBytes);

            renderFileList();
            alert('PDFs juntados com sucesso!');

        } catch (error) {
            console.error('Erro ao juntar PDFs:', error);
            alert('Erro ao processar os arquivos. Certifique-se de que nenhum documento está protegido por senha ou corrompido.');
            renderFileList();
        }
    });
}

function downloadPDF(pdfBytes) {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `PDF_Unificado_${new Date().toISOString().slice(0, 10)}.pdf`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Executa a inicialização do script
init();