
// Initialize on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
    $apply(inEdit.selector, elem => {
        const ie = new InlineEdit(elem);
        elem.inEdit = ie;
    })
});


class InlineEdit {

    toolbarItems = {
        format: {
            type: 'select',
            options: {
                'p': inEdit.p,
                'h1': inEdit.h1,
                'h2': inEdit.h2,
                'h3': inEdit.h3,
                'h4': inEdit.h4,
                'h5': inEdit.h5,
                'pre': inEdit.pre
            },
            tooltip: inEdit.format,
            callback: event => this.applyFormat(event.target.value)
        },
        font: {
            type: 'select',
            options: {
                'Arial': 'Arial',
                'Verdana': 'Verdana',
                'Helvetica': 'Helvetica',
                'Trebuchet MS': 'Trebuchet',
                'Georgia': 'Georgia',
                'Courier New': 'Courier New',
                'Comic Sans MS': 'Comic Sans',
                'Brush Script MT': 'Brush Script',
                'Impact': 'Impact',
                'Lucida Sans': 'Lucida Sans',
                'Roboto, sans-serif': 'Roboto'
            },
            tooltip: inEdit.font,
            callback: event => this.applyFontFamily(event.target.value)
        },
        bold: {
            type: 'button',
            icon: 'fa-solid fa-bold',
            tooltip: inEdit.bold,
            callback: () => this.bold()
        },
        italic: {
            type: 'button',
            icon: 'fa-solid fa-italic',
            tooltip: inEdit.italic,
            callback: () => this.italic()
        },
        underline: {
            type: 'button',
            icon: 'fa-solid fa-underline',
            tooltip: inEdit.underline,
            callback: () => this.underline()
        },
        strike: {
            type: 'button',
            icon: 'fa-solid fa-strikethrough',
            tooltip: inEdit.strike,
            callback: () => this.strikeThrough()
        },
        link: {
            type: 'button',
            icon: 'fa-solid fa-link',
            tooltip: inEdit.link,
            callback: () => this.createLink()
        },
        color: {
            type: 'button',
            icon: 'fa-solid fa-palette',
            tooltip: inEdit.color,
            callback: () => this.textColor()
        },
        sep1: true,
        clear: {
            type: 'button',
            icon: 'fa-solid fa-times',
            tooltip: inEdit.clear,
            callback: () => this.clearFormat()
        },
        sep2: true,
        undo: {
            type: 'button',
            icon: 'fa-solid fa-rotate-left',
            tooltip: inEdit.undo,
            callback: () => this.undo()
        },
        redo: {
            type: 'button',
            icon: 'fa-solid fa-rotate-right',
            tooltip: inEdit.redo,
            callback: () => this.redo()
        },
        sep3: true,
        save: {
            type: 'button',
            icon: 'fa-solid fa-check',
            tooltip: inEdit.save,
            callback: () => this.save()
        }
    };
    toolbarOrder;

    history = {
        origin: '',
        current: '',
        undo: [],
        redo: []
    };

    shortcuts = {
        b: () => this.bold(),
        i: () => this.italic(),
        u: () => this.underline(),
        z: () => this.undo(),
        y: () => this.redo(),
    };
    shortcutsAreSet = false;

    element = null;
    
    constructor(elem) {
        this.element = elem;
        this.element.classList.add('inline-editable');
        const order = this.element.getAttribute('data-toolbar');
        if (order) {
            this.toolbarOrder = order.split(/\s*,\s*/);
        } else {
            this.toolbarOrder = Object.keys(this.toolbarItems).map(e => e.replace(/^sep\d/, 'separator'));
        }
        document.addEventListener('selectionchange', debounce(this.checkSelection.bind(this)));
        this.initShortcuts();
        this.prepare();
    }

    // Overwrite shortcuts
    initShortcuts() {
        if (!this.shortcutsAreSet) {
            document.addEventListener('keydown', event => {
                if (this.element && this.element.isContentEditable) {
                    const id = event.key.toLocaleLowerCase();
                    if (event.ctrlKey || event.metaKey && this.shortcuts[id] !== undefined) {
                        event.preventDefault();
                        this.shortcuts[id]();
                    }
                }
            });
        }
        this.shortcutsAreSet = true;
    }
    
