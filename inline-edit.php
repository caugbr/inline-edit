<?php
/**
 * Plugin name: Inline Edit
 * Description: Allow logged in users to edit some parts of HTML content directly from the frontend
 * Version: 1.0
 * Author: Cau Guanabara
 * Author URI: mailto:cauguanabara@gmail.com
 * License: Wordpress
 */

if (!defined('ABSPATH')) {
    exit;
}

define('INLINE_EDIT_URL', str_replace("\\", "/", plugin_dir_url(__FILE__)));

class InlineEdit {

    public $capability = 'manage_options';
    public $owner_can = true;
    public $selector = '*[data-editable]';

    public function __construct() {
        global $wp_helper;
        if ($wp_helper) {
            $wp_helper->add_textdomain('inedit', dirname(plugin_basename(__FILE__)) . '/langs');
        } else {
            throw new Exception(__("WP-Helper is not installed and we depend on it.", 'inedit'));
        }
        add_action('init', [$this, 'include_stuff']);
        add_action('wp_ajax_save_content', [$this, 'save_content']);
        add_filter('wp_script_attributes', [$this, 'add_prop_module']);
    }
    
    private function js_strings() {
        return [
            "selector" => $this->selector,
            "ajaxurl" => admin_url('admin-ajax.php'),
            "bold" => __('Bold', 'inedit'),
            "italic" => __('Italic', 'inedit'),
            "underline" => __('Underline', 'inedit'),
            "strike" => __('Strike through', 'inedit'),
            "link" => __('Link', 'inedit'),
            "createLink" => __('Create link', 'inedit'),
            "editLink" => __('Edit link', 'inedit'),
            "color" => __('Text color', 'inedit'),
            "editColor" => __('Edit color', 'inedit'),
            "selectColor" => __('Select color', 'inedit'),
            "clear" => __('Clear format', 'inedit'),
            "format" => __('Text format', 'inedit'),
            "font" => __('Font family', 'inedit'),
            "undo" => __('Undo', 'inedit'),
            "redo" => __('Redo', 'inedit'),
            "save" => __('Update on server', 'inedit'),
            "p" => __('Paragraph', 'inedit'),
            "h1" => __('Title 1', 'inedit'),
            "h2" => __('Title 2', 'inedit'),
            "h3" => __('Title 3', 'inedit'),
            "h4" => __('Title 4', 'inedit'),
            "h5" => __('Title 5', 'inedit'),
            "pre" => __('Pre formatted', 'inedit'),
            "saveTitle" => __('Update element', 'inedit'),
            "unsaved" => __('There are unsaved changes. Discard?', 'inedit')
        ];
    }
    
    public function include_stuff() {
        if ($this->can_edit()) {
            global $wp_helper;
            $wp_helper->load('popup', '__return_true', 'wp');
            $wp_helper->load('dialog', '__return_true', 'wp');
            add_action('wp_enqueue_scripts', [$this, 'add_stuff']);
        }
    }

    public function add_prop_module($attrs) { print "{$attrs['id']}\n";
        if (isset( $attrs['id'] ) && $attrs['id'] === 'inline-edit-js-js') {
          $attrs['type'] = 'module';
        }
        return $attrs;
    }

    public function add_stuff() {
        wp_enqueue_script('inline-edit-js', INLINE_EDIT_URL . 'assets/js/inline-edit.js');
        wp_localize_script('inline-edit-js', 'inEdit', $this->js_strings());
        wp_enqueue_style('inline-edit-css', INLINE_EDIT_URL . 'assets/css/inline-edit.css');
        wp_enqueue_style('font-awesome', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css');
    }

    public function save_content() {
        if (!empty($_POST['section']) && !empty($_POST['post_id']) && !empty($_POST['content'])) {
            $content = stripslashes($_POST['content']);
            if (substr($_POST['section'], 0, 5) == 'meta:') {
                $meta_name = str_replace("meta:", "", $_POST['section']);
                $ret = update_post_meta($_POST['post_id'], $meta_name, $content);
            } else {
                $post = get_post($_POST['post_id']);
                $post->{$_POST['section']} = $content;
                $ret = wp_update_post($post);
            }
        }
        $msg = $ret ? __('Content successfully updated', 'inedit') 
                    : __('There was an error and the content could not be updated', 'inedit');
        wp_send_json(['error' => !$ret, 'message' => $msg, 'content' => $content]);
    }

    private function can_edit() {
        if (!is_user_logged_in()) {
            return false;
        }
        if ($this->owner_can) {
            global $post;
            $current_user = wp_get_current_user();
            if(isset($post->post_author) && $post->post_author == $current_user->ID) {
                return true;
            }
        }
        return current_user_can($this->capability);
    }
}

global $inline_edit;
$inline_edit = new InlineEdit();