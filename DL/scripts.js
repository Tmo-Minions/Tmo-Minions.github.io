const encoded = 'Qnk66LSq5aKoICBR576kOjgyMTQ2NTUyMw';
const authorInfo = decodeURIComponent(escape(atob(encoded)));
document.querySelector('.footer').textContent = authorInfo;

let items = [];
let currentPage = 1;
let totalPages = 1;
let isDayMode = false;
let currentDataset = null;
let dl1Data = null;
let dl2Data = null;
const searchInput = document.getElementById('searchInput');
const clearBtn = document.querySelector('.clear-btn');
const pageInput = document.getElementById('pageInput');
const loadStatus = document.getElementById('loadStatus');

// 禁止右键
document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    showToast('右键功能已禁用');
});

// 禁止控制台
console.log = function () { };
console.error = function () { };
console.warn = function () { };
console.info = function () { };

searchInput.addEventListener('input', function (e) {
    clearBtn.style.display = this.value ? 'block' : 'none';
});

function clearSearch() {
    searchInput.value = '';
    clearBtn.style.display = 'none';
    searchItems();
}

const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.id = 'fileInput';
fileInput.accept = '.txt';
fileInput.style.display = 'none';
document.body.appendChild(fileInput);

const funcMenu = document.createElement('div');
funcMenu.className = 'func-menu';

const buttons = [
    { id: 'btn-theme', icon: '🌓', title: '昼夜模式', action: toggleTheme },
    { id: 'btn-switch', icon: '↔', title: '切换1-2文本', action: toggleDataset },
    { id: 'btn-dl2', icon: 'DL2', title: '上传DL2文本', action: () => createFileInput('DL2') },
    { id: 'btn-dl1', icon: 'DL1', title: '上传DL1文本', action: () => createFileInput('DL1') },
    { id: 'btn-upload', icon: '↑', title: '上传文本', action: () => fileInput.click() }
];

buttons.forEach(btn => {
    const button = document.createElement('div');
    button.id = btn.id;
    button.className = 'func-btn';
    button.innerHTML = btn.icon;
    button.title = btn.title;
    button.onclick = btn.action;
    funcMenu.appendChild(button);
});

document.body.appendChild(funcMenu);

const menuBtn = document.createElement('div');
menuBtn.className = 'upload-btn';
menuBtn.innerHTML = '⚙️';
menuBtn.onclick = () => document.body.classList.toggle('menu-open');
document.body.appendChild(menuBtn);

function toggleTheme() {
    isDayMode = !isDayMode;
    document.body.setAttribute('data-theme', isDayMode ? 'day' : '');
    localStorage.setItem('theme', isDayMode ? 'day' : 'night');
}

fileInput.addEventListener('change', function (e) {
    handleFile(e, 'default');
});

function createFileInput(type) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt';
    input.onchange = e => handleFile(e, type);
    input.click();
}

function handleFile(e, type) {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = function (e) {
        const data = e.target.result.split('\n').filter(l => l.trim()).map(line => {
            const parts = line.split('----');
            if (parts.length < 4) {
                showToast('文件格式错误');
                return null;
            }
            return {
                fileName: parts[0].trim(),
                category: parts[1].trim(),
                itemCode: parts[2].trim(),
                itemName: parts[3].trim().replace(/&.*?&/g, '')
            };
        }).filter(item => item !== null);

        if (type === 'DL1') {
            dl1Data = data;
            document.getElementById('btn-dl1').classList.add('hidden');
        } else if (type === 'DL2') {
            dl2Data = data;
            document.getElementById('btn-dl2').classList.add('hidden');
        } else {
            items = data;
        }

        if (dl1Data && dl2Data) {
            document.getElementById('btn-switch').classList.remove('hidden');
        }

        if (type !== 'default') {
            currentDataset = type === 'DL1' ? dl1Data : dl2Data;
            items = currentDataset;
        }

        searchItems();
        showToast(`${type !== 'default' ? type : ''}物品文本手册数据加载成功！`);
    };
    reader.readAsText(file);
}

function toggleDataset() {
    if (!dl1Data || !dl2Data) {
        showToast('请先加载DL1和DL2的物品文本手册文件后再切换');
        return;
    }

    currentDataset = currentDataset === dl1Data ? dl2Data : dl1Data;
    items = currentDataset;
    searchItems();
    showToast(`已切换到：${currentDataset === dl1Data ? 'DL1物品文本手册' : 'DL2物品文本手册'}`);
}

function searchItems() {
    clearBtn.style.display = searchInput.value ? 'block' : 'none';
    const searchText = searchInput.value.toLowerCase().trim();
    const results = items.filter(item => {
        if (!searchText) return true;
        return (
            item.itemName.toLowerCase().includes(searchText) ||
            item.category.toLowerCase().includes(searchText) ||
            item.itemCode.toLowerCase().includes(searchText) ||
            item.fileName.toLowerCase().includes(searchText)
        );
    });

    const totalResults = results.length;
    const itemsPerPage = 20;
    totalPages = Math.ceil(totalResults / itemsPerPage) || 1;
    currentPage = 1;
    updatePagination();
    displayResults(results, currentPage, itemsPerPage);
}

