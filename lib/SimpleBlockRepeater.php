<?php
/*
	Redaxo-Addon SimpleBlockRepeater
	Repeater-Klasse
	v1.0.0
	by Falko Müller @ 2026	
*/

class SimpleBlockRepeater
{
    private string $id;
    private string $template      = '';
    private string $blockTitle    = 'Eintrag';
    private int    $min           = 0;
    private int    $max           = 0;
    private bool   $emptyState    = false;
    private bool   $deleteAll     = true;
    private bool   $showStatus    = true;
    private bool   $showDuplicate = true;

    public function __construct(string $id, array $options = [])
    {
        $this->id = $id;
        if (isset($options['blockTitle']))    $this->blockTitle    = $options['blockTitle'];
        if (isset($options['min']))           $this->min           = (int) $options['min'];
        if (isset($options['max']))           $this->max           = (int) $options['max'];
        if (isset($options['emptyState']))    $this->emptyState    = (bool) $options['emptyState'];
        if (isset($options['deleteAll']))     $this->deleteAll     = (bool) $options['deleteAll'];
        if (isset($options['showStatus']))    $this->showStatus    = (bool) $options['showStatus'];
        if (isset($options['showDuplicate'])) $this->showDuplicate = (bool) $options['showDuplicate'];
    }

    public function setTemplate(string $template): void
    {
        $this->template = $template;
    }

    public function show(mixed $json = null): string
    {
        $items    = $this->parseJson($json);
        $isEmpty  = empty($items);

        // Wenn emptyState=false und keine Daten → ersten leeren Block zeigen
        // Wenn emptyState=true → leeren Zustand mit Add-Button zeigen
        $showEmptyBlock = ($isEmpty && !$this->emptyState);
        if ($showEmptyBlock) {
            $items = [[]];
        }

        $blocksTpl  = $this->renderBlocks($items, $showEmptyBlock);
        $emptyTpl   = $this->renderBlock([], '__INDEX__', '__TOTAL__', true);
        $repeaterId = rex_escape($this->id);
        $addLabel   = rex_i18n::msg('sbr_add', $this->blockTitle);
		$newLabel   = rex_i18n::msg('sbr_new', $this->blockTitle);

        // Data-Attribute für JS-Optionen
        $dataOptions = ' data-delete-all="' . ($this->deleteAll ? '1' : '0') . '"'
                     . ' data-show-status="' . ($this->showStatus ? '1' : '0') . '"'
                     . ' data-show-duplicate="' . ($this->showDuplicate ? '1' : '0') . '"';

        $html  = '<div class="sbr-repeater" data-repeater-id="' . $repeaterId . '" data-max="' . $this->max . '" data-min="' . $this->min . '"' . $dataOptions . '>';
            $html .= '<div class="sbr-blocks">' . $blocksTpl . '</div>';

            // Wird sichtbar wenn alle Blöcke gelöscht wurden ODER emptyState=true beim Start
            $emptyStateStyle = ($isEmpty && $this->emptyState) ? '' : ' style="display:none"';
            $html .= '<div class="sbr-empty-state"' . $emptyStateStyle . '>';
                $html .= '<a href="#" class="btn btn-default sbr-add-btn" data-repeater-id="' . $repeaterId . '">';
                $html .= '<i class="rex-icon fa-plus"></i> ' . $newLabel . '</a>';
            $html .= '</div>';

            // Template für JS – KEIN htmlspecialchars, damit jQuery $(html) parsen kann
            $html .= '<script type="text/x-sbr-template" data-repeater-id="' . $repeaterId . '">';
            $html .= $emptyTpl;
            $html .= '</script>';
        $html .= '</div>';

        return $html;
    }


    public static function get(string $repeaterId): mixed
    {
        $postKey = 'sbr_' . $repeaterId;
        $raw     = rex_post($postKey, 'array', []);

        $items = [];
        foreach ($raw as $block):
            if (!is_array($block)) continue;

            $sanitized = [];
                foreach ($block as $key => $value):
                    $sanitized[rex_escape($key)] = $value;
                endforeach;
                if (!isset($sanitized['_status'])) { $sanitized['_status'] = '0'; }
            $items[] = $sanitized;
        endforeach;

        return $items;
    }


