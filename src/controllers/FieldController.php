<?php
namespace verbb\smith\controllers;

use verbb\smith\Smith;

use Craft;
use craft\elements\MatrixBlock;
use craft\helpers\Json;
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
        $placeholderKey = $request->getParam('placeholderKey');

        // Allow blocks to send through a namespace, so we can render them properly in-context
        // Mostly for when the Matrix field is nested in another field.
        if (!$namespace) {
            $namespace = 'fields';
        }

        foreach ($blocks as $blockData) {
            // Fetch the field from the block element used. A reliable way to deal with nested fields
            $blockId = $blockData['blockId'] ?? '';

            if (!$blockId) {
                Smith::error("Missing blockId from request.");
                Smith::error(Json::encode($blockData));

                continue;
            }

            $blockElement = MatrixBlock::find()->id($blockId)->one();

            if (!$blockElement) {
                Smith::error("Unable to find block for {$blockId}.");
                Smith::error(Json::encode($blockData));

                continue;
            }

            $field = Craft::$app->getFields()->getFieldById($blockElement->fieldId);
            $blockType = $blockElement->getType();

            if (!$field) {
                Smith::error("Unable to find field for “{$blockElement->fieldId}”.");
                Smith::error(Json::encode($blockData));

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

            $blockInfo = Smith::$plugin->field->renderMatrixBlock($namespace, $field, $block, $placeholderKey);

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
