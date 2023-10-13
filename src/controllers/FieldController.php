<?php
namespace verbb\smith\controllers;

use verbb\smith\Smith;

use Craft;
use craft\elements\MatrixBlock;
use craft\helpers\ArrayHelper;
use craft\helpers\Json;
use craft\web\Controller;

use yii\web\Response;

class FieldController extends Controller
{
    // Public Methods
    // =========================================================================

    public function actionRenderMatrixBlocks(): Response
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
            $blockTypeHandle = $blockData['type'] ?? '';

            if (!$blockId) {
                Smith::error("Missing blockId from request.");
                Smith::error(Json::encode($blockData));

                continue;
            }

            // Try to find a saved block to get data from
            if (!strstr($blockId, 'new') && $blockElement = MatrixBlock::find()->id($blockId)->one()) {
                $field = Craft::$app->getFields()->getFieldById($blockElement->fieldId);
                $blockType = $blockElement->getType();

                if (!$field) {
                    Smith::error("Unable to find field for “{$blockElement->fieldId}”.");
                    Smith::error(Json::encode($blockData));

                    continue;
                }
            } else {
                // This might've been a newly-created block, not yet saved. Not foolproof (when dealing with
                // nested fields like Neo/ST), but at least handles base Matrix setups.
                $field = Craft::$app->getFields()->getFieldByHandle($fieldHandle, false);

                if (!$field) {
                    Smith::error("Unable to find field for “{$fieldHandle}”.");
                    Smith::error(Json::encode($blockData));

                    continue;
                }

                $blockTypes = $field->getEntryTypes();
                $blockType = ArrayHelper::firstWhere($blockTypes, 'handle', $blockTypeHandle);

                if (!$blockType) {
                    Smith::error("Unable to find block type for “{$blockTypeHandle}”.");
                    Smith::error(Json::encode($blockData));

                    continue;
                }
            }

            $block = new MatrixBlock();
            $block->fieldId = $field->id;
            $block->typeId = $blockType->id;
            $block->siteId = Craft::$app->getSites()->getCurrentSite()->id;

            $block->enabled = $blockData['enabled'] ?? false;

            if (isset($blockData['fields'])) {
                $block->setFieldValues($blockData['fields']);
            }

            $blockInfo = Smith::$plugin->getField()->renderMatrixBlock($namespace, $field, $block, $placeholderKey);

            $renderedBlocks[] = [
                'typeId' => $blockType->id,
                'typeHandle' => $blockType->handle,
                'enabled' => $block->enabled,
                'bodyHtml' => $blockInfo['bodyHtml'],
                'js' => $blockInfo['footHtml'],
            ];
        }

        return $this->asJson([
            'success' => true,
            'blocks' => $renderedBlocks,
        ]);
    }
}
