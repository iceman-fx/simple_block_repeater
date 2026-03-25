# SimpleBlockRepeater – REDAXO AddOn

Wiederverwendbare Repeater-Klasse, z.B. für HTML-Formulare, als MBlock-Alternative zur Nutzung in Modulen & Addons.
Keine Abhängigkeit von MBlock, MForm oder den REDAXO-Modul-Platzhaltern.

Die Nutzung im Frontend ist prinzipiell möglich, sofern die benötigten Assets manuell eingebunden werden.

---

## Installation

1. Ordner `simple_block_repeater` nach `/redaxo/src/addons/` kopieren
2. Im REDAXO-Backend unter **AddOns** installieren und aktivieren
3. Fertig – `SimpleBlockRepeater` steht in allen anderen AddOns zur Verfügung

---

## Grundlegende Verwendung

```php
// Repeater erzeugen
$repeater = new SimpleBlockRepeater('buttons', [
    'blockTitle'    => 'Button',   // Bezeichnung eines Blocks im Heading
    'min'           => 0,          // Mindestanzahl (0 = keine)
    'max'           => 0,          // Maximalanzahl (0 = unbegrenzt)
    'emptyState'    => false,      // true = zeigt Add-Button statt leerem Block bei erster Nutzung
    'deleteAll'     => true,       // false = letzter verbleibender Block kann nicht gelöscht werden
    'showStatus'    => true,       // false = Status-Toggle ausblenden (kein _status im JSON)
    'showDuplicate' => true,       // false = Duplizieren-Button ausblenden
]);

// Template setzen
$repeater->setTemplate(<<<EOT
    <input type="text" name="name" value="{name}">
EOT);

// Ausgeben – null/false/'' werden sicher verarbeitet
echo $repeater->show($jsonAusDB);
```

```php
// Beim Speichern
$json = SimpleBlockRepeater::getJson('buttons');
$sql->setValue('buttons', $json);
```

---

## Optionen im Überblick

| Option | Typ | Standard | Beschreibung |
|---|---|---|---|
| `blockTitle` | string | `'Eintrag'` | Bezeichnung eines Blocks im Heading |
| `min` | int | `0` | Mindestanzahl Blöcke (0 = keine) |
| `max` | int | `0` | Maximalanzahl Blöcke (0 = unbegrenzt) |
| `emptyState` | bool | `false` | `true`: zeigt Add-Button statt leerem Block bei erster Nutzung |
| `deleteAll` | bool | `true` | `false`: der letzte verbleibende Block kann nicht gelöscht werden |
| `showStatus` | bool | `true` | `false`: Status-Toggle ausblenden; `_status` wird nicht im JSON gespeichert |
| `showDuplicate` | bool | `true` | `false`: Duplizieren-Button ausblenden |

---

## Drag & Drop – Sortieren

Jeder Block hat links im Heading einen Drag-Handle (☰-Icon). Blöcke können damit per Maus in eine beliebige Reihenfolge gezogen werden. Die Up/Down-Buttons bleiben weiterhin verfügbar.

Abhängigkeit: **Sortable.js**.

---

## Duplizieren

Jeder Block hat einen Duplizieren-Button. Das Duplikat wird direkt unterhalb des Quell-Blocks eingefügt und enthält alle aktuellen Feldwerte.

Ausblenden für den gesamten Repeater:
```php
$repeater = new SimpleBlockRepeater('buttons', ['showDuplicate' => false]);
```

---

## Status (On/Off)

Jeder Block hat automatisch ein Toggle-Button (Auge-Icon).

- **Aktiv** (Auge offen): Block normal dargestellt
- **Inaktiv** (Auge durchgestrichen): Block eingeklappt und ausgegraut

Status wird als `_status` im JSON gespeichert. Wenn `showStatus => false` gesetzt ist, wird der Button ausgeblendet und `_status` nicht mehr gespeichert.

Ausblenden:
```php
$repeater = new SimpleBlockRepeater('buttons', ['showStatus' => false]);
```

Im Frontend inaktive Blöcke überspringen:
```php
foreach ($buttons as $button) {
    if (($button['_status'] ?? '1') !== '1') continue;
    // nur aktive Buttons verarbeiten ...
}
```

---

## Events

Alle Events werden auf dem Repeater-Element als jQuery Custom Events ausgelöst.
Der Event-Name ist immer `sbr:<eventname>`. Das Detail-Objekt wird als zweites Argument übergeben.

