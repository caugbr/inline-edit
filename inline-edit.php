<?php
/**
 * Plugin name: Inline Edit
 * Description: Allow logged in users to edit some parts of HTML content directly from the frontend.
 * Version: 1.0
 * Author: Cau Guanabara
 * Author URI: mailto:cauguanabara@gmail.com
 * Text Domain: inedit
 * Domain Path: /langs/
 * License: Wordpress
 */

if (!defined('ABSPATH')) {
    exit;
}

define('INLINE_EDIT_PATH', trailingslashit(str_replace("\\", "/", dirname(__FILE__))));
define('INLINE_EDIT_URL', str_replace("\\", "/", plugin_dir_url(__FILE__)));

class InlineEdit {

    public $capability = 'manage_options';
    public $owner_can = true;
    public $selector = '*[data-editable]';
    private $config;

    public function __construct() {
        global $wp_helper;
        global $require_zip_plugin;
        if ($require_zip_plugin) {
            $require_zip_plugin->require(
                'Inline Edit', 
                'WP Helper', 
                'https://github.com/caugbr/wp-helper/archive/refs/heads/main.zip', 
                'wp-helper/wp-helper.php'
            );
        }
        if ($wp_helper) {
            $this->set_config();
            $wp_helper->add_textdomain('inedit', dirname(plugin_basename(__FILE__)) . '/langs');
            add_action('init', function() use($wp_helper) {
                if ($this->can_edit()) {
                    $wp_helper->load('popup', '__return_true', 'wp');
                    $wp_helper->load('dialog', '__return_true', 'wp');
                    $wp_helper->add_script(
                        'inline-edit', INLINE_EDIT_URL . 'assets/js/inline-edit.js', [], true, ['inEdit', $this->js_strings()]
                    );
                    $wp_helper->add_style('inline-edit-css', INLINE_EDIT_URL . 'assets/css/inline-edit.css');
                    if (!empty($this->config['template']) && !empty($this->config['template']['iconSet'])) {
                        if ($this->config['template']['iconSet'] == 'dashicons') {
                            $wp_helper->add_style('dashicons');
                        }
                    }
                    if (empty($this->config['template']['iconSet']) || $this->config['template']['iconSet'] == 'font-awesome') {
                        $wp_helper->add_style('font-awesome', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css');
                    }
                    if (!empty($this->config['template']['cssFile'])) {
                        $id = $this->config['template']['cssFileId'] ?? explode(".", $this->config['template']['cssFile'])[0];
                        $url = INLINE_EDIT_URL . "assets/css/{$this->config['template']['cssFile']}";
                        $wp_helper->add_style($id, $url);
                    }
                }
            });
            add_action('wp_ajax_save_content', [$this, 'save_content']);
        }
    }
    
    private function set_config() {
        $cfg = file_get_contents(INLINE_EDIT_PATH . '/config/config.json');
        $this->config = json_decode($cfg, true);
    }
    
    private function js_strings() {
        return array_merge([
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
        ], $this->config);
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