    // Prepare element to be edited
    prepare() {
        const linkOpen = tag('a', {'class': 'link-open', 'href': 'javascript://'}, '<i class="fa fa-pencil-square"></i>');
        linkOpen.addEventListener('click', event => this.edit(event.target.closest('a')));
        const linkClose = tag('a', {'class': 'link-close', 'href': 'javascript://'}, '<i class="fa fa-times-square"></i>');
        linkClose.addEventListener('click', () => this.close());
        const menu = tag('div', {'class': 'inline-edit-menu'}, [linkOpen, linkClose]);
        const wrap = tag('div', {'class': 'inline-edit-wrapper'});
        wrap.appendChild(this.toolbar());
        wrap.appendChild(menu);
        this.element.parentElement.insertBefore(wrap, this.element);
        wrap.appendChild(this.element);
        this.adjustMargins(wrap);
    }
    
    adjustMargins(menu) {
        const stl = currentStyle(this.element, /^(margin-?(top|right|bottom|left)?|display)$/);
        this.element.style.margin = '0';
        menu.style.display = stl.display;
        for (const name in stl) {
            const val = stl[name];
            if (val) {
                menu.style[name] = val;
            }
        }
    }

    edit(a) {
        if (!this.closeAll()) {
            return;
        }
        const parent = a.closest('.inline-edit-wrapper');
        parent.classList.add('editing');
        this.element = $single('.inline-editable', parent);
        this.element.setAttribute('contenteditable', 'true');
        this.element.addEventListener('input', debounce(this.saveState.bind(this), 500));
        this.element.focus();
        this.history.origin = this.history.current = this.element.innerHTML;
        this.updateHistoryButtons();
    }

    // history

    saveState() {
        const content = this.element.innerHTML;
        if (this.history.current !== content) {
            this.history.undo.push(this.history.current);
            this.history.current = content;
            this.history.redo = [];
        }
        this.updateHistoryButtons();
    }

    undo() {
        if (this.history.undo.length > 0) {
            const state = this.history.undo.pop();
            this.history.redo.push(this.element.innerHTML);
            this.element.innerHTML = state;
        }
        this.updateHistoryButtons();
    }

    redo() {
        if (this.history.redo.length > 0) {
            const state = this.history.redo.pop();
            this.history.undo.push(this.element.innerHTML);
            this.element.innerHTML = state;
        }
        this.updateHistoryButtons();
    }

    toolbar() {
        const nodes = [];
        this.toolbarOrder.forEach(key => {
            if ("separator" == key) {
                nodes.push(tag('span', {'class': 'div'}));
                return true;
            }
            if (this.toolbarItems[key].type == 'button') {
                const btn = tag('a', {'href': 'javascript://', 'class': `tb-btn btn-${key}`, 'title': this.toolbarItems[key].tooltip ?? ''}, `<i class="${this.toolbarItems[key].icon}"></i>`);
                btn.addEventListener('click', this.toolbarItems[key].callback);
                nodes.push(btn);
                return true;
            }
            if (this.toolbarItems[key].type == 'select') {
                const options = [tag('option', {value: ''}, '')];
                for (const value in this.toolbarItems[key].options) {
                    const opt = tag('option', {value}, this.toolbarItems[key].options[value]);
                    options.push(opt);
                }
                const dropdown = tag('select', {'class': `tb-combo combo-${key}`, 'title': this.toolbarItems[key].tooltip ?? ''}, options);
                dropdown.addEventListener('input', this.toolbarItems[key].callback);
                const span = tag('span', {'class': 'combo'}, dropdown);
                nodes.push(span);
            }
        });
        return tag('div', {'class': 'inline-edit-toolbar'}, nodes);
    }

    updateToolbar() {
        const elem = this.getSelectedNode();
        if (elem) {
            if (this.toolbarItems.format) {
                const combo = this.get('.combo-format');
                if (combo) {
                    const tag = elem.tagName.toLowerCase();
                    if (this.toolbarItems.format.options[tag]) {
                        combo.value = tag;
                    } else {
                        combo.value = '';
                    }
                }
            }
            if (this.toolbarItems.font) {
                const combo = this.get('.combo-font');
                if (combo) {
                    const font = currentStyle(elem)['fontFamily'];
                    if (this.toolbarItems.font.options[font]) {
                        combo.value = font;
                    } else {
                        combo.value = '';
                    }
                }
            }
            this.updateSaveButton();
            this.updateClearButton();
        }
    }

