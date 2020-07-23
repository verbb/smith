<?php
namespace verbb\smith\services;

use verbb\smith\Smith;

use Craft;
use craft\base\Component;
use craft\helpers\ArrayHelper;

use verbb\supertable\fields\SuperTableField;

use DateTime;

class Field extends Component
{
    // Public Methods
    // =========================================================================

    public function renderMatrixBlock($fieldNamespace, $field, $block)
    {
        $renderedBlock = [];

        $view = Craft::$app->getView();
        $originalTemplateMode = $view->getTemplateMode();

        // Set a temporary namespace for these
        $originalNamespace = $view->getNamespace();

        // Try and find a parent field, if we're nesting.
        $parentField = null;

        // Extract the first outer field handle
        if ($fieldNamespace !== 'fields') {
            preg_match_all('/^fields(.+?(?<=.]))/', $fieldNamespace, $matches, PREG_SET_ORDER, 0);

            $parentFieldHandle = str_replace(['[', ']'], ['', ''], $matches[0][1]);
            $parentField = ArrayHelper::firstWhere(Craft::$app->fields->getAllFields(false), 'handle', $parentFieldHandle, true);
        }

        // This is a bit tedious, for a Matrix field inside a Super Table field, it has a different namespace...
        if ($parentField && get_class($parentField) === SuperTableField::class) {
            $namespace = $view->namespaceInputName($fieldNamespace . '[' . $field->handle . '][blocks][__BLOCK2__][fields]', $originalNamespace);
        } else {
            $namespace = $view->namespaceInputName($fieldNamespace . '[' . $field->handle . '][blocks][__BLOCK__][fields]', $originalNamespace);
        }

        $view->setNamespace($namespace);

        $blockType = $block->getType();

        $view->setTemplateMode($view::TEMPLATE_MODE_CP);

        $fieldLayoutFields = $blockType->getFieldLayout()->getFields();

        foreach ($fieldLayoutFields as $field) {
            $field->setIsFresh(true);
        }

        $view->startJsBuffer();

        $bodyHtml = $view->namespaceInputs($view->renderTemplate('_includes/fields', [
            'namespace' => null,
            'fields' => $fieldLayoutFields,
            'element' => $block,
        ]));

        // Reset $_isFresh's
        foreach ($fieldLayoutFields as $field) {
            $field->setIsFresh(null);
        }

        $footHtml = $view->clearJsBuffer();

        $renderedBlock = [
            'bodyHtml' => $bodyHtml,
            'footHtml' => $footHtml,
        ];

        $view->setNamespace($originalNamespace);
        $view->setTemplateMode($originalTemplateMode);

        return $renderedBlock;
    }

}
