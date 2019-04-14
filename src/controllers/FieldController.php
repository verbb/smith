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

        $field = Craft::$app->fields->getFieldByHandle($fieldHandle);
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

            $blockInfo = Smith::$plugin->field->renderMatrixBlock($field, $block);

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
