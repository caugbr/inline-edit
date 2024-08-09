
import Commands from './commands.js';

class InlineEdit {

    toolbarItems = {};
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
        for (const cid in Commands) {
            this.addCommand(cid, Commands[cid]);
        }
        this.element = elem;
        this.element.inEdit = this;
        this.element.classList.add('inline-editable');
        const order = this.element.getAttribute('data-toolbar');
        if (order) {
            this.toolbarOrder = order.trim().split(/\s*,\s*/);
        } else {
            this.toolbarOrder = [
                "format", "font", "bold", "italic", "underline", "strike", "link", "color", 
                "separator", "clear", "separator", "undo", "redo", "separator", "save"
            ];
        }
        document.addEventListener('selectionchange', debounce(this.checkSelection.bind(this)));
        this.initShortcuts();
        this.prepare();
    }

    // Add a new button or select
    addCommand(id, obj) {
        if (this.toolbarItems[id] !== undefined) {
            return false;
        }
        const def = {
            type: '',
            icon: '',
            tooltip: '',
            options: [],
            callback: null
        };
        const command = { ...def, ...obj };
        if (command.type == 'button' && (command.icon == '' || command.tooltip == '' || command.callback == null)) {
            return false;
        }
        if (command.type == 'select' && (command.options.length == 0 || command.tooltip == '' || command.callback == null)) {
            return false;
        }
        if (command.methods) {
            for (const name in command.methods) {
                this[name] = command.methods[name].bind(this);
            }
        }
        this.toolbarItems[id] = command;
        return true;
    }

    // Overwrite native shortcuts
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
    
    // Transfer margins from element to editor and clone display property
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

    // Open editor
    edit(a) {
        if (!this.closeAll()) {
            return;
        }
        this.get().classList.add('editing');
        this.element.setAttribute('contenteditable', 'true');
        this.element.addEventListener('input', debounce(this.saveState.bind(this), 500));
        this.element.focus();
        this.history.origin = this.history.current = this.element.innerHTML;
        this.updateHistoryButtons();
    }

    // history

    // Add history step
    saveState() {
        const content = this.element.innerHTML;
        if (this.history.current !== content) {
            this.history.undo.push(this.history.current);
            this.history.current = content;
            this.history.redo = [];
        }
        this.updateHistoryButtons();
    }

    // Back in history
    undo() {
        if (this.history.undo.length > 0) {
            const state = this.history.undo.pop();
            this.history.redo.push(this.element.innerHTML);
            this.element.innerHTML = state;
        }
        this.updateHistoryButtons();
    }

    // History forward
    redo() {
        if (this.history.redo.length > 0) {
            const state = this.history.redo.pop();
            this.history.undo.push(this.element.innerHTML);
            this.element.innerHTML = state;
        }
        this.updateHistoryButtons();
    }

    // Create the elements and return the toolbar as a DOM node
    toolbar() {
        const nodes = [];
        this.toolbarOrder.forEach(key => {
            if ("separator" == key) {
                nodes.push(tag('span', {'class': 'div'}));
                return true;
            }
            if (this.toolbarItems[key].type == 'button') {
                const icon = (inEdit.template && inEdit.template.icons && inEdit.template.icons[key]) ? inEdit.template.icons[key] : this.toolbarItems[key].icon;
                const btn = tag('a', {
                    'href': 'javascript://', 
                    'class': `ie-btn btn-${key}`, 
                    'title': this.toolbarItems[key].tooltip ?? ''
                }, `<span class="${icon}"></span>`);
                btn.addEventListener('click', this.toolbarItems[key].callback.bind(this));
                nodes.push(btn);
                return true;
            }
            if (this.toolbarItems[key].type == 'select') {
                const options = [tag('option', {value: ''}, '')];
                for (const value in this.toolbarItems[key].options) {
                    const opt = tag('option', {value}, this.toolbarItems[key].options[value]);
                    options.push(opt);
                }
                const dropdown = tag('select', {'class': `ie-combo combo-${key}`, 'title': this.toolbarItems[key].tooltip ?? ''}, options);
                dropdown.addEventListener('input', this.toolbarItems[key].callback.bind(this));
                const span = tag('span', {'class': 'combo'}, dropdown);
                nodes.push(span);
            }
        });
        return tag('div', {'class': 'inline-edit-toolbar'}, nodes);
    }

    // Enable/disable commands based on changes made
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
                    const font = currentStyle(elem)['fontFamily'].replace(/^"|"$/g, '');
                    console.log('FONT', font);
                    if (this.toolbarItems.font.options[font]) {
                        console.log('FONT inside', font);
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

    // Enable/disable history buttons based on history state
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

    // Enable save button if there are changes
    updateSaveButton() {
        const btn = this.get('.btn-save');
        if (btn) {
            const fn = this.modified() ? 'remove' : 'add';
            btn.classList[fn]('disabled');
        }
    }

    // Enable/disable clear format button
    updateClearButton() {
        const btn = this.get('.btn-clear');
        const elem = this.getSelectedNode();
        if (btn && elem) {
            const fn = ['A', 'U', 'EM', 'DEL', 'SPAN', 'STRONG'].includes(elem.tagName) ? 'remove' : 'add';
            btn.classList[fn]('disabled');
        }
    }

    // Check if there are changes
    modified() {
        return (this.element.innerHTML != this.history.origin);
    }

    // Get elements
    get(selector = '') {
        const wrapper = this.element.closest('.inline-edit-wrapper');
        if (!selector) {
            return wrapper;
        }
        return $single(selector, wrapper);
    }
    
    // Close all instances
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

    // Close instance with confirmation if there are changes
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

    // Unmount the editor
    unedit() {
        this.element.innerHTML = this.history.origin;
        this.element.removeAttribute('contenteditable');
        this.element.removeEventListener('input', debounce(this.saveState.bind(this), 500));
        this.history = { origin: '', current: '', undo: [], redo: [] };
        this.get().classList.remove('editing');
    }
      

    // Selection

    // Get first parent node from selection or cursor position
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

    // Select contents of parent node
    expandToParent(range, ifHasNodes = false) {
        if (!ifHasNodes || this.hasNonTextNodes(range)) {
            const parent = this.getSelectedNode(range);
            if (parent) {
                range = this.expandSelectionToNode(parent);
            }
        }
        return range;
    }

    // Select contents of the given node
    expandSelectionToNode(node) {
        const newRange = document.createRange();
        newRange.selectNodeContents(node);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(newRange);
        return newRange;
    }

    // Get selection range
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

    // Update toolbar classes based on selection
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

    // Check for non-text nodes in selection
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

    // Update content on server
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

export default InlineEdit;