    updateHistoryButtons() {
        const undo = this.get('.btn-undo');
        if (undo) {
            let undoFn = this.history.undo.length ? 'remove' : 'add';
            undo.classList[undoFn]('disabled');
        }
        const redo = this.get('.btn-redo');
        if (redo) {
            redo.classList[this.history.redo.length ? 'remove' : 'add']('disabled');
        }
        this.updateSaveButton();
        this.updateClearButton();
    }

    updateSaveButton() {
        const btn = this.get('.btn-save');
        if (btn) {
            const fn = this.modified() ? 'remove' : 'add';
            btn.classList[fn]('disabled');
        }
    }

    updateClearButton() {
        const btn = this.get('.btn-clear');
        if (btn) {
            const elem = this.getSelectedNode();
            const fn = ['A', 'U', 'EM', 'DEL', 'SPAN', 'STRONG'].includes(elem.tagName) ? 'remove' : 'add';
            btn.classList[fn]('disabled');
        }
    }

    modified() {
        return (this.element.innerHTML != this.history.origin);
    }

    get(selector = '') {
        const wrapper = this.element.closest('.inline-edit-wrapper');
        if (!selector) {
            return wrapper;
        }
        return $single(selector, wrapper);
    }
    
    closeAll() {
        let ret = true;
        $apply('.inline-edit-wrapper.editing .inline-editable', elem => {
            if (!elem.inEdit.close()) {
                ret = false;
                return false;
            }
        });
        return ret;
    }

    close(force = false) {
        if (!force && this.modified()) {
            const dlg = new Dialog(inEdit.saveTitle);
            dlg.confirm(inEdit.unsaved).then(ok => {
                if (ok) {
                    this.unedit();
                    return true;
                }
            });
        } else {
            this.unedit();
            return true;
        }
        return false;
    }

    unedit() {
        this.element.innerHTML = this.history.origin;
        this.element.removeAttribute('contenteditable');
        this.element.removeEventListener('input', debounce(this.saveState.bind(this), 500));
        this.history = { origin: '', current: '', undo: [], redo: [] };
        this.get().classList.remove('editing');
    }

    // Commands

    clearFormat() {
        const elem = this.getSelectedNode();
        if (elem) {
            if (['A', 'U', 'EM', 'DEL', 'SPAN', 'STRONG'].includes(elem.tagName)) {
                const parent = elem.parentNode;
                while (elem.firstChild) {
                    parent.insertBefore(elem.firstChild, elem);
                }
                parent.removeChild(elem);
                this.saveState();
            }
        }
    }

    bold() {
        const range = this.getSelection();
        if (range && !!range.toString()) {
            const strong = tag('strong');
            range.surroundContents(strong);
            this.saveState();
        }
    }

    italic() {
        const range = this.getSelection();
        if (range && !!range.toString()) {
            const em = tag('em');
            range.surroundContents(em);
            this.saveState();
        }
    }

    underline() {
        const range = this.getSelection();
        if (range && !!range.toString()) {
            const u = tag('u');
            range.surroundContents(u);
            this.saveState();
        }
    }

    strikeThrough() {
        const range = this.getSelection();
        if (range && !!range.toString()) {
            const del = tag('del');
            range.surroundContents(del);
            this.saveState();
        }
    }

    textColor() {
        const range = this.getSelection();
        if (range && !!range.toString()) {
            this.selectColor().then(color => {
                const span = tag('span', { 'style': `color: ${color};` });
                range.surroundContents(span);
                this.saveState();
            });
        }
    }

    createLink() {
        let range = this.getSelection();
        if (range && !!range.toString()) {
            const link = this.getSelectedNode(range);
            const dlg = new Dialog(link ? inEdit.editLink : inEdit.createLink);
            dlg.prompt("Digite a URL", (link && link.tagName == 'A') ? link.href : '').then(url => {
                if (url) {
                    if (link && link.tagName == 'A') {
                        range = this.expandSelectionToNode(link);
                        link.href = url;
                    } else {
                        const a = tag('a', { href: url });
                        a.textContent = range.toString();
                        range.deleteContents();
                        range.insertNode(a);
                    }
                    this.saveState();
                }
            });
        }
    }

