<?php
/*
	Redaxo-Addon SimpleBlockRepeater
	Boot (weitere Konfigurationen & Einbindung)
	v1.0.0
	by Falko Müller @ 2026
*/

/** RexStan: Vars vom Check ausschließen */
/** @var rex_addon $this */

 
if (rex::isBackend() && rex::getUser()) {
    rex_view::addJsFile(rex_url::addonAssets('simple_block_repeater') . 'js/Sortable.min.js');
    rex_view::addJsFile(rex_url::addonAssets('simple_block_repeater') . 'js/simple_block_repeater.js');
    rex_view::addCssFile(rex_url::addonAssets('simple_block_repeater') . 'css/simple_block_repeater.css');
}
?>