function displayResults(results, page, itemsPerPage) {
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageResults = results.slice(start, end);

    const html = pageResults.length > 0 ? pageResults.map(item => `
        <div class="item">
            <button class="copy-btn" onclick="copyItemInfo('${item.itemName}', '${item.itemCode}')">复制</button>
            <div class="item-name">${item.itemName}</div>
            <div class="item-detail">
                文件：${item.fileName}<br>
                类型：${item.category}<br>
                代码：${item.itemCode}
            </div>
        </div>
    `).join('') : '<div class="item">未找到匹配道具</div>';

    document.getElementById('results').innerHTML = html;
    document.getElementById('loadStatus').textContent = `已加载 ${results.length} 个道具`;
}

function updatePagination() {
    document.getElementById('currentPage').textContent = currentPage;
    document.getElementById('totalPages').textContent = totalPages;
    pageInput.value = currentPage;
}

function goToPage(page) {
    page = Math.max(1, Math.min(page, totalPages));
    if (page === currentPage) return; // 防止重复加载当前页
    currentPage = page;
    const searchText = searchInput.value.toLowerCase().trim();
    const results = items.filter(item => {
        if (!searchText) return true;
        return (
            item.itemName.toLowerCase().includes(searchText) ||
            item.category.toLowerCase().includes(searchText) ||
            item.itemCode.toLowerCase().includes(searchText) ||
            item.fileName.toLowerCase().includes(searchText)
        );
    });

    displayResults(results, currentPage, 20);
    updatePagination();
}

function updatePageInput() {
    const page = parseInt(pageInput.value, 10);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        const searchText = searchInput.value.toLowerCase().trim();
        const results = items.filter(item => {
            if (!searchText) return true;
            return (
                item.itemName.toLowerCase().includes(searchText) ||
                item.category.toLowerCase().includes(searchText) ||
                item.itemCode.toLowerCase().includes(searchText) ||
                item.fileName.toLowerCase().includes(searchText)
            );
        });

        displayResults(results, currentPage, 20);
        updatePagination();
    } else {
        pageInput.value = currentPage;
    }
}

function handlePageInputKeydown(event) {
    if (event.key === 'Enter') {
        updatePageInput();
    }
}

function copyItemInfo(name, code) {
    const text = `${code} – ${name}`;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('已复制到剪贴板');
        }).catch(() => fallbackCopy(text));
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        showToast('已复制到剪贴板');
    } catch (err) {
        showToast('复制失败，请手动复制');
    }
    document.body.removeChild(textarea);
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 60px;
        left: 50%;
        transform: translateX(-50%);
        background: #4CAF50;
        color: white;
        padding: 12px 24px;
        border-radius: 25px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        animation: fadeInOut 2s;
        font-size: 14px;
        backdrop-filter: blur(5px);
        z-index: 1000;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'day') toggleTheme();

// 自动加载指定的文本文件
function loadDefaultFiles() {
    loadFile('TanMoDL1Text.txt', 'DL1');
    loadFile('TanMoDL2Text.txt', 'DL2');
}

function loadFile(fileName, type) {
    loadStatus.style.display = 'block';
    loadStatus.textContent = `正在加载 ${fileName}...`;

    const xhr = new XMLHttpRequest();
    xhr.open('GET', fileName, true);
    xhr.onload = function () {
        if (xhr.status === 200) {
            const data = xhr.responseText.split('\n').filter(l => l.trim()).map(line => {
                const parts = line.split('----');
                if (parts.length < 4) {
                    showToast('文件格式错误');
                    return null;
                }
                return {
                    fileName: parts[0].trim(),
                    category: parts[1].trim(),
                    itemCode: parts[2].trim(),
                    itemName: parts[3].trim().replace(/&.*?&/g, '')
                };
            }).filter(item => item !== null);

            if (type === 'DL1') {
                dl1Data = data;
                document.getElementById('btn-dl1').classList.add('hidden');
            } else if (type === 'DL2') {
                dl2Data = data;
                document.getElementById('btn-dl2').classList.add('hidden');
            }

            if (dl1Data && dl2Data) {
                document.getElementById('btn-switch').classList.remove('hidden');
            }

            if (type !== 'default') {
                currentDataset = type === 'DL1' ? dl1Data : dl2Data;
                items = currentDataset;
            }

            searchItems();
            loadStatus.textContent = `已加载 ${data.length} 个道具`;
            showToast(`${type}物品文本手册数据加载成功！`);
        } else {
            loadStatus.textContent = '文件加载失败';
            showToast('文件加载失败');
        }
        loadStatus.style.display = 'none';
    };
    xhr.onerror = function () {
        loadStatus.textContent = '文件加载失败';
        showToast('文件加载失败');
        loadStatus.style.display = 'none';
    };
    xhr.send();
}

// 在页面加载时自动加载默认文件
window.onload = function () {
    loadDefaultFiles();
};
