<?php
namespace verbb\smith\services;

use verbb\smith\Smith;

use Craft;
use craft\base\Component;
use craft\elements\MatrixBlock;
use craft\fieldlayoutelements\CustomField;
use craft\helpers\ArrayHelper;
use craft\models\FieldLayoutTab;

use verbb\supertable\fields\SuperTableField;

use DateTime;

class Field extends Component
{
    // Public Methods
    // =========================================================================

    public function renderMatrixBlock($fieldNamespace, $field, $block, $placeholderKey = '1')
    {
        $blockTypeInfo = [];

        // Set a temporary namespace for these
        $view = Craft::$app->getView();
        $originalNamespace = $view->getNamespace();
        $namespace = $view->namespaceInputName("{$fieldNamespace}[{$field->handle}][blocks][__BLOCK_{$placeholderKey}__]", $originalNamespace);
        $view->setNamespace($namespace);

        $blockType = $block->getType();

        $fieldLayout = $blockType->getFieldLayout();
        $fieldLayoutTab = $fieldLayout->getTabs()[0] ?? new FieldLayoutTab();

        foreach ($fieldLayoutTab->elements as $layoutElement) {
            if ($layoutElement instanceof CustomField) {
                $layoutElement->getField()->setIsFresh(true);
            }
        }

        $view->startJsBuffer();
        $bodyHtml = $view->namespaceInputs($fieldLayout->createForm($block)->render());
        $footHtml = $view->clearJsBuffer();

        // Reset $_isFresh's
        foreach ($fieldLayoutTab->elements as $layoutElement) {
            if ($layoutElement instanceof CustomField) {
                $layoutElement->getField()->setIsFresh(null);
            }
        }

        $blockTypeInfo = [
            'bodyHtml' => $bodyHtml,
            'footHtml' => $footHtml,
        ];

        $view->setNamespace($originalNamespace);

        return $blockTypeInfo;
    }

}