    applyFormat(tagName) {
        let range = this.getSelection();
        range = this.expandToParent(range, true);
        if (range && !!range.toString()) {
            const frmt = tag(tagName);
            range.surroundContents(frmt);
            this.saveState();
        }
    }

    applyFontFamily(font) {
        let range = this.getSelection();
        range = this.expandToParent(range, true);
        if (range && !!range.toString()) {
            const elem = this.getSelectedNode();
            if (elem && elem.tagName == 'SPAN') {
                elem.style.fontFamily = font;
            } else {
                const span = tag('span', { 'style': `font-family: ${font};` });
                range.surroundContents(span);
            }
            this.saveState();
        }
    }

    selectColor(initColor = '') {
        return new Promise(resolve => {
            const style = 'opacity: 0; position: absolute';
            const input = tag('input', { 'type': 'color', 'value': initColor, style });
            const btn = $single('.btn-color');
            btn.parentElement.insertBefore(input, btn);
            input.addEventListener('input', event => {
                resolve(event.target.value);
                event.target.parentElement.removeChild(event.target);
            });
            input.click();
        });
    }

    // Selection

    getSelectedNode(range = null) {
        range = range ? range : this.getSelection();
        if (range) {
            let startContainer = range.startContainer;
            while (startContainer && startContainer.nodeType !== Node.ELEMENT_NODE) {
                startContainer = startContainer.parentNode;
            }
            if (startContainer && this.element.contains(startContainer)) {
                return startContainer;
            }
    
            let endContainer = range.endContainer;
            while (endContainer && endContainer.nodeType !== Node.ELEMENT_NODE) {
                endContainer = endContainer.parentNode;
            }
            if (endContainer && this.element.contains(endContainer)) {
                return endContainer;
            }
        }
        return null;
    }

    expandToParent(range, ifHasNodes = false) {
        if (!ifHasNodes || this.hasNonTextNodes(range)) {
            const parent = this.getSelectedNode(range);
            if (parent) {
                range = this.expandSelectionToNode(parent);
            }
        }
        return range;
    }

    expandSelectionToNode(node) {
        const newRange = document.createRange();
        newRange.selectNodeContents(node);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(newRange);
        return newRange;
    }

    getSelection(element = this.element) {
        const selection = window.getSelection();
        if (element && selection.rangeCount > 0) {
            let range = selection.getRangeAt(0);
            if (element.contains(range.commonAncestorContainer)) {
                return range;
            }
        }
        return null;
    }

    checkSelection() {
        const selection = this.getSelection();
        const bar = this.get('.inline-edit-toolbar');
        bar.classList.remove('no-text');
        bar.classList.remove('no-focus');
        if (selection) {
            if (!selection.toString()) {
                bar.classList.add('no-text');
            }
            this.updateToolbar();
        } else {
            bar.classList.add('no-focus');
        }
    }

    hasNonTextNodes(range) {
        const startContainer = range.startContainer;
        const startOffset = range.startOffset;
        const endContainer = range.endContainer;
        const endOffset = range.endOffset;
        if (startContainer.nodeType !== Node.TEXT_NODE && startOffset > 0) {
            return true;
        }
        if (endContainer.nodeType !== Node.TEXT_NODE && endOffset < endContainer.childNodes.length) {
            return true;
        }
        return false;
    }

    save() {
        const content = this.element.innerHTML;
        const section = this.element.getAttribute('data-editable');
        const post_id = this.element.getAttribute('data-id');
        const action = 'save_content';
        ajax(inEdit.ajaxurl, { action, post_id, section, content }, 'POST').then(res => res.json()).then(data => {
            const dlg = new Dialog(inEdit.saveTitle);
            dlg.alert(data.message).then(() => {
                if (!data.error) {
                    this.history.current = this.history.origin = this.element.innerHTML = data.content;
                    this.close(true);
                }
            });
        });
    }
}