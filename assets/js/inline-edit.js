
import InlineEdit from './editor.js';

window.addEventListener('DOMContentLoaded', () => {
    if (window.inEdit) {
        $apply(inEdit.selector, elem => {
            const ie = new InlineEdit(elem);
        });
    }
});

