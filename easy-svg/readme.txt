=== Easy SVG ===
Contributors: unleashwp, Benjamin_Zekavica
Tags: svg, svg upload, icons, icon block, sanitize
Requires at least: 6.6
Tested up to: 7.2
Requires PHP: 8.0
Stable tag: 5.0.3
License: GPLv3 or later
License URI: https://www.gnu.org/licenses/gpl-3.0.html

Upload SVG files safely: every file is cleaned before it is stored. Keep your own icons in one library for the Icon block, shortcodes and PHP.

== Description ==

Need more icon sets, templates and integrations? [Easy SVG Pro](https://www.unleash-wp.com/en/plugins/easy-svg-pro/?src=wporg.readme-top) builds on this plugin.

Built for developers: the [documentation](https://support.unleash-wp.com/en/guides/easy-svg/introduction?utm_source=easy-svg&utm_medium=plugin&utm_campaign=readme&utm_content=docs) covers every feature, and the [API reference](https://support.unleash-wp.com/en/api/easy-svg/overview?utm_source=easy-svg&utm_medium=plugin&utm_campaign=readme&utm_content=api) explains functions, hooks and the REST API.

Easy SVG lets you upload SVG files to WordPress safely and use them like any other image. On WordPress 7.1 and newer it is also your icon library for the Icon block.

SVG files stay sharp at every size and are tiny on disk. WordPress still refuses them, and for a good reason. SVG is not a picture format like PNG or JPEG. It is XML, and an SVG file can carry scripts, event handlers and links to other servers.

Easy SVG cleans every file with the maintained [enshrined/svg-sanitize](https://github.com/darylldoyle/svg-sanitizer) library before it is stored, and a file that cannot be cleaned is refused. Then you use SVGs like any other image: in the block editor, as a featured image, in galleries and in custom fields.

Add your own icons once, pick them in the Icon block, or print them with a shortcode or one line of PHP. The icons live in the plugin, not in your theme, so they stay when you change theme or page builder.

Try it without installing: the Live Preview on this page opens a demo site with three icons in the library and on a page.

Easy SVG has run on WordPress sites since 2017 and is active on more than 40,000 of them. It sends nothing to other servers, tracks nothing and loads no scripts on your front end.

= Safe uploads, on every way in =

* **Cleaned before it is stored.** Scripts, event handlers, `javascript:` links and references to other servers are removed. A broken or empty file is refused.
* **Every way a file arrives.** The media uploader, the block editor, the REST API, WP-CLI `wp media import`, `media_sideload_image()` and importers. XML-RPC uploads are accepted only when the file is already clean.
* **A safety net.** Every new SVG attachment is checked once more when it is created. A file that cannot be cleaned is removed again.
* **The server decides the file type.** What the browser claims does not count, so a renamed file cannot slip through.
* **Real sizes in the media library.** Width and height are read from the file, also when it only has a viewBox, so an SVG never shows as 0 by 0.
* **A size limit.** Up to 2 MB per file, or less when your server's upload limit is lower.
* **Multisite aware.** On a network, SVG is offered only where the network's "Upload file types" setting includes it.

SVG uploads, cleaning and the size limit are always on. They are the safety, not features you switch off.

= Your own icons in the Icon block =

The icon library is off until you switch on "Manage icons" under Easy SVG, Settings. A fresh install adds only safe SVG uploads.

* **Add icons your way.** Choose files or drop up to 100 at once, pick SVGs from the media library, or paste SVG code and see a preview and a list of what will be removed before you save.
* **Pick them in the Icon block.** On WordPress 7.1 and newer your icons appear in the Icon block under "Easy SVG", next to the icons WordPress brings.
* **Use them anywhere.** Copy an icon as PHP, shortcode or block. `easy_svg_icon()` and the `[easy_svg_icon]` shortcode print it in templates and content, 1em square by default, so it follows the text around it.
* **Keep the library tidy.** Search, rename, switch off, download and delete icons, one at a time or several at once. A renamed icon keeps its address, so pages that use it do not break.
* **Hardened on every page.** An icon is cleaned when it is added, and hardened again each time it is printed into a page.
* **Accessible.** A decorative icon is hidden from screen readers. An icon with a meaning is announced with its name. The screens work by keyboard.
* **Icons stay visible.** When an add-on that placed icons on your pages is switched off, those icons keep showing.

= Small and quiet =

* One Easy SVG menu with Icons, Tools and Settings.
* No tracking, no external requests, no scripts on your front end.
* A support report under Easy SVG, Tools, ready to paste into a support request. Keys, tokens and e-mail addresses are left out.
* Translation-ready, with German included.

= Easy SVG Pro =

Everything above is free and stays free. Easy SVG Pro is a paid add-on by UnleashWP for agencies and freelancers who build sites for clients. It keeps one icon set per client that works in every theme and plugin and moves to the next site in one click. It adds an icon field for PHP-only blocks, brings your icons into ACF, Meta Box, Elementor, WPBakery, Avada and other builders, and exports a set as a file, a link or a plugin. It needs WordPress 7.1 and PHP 8.2.

[See Easy SVG Pro and its prices](https://www.unleash-wp.com/en/plugins/easy-svg-pro/?src=wporg.readme#pricing)

= For developers =

The sanitizer removes every tag and attribute that is not on its allow-list. Two filters let you extend that list for your site. Only add what you need: every addition is something an uploaded file may then contain.

Allow additional tags with `esw_svg_allowed_tags`:

    add_filter(
        'esw_svg_allowed_tags',
        function ( $tags ) {
            $tags[] = 'feDropShadow';
            return $tags;
        }
    );

Most drawing elements are already on the list, so you rarely need this. `feDropShadow`, the shadow some design tools export, is one that is not. Never add `script`, `foreignObject`, or the animation elements (`animate`, `set`, `animateTransform`, `animateMotion`): the list only decides which names may appear, it does not check what their attributes point at, so those elements can put back the very things the sanitizer is there to remove. `style` is allowed by default: in an uploaded file shown as an image its CSS stays inside the SVG, remote references in it are removed, and icons placed inline in a page lose it. Do not print an uploaded SVG's markup into a page yourself; use `easy_svg_icon()` so it is hardened first.

Allow additional attributes with `esw_svg_allowed_attributes`:

    add_filter(
        'esw_svg_allowed_attributes',
        function ( $attributes ) {
            $attributes[] = 'focusable';
            return $attributes;
        }
    );

External references, for example a stylesheet, image or font loaded from another server, are removed by default. A site that needs them can keep them with `esw_svg_remove_remote_references`:

    add_filter(
        'esw_svg_remove_remote_references',
        '__return_false'
    );

Add-ons can call `easy_svg_sanitizer()` to clean markup exactly the way the site does. See the FAQ for details.

== Installation ==

1. In your WordPress admin, go to Plugins → Add New Plugin.
2. Search for "Easy SVG".
3. Click Install Now, then Activate.
4. Optional: go to Easy SVG → Settings and switch on "Manage icons" to use the icon library.
5. Upload SVG files in the media library as usual.

You can also download the plugin as a zip file and upload it under Plugins → Add New Plugin → Upload Plugin.

The icon library is off until you switch it on under Easy SVG → Settings, so a fresh install adds only safe SVG uploads. A site that was already using SVG uploads keeps them when it updates.

== Frequently Asked Questions ==

= Where do I report security bugs found in this plugin? =

Please report security bugs found in the source code of the Easy SVG plugin through the [Patchstack Vulnerability Disclosure Program](https://patchstack.com/database/vdp/2c97b4d3-a5a2-48a4-b4da-b527d4d12e5c). The Patchstack team will assist you with verification, CVE assignment, and notify the developers of this plugin.

= Is it safe to allow SVG uploads? =

An SVG file can contain code, so allowing uploads without checks is not safe. Easy SVG sanitizes every SVG before it is stored: scripts, event handlers and other unsafe content are removed, and a file that cannot be cleaned is refused. Uploading still requires the same permission as any other media file.

= Why was my SVG rejected? =

The sanitizer refuses files it cannot read as a valid SVG, for example a file with broken XML or one that is not an SVG at all. Some older Adobe Illustrator exports use custom DTD entities, which are refused as well. Export the file again as a plain SVG, without those entities, and upload it again.

= I use nginx. Are the icon files protected? =

With the icon library on, WordPress keeps a copy of each icon in `wp-content/uploads/easy-svg-icon-files/`. Every file is sanitized, and its name carries a random hash, so nothing links to it. Apache reads the `.htaccess` there and serves none of them. nginx ignores `.htaccess`; add this to your server block if browsers should not reach them either:

    location ~ /easy-svg-icon-files/ {
        deny all;
    }

Put it above your other `location ~` blocks: nginx uses the first one that matches, so a rule for static files placed earlier would serve the icons anyway.

= What happens to SVGs already in my media library? =

Sanitizing happens when a file is added, so files already in your library are not changed or re-checked when you update the plugin. If some of them were uploaded before this version, or added outside the media uploader, re-upload anything you are unsure about so it passes through the current sanitizer.

= How do I allow additional tags or attributes? =

Use the `esw_svg_allowed_tags` and `esw_svg_allowed_attributes` filters, for example in a small custom plugin. The Description shows an example of each.

= How do I use the SVG icons? =

Go to Easy SVG → Icons and choose "Add icon". Give the icon a name, choose an SVG file or paste its code, and add it. On WordPress 7.1 or newer the icon then appears in the Icon block under "Easy SVG". You need administrator rights, because an icon is available site-wide. There is no limit on how many icons you keep.

On older WordPress versions the Icon block does not exist, so the icons do not appear in the editor; rendering them with `easy_svg_icon()` works there too.

Where you cannot write PHP, use the shortcode: `[easy_svg_icon name="easy-svg/heart"]`. It takes `class`, `label` and `size` like the PHP function does, and renders the same thing. `icon` works as another name for `name`.

An icon with a `label` is announced to screen readers with that name. The PHP function also takes `'decorative' => true`, which hides the icon from screen readers. Each icon's copy button in the library offers all three forms: PHP, shortcode and block. The Icon block only draws paths and polygons, so for an icon drawn with other shapes (a rectangle, a circle) the block form is not offered.

= How big is an icon? =

An icon from `easy_svg_icon()` or the shortcode is 1em square, so it follows the text around it. Pass `size` for a fixed size, `easy_svg_icon( 'easy-svg/heart', [ 'size' => '24px' ] )` or `[easy_svg_icon name="easy-svg/heart" size="24px"]`, or set it in your stylesheet: `.my-button { --easy-svg-icon-size: 1.5rem; }`. `size` takes a number with `px`, `em`, `rem` or `%`, and a plain number such as `24` means pixels; any other value draws the icon at the 1em default. Pass `'size' => ''` to leave the size to your own CSS entirely. An SVG that brings its own `width` and `height` keeps them. The icon takes the colour of the text around it, unless the SVG sets a fill of its own.

= Do my icons stay when I change theme or page builder? =

Yes. The icons are stored by this plugin, not by your theme. The Icon block, `easy_svg_icon()` and the shortcode keep working after a theme change, and the shortcode works in any page builder that renders shortcodes.

= For add-on authors: what may an add-on rely on? =

The function, the constants and the hooks named in this answer and the next two. Everything else in this plugin is an internal detail that may be renamed or removed.

`easy_svg_sanitizer()` returns a sanitizer configured with this site's allowed tags and attributes, or null when the sanitizing library is not loaded. Use it rather than the classes behind it, so an add-on cleans files exactly the way the site does.

`EASY_SVG_API` is an integer that changes only when that surface changes shape. It is 1, the first released shape, and it covers the hardening of icons printed inline: comments, CDATA, HTML that breaks out of the SVG and attributes that load from another server are removed. Compare against it rather than against the plugin version.

`EASY_SVG_PANEL_API` is a second integer, for the Icons panel's extension points: `easy_svg_panel_enqueue` and `easy_svg_panel_menu_tabs`. It is 1. It covers the five labelled areas a tab names with `area`, a tab's own drawing through `icon`, and a capability per tab, which `easy_svg_panel_menu_tabs` carries as `array( 'label' => …, 'capability' => … )` beside the plain label it also accepts; `registerCollections()`, through which an add-on lists its icon collections inside the Icon library tab; a provider's `index()` and `markup()`, so the library lists every icon by name and asks for drawings only for the tiles on screen; an optional `reorder()` that lets the owner drag a provider's collections into their own order; and `copy()`, so an icon from a read-only source is copied into the icon library or a set instead of edited. Its own number because the sanitizer surface and the panel surface move for different reasons, and a filter cannot be asked about (nothing registers one), so an add-on that contributes a menu entry has no way to tell an older plugin apart except by this.

The hooks below are part of that surface too, because this plugin's own add-on already depends on two of them. Everything not named here or in those two answers is an internal detail that may be renamed or removed.

= For add-on authors: which hooks are there? =

`easy_svg_icon_markup` filters the markup of one icon on its way out of `easy_svg_icon()`, as `( string $markup, string $slug, string $collection )`. That covers the template tag and everything that renders through it, a page builder's icon element included. The Icon block does not: WordPress holds the markup it was handed when the collection was registered, and draws that. `easy_svg_registrable_icons` below is the hook for that half. Add a class or a `<title>` with this. Return your own string and you own the escaping.

`easy_svg_icon_label` filters the accessible name `easy_svg_icon()` gives a meaningful icon when the caller passed no `label`, as `( string $label, string $slug, string $collection )`. The name it is handed is the stored title, or for another collection's icon the slug in words; return the title your collection keeps. A label the caller passed always wins, and a blank answer keeps the one handed in, so `role="img"` never goes out without a name. It is escaped on the way out.

`easy_svg_update_icon_markup( int $id, string $markup )` replaces one stored icon's drawing and answers with a word: `updated`, `not_found`, `no_markup`, `refused` or `failed`. The bytes go through this site's sanitizer and the same size and complexity bounds an upload meets, so a repaired icon is not the one way into the store that skips them. Neither the slug nor the title moves: this changes the drawing, not which icon it is.

`easy_svg_rename_icon( int $id, string $label )` changes one stored icon's visible name and answers with a word: `renamed`, `not_found`, `no_label` or `failed`. Use it rather than writing the post yourself: `wp_update_post()` re-saves the row whole, so the markup passes kses again and the icon is quietly emptied for anybody without `unfiltered_html`, and the cached icon list has to be dropped afterwards or the editor offers the old name for up to a day. The slug is never touched: it is the icon's identity, and a saved Icon block carries it.

`easy_svg_registrable_icons` filters the whole library on its way to WordPress's icon registry, as one list of `{ slug, label, content }`. This is the only place the Icon block's markup can be changed: core's registry keeps a short allow-list of its own and offers no filter, so sizing or recoloring an icon has to happen before it is registered. Drop an entry and that icon is not offered at all. Answer with something that is not a list and nothing is registered, which is the safe reading rather than a fatal. `EASY_SVG_ICONS_API` is defined when this hook exists, because a filter cannot be probed for. While a callback is hooked here, every request hands over the whole library, so it always sees all of it.

`easy_svg_register_every_icon` decides whether a request hands every icon to WordPress's icon registry up front. It is true in wp-admin, in WP-CLI and in the editing view of common page builders, where the Icon block lists icons. Everywhere else a page registers only the icons its blocks name, just before they are drawn. Return true for an editor this plugin does not recognise.

`easy_svg_panel_enqueue` fires once the Icons panel's script is registered, with that script's handle as its only argument. Make it a dependency of your own bundle and yours loads after ours, into the same panel.

`easy_svg_panel_pro_logo` filters the address of the logo the Icons panel's header shows. It is empty by default, and then the header shows this plugin's logo; an add-on returns the URL of its own logo, which the header then shows instead of this plugin's logo and badge. A narrow screen keeps the compact mark either way.

`easy_svg_pro_url` filters the address behind the add-on link in this plugin's row on the Plugins screen. The link is only there when the add-on is not installed; return your own address to point it somewhere else.

`easy_svg_review_url` filters the address the Rate link in this plugin's row on the Plugins screen goes to. It is the WordPress.org review form by default; return your own address to send people elsewhere.

`easy_svg_panel_pro_review_url` filters the address the Icons panel's footer stars go to when an add-on returns an address. It is empty by default, and then the stars lead to the WordPress.org review form; an add-on returns the address of its own review window.

`easy_svg_panel_menu_tabs` filters which tabs get their own entry in the Icons menu, as `tab id => label`. An add-on that registers a tab adds its entry here, and the entry opens the panel with that tab already open.

`easy_svg_support_report` filters the lines of the Support tab's report, as `Label => value`. An add-on adds what a support request needs. Every line is scrubbed afterwards: a label that names a key, token, secret, password, e-mail or contact is dropped, and so is a value that holds an address or a long token-like string, so a secret cannot reach the report by this route.

`easy_svg_max_bytes` is the largest SVG the plugin parses, in bytes. It is 2 MB, or the server's upload limit when that is lower, and it is not a setting: it keeps one file from tying up the parser. A file over it is refused, never truncated.

`easy_svg_max_php_tags` (10) and `easy_svg_max_use_tags` (1000) are two structural bounds checked before sanitizing. They are not about size: the sanitizer rescans the whole document once per nested PHP processing instruction, and once per `<use>` for every element with an id, so a file well under the byte cap can hold a worker for minutes. Raising them raises that ceiling. No icon and no ordinary drawing comes near either.

`easy_svg_respect_network_filetypes` (true) decides whether a multisite network's own upload-filetype setting is honoured. Left alone, a network that does not permit SVG keeps not permitting it whatever a single site says. Return false to let a site decide for itself.

= For add-on authors: which hooks loosen a security decision? =

Three, and what they cost is worth stating. Nothing in this plugin's settings can switch sanitizing off, so reaching these is a deliberate act of code on a site whose owner accepted the trade.

`esw_svg_allowed_tags` and `esw_svg_allowed_attributes` are the sanitizer's allow-list of elements and of attributes. Adding to either lets markup through that is refused today. `<script>`, `on*` handlers and `javascript:` URLs are refused for the ordinary reason, and admitting them makes an uploaded file able to run code in your admins' browsers. Admitting a drawing element that an icon library needs is the case these exist for.

`esw_svg_remove_remote_references` (true) decides whether references to other hosts are stripped out of an uploaded SVG. Left alone, an SVG cannot pull anything from somewhere else. Turned off, an uploaded file can fetch from a third-party host on your visitors' behalf, a request that leaves your site and can be logged by whoever receives it.

= What does Pro add? =

Easy SVG Pro is a paid add-on for agencies and freelancers. Instead of one icon library per site, you keep one icon set per client and take it from site to site. It adds an icon field for PHP-only blocks, your icons in ACF, Meta Box, Lazy Blocks, Elementor, WPBakery, Avada and more, imports from ZIP files and icon fonts, and export as a file, a link or a plugin. Plans cost 29 euros a year for one site, 89 for ten sites and 149 for unlimited sites. Nothing in this free plugin is locked or limited without it. [Easy SVG Pro prices](https://www.unleash-wp.com/en/plugins/easy-svg-pro/?src=wporg.readme#pricing)

= What does my server need? =

WordPress 6.6 and PHP 8.0 or newer, with the DOM, libxml and JSON extensions: the sanitizer that checks every SVG needs them. The plugin sends nothing to any outside server. For the icon library with many icons, a PHP memory_limit of 128 MB is enough. The full list: [System requirements](https://support.unleash-wp.com/en/guides/easy-svg/requirements?utm_source=easy-svg&utm_medium=plugin&utm_campaign=readme&utm_content=requirements).

= Where can I get help? =

Please ask in the [support forum](https://wordpress.org/support/plugin/easy-svg/).

= Where is the source code? =

The PHP ships as written. The settings panel in `build/panel.js` and the hint in `build/hint.js` are compiled with Vite from the React sources, which ship unminified in the `src/` folder of the plugin. The package.json, package-lock.json, vite.config.js and the fonts in `public/` ship too, so `npm ci && npm run build` in the plugin folder builds them again.

== Credits ==

Easy SVG is built on these open source projects. Thank you.

* [svg-sanitizer](https://github.com/darylldoyle/svg-sanitizer) by Daryll Doyle, GPL-2.0-or-later
* [Chakra UI](https://chakra-ui.com) by Chakra Systems, [Ark UI](https://ark-ui.com) and [Zag.js](https://zagjs.com) by Chakra UI, MIT
* [Emotion](https://emotion.sh) and [Stylis](https://github.com/thysultan/stylis), MIT
* [Floating UI](https://floating-ui.com), MIT
* [Internationalized](https://react-spectrum.adobe.com/internationalized/) by Adobe, Apache-2.0
* [DOMPurify](https://github.com/cure53/DOMPurify) by Cure53, MPL-2.0 or Apache-2.0
* [dnd kit](https://dndkit.com) by Claudéric Demers, MIT
* [React Icons](https://react-icons.github.io/react-icons/), MIT, with icons from [Lucide](https://lucide.dev), ISC
* [Ubuntu Font Family](https://design.ubuntu.com/font) by Canonical Ltd., Ubuntu Font Licence 1.0, licence text in `build/fonts/LICENCE.txt`
* React and React DOM are the copies WordPress ships, not bundled here.

== Screenshots ==

1. Your own icons in one library, ready for the Icon block, templates and shortcodes.
2. Paste SVG code and see first what will be removed. Here an onload handler and a script are taken out before the icon is saved.
3. In the block editor, your icons appear in the Icon block under "Easy SVG".
4. Add icons by dropping files, choosing them or pasting code.
5. SVG files in the media library, with a preview like any other image.

== Changelog ==

= 5.0.3 (2026-11-27) =
* New: icons of your own sets can be copied into the library, or moved there by dragging them onto Library.
* Changed: an icon that is moved or deleted leaves the library at once. If the change fails, it comes back.
* Changed: while the library loads, its placeholder has the shape of the screen.
* New: a Live Preview on the plugin page on WordPress.org.

= 5.0.2 (2026-11-26) =
* New: icons in the Icon block can link to a page, a URL or a jump mark such as #prices, with the editor's own link field. The link is named for screen readers and says when it opens a new tab.
* Changed: when icon sets are installed, the search finds icons in the library and in every set, in place of the All icons entry in the rail.
* Changed: Font Awesome's licence comment stays in an SVG when it is cleaned, as Font Awesome asks.
* Changed: colors an SVG sets through CSS classes stay when it is cleaned.
* Changed: the library stays smooth while icons are dragged, the pager stays in reach above the footer, and a notice leaves after 4 seconds.
* Changed: deleting from the trash reads Delete permanently. On phones and tablets Collections sits beside Edit.
* Performance: the library loads the media library and the code editor only when a dialog needs them.
* Fixed: an SVG whose root tag was very long lost its drawing when cleaned.
* Fixed: set icons picked while a search was still loading were unpicked.
* Security reports go through the Patchstack Vulnerability Disclosure Program.

= 5.0.1 (2026-11-25) =
* Changed: the plugin is called Easy SVG everywhere.
* Changed: in a set, the icons in use come first.
* Changed: the library's notice leaves after 3 seconds and stays while the pointer or the keyboard focus is on it. After a delete it could stay on screen for good.
* Security: an icon on the page and in the preview loads nothing from another server, also through fill, mask, filter or marker.
* Security: icons whose name could break the copied code get no copy buttons.
* Performance: icons kept from a switched-off add-on load as one cached file instead of inline CSS on every page.
* For developers: a `size` that has no effect says why in the debug log (WP_DEBUG).
* Docs: the FAQ shows how to protect the icon files on nginx.
* Updated: DOMPurify 3.5.0.

= 5.0.0 (2026-11-25) =
* New: an icon library for the Icon block (WordPress 7.1 and newer). Upload SVGs, drop them onto the library, paste SVG code or pick them from the media library. Every icon is cleaned on the way in, exactly as an upload is.
* New: one Easy SVG menu with Icons, Tools and Settings.
* New: search, rename, switch off and delete icons, also several at once. A renamed icon keeps the address a template already uses.
* New: deleted icons go to a Trash in the library. Restore them there or delete them for good, which leaves nothing on the server.
* New: `easy_svg_icon()` and a shortcode print an icon anywhere, 1em square by default and sized with `size` or `--easy-svg-icon-size`. The icon takes the colour of the text around it.
* New: `easy_svg_icon()` also draws icons from WordPress's own icon registry.
* New: the editor says so when an Icon block points at an icon that is no longer there.
* Security: an uploaded SVG loses `expression()`, `behavior`, `-moz-binding` and any `url()` that is not a link into the file, a relative path or http(s), such as `javascript:` and `data:`, in its styles.
* Security: title and description inside an SVG are checked in any letter case, so markup hidden in them is removed.
* Security: an icon is hardened again each time it is printed, and a `style` in it keeps only how the drawing is painted, so a stored icon cannot bring a script onto the page or be styled to cover it.
* Security: a refused SVG leaves no file in the uploads folder, and icon folders cannot be listed.
* Changed: External references in uploaded SVGs are now removed by default; filter `esw_svg_remove_remote_references` restores the old behavior.
* Changed: the icon library is off until you switch it on under Easy SVG, Settings. Safe SVG uploads are always on.
* Changed: on multisite, SVG is offered only where the network's "Upload file types" includes it, and the icon library follows the same list.
* Fixed: an SVG that only has a viewBox gets its real width and height in the media library and the Image block instead of 0x0.
* Fixed: icons drawn with strokes show in the Icon block instead of an empty box.
* Fixed: two copies of the same icon on one page no longer share a filter or a gradient.
* Accessibility: the screens work by keyboard, show a focus ring everywhere, and screen readers read each setting's description.
* German: formal, Austrian and Swiss sites get the German translation too.
* Note: updating does not re-check SVGs already in your media library. Re-upload anything added before this version if you are unsure about it.
* For add-on authors: `easy_svg_sanitizer()`, `EASY_SVG_API`, `EASY_SVG_PANEL_API` and `EASY_SVG_ICONS_API`, with the hooks documented in the FAQ.

= 4.2.2 =
* Security: SVG files are sanitized on every upload path, including REST uploads of raw data, WP-CLI, XML-RPC and importers.

= 4.2.1 =
* Maintenance release so the 4.2 security update reaches every site through the WordPress update check. No code changes.

= 4.2 =
* Security: the bundled sanitizer (enshrined/svg-sanitize) is updated to 1.1.1. It fixes a stored XSS via DTD entities, a crash on DTD attribute declarations and a mixed case xlink:href bypass of the `<use>` nesting check, among the published advisories GHSA-9rjx-3jch-6vjf, GHSA-m9xh-6747-9r6f, GHSA-v383-3rw5-q8rf, GHSA-qhmf-972w-m957 and GHSA-3vh3-jf65-656w.
* Security: SVG files with an internal DTD (custom entities) are refused. A standard DOCTYPE is still removed and the file is accepted.

= 4.1 =
* Security: server-side SVG file type detection; every genuine SVG upload is sanitized, and spoofed uploads are rejected.
* Updated SVG sanitizer.
* Code quality improvements for the WordPress plugin guidelines.

= 4.0 =
* Updated SVG sanitizer.
* Compatibility with the current WordPress version.

= 3.9 =
* Updated SVG sanitizer and license.
* Compatibility with WordPress 6.8.

= 3.8 =
* Security fix for the image uploader. Props to Francesco Carlucci and Wordfence.
* Requires PHP 8.0 and WordPress 6.0 or newer.

Older versions: see the "Advanced View" of this plugin on WordPress.org.

== Upgrade Notice ==

= 5.0.3 =
Moved and deleted icons leave the library at once; set icons can be copied into the library.

= 5.0.2 =
Icons in the Icon block can link, and Font Awesome icons keep their licence comment when cleaned.

= 5.0.1 =
Icons no longer load anything from other servers, the library notice no longer stays on screen, and icons kept from a switched-off add-on load as one cached file.

= 5.0.0 =
New icon library for the Icon block, off until you switch it on. Fixes published security advisories in the bundled sanitizer and cleans SVGs from `wp media import`, importers or REST. SVGs with custom DTD entities are refused. SVGs already uploaded are not re-checked.
