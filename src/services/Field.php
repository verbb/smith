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

    public function renderMatrixBlock($fieldNamespace, $field, $block, $placeholderKey = '1')
    {
        $renderedBlock = [];

        $view = Craft::$app->getView();
        $originalTemplateMode = $view->getTemplateMode();

        // Set a temporary namespace for these
        $originalNamespace = $view->getNamespace();

        $namespace = $view->namespaceInputName("{$fieldNamespace}[{$field->handle}][blocks][__BLOCK_{$placeholderKey}__][fields]", $originalNamespace);

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
