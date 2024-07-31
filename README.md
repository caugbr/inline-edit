# Inline-edit
A Wordpress plugin that allows logged in users to edit parts of HTML directly from the frontend.

## Who is this for?
If your users can't access the site administration, but you want them to edit some elements, this plugin creates an inline editor, allowing users to change things without going into the administration.

## How to

### Template
First, you need to add some attributes to the tags that will be editable:

- `data-editable` - contains the property that will be editable.\
  It can be a post property, like `post_title` or a meta field name, preceeded by 'meta:', like this: `meta:field_name`.
- `data-id` - contains the post ID
- `data-toolbar` - defines the commands that will be available.\
  If omitted the full editor will be displayed.

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
You can change it like this:

    global  $inline_edit;
    // set your preferred capability
    $linine_edit->capability = 'any_wp_capability';
    // now the owner can edit only if he has the capability set
    $linine_edit->owner_can = false;


