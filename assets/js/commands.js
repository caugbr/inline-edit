

const Commands = {
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
        callback(event) { this.applyFormat(event.target.value); },
        methods: {
            applyFormat(tagName) {
                let range = this.getSelection();
                range = this.expandToParent(range, true);
                if (tagName && range && !!range.toString()) {
                    const frmt = tag(tagName);
                    range.surroundContents(frmt);
                    this.saveState();
                }
            }
        }
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
        callback(event) { this.applyFontFamily(event.target.value); },
        methods: {
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
        }
    },
    bold: {
        type: 'button',
        icon: 'fa-solid fa-bold',
        tooltip: inEdit.bold,
        callback() { this.bold() },
        methods: {
            bold() {
                const range = this.getSelection();
                if (range && !!range.toString()) {
                    const strong = tag('strong');
                    range.surroundContents(strong);
                    this.saveState();
                }
            }
        }
    },
    italic: {
        type: 'button',
        icon: 'fa-solid fa-italic',
        tooltip: inEdit.italic,
        callback() { this.italic() },
        methods: {
            italic() {
                const range = this.getSelection();
                if (range && !!range.toString()) {
                    const em = tag('em');
                    range.surroundContents(em);
                    this.saveState();
                }
            }
        }
    },
    underline: {
        type: 'button',
        icon: 'fa-solid fa-underline',
        tooltip: inEdit.underline,
        callback() { this.underline() },
        methods: {
            underline() {
                const range = this.getSelection();
                if (range && !!range.toString()) {
                    const u = tag('u');
                    range.surroundContents(u);
                    this.saveState();
                }
            }
        }
    },
    strike: {
        type: 'button',
        icon: 'fa-solid fa-strikethrough',
        tooltip: inEdit.strike,
        callback() { this.strikeThrough() },
        methods: {
            strikeThrough() {
                const range = this.getSelection();
                if (range && !!range.toString()) {
                    const del = tag('del');
                    range.surroundContents(del);
                    this.saveState();
                }
            }
        }
    },
    link: {
        type: 'button',
        icon: 'fa-solid fa-link',
        tooltip: inEdit.link,
        callback() { this.createLink() },
        methods: {
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
        }
    },
    color: {
        type: 'button',
        icon: 'fa-solid fa-palette',
        tooltip: inEdit.color,
        callback() { this.textColor() },
        methods: {
            textColor() {
                const range = this.getSelection();
                if (range && !!range.toString()) {
                    const wrapper = this.getSelectedNode(range);
                    const color = this.toHex(wrapper.style.color);
                    this.selectColor(color).then(color => {
                        const span = tag('span', { 'style': `color: ${color};` });
                        range.surroundContents(span);
                        this.saveState();
                    });
                }
            },
            selectColor(initColor = '') {
                return new Promise(resolve => {
                    const dlg = new Dialog(inEdit.editColor);
                    dlg.addButton(() => resolve(initColor), 'Cancel', 'secondary');
                    dlg.addButton(() => resolve(this.toHex($single('.content-modal input[type="color"]').value)));
                    dlg.modal(`<strong>${inEdit.selectColor}</strong><p><input type="color" value="${initColor}"></p>`);
                });
            },
            toHex(color) {
                color = color.trim();
                if (color.startsWith("#")) {
                    if (color.length === 4) {
                        color = "#" + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
                    }
                    return color.toUpperCase();
                }
              
                if (color.startsWith("rgb")) {
                    const rgbValues = color.match(/\d+/g).map(Number);
                    const hexValues = rgbValues.map(value => {
                        const hex = value.toString(16);
                        return hex.length === 1 ? "0" + hex : hex;
                    });
                    return `#${hexValues.join("")}`.toUpperCase();
                }
                return color;
            }
        }
    },
    clear: {
        type: 'button',
        icon: 'fa-solid fa-times',
        tooltip: inEdit.clear,
        callback() { this.clearFormat() },
        methods: {
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
        }
    },
    undo: {
        type: 'button',
        icon: 'fa-solid fa-rotate-left',
        tooltip: inEdit.undo,
        callback() { this.undo() }
    },
    redo: {
        type: 'button',
        icon: 'fa-solid fa-rotate-right',
        tooltip: inEdit.redo,
        callback() { this.redo() }
    },
    save: {
        type: 'button',
        icon: 'fa-solid fa-check',
        tooltip: inEdit.save,
        callback() { this.save() }
    }
};

export default Commands;