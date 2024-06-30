<?php
namespace verbb\smith\controllers;

use Craft;
use craft\base\Element;
use craft\elements\ElementCollection;
use craft\elements\Entry;
use craft\elements\db\EntryQuery;
use craft\fields\Matrix;
use craft\helpers\ElementHelper;
use craft\helpers\StringHelper;
use craft\web\Controller;

use yii\web\BadRequestHttpException;
use yii\web\ForbiddenHttpException;
use yii\web\Response;

class FieldController extends Controller
{
    // Public Methods
    // =========================================================================

    public function actionRenderMatrixBlocks(): Response
    {
        $this->requireAcceptsJson();
        $this->requirePostRequest();

        $blockData = [];
        $blocks = $this->request->getRequiredBodyParam('blocks', []);

        foreach ($blocks as $block) {
            $uid = $block['uid'];
            $fieldId = $block['fieldId'];
            $entryTypeId = $block['entryTypeId'];
            $ownerId = $block['ownerId'];
            $ownerElementType = $block['ownerElementType'];
            $siteId = $block['siteId'];
            $namespace = $block['namespace'];

            $currentEntry = Entry::find()->siteId('*')->uid($uid)->status(null)->one();

            if (!$currentEntry) {
                throw new BadRequestHttpException("Invalid entry UID $uid.");
            }

            $elementsService = Craft::$app->getElements();
            $owner = $elementsService->getElementById($ownerId, $ownerElementType, $siteId);
            if (!$owner) {
                throw new BadRequestHttpException("Invalid owner ID, element type, or site ID.");
            }

            $field = $owner->getFieldLayout()?->getFieldById($fieldId);
            if (!$field instanceof Matrix) {
                throw new BadRequestHttpException("Invalid Matrix field ID: $fieldId");
            }

            $entryType = Craft::$app->getEntries()->getEntryTypeById($entryTypeId);
            if (!$entryType) {
                throw new BadRequestHttpException("Invalid entry type ID: $entryTypeId");
            }

            $site = Craft::$app->getSites()->getSiteById($siteId, true);
            if (!$site) {
                throw new BadRequestHttpException("Invalid site ID: $siteId");
            }

            /** @var Entry $entry */
            $entry = Craft::createObject([
                'class' => Entry::class,
                'siteId' => $siteId,
                'uid' => StringHelper::UUID(),
                'typeId' => $entryType->id,
                'fieldId' => $fieldId,
                'owner' => $owner,
                'title' => $currentEntry->title,
                'slug' => ElementHelper::tempSlug(),
            ]);

            $entry->setFieldValues($currentEntry->getSerializedFieldValues());

            $user = static::currentUser();
            if (!$elementsService->canSave($entry, $user)) {
                throw new ForbiddenHttpException('User not authorized to create this element.');
            }

            $entry->setScenario(Element::SCENARIO_ESSENTIALS);

            if (!$elementsService->saveElement($entry, false)) {
                return $this->asFailure(Craft::t('app', 'Couldn’t create {type}.', [
                    'type' => Entry::lowerDisplayName(),
                ]));
            }

            /** @var EntryQuery|ElementCollection $value */
            $value = $owner->getFieldValue($field->handle);

            $view = $this->getView();

            /** @var Entry[] $entries */
            $entries = $value->all();

            $html = $view->namespaceInputs(fn() => $view->renderTemplate('_components/fieldtypes/Matrix/block.twig', [
                'name' => $field->handle,
                'entryTypes' => $field->getEntryTypesForField($entries, $owner),
                'entry' => $entry,
                'isFresh' => true,
            ]), $namespace);

            $blockData[] = [
                'blockHtml' => $html,
                'headHtml' => $view->getHeadHtml(),
                'bodyHtml' => $view->getBodyHtml(),
            ];
        }

        return $this->asJson([
            'success' => true,
            'blocks' => $blockData,
        ]);
    }
}
