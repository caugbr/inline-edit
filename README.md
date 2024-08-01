# Inline-edit
A Wordpress plugin that allows logged in users to edit parts of HTML directly from the frontend.

## Who is this for?
If your users can't access the site administration, but you want them to edit some elements, this plugin creates an inline editor, allowing users to change things without going into the administration.

## How to use it


### Template
First, you need to add some attributes to the tags that will be editable:

- **`data-editable`** - contains the property that will be editable.\
  It can be a post property, like `post_title` or a meta field name, preceeded by 'meta:', like this: `meta:field_name`.
- **`data-id`** - contains the post ID
- **`data-toolbar`** - defines the commands that will be available.\
  If omitted the full editor will be displayed. Optional.

Example with a limited editor (only text itself can be changed):

	<h1
	    class="entry-title"
	    data-editable="post_title"
	    data-id="<?php the_ID(); ?>"
	    data-toolbar="undo,redo,separator,save">
	    <?php  the_title(); ?>
	</h1>

### Plugin
By default, the plugin will use two parameters to define who can use the editor. Whether the current user has the capability set (default: manage_options) or whether he is the owner of the edited post.\
There is a global instance of the plugin and you can change it like this:

    global  $inline_edit;
    // set your preferred capability
    $linine_edit->capability = 'any_wp_capability';
    // now the owner can edit only if he has the capability set
    $linine_edit->owner_can = false;

## Editor
The editor is simple and has few commands available. This is the first version of this plugin, but beyond that, the user should not have much power to change the style of the page. It is designed to edit the text, not the style.

### Toolbar items
The below list contains the names you can use to organize toolbar for each editable element, using the attribute `data-toolbar`.

**When commands are disabled:**
- The buttons that applies format will be enabled only if there is some selected text. 
- The button "clear" is enabled only if cursor is inside some element that has a format to be removed.
- The history buttons will follow the history and they will be enabled if there are history steps to undo / redo.
- The button "save" will be disabled until you make some change.
- The two dropdowns are always enabled but only have effect if there is some selected text.

**List of all commands:**
- "separator" - (not a command) Add a vertical separator between items
- "format" - (combo) Set text format.
- "font" - (combo) Set font family.
- "bold" - (button) 
- "italic" - (button) 
- "underline" - (button) 
- "strike" - (button) 
- "link" - (button) Create / edit link.
- "color" - (button) Set text color.
- "clear" - (button) Remove text format.
- "undo" - (button) 
- "redo" - (button) 
- "save" - (button) Save changes on server. *Required.