    public static function getJson(string $repeaterId): string
    {
        return json_encode(self::get($repeaterId), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }


    // -------------------------------------------------------------------------
    // Private Hilfsmethoden
    // -------------------------------------------------------------------------

    private function parseJson(mixed $json): array
    {
        if (empty($json) || !is_string($json)) return [];
        $decoded = json_decode($json, true);
        return (is_array($decoded) && !empty($decoded)) ? $decoded : [];
    }

    private function renderBlocks(array $items, bool $isEmpty = false): string
    {
        $html  = '';
        $total = count($items);
        foreach ($items as $index => $data) {
            $isNew = ($isEmpty && $index === 0);
            $html .= $this->renderBlock($data, $index, $total, false, $isNew);
        }
        return $html;
    }

    /**
     * Button-Leiste für renderBlock()
     */
    private function renderControls(string $toggleIcon): string
    {
        $upLabel        = rex_i18n::msg('sbr_up');
        $downLabel      = rex_i18n::msg('sbr_down');
        $toggleLabel    = rex_i18n::msg('sbr_toggle');
        $deleteLabel    = rex_i18n::msg('sbr_delete');
        $addLabel       = rex_i18n::msg('sbr_add');
        $duplicateLabel = rex_i18n::msg('sbr_duplicate');

        $html  = '<div class="sbr-controls">';
            $html .= '<a href="#" class="btn btn-xs btn-default sbr-add-after" title="' . $addLabel . '"><i class="rex-icon fa-plus"></i></a>';

            // Duplizieren-Button (wird per JS/CSS ausgeblendet wenn showDuplicate=false)
            $html .= '<a href="#" class="btn btn-xs btn-default sbr-duplicate" title="' . $duplicateLabel . '"><i class="rex-icon fa-copy"></i></a>';

            $html .= '<a href="#" class="btn btn-xs btn-danger sbr-delete" title="' . $deleteLabel . '"><i class="rex-icon fa-trash"></i></a>';

            // Status-Toggle (wird per JS/CSS ausgeblendet wenn showStatus=false)
            $html .= '<a href="#" class="btn btn-xs btn-default sbr-toggle" title="' . $toggleLabel . '"><i class="rex-icon ' . $toggleIcon . '"></i></a>';

            $html .= '<div class="btn-group btn-group-xs">';
                $html .= '<a href="#" class="btn btn-xs btn-default sbr-up" title="' . $upLabel . '"><i class="rex-icon fa-arrow-up"></i></a>';
                $html .= '<a href="#" class="btn btn-xs btn-default sbr-down" title="' . $downLabel . '"><i class="rex-icon fa-arrow-down"></i></a>';
            $html .= '</div>';
        $html .= '</div>';

        return $html;
    }

    /**
     * Render-Methode für befüllte Blöcke UND JS-Template.
     *
     * @param array      $data       Feldwerte (leer für neuen / Template-Block)
     * @param int|string $index      Block-Index oder '__INDEX__' für JS-Template
     * @param int|string $total      Gesamtanzahl oder '__TOTAL__' für JS-Template
     * @param bool       $isTemplate true = JS-Template
     * @param bool       $isNew      Block bekommt sbr-isnew Klasse
     */
    private function renderBlock(array $data, mixed $index, mixed $total, bool $isTemplate = false, bool $isNew = false): string
    {
        $repeaterId = rex_escape($this->id);
        $blockNum   = $isTemplate ? '__NUM__' : ((int)$index + 1);

        $status         = (!$isTemplate && isset($data['_status'])) ? (string)$data['_status'] : '1';
        $isActive       = $status === '1';
        $statusClass    = $isActive ? '' : ' sbr-block-inactive';
        $bodyStyle      = $isActive ? '' : ' style="display:none"';
        $toggleIcon     = $isActive ? 'fa-eye' : 'fa-eye-slash';
        $statusFieldVal = $isActive ? '1' : '0';

        $newClass = $isNew ? ' sbr-isnew' : '';

        $isFirst = '';
        $isLast  = '';
        if (!$isTemplate && is_int($index) && is_int($total)) {
            if ($index === 0)           $isFirst = ' data-first="1"';
            if ($index === $total - 1)  $isLast  = ' data-last="1"';
        }

        $statusInput    = '<input type="hidden" name="sbr_' . $repeaterId . '[' . $index . '][_status]" value="' . $statusFieldVal . '" class="sbr-status-input">';
        $filledTemplate = $this->fillTemplate($this->template, $data, $index);

        // Drag-Handle am Titel
        $dragHandle = '<span class="sbr-drag-handle" title="' . rex_i18n::msg('sbr_drag') . '"><i class="rex-icon fa-bars"></i></span>';

        $html  = '<div class="sbr-block panel panel-default' . $statusClass . $newClass . '" data-repeater-id="' . $repeaterId . '" data-index="' . $index . '" data-status="' . $statusFieldVal . '"' . $isFirst . $isLast . '>';
            $html .= '<div class="panel-heading">';
                $html .= $dragHandle;
                $html .= '<strong class="sbr-block-title">' . $this->blockTitle . ' #' . $blockNum . '</strong>';
                $html .= $this->renderControls($toggleIcon);
            $html .= '</div>';
            $html .= '<div class="panel-body"' . $bodyStyle . '>';
                $html .= $statusInput;
                $html .= $filledTemplate;
            $html .= '</div>';
        $html .= '</div>';

        return $html;
    }

    private function fillTemplate(string $template, array $data, mixed $index): string
    {
        $repeaterId = $this->id;

        $filled = preg_replace_callback('/\{([a-zA-Z0-9_]+)\}/', function ($matches) use ($data) {
            $key = $matches[1];
            return isset($data[$key]) ? rex_escape($data[$key]) : '';
        }, $template);

        $filled = preg_replace_callback(
            '/\bname=["\']([^"\']+)["\']/i',
            function ($matches) use ($repeaterId, $index) {
                return 'name="sbr_' . $repeaterId . '[' . $index . '][' . $matches[1] . ']"';
            },
            $filled
        );

        return $filled;
    }
}
?>