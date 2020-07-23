<?php
namespace verbb\smith\controllers;

use verbb\smith\Smith;

use Craft;
use craft\elements\MatrixBlock;
use craft\helpers\ArrayHelper;
use craft\web\Controller;

use yii\web\Response;

class FieldController extends Controller
{
    // Public Methods
    // =========================================================================

    public function actionRenderMatrixBlocks()
    {
        $this->requireAcceptsJson();
        $this->requirePostRequest();

        $renderedBlocks = [];

        $request = Craft::$app->getRequest();

        $fieldHandle = $request->getParam('field');
        $blocks = $request->getParam('blocks');
        $namespace = $request->getParam('namespace');

        // Allow blocks to send through a namespace, so we can render them properly in-context
        // Mostly for when the Matrix field is nested in another field.
        if (!$namespace) {
            $namespace = 'fields';
        }

        // Special handling here. The Matrix field might be nested. We have to use this function in order
        // to find all fields, regardless of context
        $field = ArrayHelper::firstWhere(Craft::$app->fields->getAllFields(false), 'handle', $fieldHandle, true);

        $blockTypes = Craft::$app->matrix->getBlockTypesByFieldId($field->id) ?? [];
        $blockTypes = ArrayHelper::index($blockTypes, 'handle');

        foreach ($blocks as $blockData) {
            $blockType = $blockTypes[$blockData['type']] ?? null;

            if (!$blockType) {
                continue;
            }
            
            $block = new MatrixBlock();
            $block->fieldId = $field->id;
            $block->typeId = $blockType->id;
            $block->siteId = Craft::$app->getSites()->getCurrentSite()->id;

            $block->enabled = $blockData['enabled'] ?? false;

            if (isset($blockData['fields'])) {
                $block->setFieldValues($blockData['fields']);
            }

            $blockInfo = Smith::$plugin->field->renderMatrixBlock($namespace, $field, $block);

            $renderedBlocks[] = [
                'typeId' => $blockType->id,
                'typeHandle' => $blockType->handle,
                'enabled' => $block->enabled,
                'bodyHtml' => $blockInfo['bodyHtml'],
                'footHtml' => $blockInfo['footHtml'],
            ];
        }

        return $this->asJson([
            'success' => true,
            'blocks' => $renderedBlocks,
        ]);
    }
}
