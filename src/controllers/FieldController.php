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
        $this->requireCpRequest();
        $this->requireAcceptsJson();
        $this->requirePostRequest();

        $blockData = [];
        $target = $this->request->getRequiredBodyParam('target', []);
        $blocks = $this->request->getRequiredBodyParam('blocks', []);
        $targetFieldId = $target['fieldId'] ?? null;
        $ownerId = $target['ownerId'];
        $ownerElementType = $target['ownerElementType'];
        $siteId = $target['siteId'];
        $namespace = $target['namespace'];

        if (!is_int($targetFieldId) && (!is_string($targetFieldId) || !ctype_digit($targetFieldId))) {
            throw new BadRequestHttpException('Invalid target Matrix field ID.');
        }

        $targetFieldId = (int)$targetFieldId;
        $elementsService = Craft::$app->getElements();
        $user = static::currentUser();
        $owner = $elementsService->getElementById($ownerId, $ownerElementType, $siteId);

        if (!$owner) {
            throw new BadRequestHttpException("Invalid owner ID, element type, or site ID.");
        }

        $field = $owner->getFieldLayout()?->getFieldById($targetFieldId);

        if (!$field instanceof Matrix) {
            throw new BadRequestHttpException("Invalid Matrix field ID: $targetFieldId");
        }

        $site = Craft::$app->getSites()->getSiteById($siteId, true);

        if (!$site) {
            throw new BadRequestHttpException("Invalid site ID: $siteId");
        }

        $entriesToCreate = [];

        foreach ($blocks as $block) {
            $uid = $block['uid'] ?? null;
            $sourceSiteId = $block['siteId'] ?? null;

            if (!is_string($uid) || !StringHelper::isUUID($uid)) {
                throw new BadRequestHttpException('Invalid entry UID.');
            }

            if (!is_int($sourceSiteId) && (!is_string($sourceSiteId) || !ctype_digit($sourceSiteId))) {
                throw new BadRequestHttpException('Invalid source site ID.');
            }

            $sourceSiteId = (int)$sourceSiteId;
            $sourceSite = Craft::$app->getSites()->getSiteById($sourceSiteId, true);

            if (!$sourceSite) {
                throw new BadRequestHttpException("Invalid source site ID: $sourceSiteId");
            }

            $currentEntry = Entry::find()->siteId($sourceSite->id)->uid($uid)->drafts(null)->status(null)->one();

            if (!$currentEntry) {
                throw new BadRequestHttpException('Invalid entry UID.');
            }

            if (!$elementsService->canView($currentEntry, $user)) {
                throw new ForbiddenHttpException('User not authorized to copy this element.');
            }

            if ((int)$currentEntry->fieldId !== $targetFieldId) {
                throw new BadRequestHttpException('Source entry does not belong to the target Matrix field.');
            }

            $entryTypeId = (int)$currentEntry->typeId;

            /** @var Entry $entry */
            $entry = Craft::createObject([
                'class' => Entry::class,
                'siteId' => $siteId,
                'uid' => StringHelper::UUID(),
                'typeId' => $entryTypeId,
                'fieldId' => $targetFieldId,
                'primaryOwner' => $owner,
                'owner' => $owner,
                'title' => $currentEntry->title,
                'slug' => ElementHelper::tempSlug(),
            ]);

            $entry->setFieldValues($currentEntry->getSerializedFieldValues());

            if (!$elementsService->canSave($entry, $user)) {
                throw new ForbiddenHttpException('User not authorized to create this element.');
            }

            $entry->setScenario(Element::SCENARIO_ESSENTIALS);
            $entriesToCreate[] = $entry;
        }

        /** @var EntryQuery|ElementCollection $value */
        $value = $owner->getFieldValue($field->handle);

        /** @var Entry[] $entries */
        $entries = $value->all();
        $entryTypes = $field->getEntryTypesForField($entries, $owner);
        $allowedEntryTypeIds = array_fill_keys(array_map(fn($entryType) => $entryType->id, $entryTypes), true);

        foreach ($entriesToCreate as $entry) {
            if (!isset($allowedEntryTypeIds[$entry->typeId])) {
                throw new BadRequestHttpException('Source entry type is not available for the target Matrix field.');
            }
        }

        foreach ($entriesToCreate as $entry) {
            if (!Craft::$app->getDrafts()->saveElementAsDraft($entry, $user->id, markAsSaved: false)) {
                return $this->asFailure(Craft::t('app', 'Couldn’t create {type}.', [
                    'type' => Entry::lowerDisplayName(),
                ]));
            }

            $view = $this->getView();

            $html = $view->namespaceInputs(fn() => $view->renderTemplate('_components/fieldtypes/Matrix/block.twig', [
                'name' => $field->handle,
                'entryTypes' => $entryTypes,
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