```javascript
// Beispiel-Binding
$('.sbr-repeater[data-repeater-id="buttons"]').on('sbr:add', function (e, detail) {
    console.log('Neuer Block hinzugefügt:', detail.$block, 'Index:', detail.index);
});
```

| Event | Wann | Detail-Objekt |
|---|---|---|
| `sbr:show` | Nach initialem Laden aller Blöcke | `{ $repeater, blocks: [{ $block, index }] }` |
| `sbr:add` | Neuer (leerer) Block hinzugefügt | `{ $repeater, $block, index }` |
| `sbr:duplicate` | Block dupliziert | `{ $repeater, $block, $source, index }` |
| `sbr:move` | Block bewegt (up/down/drag) | `{ $repeater, $block, index, oldIndex }` |
| `sbr:delete` | Block gelöscht | `{ $repeater, index }` |

### Beispiele

```javascript
// Repeater nach dem Laden auswerten
$('.sbr-repeater').on('sbr:show', function (e, detail) {
    console.log('Repeater geladen, Anzahl Blöcke:', detail.blocks.length);
});

// Auf neuen Block reagieren und Feld vorbelegen
$('.sbr-repeater[data-repeater-id="buttons"]').on('sbr:add', function (e, detail) {
    detail.$block.find('[name*="[name]"]').val('neuer_button');
});

// Reihenfolge nach Move protokollieren
$('.sbr-repeater').on('sbr:move', function (e, detail) {
    console.log('Block von', detail.oldIndex, 'nach', detail.index, 'verschoben');
});
```

---

## Template-Attribute

| Attribut | Beschreibung |
|---|---|
| `name="feldname"` | Wird auf `sbr_id[index][feldname]` umgeschrieben |
| `value="{feldname}"` | Wird mit gespeichertem Wert befüllt |
| `data-default="wert"` | Vorbelegung bei neuen (leeren) Blöcken |
| `data-pattern="^regex$"` | Validierung per RegEx (input + submit) |
| `data-pattern-message="..."` | Fehlermeldung bei ungültigem Wert |

---

## Feldtypen – Beispiele

### Text / Number
```html
<input type="text" class="form-control" name="name" value="{name}"
       data-default="mein_wert"
       data-pattern="^[a-z0-9_]+$"
       data-pattern-message="Nur a-z, 0-9 und _ erlaubt">

<input type="number" class="form-control" name="fontsize" value="{fontsize}"
       data-default="16" data-pattern="^\d+$"
       data-pattern-message="Nur Ganzzahlen erlaubt" min="8" max="72">
```

### Select
```html
<select class="form-control" name="design" data-default="filled" data-selected="{design}">
    <option value="filled">Filled</option>
    <option value="outlined">Outlined</option>
    <option value="ghost">Ghost</option>
</select>
```

### Checkbox
```html
<label class="checkbox-inline">
    <input type="checkbox" name="fullwidth" value="1" data-default="checked" data-selected="{fullwidth}">
    Volle Breite
</label>
```

**Tipp:** Um immer einen Wert in der JSON zu erhalten, ist es sinnvoll, ein zusätzliches hidden-Feld mit zu übergeben.
Dieses wird auch dann übertragen, wenn die Checkbox nicht angehakt ist.
```html
<input type="hidden" name="fullwidth" value="0">
<label class="checkbox-inline">
    <input type="checkbox" name="fullwidth" value="1" data-default="checked" data-selected="{fullwidth}">
    Volle Breite
</label>
```

### Radio
```html
<label class="radio-inline">
    <input type="radio" name="align" value="left" data-default="left" data-selected="{align}"> Links
</label>
<label class="radio-inline">
    <input type="radio" name="align" value="center" data-default="left" data-selected="{align}"> Mitte
</label>
<label class="radio-inline">
    <input type="radio" name="align" value="right"  data-default="left" data-selected="{align}"> Rechts
</label>
```

---

## Mehrere Repeater auf einer Seite

```php
$repeater1 = new SimpleBlockRepeater('buttons');
$repeater2 = new SimpleBlockRepeater('teaser_blocks', ['emptyState' => true]);

echo $repeater1->show($json1);
echo $repeater2->show($json2);
```

---

## Fragen, Wünsche, Probleme?

Du hast einen Fehler gefunden oder ein nettes Feature parat?<br>
Lege ein Issue unter https://github.com/iceman-fx/simple_block_repeater an.