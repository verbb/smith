/** Seed a populated native Craft Matrix field for Smith's action menu. */

use craft\elements\Entry;
use craft\fieldlayoutelements\CustomField;
use craft\fieldlayoutelements\entries\EntryTitleField;
use craft\fields\Matrix;
use craft\fields\PlainText;
use craft\helpers\Json;
use craft\models\EntryType;
use craft\models\FieldLayout;
use craft\models\FieldLayoutTab;
use craft\models\Section;
use craft\models\Section_SiteSettings;

$fields = Craft::$app->getFields();
$entries = Craft::$app->getEntries();
$elements = Craft::$app->getElements();
$site = Craft::$app->getSites()->getPrimarySite();
$sectionHandle = 'smithPages';
$matrixHandle = 'smithContentBlocks';
$headingHandle = 'smithBlockHeading';
$textHandle = 'smithBlockText';

$heading = $fields->getFieldByHandle($headingHandle);
if (!$heading instanceof PlainText) {
    $heading = new PlainText(['name' => 'Heading', 'handle' => $headingHandle]);
    if (!$fields->saveField($heading)) {
        throw new RuntimeException('Unable to save Smith heading field: ' . Json::encode($heading->getErrors()));
    }
}

$text = $fields->getFieldByHandle($textHandle);
if (!$text instanceof PlainText) {
    $text = new PlainText(['name' => 'Text', 'handle' => $textHandle, 'multiline' => true, 'initialRows' => 3]);
    if (!$fields->saveField($text)) {
        throw new RuntimeException('Unable to save Smith text field: ' . Json::encode($text->getErrors()));
    }
}

$matrix = $fields->getFieldByHandle($matrixHandle);

if (!$matrix instanceof Matrix) {
    $blockType = new EntryType(['name' => 'Text block', 'handle' => 'smithTextBlock']);
    $blockLayout = new FieldLayout(['type' => Entry::class]);
    $blockTab = new FieldLayoutTab(['name' => Craft::t('app', 'Content'), 'layout' => $blockLayout]);
    $blockTab->setElements([new CustomField($heading), new CustomField($text)]);
    $blockLayout->setTabs([$blockTab]);
    $blockType->setFieldLayout($blockLayout);

    if (!$entries->saveEntryType($blockType)) {
        throw new RuntimeException('Unable to save Smith Matrix entry type: ' . Json::encode($blockType->getErrors()));
    }

    $matrix = new Matrix([
        'name' => 'Content blocks',
        'handle' => $matrixHandle,
        'viewMode' => 'blocks',
    ]);
    $matrix->setEntryTypes([$blockType]);

    if (!$fields->saveField($matrix)) {
        throw new RuntimeException('Unable to save Smith Matrix field: ' . Json::encode($matrix->getErrors()));
    }
}

$blockType = $matrix->getEntryTypes()[0] ?? null;
if (!$blockType) {
    throw new RuntimeException('Smith Matrix field has no entry type.');
}

$section = $entries->getSectionByHandle($sectionHandle);

if (!$section) {
    $pageType = new EntryType(['name' => 'Pages', 'handle' => $sectionHandle . 'Type']);
    $pageLayout = new FieldLayout(['type' => Entry::class]);
    $pageTab = new FieldLayoutTab(['name' => Craft::t('app', 'Content'), 'layout' => $pageLayout]);
    $pageTab->setElements([new EntryTitleField(), new CustomField($matrix)]);
    $pageLayout->setTabs([$pageTab]);
    $pageType->setFieldLayout($pageLayout);

    if (!$entries->saveEntryType($pageType)) {
        throw new RuntimeException('Unable to save Smith page entry type: ' . Json::encode($pageType->getErrors()));
    }

    $section = new Section(['name' => 'Pages', 'handle' => $sectionHandle, 'type' => Section::TYPE_CHANNEL]);
    $section->setEntryTypes([$pageType]);
    $section->setSiteSettings([new Section_SiteSettings([
        'siteId' => $site->id,
        'enabledByDefault' => true,
        'hasUrls' => false,
    ])]);

    if (!$entries->saveSection($section)) {
        throw new RuntimeException('Unable to save Smith section: ' . Json::encode($section->getErrors()));
    }
}

$pageType = $entries->getEntryTypesBySectionId($section->id)[0] ?? null;
$page = Entry::find()->sectionId($section->id)->slug('about-the-studio')->siteId($site->id)->status(null)->one();

if (!$page) {
    $page = new Entry([
        'sectionId' => $section->id,
        'typeId' => $pageType->id,
        'siteId' => $site->id,
        'slug' => 'about-the-studio',
        'enabled' => true,
    ]);
    $page->title = 'About the studio';

    if (!$elements->saveElement($page)) {
        throw new RuntimeException('Unable to save Smith page: ' . Json::encode($page->getErrors()));
    }
}

$existingBlocks = Entry::find()
    ->fieldId($matrix->id)
    ->owner($page)
    ->siteId($site->id)
    ->status(null)
    ->all();

if (!$existingBlocks) {
    $content = [
        ['A thoughtful first impression', 'A concise introduction gives visitors the context they need before they explore the rest of the site.'],
        ['Built around the work', 'Flexible content blocks keep the story moving while the project imagery remains the focus.'],
    ];

    foreach ($content as $index => [$blockHeading, $blockText]) {
        $block = new Entry([
            'siteId' => $site->id,
            'typeId' => $blockType->id,
            'fieldId' => $matrix->id,
            'sortOrder' => $index + 1,
        ]);
        $block->setOwner($page);
        $block->setFieldValues([
            $headingHandle => $blockHeading,
            $textHandle => $blockText,
        ]);

        if (!$elements->saveElement($block)) {
            throw new RuntimeException('Unable to save Smith Matrix block: ' . Json::encode($block->getErrors()));
        }
    }
}

echo Json::encode([
    'entryEditRoute' => parse_url((string)$page->getCpEditUrl(), PHP_URL_PATH),
], JSON_THROW_ON_ERROR);
