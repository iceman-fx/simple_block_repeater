/*
	SimpleBlockRepeater (sbr) – Frontend-Logik
	v1.0

	Namespace: SBR (window.SBR)
	Abhängigkeiten: jQuery, Sortable.js
*/

(function ($, window) {
    'use strict';

    var SBR = window.SBR = window.SBR || {};

    // -------------------------------------------------------------------------
    // Hilfsfunktion: Repeater-Optionen auslesen
    // -------------------------------------------------------------------------

    SBR.getOptions = function ($repeater) {
        return {
            deleteAll:     $repeater.data('delete-all')     !== 0,
            showStatus:    $repeater.data('show-status')    !== 0,
            showDuplicate: $repeater.data('show-duplicate') !== 0
        };
    };

    // -------------------------------------------------------------------------
    // Events – Custom Events auf dem Repeater-Element
    //
    // sbr:show      → nach dem initialen Laden aller Blöcke
    //                 detail: { $repeater, blocks: [{ $block, index }] }
    //
    // sbr:add       → neuer (leerer) Block wurde hinzugefügt
    //                 detail: { $repeater, $block, index }
    //
    // sbr:duplicate → Block wurde dupliziert
    //                 detail: { $repeater, $block, $source, index }
    //
    // sbr:move      → Block wurde bewegt (up/down/sortable)
    //                 detail: { $repeater, $block, index, oldIndex }
    //
    // sbr:delete    → Block wurde gelöscht
    //                 detail: { $repeater, index }
    // -------------------------------------------------------------------------

    SBR.trigger = function ($repeater, eventName, detail) {
        $repeater.trigger('sbr:' + eventName, [detail]);
    };

    // -------------------------------------------------------------------------
    // Reindexing
    // -------------------------------------------------------------------------

    SBR.reindexBlocks = function ($repeater) {
        var repeaterId = $repeater.data('repeater-id');
        var $blocks    = $repeater.find('.sbr-blocks > .sbr-block');
        var total      = $blocks.length;

        $blocks.each(function (newIndex) {
            var $block = $(this);
            $block.attr('data-index', newIndex);

            $block.find('.sbr-block-title').text(
                $block.find('.sbr-block-title').text().replace(/#\d+/, '#' + (newIndex + 1))
            );

            $block.find('input, select, textarea').each(function () {
                var $field = $(this);
                var name   = $field.attr('name');
                if (name) {
                    $field.attr('name', name.replace(
                        new RegExp('(sbr_' + repeaterId + '\\[)\\d+(\\])'),
                        '$1' + newIndex + '$2'
                    ));
                }
            });

            $block.removeAttr('data-first').removeAttr('data-last');
            if (newIndex === 0)         $block.attr('data-first', '1');
            if (newIndex === total - 1) $block.attr('data-last',  '1');
        });

        $blocks.each(function (idx) {
            $(this).find('.sbr-up').toggleClass('disabled',  idx === 0);
            $(this).find('.sbr-down').toggleClass('disabled', idx === total - 1);
        });

        var max = parseInt($repeater.data('max'), 10);
        if (max > 0) {
            $repeater.find('.sbr-add-btn, .sbr-add-after').toggleClass('disabled', total >= max);
        }

        // Leer-Zustand ein-/ausblenden
        $repeater.find('.sbr-empty-state').toggle(total === 0);
        $repeater.find('.sbr-blocks').toggle(total > 0);

        // Status-Button + Duplicate-Button ein-/ausblenden je nach Repeater-Optionen
        var opts = SBR.getOptions($repeater);
        if (!opts.showStatus) {
            $repeater.find('.sbr-toggle').hide();
        }
        if (!opts.showDuplicate) {
            $repeater.find('.sbr-duplicate').hide();
        }

        // deleteAll=false: Löschen-Button deaktivieren wenn nur noch 1 Block übrig
        if (!opts.deleteAll && total <= 1) {
            $repeater.find('.sbr-delete').addClass('disabled');
        } else {
            $repeater.find('.sbr-delete').removeClass('disabled');
        }
    };

    // -------------------------------------------------------------------------
    // Glow-Effekt
    // -------------------------------------------------------------------------

    SBR.applyGlow = function ($block) {
        $block.addClass('sbr-block-glow');
        setTimeout(function () { $block.removeClass('sbr-block-glow'); }, 2000);
    };

    // -------------------------------------------------------------------------
    // Status-Toggle
    // -------------------------------------------------------------------------

    SBR.toggleStatus = function ($block) {
        var isActive     = $block.attr('data-status') !== '0';
        var $body        = $block.find('.panel-body');
        var $icon        = $block.find('.sbr-toggle .rex-icon');
        var $statusInput = $block.find('.sbr-status-input');

        if (isActive) {
            $block.attr('data-status', '0').addClass('sbr-block-inactive');
            $body.slideUp(150);
            $icon.removeClass('fa-eye').addClass('fa-eye-slash');
            $statusInput.val('0');
        } else {
            $block.attr('data-status', '1').removeClass('sbr-block-inactive');
            $body.slideDown(150);
            $icon.removeClass('fa-eye-slash').addClass('fa-eye');
            $statusInput.val('1');
        }
    };

    // -------------------------------------------------------------------------
    // Defaults + saved Data (data-default / data-selected)
    // -------------------------------------------------------------------------

    SBR.applyDefaults = function ($block) {
        $block.find('input[data-default], textarea[data-default]').each(function () {
            var $field = $(this);
            var val    = $field.val();
            var def    = (val !== undefined && val !== null && val !== '' ? val : $field.attr('data-default'));
            var type   = ($field.attr('type') || '').toLowerCase();

            if (type === 'checkbox') {
                $field.prop('checked', def === 'checked' || def === '1' || def === 'true');
            } else if (type === 'radio') {
                var name = $field.attr('name');
                $block.find('input[type="radio"][name="' + name + '"]').each(function () {
                    $(this).prop('checked', $(this).val() === def);
                });
            } else {
                $field.val(def);
            }
        });

        $block.find('select[data-default], select[data-selected]').each(function () {
            var $select = $(this);
            var sel     = $select.attr('data-selected');
            var def     = (sel !== undefined && sel !== null && sel !== '' ? sel : $select.attr('data-default'));
            $select.val(def);

            if ($select.val() === null) {
                if (def !== undefined && def !== null && def !== '') {
                    $select.find('option[value="' + def + '"]').prop('selected', true);
                } else {
                    $select.prop('selectedIndex', 0);
                }
            }
        });
    };

    // -------------------------------------------------------------------------
    // Validierung
    // -------------------------------------------------------------------------

    SBR.validateField = function ($field) {
        var pattern = $field.attr('data-pattern');
        if (!pattern) return true;

        var value   = $field.val();
        var valid   = new RegExp(pattern).test(value);
        var message = $field.attr('data-pattern-message') || 'Ungültige Eingabe';

        var $msg = $field.next('.sbr-error');
        if (!$msg.length) {
            $msg = $('<span class="sbr-error help-block"></span>');
            $field.after($msg);
        }

        if (valid) {
            $field.removeClass('has-error');
            $msg.hide().text('');
        } else {
            $field.addClass('has-error');
            $msg.text(message).show();
        }

        return valid;
    };

    SBR.validateContainer = function ($container) {
        var valid = true;
        $container.find('input[data-pattern], textarea[data-pattern]').each(function () {
            var $field = $(this);
            if ($field.val() === '' && !$field.prop('required')) return;
            if (!SBR.validateField($field)) valid = false;
        });
        return valid;
    };

    SBR.clearValidationState = function ($block) {
        $block.find('.form-group').removeClass('has-error');
        $block.find('.sbr-error').hide().text('');
    };

    SBR.applyNativePattern = function ($block) {
        $block.find('input[data-pattern], textarea[data-pattern]').each(function () {
            var $field  = $(this);
            var pattern = $field.attr('data-pattern').replace(/^\^/, '').replace(/\$$/, '');
            $field.attr('pattern', pattern);
        });
    };

    // -------------------------------------------------------------------------
    // Neuen Block aus Template holen
    // -------------------------------------------------------------------------

    SBR.getNewBlock = function ($repeater, newIndex) {
        var repeaterId = $repeater.data('repeater-id');
        var $tpl = $repeater.find('script[type="text/x-sbr-template"][data-repeater-id="' + repeaterId + '"]');

        if (!$tpl.length) {
            console.error('SimpleBlockRepeater: Kein Template für ID "' + repeaterId + '" gefunden.');
            return null;
        }

        var html = $tpl.html()
            .replace(/__INDEX__/g, newIndex)
            .replace(/__NUM__/g,   newIndex + 1)
            .replace(/__TOTAL__/g, newIndex + 1);

        return $(html);
    };

    // Gemeinsame Logik nach Einfügen eines neuen Blocks
    SBR.initNewBlock = function ($newBlock, $repeater) {
        SBR.applyDefaults($newBlock);
        SBR.applyNativePattern($newBlock);
        SBR.reindexBlocks($repeater);
        SBR.applyGlow($newBlock);
        $newBlock.find('input:not([type=hidden]), select, textarea').first().focus();
    };

    // -------------------------------------------------------------------------
    // Duplizieren
    // -------------------------------------------------------------------------

    SBR.duplicateBlock = function ($sourceBlock, $repeater) {
        var repeaterId = $repeater.data('repeater-id');
        var $container = $repeater.find('.sbr-blocks');
        var newIndex   = $container.find('.sbr-block').length;

        // Neuen leeren Block aus Template holen
        var $newBlock = SBR.getNewBlock($repeater, newIndex);
        if (!$newBlock) return;

        // Werte aus dem Quell-Block in den neuen Block übertragen
        $sourceBlock.find('input, select, textarea').each(function () {
            var $src  = $(this);
            var name  = $src.attr('name');
            if (!name) return;

            // Feldname: extrahiere den letzten Teil [feldname]
            var match = name.match(/\[([^\]]+)\]$/);
            if (!match) return;
            var fieldKey = match[1];

            // Entsprechendes Feld im neuen Block finden (über name-Endung)
            var $dst = $newBlock.find('[name$="[' + fieldKey + ']"]');
            if (!$dst.length) return;

            var type = ($src.attr('type') || '').toLowerCase();

            if (type === 'checkbox') {
                $dst.prop('checked', $src.prop('checked'));
            } else if (type === 'radio') {
                if ($src.prop('checked')) {
                    $dst.prop('checked', true);
                }
            } else if (type === 'hidden' && fieldKey === '_status') {
                // Status ebenfalls übernehmen
                $dst.val($src.val());
            } else {
                $dst.val($src.val());
            }
        });

        // Status-Darstellung synchronisieren
        var srcStatus = $sourceBlock.attr('data-status');
        $newBlock.attr('data-status', srcStatus);
        if (srcStatus === '0') {
            $newBlock.addClass('sbr-block-inactive');
            $newBlock.find('.panel-body').hide();
            $newBlock.find('.sbr-toggle .rex-icon').removeClass('fa-eye').addClass('fa-eye-slash');
        }

        // select: data-selected-Attribut aktualisieren damit SBR.applyDefaults korrekt arbeitet
        $sourceBlock.find('select').each(function () {
            var $srcSel  = $(this);
            var srcName  = $srcSel.attr('name');
            if (!srcName) return;
            var match = srcName.match(/\[([^\]]+)\]$/);
            if (!match) return;
            var fieldKey = match[1];
            var $dstSel  = $newBlock.find('select[name$="[' + fieldKey + ']"]');
            if ($dstSel.length) {
                $dstSel.attr('data-selected', $srcSel.val());
                $dstSel.val($srcSel.val());
            }
        });

        $newBlock.addClass('sbr-isnew');
        $sourceBlock.after($newBlock);

        SBR.applyNativePattern($newBlock);
        SBR.reindexBlocks($repeater);
        SBR.applyGlow($newBlock);

        var newIdx = parseInt($newBlock.attr('data-index'), 10);
        SBR.trigger($repeater, 'duplicate', {
            $repeater: $repeater,
            $block:    $newBlock,
            $source:   $sourceBlock,
            index:     newIdx
        });

        return $newBlock;
    };

    // -------------------------------------------------------------------------
    // Sortable initialisieren
    // -------------------------------------------------------------------------

    SBR.initSortable = function ($repeater) {
        var $blocksContainer = $repeater.find('.sbr-blocks')[0];
        if (!$blocksContainer) return;

        if (typeof Sortable === 'undefined') {
            console.warn('SimpleBlockRepeater: Sortable.js nicht geladen. Drag & Drop nicht verfügbar.');
            return;
        }

        Sortable.create($blocksContainer, {
            handle:    '.sbr-drag-handle',
            animation: 150,
            ghostClass: 'sbr-block-ghost',
            dragClass:  'sbr-block-dragging',
            onStart: function (evt) {
                // Visuelles Feedback
            },
            onEnd: function (evt) {
                var oldIndex = evt.oldIndex;
                var newIndex = evt.newIndex;

                if (oldIndex === newIndex) return;

                SBR.reindexBlocks($repeater);

                var $movedBlock = $($repeater.find('.sbr-blocks > .sbr-block')[newIndex]);

                SBR.trigger($repeater, 'move', {
                    $repeater: $repeater,
                    $block:    $movedBlock,
                    index:     newIndex,
                    oldIndex:  oldIndex
                });
            }
        });
    };

    // -------------------------------------------------------------------------
    // Event-Handler
    // -------------------------------------------------------------------------

    // Block am Ende hinzufügen (globaler Add-Button + Leer-Zustand-Button)
    $(document).on('click', '.sbr-add-btn', function (e) {
        e.preventDefault();
        var $btn = $(this);
        if ($btn.hasClass('disabled')) return;

        var repeaterId = $btn.data('repeater-id');
        var $repeater  = $('.sbr-repeater[data-repeater-id="' + repeaterId + '"]');
        var $container = $repeater.find('.sbr-blocks');
        var newIndex   = $container.find('.sbr-block').length;

        var $newBlock = SBR.getNewBlock($repeater, newIndex);
        if (!$newBlock) return;

        $newBlock.addClass('sbr-isnew');
        $container.append($newBlock);
        SBR.initNewBlock($newBlock, $repeater);

        var idx = parseInt($newBlock.attr('data-index'), 10);
        SBR.trigger($repeater, 'add', {
            $repeater: $repeater,
            $block:    $newBlock,
            index:     idx
        });
    });

    // Block nach aktuellem Element einfügen
    $(document).on('click', '.sbr-add-after', function (e) {
        e.preventDefault();
        var $btn = $(this);
        if ($btn.hasClass('disabled')) return;

        var $block     = $btn.closest('.sbr-block');
        var $repeater  = $btn.closest('.sbr-repeater');
        var $container = $repeater.find('.sbr-blocks');
        var newIndex   = $container.find('.sbr-block').length;

        var $newBlock = SBR.getNewBlock($repeater, newIndex);
        if (!$newBlock) return;

        $newBlock.addClass('sbr-isnew');
        $block.after($newBlock);
        SBR.initNewBlock($newBlock, $repeater);

        var idx = parseInt($newBlock.attr('data-index'), 10);
        SBR.trigger($repeater, 'add', {
            $repeater: $repeater,
            $block:    $newBlock,
            index:     idx
        });
    });

    // Block duplizieren
    $(document).on('click', '.sbr-duplicate', function (e) {
        e.preventDefault();
        var $btn      = $(this);
        if ($btn.hasClass('disabled')) return;

        var $block    = $btn.closest('.sbr-block');
        var $repeater = $btn.closest('.sbr-repeater');

        var opts = SBR.getOptions($repeater);
        if (!opts.showDuplicate) return;

        SBR.duplicateBlock($block, $repeater);
    });

    // Toggle
    $(document).on('click', '.sbr-toggle', function (e) {
        e.preventDefault();
        var $repeater = $(this).closest('.sbr-repeater');
        var opts      = SBR.getOptions($repeater);
        if (!opts.showStatus) return;

        SBR.toggleStatus($(this).closest('.sbr-block'));
    });

    // Block löschen
    $(document).on('click', '.sbr-delete', function (e) {
        e.preventDefault();
        var $btn      = $(this);
        if ($btn.hasClass('disabled')) return;

        var $block    = $btn.closest('.sbr-block');
        var $repeater = $btn.closest('.sbr-repeater');
        var opts      = SBR.getOptions($repeater);
        var min       = parseInt($repeater.data('min'), 10) || 0;
        var total     = $repeater.find('.sbr-blocks > .sbr-block').length;

        if (min > 0 && total <= min) {
            alert('Mindestanzahl von ' + min + ' Einträgen erreicht.');
            return;
        }

        // deleteAll=false: letzten Block schützen
        if (!opts.deleteAll && total <= 1) {
            return;
        }

        var deletedIndex = parseInt($block.attr('data-index'), 10);

        if (confirm('Eintrag wirklich löschen?')) {
            $block.remove();
            SBR.reindexBlocks($repeater);

            SBR.trigger($repeater, 'delete', {
                $repeater: $repeater,
                index:     deletedIndex
            });
        }
    });

    // Block nach oben
    $(document).on('click', '.sbr-up', function (e) {
        e.preventDefault();
        var $btn = $(this);
        if ($btn.hasClass('disabled')) return;

        var $block    = $btn.closest('.sbr-block');
        var $repeater = $btn.closest('.sbr-repeater');
        var $prev     = $block.prev('.sbr-block');
        var oldIndex  = parseInt($block.attr('data-index'), 10);

        if ($prev.length) {
            $prev.before($block);
            SBR.reindexBlocks($repeater);
            SBR.clearValidationState($block);
            SBR.clearValidationState($prev);

            SBR.trigger($repeater, 'move', {
                $repeater: $repeater,
                $block:    $block,
                index:     parseInt($block.attr('data-index'), 10),
                oldIndex:  oldIndex
            });
        }
    });

    // Block nach unten
    $(document).on('click', '.sbr-down', function (e) {
        e.preventDefault();
        var $btn = $(this);
        if ($btn.hasClass('disabled')) return;

        var $block    = $btn.closest('.sbr-block');
        var $repeater = $btn.closest('.sbr-repeater');
        var $next     = $block.next('.sbr-block');
        var oldIndex  = parseInt($block.attr('data-index'), 10);

        if ($next.length) {
            $next.after($block);
            SBR.reindexBlocks($repeater);
            SBR.clearValidationState($block);
            SBR.clearValidationState($next);

            SBR.trigger($repeater, 'move', {
                $repeater: $repeater,
                $block:    $block,
                index:     parseInt($block.attr('data-index'), 10),
                oldIndex:  oldIndex
            });
        }
    });

    // Validierung bei input
    $(document).on('input', '.sbr-block input[data-pattern], .sbr-block textarea[data-pattern]', function () {
        SBR.validateField($(this));
    });

    // Submit-Validierung
    $(document).on('submit', 'form', function (e) {
        var $repeaters = $(this).find('.sbr-repeater');
        if (!$repeaters.length) return;

        var formValid   = true;
        var $firstError = null;

        $repeaters.each(function () {
            $(this).find('.sbr-blocks > .sbr-block').each(function () {
                if (!SBR.validateContainer($(this))) {
                    formValid = false;
                    if (!$firstError) {
                        $firstError = $(this).find('.has-error input, .has-error textarea').first();
                    }
                }
            });
        });

        if (!formValid) {
            e.preventDefault();
            if ($firstError && $firstError.length) {
                $('html, body').animate({
                    scrollTop: $firstError.closest('.sbr-block').offset().top - 80
                }, 300, function () { $firstError.focus(); });
            }
        }
    });

    // -------------------------------------------------------------------------
    // Init
    // -------------------------------------------------------------------------
    $(function () {
        $('.sbr-repeater').each(function () {
            var $repeater = $(this);

            SBR.reindexBlocks($repeater);

            var blocks = [];
            $repeater.find('.sbr-block').each(function () {
                SBR.applyDefaults($(this));
                SBR.applyNativePattern($(this));
                blocks.push({
                    $block: $(this),
                    index:  parseInt($(this).attr('data-index'), 10)
                });
            });

            // Sortable initialisieren
            SBR.initSortable($repeater);

            // onShow-Event
            SBR.trigger($repeater, 'show', {
                $repeater: $repeater,
                blocks:    blocks
            });
        });
    });

}(jQuery, window));
