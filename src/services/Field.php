<?php
namespace verbb\smith\services;

use verbb\smith\Smith;

use Craft;
use craft\base\Component;

use DateTime;

class Field extends Component
{
    // Public Methods
    // =========================================================================

    public function renderMatrixBlock($field, $block)
    {
        $renderedBlock = [];

        $view = Craft::$app->getView();
        $originalTemplateMode = $view->getTemplateMode();

        // Set a temporary namespace for these
        $originalNamespace = $view->getNamespace();
        $namespace = $view->namespaceInputName('fields[' . $field->handle . '][blocks][__BLOCK__][fields]', $originalNamespace);
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
